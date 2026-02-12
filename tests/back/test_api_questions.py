"""API tests: questions (list, detail, check answer, max_attempts)."""
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_question_list(api_client, test_question):
    response = api_client.get("/api/questions/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert any(q.get("title") == "Test Question" for q in data)


@pytest.mark.django_db
def test_question_create_teacher(teacher_client, test_track):
    """Teacher can create a question."""
    from apps.tracks.documents import Track
    response = teacher_client.post(
        "/api/questions/",
        {
            "title": "New Question",
            "prompt": "Pick one",
            "track_id": str(test_track.id),
            "choices": [
                {"id": "c1", "text": "A", "is_correct": True},
                {"id": "c2", "text": "B", "is_correct": False},
            ],
            "multiple": False,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "New Question"
    assert "id" in data
    track = Track.objects.get(id=test_track.id)
    assert len(track.lessons) == 1
    assert track.lessons[0].type == "question"
    assert track.lessons[0].title == "New Question"


@pytest.mark.django_db
def test_question_create_student_forbidden(auth_client, test_track):
    """Student cannot create question."""
    response = auth_client.post(
        "/api/questions/",
        {
            "title": "New Q",
            "prompt": "Pick",
            "track_id": str(test_track.id),
            "choices": [
                {"id": "c1", "text": "A", "is_correct": True},
                {"id": "c2", "text": "B", "is_correct": False},
            ],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_question_detail(api_client, test_question):
    response = api_client.get(f"/api/questions/{test_question.id}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Test Question"
    assert "choices" in data


@pytest.mark.django_db
def test_question_check_passed(auth_client, test_question):
    """Correct choice returns passed True."""
    correct_ids = [c.id for c in test_question.choices if c.is_correct]
    response = auth_client.post(
        f"/api/questions/{test_question.id}/check/",
        {"selected": correct_ids},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["passed"] is True


@pytest.mark.django_db
def test_question_check_failed(auth_client, test_question):
    """Wrong choice returns passed False."""
    wrong_ids = [c.id for c in test_question.choices if not c.is_correct]
    response = auth_client.post(
        f"/api/questions/{test_question.id}/check/",
        {"selected": wrong_ids},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["passed"] is False


@pytest.mark.django_db
def test_question_check_max_attempts_403(auth_client, test_question):
    """Exceeding max_attempts returns 403."""
    from apps.questions.documents import Question
    q = Question.objects.get(id=test_question.id)
    q.max_attempts = 0
    q.save()
    correct_ids = [c.id for c in test_question.choices if c.is_correct]
    response = auth_client.post(
        f"/api/questions/{test_question.id}/check/",
        {"selected": correct_ids},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
