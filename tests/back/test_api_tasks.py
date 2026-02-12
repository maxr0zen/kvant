"""API tests: tasks (retrieve, run, submit, max_attempts)."""
import pytest
from rest_framework import status

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
