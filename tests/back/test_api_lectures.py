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
