"""API tests: users (list, create, update, permissions)."""
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_users_list_superuser(superuser_client, test_user):
    """Superuser can list users."""
    response = superuser_client.get("/api/auth/users/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert any(u.get("username") == "teststudent" for u in data)


@pytest.mark.django_db
def test_users_list_student_forbidden(auth_client):
    """Student cannot list users."""
    response = auth_client.get("/api/auth/users/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_users_create_superuser(superuser_client):
    """Superuser can create user."""
    import uuid
    username = f"newuser_{uuid.uuid4().hex[:8]}"
    response = superuser_client.post(
        "/api/auth/users/",
        {
            "username": username,
            "first_name": "New",
            "last_name": "User",
            "role": "student",
            "password": "pass123",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED, response.json()
    assert response.json()["username"] == username


@pytest.mark.django_db
def test_users_update_superuser(superuser_client, test_user):
    """Superuser can update user."""
    response = superuser_client.patch(
        f"/api/auth/users/{test_user.id}/",
        {"first_name": "Updated"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["first_name"] == "Updated"
