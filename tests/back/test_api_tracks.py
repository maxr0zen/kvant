"""API tests: tracks (list, retrieve, create, update, orphan_*, lesson id normalization)."""
import pytest
from rest_framework import status
from uuid import uuid4


@pytest.mark.django_db
def test_tracks_list_format(api_client, test_track):
    """List returns tracks, orphan_lectures, orphan_tasks, orphan_puzzles, orphan_questions."""
    response = api_client.get("/api/tracks/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "tracks" in data
    assert "orphan_lectures" in data
    assert "orphan_tasks" in data
    assert "orphan_puzzles" in data
    assert "orphan_questions" in data
    assert "orphan_layouts" in data
    assert isinstance(data["tracks"], list)
    assert len(data["tracks"]) >= 1
    track = next((t for t in data["tracks"] if t.get("title") == "Test Track"), None)
    assert track is not None
    assert "id" in track
    assert "lessons" in track


@pytest.mark.django_db
def test_tracks_retrieve(api_client, test_track):
    """Retrieve returns track by id (ObjectId or public_id)."""
    response = api_client.get(f"/api/tracks/{test_track.id}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Test Track"
    assert data["id"] == str(test_track.id) or data["id"] == getattr(test_track, "public_id", None)


@pytest.mark.django_db
def test_tracks_retrieve_404(api_client):
    response = api_client.get("/api/tracks/000000000000000000000000/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_tracks_create_teacher(teacher_client, test_track):
    """Teacher can create a track."""
    response = teacher_client.post(
        "/api/tracks/",
        {"title": "New Track", "description": "Desc", "order": 1, "visible_group_ids": []},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "New Track"
    assert "id" in data


@pytest.mark.django_db
def test_tracks_create_student_forbidden(auth_client):
    """Student cannot create track."""
    response = auth_client.post(
        "/api/tracks/",
        {"title": "New Track", "description": "Desc", "order": 1},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_tracks_update_teacher(teacher_client, test_track):
    """Teacher can update track."""
    from apps.users.documents import User
    teacher = User.objects.get(username="testteacher")
    test_track.created_by_id = str(teacher.id)
    test_track.save()
    response = teacher_client.patch(
        f"/api/tracks/{test_track.id}/",
        {"title": "Updated Title"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["title"] == "Updated Title"


@pytest.mark.django_db
def test_tracks_destroy_creator(teacher_client, test_teacher, test_track):
    """Track creator can delete their track."""
    from apps.tracks.documents import Track
    test_track.created_by_id = str(test_teacher.id)
    test_track.save()
    response = teacher_client.delete(f"/api/tracks/{test_track.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert Track.objects(id=test_track.id).count() == 0


@pytest.mark.django_db
def test_tracks_destroy_non_creator_forbidden(teacher_client, test_track):
    """Teacher cannot delete track created by another teacher."""
    from apps.tracks.documents import Track
    test_track.created_by_id = "000000000000000000000001"  # not our teacher
    test_track.save()
    response = teacher_client.delete(f"/api/tracks/{test_track.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert Track.objects(id=test_track.id).count() == 1


@pytest.mark.django_db
def test_tracks_destroy_superuser(superuser_client, test_track):
    """Superuser can delete any track."""
    from apps.tracks.documents import Track
    test_track.created_by_id = "000000000000000000000001"  # different user
    test_track.save()
    response = superuser_client.delete(f"/api/tracks/{test_track.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert Track.objects(id=test_track.id).count() == 0


@pytest.mark.django_db
def test_teacher_sees_foreign_tracks_and_student_does_not(api_client, teacher_client, test_teacher):
    from apps.groups.documents import Group
    from apps.users.documents import User, UserRole
    from apps.tracks.documents import Track
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework.test import APIClient

    g1 = Group(title="G1", order=1).save()
    g2 = Group(title="G2", order=2).save()
    test_teacher.group_ids = [str(g1.id)]
    test_teacher.save()

    teacher_b = User(
        username=f"teacher_b_{uuid4().hex[:8]}",
        first_name="B",
        last_name="Teach",
        role=UserRole.TEACHER.value,
        group_ids=[str(g2.id)],
    )
    teacher_b.set_password("x")
    teacher_b.save()

    foreign_track = Track(
        title="Foreign track",
        description="",
        order=10,
        lessons=[],
        visible_group_ids=[str(g2.id)],
        created_by_id=str(teacher_b.id),
    ).save()

    student = User(
        username=f"student_g1_{uuid4().hex[:8]}",
        first_name="S",
        last_name="One",
        role=UserRole.STUDENT.value,
        group_id=str(g1.id),
    )
    student.set_password("x")
    student.save()
    st_client = APIClient()
    st_token = AccessToken.for_user(type("W", (), {"id": str(student.id)})())
    st_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(st_token)}")

    r_teacher = teacher_client.get("/api/tracks/")
    assert r_teacher.status_code == status.HTTP_200_OK
    teacher_retrieve = teacher_client.get(f"/api/tracks/{str(getattr(foreign_track, 'public_id', None) or foreign_track.id)}/")
    assert teacher_retrieve.status_code == status.HTTP_200_OK

    r_student = st_client.get("/api/tracks/")
    assert r_student.status_code == status.HTTP_200_OK

    r_student_retrieve = st_client.get(f"/api/tracks/{str(getattr(foreign_track, 'public_id', None) or foreign_track.id)}/")
    assert r_student_retrieve.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_teacher_can_patch_foreign_track_only_visible_groups(teacher_client, test_teacher):
    from apps.groups.documents import Group
    from apps.users.documents import User, UserRole
    from apps.tracks.documents import Track

    g1 = Group(title="TG1", order=1).save()
    g2 = Group(title="TG2", order=2).save()
    test_teacher.group_ids = [str(g1.id)]
    test_teacher.save()

    teacher_b = User(
        username=f"teacher_patch_b_{uuid4().hex[:8]}",
        first_name="B",
        last_name="Teach",
        role=UserRole.TEACHER.value,
        group_ids=[str(g2.id)],
    )
    teacher_b.set_password("x")
    teacher_b.save()
    foreign_track = Track(
        title="Foreign patch track",
        description="desc",
        order=3,
        lessons=[],
        visible_group_ids=[str(g2.id)],
        created_by_id=str(teacher_b.id),
    ).save()
    tid = str(getattr(foreign_track, "public_id", None) or foreign_track.id)

    r_forbidden = teacher_client.patch(f"/api/tracks/{tid}/", {"title": "Hacked"}, format="json")
    assert r_forbidden.status_code == status.HTTP_403_FORBIDDEN

    r_allowed = teacher_client.patch(f"/api/tracks/{tid}/", {"visible_group_ids": [str(g1.id)]}, format="json")
    assert r_allowed.status_code == status.HTTP_200_OK
    assert r_allowed.json()["visible_group_ids"] == [str(g1.id)]


@pytest.mark.django_db
def test_overdue_orphan_survey_hidden_after_completion(auth_client, test_user):
    from datetime import datetime, timedelta, timezone
    from apps.surveys.documents import Survey
    from apps.submissions.documents import LessonProgress

    s = Survey(
        title="Overdue survey",
        prompt="",
        track_id="",
        visible_group_ids=[],
        available_until=datetime.now(timezone.utc) - timedelta(days=1),
    ).save()
    sid = str(getattr(s, "public_id", None) or s.id)

    # before completion: appears in overdue surveys
    r1 = auth_client.get("/api/tracks/")
    assert r1.status_code == status.HTTP_200_OK
    ids1 = [x["id"] for x in r1.json().get("orphan_overdue_surveys", [])]
    assert sid in ids1

    LessonProgress(
        user_id=str(test_user.id),
        lesson_id=sid,
        lesson_type="survey",
        status="completed",
    ).save()

    # after completion: should be hidden from overdue surveys
    r2 = auth_client.get("/api/tracks/")
    assert r2.status_code == status.HTTP_200_OK
    ids2 = [x["id"] for x in r2.json().get("orphan_overdue_surveys", [])]
    assert sid not in ids2
