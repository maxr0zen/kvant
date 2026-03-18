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


@pytest.mark.django_db
def test_question_update_delete_acl(teacher_client, test_track, test_user, test_superuser):
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

    # creator teacher creates question
    created = teacher_client.post(
        "/api/questions/",
        {
            "title": "ACL Q",
            "prompt": "Pick",
            "track_id": str(test_track.id),
            "choices": [
                {"id": "c1", "text": "A", "is_correct": True},
                {"id": "c2", "text": "B", "is_correct": False},
            ],
            "multiple": False,
            "visible_group_ids": [],
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED, created.json()
    qid = created.json()["id"]

    # student cannot update/delete
    r_patch_student = student_client.patch(f"/api/questions/{qid}/", {"title": "X"}, format="json")
    assert r_patch_student.status_code == status.HTTP_403_FORBIDDEN
    r_del_student = student_client.delete(f"/api/questions/{qid}/")
    assert r_del_student.status_code == status.HTTP_403_FORBIDDEN

    # creator can update
    r_patch_teacher = teacher_client.patch(f"/api/questions/{qid}/", {"title": "ACL Q2"}, format="json")
    assert r_patch_teacher.status_code == status.HTTP_200_OK, r_patch_teacher.json()
    assert r_patch_teacher.json()["title"] == "ACL Q2"

    # superuser can delete
    r_del_admin = admin_client.delete(f"/api/questions/{qid}/")
    assert r_del_admin.status_code == status.HTTP_204_NO_CONTENT
