"""API tests: lectures (retrieve, create)."""
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_lecture_retrieve(api_client, test_lecture):
    response = api_client.get(f"/api/lectures/{test_lecture.id}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Test Lecture"
    assert "blocks" in data


@pytest.mark.django_db
def test_lecture_retrieve_404(api_client):
    response = api_client.get("/api/lectures/000000000000000000000000/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_lecture_create_teacher(teacher_client, test_track):
    response = teacher_client.post(
        "/api/lectures/",
        {
            "title": "New Lecture",
            "track_id": str(test_track.id),
            "blocks": [],
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["title"] == "New Lecture"


@pytest.mark.django_db
def test_lecture_create_student_forbidden(auth_client, test_track):
    response = auth_client.post(
        "/api/lectures/",
        {
            "title": "New Lecture",
            "track_id": str(test_track.id),
            "blocks": [],
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_lecture_create_with_web_file_block(teacher_client, test_track):
    """Creating a lecture with a web_file block should succeed and preserve block fields."""
    response = teacher_client.post(
        "/api/lectures/",
        {
            "title": "Web File Lecture",
            "track_id": str(test_track.id),
            "blocks": [
                {"type": "web_file", "url": "/web-lection-files/lesson1.html", "title": "Interactive"}
            ],
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "Web File Lecture"
    assert len(data["blocks"]) == 1
    assert data["blocks"][0]["type"] == "web_file"
    assert data["blocks"][0]["url"] == "/web-lection-files/lesson1.html"
    assert data["blocks"][0]["title"] == "Interactive"


@pytest.mark.django_db
def test_lecture_retrieve_web_file_block(api_client, test_lecture):
    """Retrieving a lecture with a web_file block should return the block unchanged."""
    test_lecture.blocks = [
        {"type": "web_file", "url": "/web-lection-files/test.html", "title": "Test File"}
    ]
    test_lecture.save()
    response = api_client.get(f"/api/lectures/{test_lecture.id}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["blocks"]) == 1
    assert data["blocks"][0]["type"] == "web_file"
    assert data["blocks"][0]["url"] == "/web-lection-files/test.html"
    assert data["blocks"][0]["title"] == "Test File"


@pytest.mark.django_db
def test_lecture_web_file_block_missing_url(teacher_client, test_track):
    """A web_file block without a url should be rejected with 400 Bad Request."""
    response = teacher_client.post(
        "/api/lectures/",
        {
            "title": "Bad Web File Lecture",
            "track_id": str(test_track.id),
            "blocks": [
                {"type": "web_file", "title": "Missing URL"}
            ],
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
