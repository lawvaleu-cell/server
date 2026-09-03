import logging
import re
import threading
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from app.config import config
from app.github import (
    GitHubError,
    append_reference_with_retry,
    delete_file_best_effort,
    read_library,
    upload_file,
)

api = Blueprint("api", __name__)
logger = logging.getLogger("legal_library_api")

# Serializes the whole submit flow (ID generation + GitHub writes) within
# this process, so two requests handled by the same worker can never race
# on library.json. See README for the single-worker deployment note this
# relies on.
_submit_lock = threading.Lock()

# Magic-byte signatures used to verify a file's real type, since neither
# the filename extension nor the browser-reported Content-Type can be
# trusted on their own.
_PDF_MAGIC = b"%PDF-"
_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _ext(filename):
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower()


def _looks_like_pdf(data):
    return data[:5] == _PDF_MAGIC


def _looks_like_image(data, ext):
    if ext in ("jpg", "jpeg"):
        return data[:3] == _JPEG_MAGIC
    if ext == "png":
        return data[:8] == _PNG_MAGIC
    if ext == "webp":
        return data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return False


def _generate_id(existing_library):
    """REF-<year>-<5 digit sequence>, unique against the current list.
    (Existing ID scheme — unchanged from the current project.)"""
    year = datetime.now(timezone.utc).year
    prefix = f"REF-{year}-"

    max_seq = 0
    for item in existing_library:
        ref_id = item.get("id", "") if isinstance(item, dict) else ""
        m = re.match(rf"^{re.escape(prefix)}(\d+)$", ref_id)
        if m:
            max_seq = max(max_seq, int(m.group(1)))

    new_id = f"{prefix}{max_seq + 1:05d}"

    existing_ids = {item.get("id") for item in existing_library if isinstance(item, dict)}
    while new_id in existing_ids:
        max_seq += 1
        new_id = f"{prefix}{max_seq + 1:05d}"

    return new_id


def _read_and_validate(file_storage, *, kind, allowed_extensions, allowed_mime_types, max_size_mb):
    """
    Validates an uploaded file's extension, browser-reported MIME type,
    real content (magic bytes), and size.
    Returns (bytes, extension), or raises ValueError with a safe message.
    """
    ext = _ext(file_storage.filename or "")
    if ext not in allowed_extensions:
        raise ValueError(f"Unsupported file extension for {kind}")

    if file_storage.mimetype not in allowed_mime_types:
        raise ValueError(f"Unsupported content type for {kind}")

    file_storage.stream.seek(0, 2)
    size_bytes = file_storage.stream.tell()
    file_storage.stream.seek(0)

    if size_bytes == 0:
        raise ValueError(f"{kind} file is empty")

    max_bytes = max_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise ValueError(f"{kind} exceeds the maximum allowed size of {max_size_mb}MB")

    data = file_storage.stream.read()

    if kind == "pdf" and not _looks_like_pdf(data):
        raise ValueError("The uploaded pdf file is not a valid PDF")
    if kind == "cover" and not _looks_like_image(data, ext):
        raise ValueError("The uploaded cover file is not a valid image")

    return data, ext


def _public_path(relative_path):
    if config.PUBLIC_BASE_URL:
        return f"{config.PUBLIC_BASE_URL}/{relative_path}"
    return relative_path


@api.route("/api/health", methods=["GET"])
def health():
    return jsonify({"success": True, "status": "ok"})


@api.route("/api/submit-reference", methods=["POST"])
def submit_reference():
    if not request.content_type or "multipart/form-data" not in request.content_type:
        return jsonify({"success": False, "message": "Expected multipart/form-data"}), 400

    # Keep every text field exactly as the site sends it — no renaming,
    # no assumptions about which fields exist.
    form_data = {key: value for key, value in request.form.items()}

    if not form_data and not request.files:
        return jsonify({"success": False, "message": "No data submitted"}), 400

    # --- Step 1: validate uploads up front, before any GitHub call. ---
    pdf_storage = request.files.get("pdf")
    cover_storage = request.files.get("cover")

    pdf_bytes = pdf_ext = None
    cover_bytes = cover_ext = None

    try:
        if pdf_storage and pdf_storage.filename:
            pdf_bytes, pdf_ext = _read_and_validate(
                pdf_storage,
                kind="pdf",
                allowed_extensions=config.ALLOWED_PDF_EXTENSIONS,
                allowed_mime_types=config.ALLOWED_PDF_MIME_TYPES,
                max_size_mb=config.MAX_PDF_SIZE_MB,
            )
        if cover_storage and cover_storage.filename:
            cover_bytes, cover_ext = _read_and_validate(
                cover_storage,
                kind="cover",
                allowed_extensions=config.ALLOWED_IMAGE_EXTENSIONS,
                allowed_mime_types=config.ALLOWED_IMAGE_MIME_TYPES,
                max_size_mb=config.MAX_COVER_SIZE_MB,
            )
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400

    uploaded_paths = []  # for best-effort cleanup if a later step fails

    # --- Steps 2-6 run under a lock: one submission touches GitHub at a
    # time in this process, so ID generation and library.json updates
    # can't race each other. ---
    with _submit_lock:
        try:
            # Step 2: generate the reference ID from the current library.
            existing_library, _sha = read_library()
            new_id = _generate_id(existing_library)

            reference = dict(form_data)
            reference["id"] = new_id
            reference["status"] = "pending"
            reference["submitted_at"] = datetime.now(timezone.utc).isoformat()
            reference["files"] = {"pdf": None, "cover": None}

            # Step 3: upload PDF, if any.
            if pdf_bytes is not None:
                pdf_path = f"{config.BOOKS_DIR}/{new_id}.{pdf_ext}"
                upload_file(pdf_path, pdf_bytes, f"Add pdf for {new_id}")
                uploaded_paths.append(pdf_path)
                reference["files"]["pdf"] = _public_path(pdf_path)

            # Step 4: upload cover, if any.
            if cover_bytes is not None:
                cover_path = f"{config.COVERS_DIR}/{new_id}.{cover_ext}"
                upload_file(cover_path, cover_bytes, f"Add cover for {new_id}")
                uploaded_paths.append(cover_path)
                reference["files"]["cover"] = _public_path(cover_path)

            # Step 5: update library.json (existing entries are preserved).
            append_reference_with_retry(reference)

        except GitHubError as exc:
            logger.error("submit-reference failed for a GitHub-related reason: %s", exc)
            for path in uploaded_paths:
                delete_file_best_effort(path)
            return jsonify({"success": False, "message": "Unable to submit reference"}), 502
        except Exception:
            logger.exception("submit-reference failed unexpectedly")
            for path in uploaded_paths:
                delete_file_best_effort(path)
            return jsonify({"success": False, "message": "Unable to submit reference"}), 500

    # Step 6: return success.
    return jsonify(
        {
            "success": True,
            "message": "Reference submitted successfully",
            "id": reference["id"],
        }
    )
