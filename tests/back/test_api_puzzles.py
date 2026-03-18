"""API tests: puzzles (list, detail, create, check solution, max_attempts)."""
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_puzzle_list(api_client, test_puzzle):
    response = api_client.get("/api/puzzles/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert any(p.get("title") == "Test Puzzle" for p in data)


@pytest.mark.django_db
def test_puzzle_detail(api_client, test_puzzle):
    response = api_client.get(f"/api/puzzles/{test_puzzle.id}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Test Puzzle"
    assert "blocks" in data


@pytest.mark.django_db
def test_puzzle_create_teacher(teacher_client, test_track):
    response = teacher_client.post(
        "/api/puzzles/create/",
        {
            "title": "New Puzzle",
            "description": "Desc",
            "track_id": str(test_track.id),
            "blocks": [{"id": "b1", "code": "x=1", "order": "1", "indent": ""}],
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["title"] == "New Puzzle"


@pytest.mark.django_db
def test_puzzle_check_solution_passed(auth_client, test_puzzle):
    """Correct block order returns passed True."""
    blocks = [{"id": b.id, "code": b.code, "indent": getattr(b, "indent", "")} for b in test_puzzle.blocks]
    response = auth_client.post(
        f"/api/puzzles/{test_puzzle.id}/check/",
        {"blocks": blocks},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["passed"] is True


@pytest.mark.django_db
def test_puzzle_check_solution_failed(auth_client, test_puzzle):
    """Wrong block order returns passed False."""
    wrong_order = [{"id": test_puzzle.blocks[1].id, "code": test_puzzle.blocks[1].code, "indent": ""},
                   {"id": test_puzzle.blocks[0].id, "code": test_puzzle.blocks[0].code, "indent": ""}]
    response = auth_client.post(
        f"/api/puzzles/{test_puzzle.id}/check/",
        {"blocks": wrong_order},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["passed"] is False


@pytest.mark.django_db
def test_puzzle_check_max_attempts_403(auth_client, test_puzzle):
    """Exceeding max_attempts on check returns 403."""
    from apps.puzzles.documents import Puzzle
    p = Puzzle.objects.get(id=test_puzzle.id)
    p.max_attempts = 0
    p.save()
    blocks = [{"id": b.id, "code": b.code, "indent": getattr(b, "indent", "")} for b in test_puzzle.blocks]
    response = auth_client.post(
        f"/api/puzzles/{test_puzzle.id}/check/",
        {"blocks": blocks},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_puzzle_update_delete_acl(teacher_client, test_track, test_user, test_superuser):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import AccessToken

    def client_for(u):
        c = APIClient()

        class _W:
            id = str(u.id)

        token = AccessToken.for_user(_W())
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")
        return c

    student_client = client_for(test_user)
    admin_client = client_for(test_superuser)

    created = teacher_client.post(
        "/api/puzzles/create/",
        {
            "title": "ACL P",
            "description": "",
            "track_id": str(test_track.id),
            "blocks": [{"id": "b1", "code": "print(1)", "order": "1", "indent": ""}],
            "visible_group_ids": [],
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED, created.json()
    pid = created.json()["id"]

    # student cannot update/delete
    r_patch_student = student_client.patch(f"/api/puzzles/{pid}/", {"title": "X"}, format="json")
    assert r_patch_student.status_code == status.HTTP_403_FORBIDDEN
    r_del_student = student_client.delete(f"/api/puzzles/{pid}/")
    assert r_del_student.status_code == status.HTTP_403_FORBIDDEN

    # creator can update
    r_patch_teacher = teacher_client.patch(f"/api/puzzles/{pid}/", {"title": "ACL P2"}, format="json")
    assert r_patch_teacher.status_code == status.HTTP_200_OK, r_patch_teacher.json()
    assert r_patch_teacher.json()["title"] == "ACL P2"

    # superuser can delete
    r_del_admin = admin_client.delete(f"/api/puzzles/{pid}/")
    assert r_del_admin.status_code == status.HTTP_204_NO_CONTENT
