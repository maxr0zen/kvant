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
