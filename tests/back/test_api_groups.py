"""API tests: groups (list, create/update, permissions)."""
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_groups_list_teacher(teacher_client, test_group):
    """Teacher can list groups (their own)."""
    response = teacher_client.get("/api/groups/")
    # Teacher with no group_ids gets empty list; with group_ids sees those
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)


@pytest.mark.django_db
def test_groups_list_superuser(superuser_client, test_group):
    """Superuser can list all groups."""
    response = superuser_client.get("/api/groups/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert any(g.get("title") == "Test Group" for g in data)


@pytest.mark.django_db
def test_groups_create_superuser(superuser_client):
    """Superuser can create group."""
    response = superuser_client.post(
        "/api/groups/",
        {"title": "New Group", "order": 0},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["title"] == "New Group"


@pytest.mark.django_db
def test_groups_create_teacher_forbidden(teacher_client):
    """Teacher cannot create group."""
    response = teacher_client.post(
        "/api/groups/",
        {"title": "New Group", "order": 0},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_groups_update_superuser(superuser_client, test_group):
    """Superuser can update group."""
    response = superuser_client.patch(
        f"/api/groups/{test_group.id}/",
        {"title": "Updated Group"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["title"] == "Updated Group"
