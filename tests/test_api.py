import io
import json
import unittest
from unittest.mock import patch

from app import create_app


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_health_check(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "ok")

    def test_submit_reference_rejects_wrong_content_type(self):
        resp = self.client.post("/api/submit-reference", json={"title": "x"})
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertFalse(data["success"])

    def test_submit_reference_rejects_empty_payload(self):
        resp = self.client.post(
            "/api/submit-reference",
            data={},
            content_type="multipart/form-data",
        )
        self.assertEqual(resp.status_code, 400)

    def test_submit_reference_rejects_bad_file_extension(self):
        data = {
            "title": "Test reference",
            "pdf": (io.BytesIO(b"not really a pdf"), "malware.exe"),
        }
        resp = self.client.post(
            "/api/submit-reference",
            data=data,
            content_type="multipart/form-data",
        )
        self.assertEqual(resp.status_code, 400)
        body = resp.get_json()
        self.assertFalse(body["success"])

    @patch("app.routes.update_library_with_retry")
    def test_submit_reference_success_text_only(self, mock_update):
        mock_update.return_value = {"id": "REF-2026-00001", "status": "pending"}

        resp = self.client.post(
            "/api/submit-reference",
            data={"title": "Test reference", "author": "Someone"},
            content_type="multipart/form-data",
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body["success"])
        self.assertEqual(body["id"], "REF-2026-00001")
        mock_update.assert_called_once()

    @patch("app.routes.upload_file")
    @patch("app.routes.update_library_with_retry")
    def test_submit_reference_with_pdf_and_cover(self, mock_update, mock_upload):
        def fake_update(build_reference_fn):
            return build_reference_fn([])

        mock_update.side_effect = fake_update
        mock_upload.return_value = "references/REF-2026-00001.pdf"

        data = {
            "title": "Test reference",
            "pdf": (io.BytesIO(b"%PDF-1.4 fake content"), "doc.pdf"),
            "cover_image": (io.BytesIO(b"\xff\xd8\xff\xe0 fake jpg"), "cover.jpg"),
        }
        resp = self.client.post(
            "/api/submit-reference",
            data=data,
            content_type="multipart/form-data",
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body["success"])
        self.assertEqual(mock_upload.call_count, 2)


if __name__ == "__main__":
    unittest.main()
