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

    # Folders (inside the same GitHub repo) where uploaded files are stored.
    REFERENCES_DIR = os.environ.get("REFERENCES_DIR", "references")
    COVERS_DIR = os.environ.get("COVERS_DIR", "covers")

    # --- CORS ---
    # Comma-separated list of allowed origins, e.g.:
    # ALLOWED_ORIGIN=https://example.com,https://www.example.com
    ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "")

    # --- Server ---
    PORT = int(os.environ.get("PORT", 5000))
    HOST = os.environ.get("HOST", "0.0.0.0")
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

    # --- Uploads ---
    MAX_PDF_SIZE_MB = float(os.environ.get("MAX_PDF_SIZE_MB", 10))
    MAX_COVER_SIZE_MB = float(os.environ.get("MAX_COVER_SIZE_MB", 5))

    ALLOWED_PDF_EXTENSIONS = {"pdf"}
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

    # --- GitHub write retries (handles concurrent submissions) ---
    GITHUB_MAX_RETRIES = int(os.environ.get("GITHUB_MAX_RETRIES", 5))
    GITHUB_REQUEST_TIMEOUT = int(os.environ.get("GITHUB_REQUEST_TIMEOUT", 15))


config = Config()
