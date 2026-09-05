```python
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

# Serializes the whole submit flow (ID generation + GitHub writes)
# within this process, so two requests handled by the same worker
# can never race on library.json.
_submit_lock = threading.Lock()

# Magic-byte signatures used to verify a file's real type.
_PDF_MAGIC = b"%PDF-"
_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _ext(filename):
    """Return the lowercase file extension without the dot."""
    if not filename or "." not in filename:
        return ""

    return filename.rsplit(".", 1)[1].lower()


def _looks_like_pdf(data):
    """Check whether the file starts with the PDF magic bytes."""
    return data[:5] == _PDF_MAGIC


def _looks_like_image(data, ext):
    """Check image magic bytes according to the file extension."""
    if ext in ("jpg", "jpeg"):
        return data[:3] == _JPEG_MAGIC

    if ext == "png":
        return data[:8] == _PNG_MAGIC

    if ext == "webp":
        return data[:4] == b"RIFF" and data[8:12] == b"WEBP"

    return False


def _generate_id(existing_library):
    """
    Generate:

        REF-<year>-<5 digit sequence>

    Example:

        REF-2026-00001
        REF-2026-00002
        REF-2026-00003

    The sequence is calculated from the existing library.
    """
    year = datetime.now(timezone.utc).year
    prefix = f"REF-{year}-"

    max_seq = 0

    for item in existing_library:
        ref_id = item.get("id", "") if isinstance(item, dict) else ""

        match = re.match(
            rf"^{re.escape(prefix)}(\d+)$",
            ref_id,
        )

        if match:
            max_seq = max(max_seq, int(match.group(1)))

    new_id = f"{prefix}{max_seq + 1:05d}"

    # Extra protection against duplicated IDs.
    existing_ids = {
        item.get("id")
        for item in existing_library
        if isinstance(item, dict)
    }

    while new_id in existing_ids:
        max_seq += 1
        new_id = f"{prefix}{max_seq + 1:05d}"

    return new_id


def _read_and_validate(
    file_storage,
    *,
    kind,
    allowed_extensions,
    allowed_mime_types,
    max_size_mb,
):
    """
    Validate an uploaded file:

    - extension
    - MIME type
    - file size
    - real file signature / magic bytes

    Returns:

        (bytes, extension)

    or raises ValueError.
    """

    ext = _ext(file_storage.filename or "")

    # Validate extension.
    if ext not in allowed_extensions:
        raise ValueError(
            f"Unsupported file extension for {kind}"
        )

    # Validate browser-reported MIME type.
    if file_storage.mimetype not in allowed_mime_types:
        raise ValueError(
            f"Unsupported content type for {kind}"
        )

    # Determine file size without consuming the stream.
    file_storage.stream.seek(0, 2)
    size_bytes = file_storage.stream.tell()
    file_storage.stream.seek(0)

    # Empty file.
    if size_bytes == 0:
        raise ValueError(
            f"{kind} file is empty"
        )

    # Maximum allowed size.
    max_bytes = max_size_mb * 1024 * 1024

    if size_bytes > max_bytes:
        raise ValueError(
            f"{kind} exceeds the maximum allowed size of {max_size_mb}MB"
        )

    # Read the file.
    data = file_storage.stream.read()

    # Validate real PDF content.
    if kind == "pdf" and not _looks_like_pdf(data):
        raise ValueError(
            "The uploaded pdf file is not a valid PDF"
        )

    # Validate cover image.
    if kind == "cover" and not _looks_like_image(data, ext):
        raise ValueError(
            "The uploaded cover file is not a valid image"
        )

    # Validate contributor photo.
    if kind == "photo" and not _looks_like_image(data, ext):
        raise ValueError(
            "The uploaded contributor photo is not a valid image"
        )

    return data, ext


def _public_path(relative_path):
    """
    Convert a repository-relative path into a public URL.

    Example:

        contributors/REF-2026-00001.jpg

    becomes:

        https://example.com/contributors/REF-2026-00001.jpg

    when PUBLIC_BASE_URL is configured.
    """

    if config.PUBLIC_BASE_URL:
        return f"{config.PUBLIC_BASE_URL}/{relative_path}"

    return relative_path


@api.route("/api/health", methods=["GET"])
def health():
    """Health-check endpoint."""
    return jsonify(
        {
            "success": True,
            "status": "ok",
        }
    )


@api.route("/api/submit-reference", methods=["POST"])
def submit_reference():
    """
    Receive a reference submission from the website.

    Supported files:

    - pdf
    - cover
    - contributorPhoto

    Contributor information is stored using the nested structure:

    {
        "contributor": {
            "name": "...",
            "bio": "...",
            "photo": "...",
            "showName": true,
            "showPhoto": true,
            "showBio": true,
            "showLinks": true,
            "links": {
                "website": "...",
                "linkedin": "...",
                "facebook": "...",
                "instagram": "...",
                "x": "...",
                "github": "..."
            }
        }
    }
    """

    # ------------------------------------------------------------------
    # 1. Validate request type
    # ------------------------------------------------------------------

    if (
        not request.content_type
        or "multipart/form-data" not in request.content_type
    ):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Expected multipart/form-data",
                }
            ),
            400,
        )

    # ------------------------------------------------------------------
    # 2. Read all text fields
    # ------------------------------------------------------------------

    form_data = {
        key: value
        for key, value in request.form.items()
    }

    if not form_data and not request.files:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "No data submitted",
                }
            ),
            400,
        )

    # ------------------------------------------------------------------
    # 3. Get uploaded files
    # ------------------------------------------------------------------

    pdf_storage = request.files.get("pdf")
    cover_storage = request.files.get("cover")
    photo_storage = request.files.get("contributorPhoto")

    # Initialize all file variables.
    pdf_bytes = pdf_ext = None
    cover_bytes = cover_ext = None
    photo_bytes = photo_ext = None

    # ------------------------------------------------------------------
    # 4. Validate uploaded files BEFORE any GitHub operation
    # ------------------------------------------------------------------

    try:

        # ----------------------------
        # PDF
        # ----------------------------

        if pdf_storage and pdf_storage.filename:

            pdf_bytes, pdf_ext = _read_and_validate(
                pdf_storage,
                kind="pdf",
                allowed_extensions=config.ALLOWED_PDF_EXTENSIONS,
                allowed_mime_types=config.ALLOWED_PDF_MIME_TYPES,
                max_size_mb=config.MAX_PDF_SIZE_MB,
            )

        # ----------------------------
        # Cover
        # ----------------------------

        if cover_storage and cover_storage.filename:

            cover_bytes, cover_ext = _read_and_validate(
                cover_storage,
                kind="cover",
                allowed_extensions=config.ALLOWED_IMAGE_EXTENSIONS,
                allowed_mime_types=config.ALLOWED_IMAGE_MIME_TYPES,
                max_size_mb=config.MAX_COVER_SIZE_MB,
            )

        # ----------------------------
        # Contributor photo
        # ----------------------------

        if photo_storage and photo_storage.filename:

            photo_bytes, photo_ext = _read_and_validate(
                photo_storage,
                kind="photo",
                allowed_extensions=config.ALLOWED_IMAGE_EXTENSIONS,
                allowed_mime_types=config.ALLOWED_IMAGE_MIME_TYPES,
                max_size_mb=config.MAX_COVER_SIZE_MB,
            )

    except ValueError as exc:

        return (
            jsonify(
                {
                    "success": False,
                    "message": str(exc),
                }
            ),
            400,
        )

    # Keep track of uploaded files.
    # If a later GitHub operation fails, these files will be removed.
    uploaded_paths = []

    # ------------------------------------------------------------------
    # 5. Generate ID + upload files + update library.json
    # ------------------------------------------------------------------

    with _submit_lock:

        try:

            # ----------------------------------------------------------
            # Step 1: Read current library
            # ----------------------------------------------------------

            existing_library, _sha = read_library()

            # ----------------------------------------------------------
            # Step 2: Generate unique reference ID
            # ----------------------------------------------------------

            new_id = _generate_id(existing_library)

            # ----------------------------------------------------------
            # Step 3: Create base reference
            # ----------------------------------------------------------

            reference = dict(form_data)

            # ----------------------------------------------------------
            # Contributor
            #
            # IMPORTANT:
            # The contributor information is stored in one nested
            # object so library.js can read:
            #
            # ref.contributor.name
            # ref.contributor.photo
            # ref.contributor.bio
            # ref.contributor.links
            # ----------------------------------------------------------

            reference["contributor"] = {
                "name": form_data.get(
                    "contributorName",
                    ""
                ).strip(),

                "bio": form_data.get(
                    "contributorBio",
                    ""
                ).strip(),

                "photo": "",

                "showName": (
                    form_data.get("showName") == "on"
                ),

                "showPhoto": (
                    form_data.get("showPhoto") == "on"
                ),

                "showBio": (
                    form_data.get("showBio") == "on"
                ),

                "showLinks": (
                    form_data.get("showLinks") == "on"
                ),

                "links": {
                    "website": form_data.get(
                        "linkWebsite",
                        ""
                    ).strip(),

                    "linkedin": form_data.get(
                        "linkLinkedin",
                        ""
                    ).strip(),

                    "facebook": form_data.get(
                        "linkFacebook",
                        ""
                    ).strip(),

                    "instagram": form_data.get(
                        "linkInstagram",
                        ""
                    ).strip(),

                    "x": form_data.get(
                        "linkX",
                        ""
                    ).strip(),

                    "github": form_data.get(
                        "linkGithub",
                        ""
                    ).strip(),
                },
            }

            # ----------------------------------------------------------
            # Remove old flat contributor fields.
            #
            # This prevents library.json from containing both:
            #
            # contributorName
            #
            # and:
            #
            # contributor: {...}
            #
            # ----------------------------------------------------------

            for key in (
                "contributorName",
                "contributorEmail",
                "contributorBio",
                "linkWebsite",
                "linkLinkedin",
                "linkFacebook",
                "linkInstagram",
                "linkX",
                "linkGithub",
                "showName",
                "showPhoto",
                "showBio",
                "showLinks",
            ):
                reference.pop(key, None)

            # ----------------------------------------------------------
            # Basic reference metadata
            # ----------------------------------------------------------

            reference["id"] = new_id

            reference["status"] = "pending"

            reference["submitted_at"] = (
                datetime.now(timezone.utc).isoformat()
            )

            # ----------------------------------------------------------
            # Initialize file URLs
            # ----------------------------------------------------------

            reference["pdf"] = None
            reference["cover"] = None

            # ----------------------------------------------------------
            # Step 4: Upload PDF
            # ----------------------------------------------------------

            if pdf_bytes is not None:

                pdf_path = (
                    f"{config.BOOKS_DIR}/"
                    f"{new_id}.{pdf_ext}"
                )

                upload_file(
                    pdf_path,
                    pdf_bytes,
                    f"Add pdf for {new_id}",
                )

                uploaded_paths.append(pdf_path)

                reference["pdf"] = _public_path(
                    pdf_path
                )

            # ----------------------------------------------------------
            # Step 5: Upload cover
            # ----------------------------------------------------------

            if cover_bytes is not None:

                cover_path = (
                    f"{config.COVERS_DIR}/"
                    f"{new_id}.{cover_ext}"
                )

                upload_file(
                    cover_path,
                    cover_bytes,
                    f"Add cover for {new_id}",
                )

                uploaded_paths.append(cover_path)

                reference["cover"] = _public_path(
                    cover_path
                )

            # ----------------------------------------------------------
            # Step 6: Upload contributor photo
            # ----------------------------------------------------------

            if photo_bytes is not None:

                photo_path = (
                    f"contributors/"
                    f"{new_id}.{photo_ext}"
                )

                upload_file(
                    photo_path,
                    photo_bytes,
                    f"Add contributor photo for {new_id}",
                )

                uploaded_paths.append(photo_path)

                reference["contributor"]["photo"] = (
                    _public_path(photo_path)
                )

            # ----------------------------------------------------------
            # Step 7: Update library.json
            # ----------------------------------------------------------

            append_reference_with_retry(
                reference
            )

        # --------------------------------------------------------------
        # GitHub-related failure
        # --------------------------------------------------------------

        except GitHubError as exc:

            logger.error(
                "submit-reference failed for a "
                "GitHub-related reason: %s",
                exc,
            )

            # Best-effort cleanup of already uploaded files.
            for path in uploaded_paths:

                delete_file_best_effort(
                    path
                )

            return (
                jsonify(
                    {
                        "success": False,
                        "message": (
                            "Unable to submit reference"
                        ),
                    }
                ),
                502,
            )

        # --------------------------------------------------------------
        # Unexpected failure
        # --------------------------------------------------------------

        except Exception:

            logger.exception(
                "submit-reference failed unexpectedly"
            )

            # Best-effort cleanup.
            for path in uploaded_paths:

                delete_file_best_effort(
                    path
                )

            return (
                jsonify(
                    {
                        "success": False,
                        "message": (
                            "Unable to submit reference"
                        ),
                    }
                ),
                500,
            )

    # ------------------------------------------------------------------
    # 6. Success
    # ------------------------------------------------------------------

    return jsonify(
        {
            "success": True,
            "message": "Reference submitted successfully",
            "id": reference["id"],
        }
    )
```
