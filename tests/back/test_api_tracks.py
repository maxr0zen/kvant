"""API tests: tracks (list, retrieve, create, update, orphan_*, lesson id normalization)."""
import pytest
from rest_framework import status


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
