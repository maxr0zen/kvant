"""API tests: web lecture ZIP upload (teacher/superuser only)."""
import io
import zipfile
import pytest
from rest_framework import status


@pytest.fixture
def valid_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("index.html", "<html><body>Hello</body></html>")
        zf.writestr("style.css", "body { color: red; }")
    buf.seek(0)
    buf.name = "test.zip"
    return buf


@pytest.fixture
def zip_no_index():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("readme.txt", "No index here")
    buf.seek(0)
    buf.name = "test.zip"
    return buf


@pytest.fixture
def invalid_file():
    buf = io.BytesIO(b"This is not a zip file")
    buf.name = "test.zip"
    return buf


class TestWebLectureUpload:
    def test_teacher_can_upload(self, teacher_client, valid_zip):
        response = teacher_client.post(
            "/api/lectures/upload-web-lecture/",
            {"file": valid_zip},
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "url" in data
        assert "folder" in data
        assert data["url"].endswith("/index.html")
        assert data["url"].startswith("/web-lection-files/")

    def test_superuser_can_upload(self, superuser_client, valid_zip):
        response = superuser_client.post(
            "/api/lectures/upload-web-lecture/",
            {"file": valid_zip},
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_student_cannot_upload(self, auth_client, valid_zip):
        response = auth_client.post(
            "/api/lectures/upload-web-lecture/",
            {"file": valid_zip},
            format="multipart",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_upload_requires_auth(self, api_client, valid_zip):
        response = api_client.post(
            "/api/lectures/upload-web-lecture/",
            {"file": valid_zip},
            format="multipart",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_upload_no_index_html(self, teacher_client, zip_no_index):
        response = teacher_client.post(
            "/api/lectures/upload-web-lecture/",
            {"file": zip_no_index},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "index.html" in response.json()["detail"]

    def test_upload_invalid_zip(self, teacher_client, invalid_file):
        response = teacher_client.post(
            "/api/lectures/upload-web-lecture/",
            {"file": invalid_file},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_not_zip(self, teacher_client):
        buf = io.BytesIO(b"<html>not zip</html>")
        buf.name = "test.html"
        response = teacher_client.post(
            "/api/lectures/upload-web-lecture/",
            {"file": buf},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
