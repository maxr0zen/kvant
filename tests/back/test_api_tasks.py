"""API tests: tasks (retrieve, run, submit, max_attempts)."""
import pytest
from rest_framework import status
from uuid import uuid4

from apps.submissions.documents import Submission


@pytest.mark.django_db
def test_tasks_retrieve(api_client, test_task):
    """Retrieve task by id."""
    response = api_client.get(f"/api/tasks/{test_task.id}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Test Task"
    assert "test_cases" in data
    assert "starter_code" in data


@pytest.mark.django_db
def test_tasks_retrieve_404(api_client):
    response = api_client.get("/api/tasks/000000000000000000000000/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_tasks_create_auto_adds_to_track(teacher_client, test_track):
    """Creating a task with track_id auto-adds it to track.lessons."""
    from apps.tracks.documents import Track
    assert len(test_track.lessons) == 0
    response = teacher_client.post(
        "/api/tasks/",
        {
            "title": "New Task",
            "description": "Desc",
            "starter_code": "",
            "track_id": str(test_track.id),
            "test_cases": [{"id": "c1", "input": "1", "expected_output": "1\n", "is_public": True}],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    track = Track.objects.get(id=test_track.id)
    assert len(track.lessons) == 1
    assert track.lessons[0].type == "task"
    assert track.lessons[0].title == "New Task"


@pytest.mark.django_db
def test_tasks_run_success(auth_client, test_task):
    """Run code: correct solution passes."""
    code = "a = int(input())\nb = int(input())\nprint(a + b)"
    response = auth_client.post(
        f"/api/tasks/{test_task.id}/run/",
        {"code": code},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "results" in data
    assert len(data["results"]) >= 1
    assert data["results"][0]["passed"] is True


@pytest.mark.django_db
def test_tasks_run_wrong_output(auth_client, test_task):
    """Run code: wrong output fails."""
    response = auth_client.post(
        f"/api/tasks/{test_task.id}/run/",
        {"code": "print(0)"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert any(r["passed"] is False for r in data["results"])


@pytest.mark.django_db
def test_tasks_submit_success(auth_client, test_task, test_user):
    """Submit correct code: passed True, submission saved."""
    code = "a = int(input())\nb = int(input())\nprint(a + b)"
    response = auth_client.post(
        f"/api/tasks/{test_task.id}/submit/",
        {"code": code},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["passed"] is True
    assert Submission.objects(user_id=str(test_user.id), task_id=str(test_task.id)).count() == 1


@pytest.mark.django_db
def test_tasks_submit_failed(auth_client, test_task):
    """Submit wrong code: passed False."""
    response = auth_client.post(
        f"/api/tasks/{test_task.id}/submit/",
        {"code": "print(0)"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["passed"] is False


@pytest.mark.django_db
def test_tasks_submit_max_attempts_403(auth_client, test_task, test_user):
    """When max_attempts exceeded, submit returns 403."""
    from apps.tasks.documents import Task
    task_id = str(test_task.id)
    # Set max_attempts = 1 on the task (reload from DB to get same doc)
    task = Task.objects.get(id=test_task.id)
    task.max_attempts = 1
    task.save()
    # First submit is OK
    code = "a = int(input())\nb = int(input())\nprint(a + b)"
    r1 = auth_client.post(f"/api/tasks/{task_id}/submit/", {"code": code}, format="json")
    assert r1.status_code == status.HTTP_200_OK
    # Second submit must be 403
    r2 = auth_client.post(f"/api/tasks/{task_id}/submit/", {"code": code}, format="json")
    assert r2.status_code == status.HTTP_403_FORBIDDEN
    assert "попыток" in r2.json().get("detail", "")


@pytest.mark.django_db
def test_tasks_draft_get_unauth_returns_none(api_client, test_task):
    r = api_client.get(f"/api/tasks/{test_task.id}/draft/")
    assert r.status_code == status.HTTP_200_OK
    assert r.json() == {"code": None}


@pytest.mark.django_db
def test_tasks_draft_put_unauth_401(api_client, test_task):
    r = api_client.put(f"/api/tasks/{test_task.id}/draft/", {"code": "x"}, format="json")
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_tasks_draft_put_then_get(auth_client, test_task):
    put = auth_client.put(
        f"/api/tasks/{test_task.id}/draft/",
        {"code": "draft-code"},
        format="json",
    )
    assert put.status_code == status.HTTP_200_OK, put.json()
    assert put.json().get("status") == "ok"

    get = auth_client.get(f"/api/tasks/{test_task.id}/draft/")
    assert get.status_code == status.HTTP_200_OK
    assert get.json() == {"code": "draft-code"}


@pytest.mark.django_db
def test_tasks_draft_get_falls_back_to_last_submission(auth_client, test_task):
    # No draft yet, but a submission exists
    auth_client.post(
        f"/api/tasks/{test_task.id}/submit/",
        {"code": "submission-code"},
        format="json",
    )

    r = auth_client.get(f"/api/tasks/{test_task.id}/draft/")
    assert r.status_code == status.HTTP_200_OK
    assert r.json() == {"code": "submission-code"}


@pytest.mark.django_db
def test_teacher_can_patch_foreign_task_only_visible_groups(teacher_client, test_teacher, test_task):
    from apps.groups.documents import Group
    from apps.users.documents import User, UserRole

    g1 = Group(title="TaskG1", order=1).save()
    g2 = Group(title="TaskG2", order=2).save()
    test_teacher.group_ids = [str(g1.id)]
    test_teacher.save()

    teacher_b = User(
        username=f"task_teacher_b_{uuid4().hex[:8]}",
        first_name="B",
        last_name="Teach",
        role=UserRole.TEACHER.value,
        group_ids=[str(g2.id)],
    )
    teacher_b.set_password("x")
    teacher_b.save()
    test_task.created_by_id = str(teacher_b.id)
    test_task.visible_group_ids = [str(g2.id)]
    test_task.save()
    tid = str(getattr(test_task, "public_id", None) or test_task.id)

    r_forbidden = teacher_client.patch(f"/api/tasks/{tid}/", {"title": "new title"}, format="json")
    assert r_forbidden.status_code == status.HTTP_403_FORBIDDEN

    r_allowed = teacher_client.patch(f"/api/tasks/{tid}/", {"visible_group_ids": [str(g1.id)]}, format="json")
    assert r_allowed.status_code == status.HTTP_200_OK
    assert r_allowed.json()["visible_group_ids"] == [str(g1.id)]
