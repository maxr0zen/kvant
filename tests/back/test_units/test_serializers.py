"""Unit tests: TrackSerializer lesson id normalization (public_id -> ObjectId)."""
import pytest
import sys
import os

BACK = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "back"))
if BACK not in sys.path:
    sys.path.insert(0, BACK)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")


@pytest.mark.django_db
def test_track_serializer_lesson_id_normalization(test_track, test_task):
    """TrackSerializer normalizes lesson id (public_id or ObjectId) to ObjectId in LessonRef."""
    from apps.tracks.serializers import TrackSerializer
    from apps.tracks.documents import Track, LessonRef
    # Create track with lesson ref by task ObjectId
    track = Track(
        title="ST",
        description="",
        order=0,
        lessons=[
            LessonRef(
                id=str(test_task.id),
                type="task",
                title=test_task.title,
                order=0,
            ),
        ],
        visible_group_ids=[],
    )
    track.save()
    try:
        ser = TrackSerializer(track)
        data = ser.data
        assert "lessons" in data
        assert len(data["lessons"]) == 1
        assert data["lessons"][0]["id"] == str(getattr(test_task, "public_id", None) or test_task.id)
        assert data["lessons"][0]["type"] == "task"
    finally:
        track.delete()


@pytest.mark.django_db
def test_track_serializer_create_resolves_lesson_id(test_task):
    """Create with lesson public_id or ObjectId stores ObjectId in LessonRef."""
    from apps.tracks.serializers import TrackSerializer
    from apps.tracks.documents import Track
    ser = TrackSerializer(data={
        "title": "Track with lesson",
        "description": "",
        "order": 0,
        "lessons": [
            {"id": str(test_task.id), "type": "task", "title": test_task.title, "order": 0},
        ],
        "visible_group_ids": [],
    })
    assert ser.is_valid(), ser.errors
    track = ser.save()
    try:
        assert len(track.lessons) == 1
        assert track.lessons[0].id == str(test_task.id)
        assert track.lessons[0].type == "task"
    finally:
        track.delete()
