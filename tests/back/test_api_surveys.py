"""API tests: surveys (list, create, detail)."""
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_survey_create_teacher(teacher_client, test_track):
    """Teacher can create a survey."""
    response = teacher_client.post(
        "/api/surveys/",
        {
            "title": "New Survey",
            "prompt": "Describe your experience",
            "track_id": str(test_track.id),
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "New Survey"
    assert "id" in data


@pytest.mark.django_db
def test_survey_create_minimal(teacher_client):
    """Create survey with minimal fields (no track)."""
    response = teacher_client.post(
        "/api/surveys/",
        {
            "title": "Minimal Survey",
            "prompt": "",
            "track_id": "",
            "visible_group_ids": [],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED, response.json()
    data = response.json()
    assert data["title"] == "Minimal Survey"


@pytest.mark.django_db
def test_survey_submit_and_overwrite_response(auth_client, test_user):
    from apps.surveys.documents import Survey, SurveyResponse
    from apps.submissions.documents import LessonProgress

    s = Survey(title="S", prompt="", track_id="", visible_group_ids=[]).save()

    r1 = auth_client.post(f"/api/surveys/{s.id}/submit/", {"answer": "first"}, format="json")
    assert r1.status_code == status.HTTP_200_OK, r1.json()
    assert r1.json().get("ok") is True
    assert SurveyResponse.objects(survey_id=str(s.id), user_id=str(test_user.id)).count() == 1
    assert SurveyResponse.objects(survey_id=str(s.id), user_id=str(test_user.id)).first().answer == "first"

    r2 = auth_client.post(f"/api/surveys/{s.id}/submit/", {"answer": "second"}, format="json")
    assert r2.status_code == status.HTTP_200_OK, r2.json()
    assert SurveyResponse.objects(survey_id=str(s.id), user_id=str(test_user.id)).count() == 1
    assert SurveyResponse.objects(survey_id=str(s.id), user_id=str(test_user.id)).first().answer == "second"
    lesson_id = str(getattr(s, "public_id", None) or s.id)
    lp = LessonProgress.objects(user_id=str(test_user.id), lesson_id=lesson_id, lesson_type="survey").first()
    assert lp is not None
    assert lp.status == "started"


@pytest.mark.django_db
def test_survey_responses_permissions(teacher_client, test_user, test_teacher, test_group):
    from apps.surveys.documents import Survey, SurveyResponse
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import AccessToken

    # Put student and teacher into same group context
    test_user.group_id = str(test_group.id)
    test_user.save()
    test_teacher.group_ids = [str(test_group.id)]
    test_teacher.save()

    s = Survey(title="S", prompt="", track_id="", visible_group_ids=[str(test_group.id)]).save()
    SurveyResponse(survey_id=str(s.id), user_id=str(test_user.id), answer="a1").save()

    # student cannot list responses
    student_client = APIClient()

    class _W:
        id = str(test_user.id)

    token = AccessToken.for_user(_W())
    student_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")

    r_forbidden = student_client.get(f"/api/surveys/{s.id}/responses/")
    assert r_forbidden.status_code == status.HTTP_403_FORBIDDEN

    # teacher can list responses for survey visible to their groups
    r_ok = teacher_client.get(f"/api/surveys/{s.id}/responses/")
    assert r_ok.status_code == status.HTTP_200_OK, r_ok.json()
    data = r_ok.json()
    assert "responses" in data
    assert any(x.get("answer") == "a1" for x in data["responses"])


@pytest.mark.django_db
def test_survey_accept_response_marks_student_completed(teacher_client, test_user, test_teacher, test_group):
    from apps.surveys.documents import Survey, SurveyResponse
    from apps.submissions.documents import LessonProgress

    test_user.group_id = str(test_group.id)
    test_user.save()
    test_teacher.group_ids = [str(test_group.id)]
    test_teacher.save()

    s = Survey(title="S", prompt="", track_id="", visible_group_ids=[str(test_group.id)]).save()
    SurveyResponse(survey_id=str(s.id), user_id=str(test_user.id), answer="a1").save()

    r = teacher_client.post(f"/api/surveys/{s.id}/responses/{test_user.id}/accept/")
    assert r.status_code == status.HTTP_200_OK, r.json()
    assert r.json().get("ok") is True

    lesson_id = str(getattr(s, "public_id", None) or s.id)
    lp = LessonProgress.objects(user_id=str(test_user.id), lesson_id=lesson_id, lesson_type="survey").first()
    assert lp is not None
    assert lp.status == "completed"


@pytest.mark.django_db
def test_survey_accept_response_student_forbidden(auth_client, test_user):
    from apps.surveys.documents import Survey

    s = Survey(title="S", prompt="", track_id="", visible_group_ids=[]).save()
    r = auth_client.post(f"/api/surveys/{s.id}/responses/{test_user.id}/accept/")
    assert r.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_survey_accept_requires_existing_response(superuser_client, test_user):
    from apps.surveys.documents import Survey

    s = Survey(title="S", prompt="", track_id="", visible_group_ids=[]).save()
    r = superuser_client.post(f"/api/surveys/{s.id}/responses/{test_user.id}/accept/")
    assert r.status_code == status.HTTP_400_BAD_REQUEST
