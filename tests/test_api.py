import io
import json
import threading
import time
import unittest
from unittest.mock import patch

from app import create_app
from app.github import GitHubError


PDF_BYTES = b"%PDF-1.4\n%fake pdf content for testing\n"
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"0" * 50
EXE_BYTES = b"MZ" + b"0" * 50


class HealthTestCase(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_health_check(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "ok")


class SubmitReferenceTestCase(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_rejects_wrong_content_type(self):
        resp = self.client.post("/api/submit-reference", json={"title": "x"})
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.get_json()["success"])

    def test_rejects_empty_payload(self):
        resp = self.client.post(
            "/api/submit-reference", data={}, content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 400)

    # --- 2. Submitting without a PDF still works (kept from current behavior) ---
    @patch("app.routes.append_reference_with_retry")
    @patch("app.routes.read_library", return_value=([], None))
    def test_submit_without_pdf_is_allowed(self, mock_read, mock_append):
        mock_append.side_effect = lambda ref: ref

        resp = self.client.post(
            "/api/submit-reference",
            data={"title": "Test reference", "author": "Someone"},
            content_type="multipart/form-data",
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body["success"])

        sent_reference = mock_append.call_args[0][0]
        self.assertIsNone(sent_reference["files"]["pdf"])
        self.assertIsNone(sent_reference["files"]["cover"])

    # --- 3 & 4. PDF goes to books/, cover goes to covers/ ---
    @patch("app.routes.append_reference_with_retry")
    @patch("app.routes.upload_file")
    @patch("app.routes.read_library", return_value=([], None))
    def test_pdf_and_cover_uploaded_to_correct_folders(self, mock_read, mock_upload, mock_append):
        mock_append.side_effect = lambda ref: ref

        data = {
            "title": "Test reference",
            "pdf": (io.BytesIO(PDF_BYTES), "doc.pdf", "application/pdf"),
            "cover": (io.BytesIO(JPEG_BYTES), "cover.jpg", "image/jpeg"),
        }
        resp = self.client.post(
            "/api/submit-reference", data=data, content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 200)

        upload_paths = [call.args[0] for call in mock_upload.call_args_list]
        self.assertTrue(any(p.startswith("books/") and p.endswith(".pdf") for p in upload_paths))
        self.assertTrue(any(p.startswith("covers/") and p.endswith(".jpg") for p in upload_paths))

    # --- 5, 6, 7. library.json receives the new reference: status=pending, correct pdf path ---
    @patch("app.routes.append_reference_with_retry")
    @patch("app.routes.upload_file")
    @patch("app.routes.read_library", return_value=([{"id": "REF-2026-00001", "status": "published"}], None))
    def test_new_reference_shape(self, mock_read, mock_upload, mock_append):
        mock_append.side_effect = lambda ref: ref

        data = {
            "title": "Second reference",
            "pdf": (io.BytesIO(PDF_BYTES), "doc.pdf", "application/pdf"),
        }
        resp = self.client.post(
            "/api/submit-reference", data=data, content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 200)

        sent_reference = mock_append.call_args[0][0]
        self.assertEqual(sent_reference["id"], "REF-2026-00002")
        self.assertEqual(sent_reference["status"], "pending")
        self.assertEqual(sent_reference["files"]["pdf"], "books/REF-2026-00002.pdf")

    # --- 8. Old references are never dropped (exercised at the github module level) ---
    def test_append_preserves_existing_entries(self):
        from app import github as github_module

        existing = [{"id": "REF-2026-00001", "status": "published"}]
        new_ref = {"id": "REF-2026-00002", "status": "pending"}

        put_calls = []

        def fake_get_file(path):
            if path == github_module.config.LIBRARY_PATH:
                return json.dumps(existing), "sha-abc"
            return None, None

        def fake_put_file(path, content_bytes, message, sha=None):
            put_calls.append(json.loads(content_bytes))
            return True

        with patch.object(github_module, "get_file", side_effect=fake_get_file), \
             patch.object(github_module, "put_file", side_effect=fake_put_file):
            result = github_module.append_reference_with_retry(new_ref)

        self.assertEqual(result, new_ref)
        self.assertEqual(len(put_calls), 1)
        written_library = put_calls[0]
        self.assertEqual(len(written_library), 2)
        self.assertIn(existing[0], written_library)
        self.assertIn(new_ref, written_library)

    # --- 9. Disallowed file types are rejected (bad extension, bad mimetype, bad magic bytes) ---
    def test_rejects_disguised_executable_as_pdf(self):
        data = {
            "title": "Test",
            "pdf": (io.BytesIO(EXE_BYTES), "malware.pdf", "application/pdf"),
        }
        resp = self.client.post(
            "/api/submit-reference", data=data, content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.get_json()["success"])

    def test_rejects_wrong_extension(self):
        data = {
            "title": "Test",
            "pdf": (io.BytesIO(PDF_BYTES), "doc.exe", "application/pdf"),
        }
        resp = self.client.post(
            "/api/submit-reference", data=data, content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 400)

    # --- 10. Oversized files are rejected ---
    @patch("app.config.config.MAX_PDF_SIZE_MB", 0.00001)
    def test_rejects_oversized_pdf(self):
        data = {
            "title": "Test",
            "pdf": (io.BytesIO(PDF_BYTES), "doc.pdf", "application/pdf"),
        }
        resp = self.client.post(
            "/api/submit-reference", data=data, content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("size", resp.get_json()["message"].lower())

    # --- 11. GitHub errors are handled without leaking internals ---
    @patch("app.routes.upload_file")
    @patch("app.routes.read_library", return_value=([], None))
    def test_github_error_returns_generic_message(self, mock_read, mock_upload):
        mock_upload.side_effect = GitHubError("token rejected: some internal GitHub detail")

        data = {
            "title": "Test",
            "pdf": (io.BytesIO(PDF_BYTES), "doc.pdf", "application/pdf"),
        }
        resp = self.client.post(
            "/api/submit-reference", data=data, content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 502)
        body = resp.get_json()
        self.assertFalse(body["success"])
        self.assertNotIn("token", body["message"].lower())
        self.assertNotIn("internal GitHub detail", body["message"])

    # --- 12. Concurrent submissions don't corrupt library.json (lock serializes them) ---
    def test_concurrent_submissions_are_serialized(self):
        active = {"count": 0}
        max_seen = {"value": 0}
        lock_for_test = threading.Lock()

        def fake_read_library():
            return [], None

        def fake_upload_file(path, data, message):
            with lock_for_test:
                active["count"] += 1
                max_seen["value"] = max(max_seen["value"], active["count"])
            time.sleep(0.05)
            with lock_for_test:
                active["count"] -= 1
            return path

        def fake_append(reference):
            return reference

        with patch("app.routes.read_library", side_effect=fake_read_library), \
             patch("app.routes.upload_file", side_effect=fake_upload_file), \
             patch("app.routes.append_reference_with_retry", side_effect=fake_append):

            def submit():
                client = create_app().test_client()
                data = {
                    "title": "Concurrent test",
                    "pdf": (io.BytesIO(PDF_BYTES), "doc.pdf", "application/pdf"),
                }
                client.post("/api/submit-reference", data=data, content_type="multipart/form-data")

            threads = [threading.Thread(target=submit) for _ in range(5)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

        # If the lock worked, only one upload was ever "in flight" at once.
        self.assertEqual(max_seen["value"], 1)

    # --- 13. GitHub token never appears in a response ---
    @patch("app.routes.append_reference_with_retry")
    @patch("app.routes.read_library", return_value=([], None))
    @patch("app.config.config.GITHUB_TOKEN", "super-secret-token-value")
    def test_token_not_exposed_in_response(self, mock_read, mock_append):
        mock_append.side_effect = lambda ref: ref
        resp = self.client.post(
            "/api/submit-reference",
            data={"title": "Test"},
            content_type="multipart/form-data",
        )
        self.assertNotIn("super-secret-token-value", resp.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
