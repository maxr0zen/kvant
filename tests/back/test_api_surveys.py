"""API tests: surveys (list, create, detail)."""
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_survey_create_teacher(teacher_client, test_track):
    """Teacher can create a survey."""
    response = teacher_client.post(
        "/api/surveys/",
        {
            "title": "New Survey",
            "prompt": "Describe your experience",
            "track_id": str(test_track.id),
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "New Survey"
    assert "id" in data


@pytest.mark.django_db
def test_survey_create_minimal(teacher_client):
    """Create survey with minimal fields (no track)."""
    response = teacher_client.post(
        "/api/surveys/",
        {
            "title": "Minimal Survey",
            "prompt": "",
            "track_id": "",
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED, response.json()
    data = response.json()
    assert data["title"] == "Minimal Survey"
