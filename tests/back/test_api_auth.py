"""API tests: auth (login, profile)."""
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_login_success(api_client, test_user):
    response = api_client.post(
        "/api/auth/login/",
        {"username": "teststudent", "password": "testpass123"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "token" in data
    assert "user" in data
    assert data["user"]["username"] == "teststudent"


@pytest.mark.django_db
def test_login_wrong_password(api_client, test_user):
    response = api_client.post(
        "/api/auth/login/",
        {"username": "teststudent", "password": "wrong"},
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "detail" in response.json()


@pytest.mark.django_db
def test_login_nonexistent_user(api_client):
    response = api_client.post(
        "/api/auth/login/",
        {"username": "nosuchuser", "password": "any"},
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_profile_authenticated(auth_client, test_user):
    response = auth_client.get("/api/auth/profile/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "user" in data
    assert data["user"]["username"] == "teststudent"


def test_profile_unauthenticated(api_client):
    response = api_client.get("/api/auth/profile/")
    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


@pytest.mark.django_db
def test_platform_completed_assignments_returns_only_standalone_completed(auth_client, test_user):
    from apps.submissions.documents import LessonProgress

    LessonProgress(
        user_id=str(test_user.id),
        lesson_id="standalone-1",
        lesson_type="survey",
        lesson_title="Standalone survey",
        track_id="",
        status="completed",
        completed_late=False,
    ).save()
    LessonProgress(
        user_id=str(test_user.id),
        lesson_id="intrack-1",
        lesson_type="task",
        lesson_title="In track task",
        track_id="track-123",
        status="completed",
    ).save()
    LessonProgress(
        user_id=str(test_user.id),
        lesson_id="started-1",
        lesson_type="question",
        lesson_title="Started question",
        track_id="",
        status="started",
    ).save()

    response = auth_client.get("/api/auth/profile/platform-completed/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "items" in data
    ids = [x["lesson_id"] for x in data["items"]]
    assert "standalone-1" in ids
    assert "intrack-1" not in ids
    assert "started-1" not in ids
