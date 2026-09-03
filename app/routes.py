import os
import re
import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from app.config import config
from app.github import GitHubError, update_library_with_retry, upload_file

api = Blueprint("api", __name__)

# Field-name hints used only to decide WHERE an uploaded file goes
# (references/ vs covers/). We never invent or require new field names;
# any field the site sends is accepted and kept as-is in the reference
# data. This is only for routing already-known upload fields safely.
PDF_FIELD_HINTS = ("pdf", "file", "document")
COVER_FIELD_HINTS = ("cover", "image", "thumbnail")


def _ext(filename):
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower()


def _generate_id(existing_library):
    """REF-<year>-<5 digit sequence>, unique against the current list."""
    year = datetime.now(timezone.utc).year
    prefix = f"REF-{year}-"

    max_seq = 0
    for item in existing_library:
        ref_id = item.get("id", "") if isinstance(item, dict) else ""
        m = re.match(rf"^{re.escape(prefix)}(\d+)$", ref_id)
        if m:
            max_seq = max(max_seq, int(m.group(1)))

    new_id = f"{prefix}{max_seq + 1:05d}"

    # Guard against duplicates in a malformed/edited-by-hand library file.
    existing_ids = {item.get("id") for item in existing_library if isinstance(item, dict)}
    while new_id in existing_ids:
        max_seq += 1
        new_id = f"{prefix}{max_seq + 1:05d}"

    return new_id


def _validate_and_read(file_storage, allowed_extensions, max_size_mb, label):
    """
    Validates an uploaded file's extension and size.
    Returns the raw bytes, or raises ValueError with a user-safe message.
    """
    filename = secure_filename(file_storage.filename or "")
    ext = _ext(filename)

    if ext not in allowed_extensions:
        raise ValueError(f"Unsupported file type for {label}")

    file_storage.stream.seek(0, os.SEEK_END)
    size_bytes = file_storage.stream.tell()
    file_storage.stream.seek(0)

    max_bytes = max_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise ValueError(f"{label} exceeds the maximum allowed size of {max_size_mb}MB")

    if size_bytes == 0:
        raise ValueError(f"{label} is empty")

    return file_storage.stream.read()


def _classify_field(field_name):
    lowered = field_name.lower()
    if any(hint in lowered for hint in COVER_FIELD_HINTS):
        return "cover"
    if any(hint in lowered for hint in PDF_FIELD_HINTS):
        return "pdf"
    return None


@api.route("/api/health", methods=["GET"])
def health():
    return jsonify({"success": True, "status": "ok"})


@api.route("/api/submit-reference", methods=["POST"])
def submit_reference():
    if not request.content_type or "multipart/form-data" not in request.content_type:
        return jsonify({"success": False, "message": "Expected multipart/form-data"}), 400

    # Keep every text field exactly as the site sent it. We don't assume
    # or require specific field names.
    form_data = {key: value for key, value in request.form.items()}

    if not form_data and not request.files:
        return jsonify({"success": False, "message": "No data submitted"}), 400

    # Validate + read uploaded files up front (before touching GitHub),
    # so a bad upload never triggers a partial write.
    pending_uploads = []  # list of (field_name, kind, bytes, extension)
    try:
        for field_name, file_storage in request.files.items():
            if not file_storage or not file_storage.filename:
                continue

            kind = _classify_field(field_name)
            if kind == "cover":
                data = _validate_and_read(
                    file_storage, config.ALLOWED_IMAGE_EXTENSIONS, config.MAX_COVER_SIZE_MB, "cover image"
                )
            else:
                # Default unknown file fields to the PDF/document rules.
                data = _validate_and_read(
                    file_storage, config.ALLOWED_PDF_EXTENSIONS, config.MAX_PDF_SIZE_MB, "document"
                )
                kind = "pdf"

            ext = _ext(secure_filename(file_storage.filename))
            pending_uploads.append((field_name, kind, data, ext))

    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400

    def build_reference(existing_library):
        new_id = _generate_id(existing_library)

        reference = dict(form_data)  # preserve all fields as sent
        reference["id"] = new_id
        reference["status"] = "pending"
        reference["submitted_at"] = datetime.now(timezone.utc).isoformat()

        if pending_uploads:
            reference["files"] = {}
            for field_name, kind, data, ext in pending_uploads:
                folder = config.COVERS_DIR if kind == "cover" else config.REFERENCES_DIR
                safe_path = f"{folder}/{new_id}.{ext}"
                try:
                    upload_file(safe_path, data, f"Add {kind} for {new_id}")
                except GitHubError:
                    # Re-raised as a plain exception so the outer handler
                    # gives a generic response and the library.json write
                    # is not attempted with a broken file reference.
                    raise
                reference["files"][field_name] = safe_path

        return reference

    try:
        new_reference = update_library_with_retry(build_reference)
    except GitHubError:
        return jsonify({"success": False, "message": "Unable to submit reference"}), 502
    except Exception:
        return jsonify({"success": False, "message": "Unable to submit reference"}), 500

    return jsonify(
        {
            "success": True,
            "message": "Reference submitted successfully",
            "id": new_reference["id"],
        }
    )
