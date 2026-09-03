"""
Configuration loaded entirely from environment variables.
No secrets are hard-coded anywhere in this project.
"""

import os

# Load a local .env file if present (only used for local development).
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Config:
    # --- GitHub ---
    GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
    GITHUB_OWNER = os.environ.get("GITHUB_OWNER", "")
    GITHUB_REPO = os.environ.get("GITHUB_REPO", "")
    GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main")
    LIBRARY_PATH = os.environ.get("LIBRARY_PATH", "data/library.json")

    # Fixed folders (inside the website's GitHub repo) where uploaded
    # files are stored. Not user-controlled — the server always writes
    # to exactly these two paths, keyed by the reference ID.
    BOOKS_DIR = os.environ.get("BOOKS_DIR", "books")
    COVERS_DIR = os.environ.get("COVERS_DIR", "covers")

    # --- CORS ---
    # Comma-separated list of allowed origins, e.g.:
    # ALLOWED_ORIGIN=https://example.com,https://www.example.com
    ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "")

    # Optional: only needed if the static site requires a full URL (not a
    # repo-relative path like "books/REF-2026-00001.pdf") to open files —
    # e.g. when files are served from GitHub Pages/raw.githubusercontent
    # under a different host than the one committing them. Left empty,
    # the server stores plain relative paths (the format the task's own
    # example used), which is the safer default since we can't inspect
    # the actual frontend from here.
    PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")

    # --- Server ---
    PORT = int(os.environ.get("PORT", 5000))
    HOST = os.environ.get("HOST", "0.0.0.0")
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

    # --- Uploads ---
    MAX_PDF_SIZE_MB = float(os.environ.get("MAX_PDF_SIZE_MB", 10))
    MAX_COVER_SIZE_MB = float(os.environ.get("MAX_COVER_SIZE_MB", 5))

    ALLOWED_PDF_EXTENSIONS = {"pdf"}
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

    # Extension alone is never trusted — the browser-reported Content-Type
    # and the file's own magic bytes are also checked (see app/routes.py).
    ALLOWED_PDF_MIME_TYPES = {"application/pdf"}
    ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

    # --- GitHub write retries (handles concurrent submissions) ---
    GITHUB_MAX_RETRIES = int(os.environ.get("GITHUB_MAX_RETRIES", 5))
    GITHUB_REQUEST_TIMEOUT = int(os.environ.get("GITHUB_REQUEST_TIMEOUT", 15))


config = Config()
