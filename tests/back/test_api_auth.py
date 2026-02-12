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
