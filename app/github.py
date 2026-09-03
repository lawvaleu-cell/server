"""
All communication with the GitHub Contents API lives in this file.
No GitHub token ever leaves this module or gets returned to a client.
"""

import base64
import json
import time

import requests

from app.config import config

API_ROOT = "https://api.github.com"


class GitHubError(Exception):
    """Raised for unexpected GitHub failures. Message is safe to log,
    but should NOT be forwarded to the end user as-is."""
    pass


def _headers():
    return {
        "Authorization": f"Bearer {config.GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _contents_url(path):
    owner = config.GITHUB_OWNER
    repo = config.GITHUB_REPO
    return f"{API_ROOT}/repos/{owner}/{repo}/contents/{path}"


def get_file(path):
    """
    Fetch a file's decoded text content and its sha from GitHub.
    Returns (content_str, sha) if the file exists.
    Returns (None, None) if the file does not exist (404).
    Raises GitHubError on any other failure.
    """
    try:
        resp = requests.get(
            _contents_url(path),
            headers=_headers(),
            params={"ref": config.GITHUB_BRANCH},
            timeout=config.GITHUB_REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise GitHubError(f"network error reading {path}: {exc}")

    if resp.status_code == 404:
        return None, None

    if resp.status_code != 200:
        raise GitHubError(f"unexpected status {resp.status_code} reading {path}: {resp.text[:300]}")

    data = resp.json()
    encoded = data.get("content", "")
    encoding = data.get("encoding", "base64")
    if encoding != "base64":
        raise GitHubError(f"unsupported encoding '{encoding}' for {path}")

    raw_bytes = base64.b64decode(encoded)
    return raw_bytes.decode("utf-8"), data.get("sha")


def put_file(path, content_bytes, message, sha=None):
    """
    Create or update a file at `path` with `content_bytes`.
    If `sha` is provided, GitHub requires it to match the current file
    (used to detect/avoid overwriting someone else's concurrent change).

    Returns True on success.
    Returns False on a 409/422 conflict (caller should retry).
    Raises GitHubError on any other failure.
    """
    payload = {
        "message": message,
        "content": base64.b64encode(content_bytes).decode("ascii"),
        "branch": config.GITHUB_BRANCH,
    }
    if sha:
        payload["sha"] = sha

    try:
        resp = requests.put(
            _contents_url(path),
            headers=_headers(),
            data=json.dumps(payload),
            timeout=config.GITHUB_REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise GitHubError(f"network error writing {path}: {exc}")

    if resp.status_code in (200, 201):
        return True

    if resp.status_code in (409, 422):
        # Conflict: file changed since we read it (sha mismatch), or
        # the file already exists when we didn't expect it to.
        return False

    raise GitHubError(f"unexpected status {resp.status_code} writing {path}: {resp.text[:300]}")


def read_library():
    """
    Fetch and parse the current library.json.
    Returns (library_list, sha). sha is None if the file doesn't exist yet.
    Raises GitHubError on failure or if the file isn't a JSON array.
    """
    content, sha = get_file(config.LIBRARY_PATH)
    if content is None:
        return [], None
    try:
        library = json.loads(content)
    except json.JSONDecodeError as exc:
        raise GitHubError(f"library.json is not valid JSON: {exc}")
    if not isinstance(library, list):
        raise GitHubError("library.json does not contain a JSON array")
    return library, sha


def append_reference_with_retry(reference):
    """
    Append an already-built `reference` dict to library.json, handling the
    case where another request/process modifies the file concurrently.

    Important: the reference (its ID, and any file paths already uploaded
    for it) must be fully decided BEFORE calling this. This function only
    retries the read-modify-write of library.json itself — it never
    regenerates the ID or re-uploads files, so a retry can never orphan
    an already-uploaded PDF/cover under an abandoned ID.

    Existing entries are always preserved: each attempt re-reads the
    latest library.json and appends to it, never replaces it.

    Returns the reference dict once committed.
    Raises GitHubError if it fails after all retries.
    """
    last_error = None

    for _attempt in range(config.GITHUB_MAX_RETRIES):
        library, sha = read_library()

        # Idempotency guard: if this exact ID is already present (e.g. a
        # previous attempt's write actually succeeded but we didn't get
        # to see the response, or a rare cross-process race slipped past
        # the in-process lock), don't add a duplicate entry.
        if any(isinstance(item, dict) and item.get("id") == reference.get("id") for item in library):
            return reference

        updated_library = library + [reference]
        new_content = json.dumps(updated_library, ensure_ascii=False, indent=2).encode("utf-8")
        message = f"Add new library reference {reference.get('id')}"

        try:
            success = put_file(config.LIBRARY_PATH, new_content, message, sha=sha)
        except GitHubError as exc:
            last_error = exc
            continue

        if success:
            return reference

        # Conflict: someone else updated library.json between our GET and
        # PUT. Small backoff, then re-read and retry the merge.
        last_error = GitHubError("conflict updating library.json, retrying")
        time.sleep(0.3)

    raise GitHubError(f"failed to update library.json after retries: {last_error}")


def delete_file_best_effort(path):
    """
    Best-effort cleanup of an orphaned upload (e.g. a PDF that was
    committed but its sibling cover upload, or the library.json update,
    then failed). Never raises — failures here are logged by the caller,
    not surfaced to the user, since the user-facing operation has already
    failed for its own reason.
    """
    try:
        _content, sha = get_file(path)
        if not sha:
            return
        payload = {
            "message": f"Remove orphaned upload {path}",
            "sha": sha,
            "branch": config.GITHUB_BRANCH,
        }
        requests.delete(
            _contents_url(path),
            headers=_headers(),
            data=json.dumps(payload),
            timeout=config.GITHUB_REQUEST_TIMEOUT,
        )
    except Exception:
        pass


def upload_file(path, file_bytes, message):
    """
    Upload a binary file (PDF / cover image) to the repo at `path`.
    Overwrites if a file already exists at that exact path (unlikely,
    since callers use unique generated filenames).
    Raises GitHubError on failure.
    """
    _content, sha = get_file(path)
    success = put_file(path, file_bytes, message, sha=sha)
    if not success:
        # Extremely unlikely race on a unique filename; one retry is enough.
        _content, sha = get_file(path)
        success = put_file(path, file_bytes, message, sha=sha)
    if not success:
        raise GitHubError(f"failed to upload {path}")
    return path
