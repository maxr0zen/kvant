"""Unit tests: submissions.progress.save_lesson_progress."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest


@pytest.mark.django_db
def test_save_lesson_progress_does_not_downgrade_completed_to_started():
    from apps.submissions.documents import LessonProgress
    from apps.submissions.progress import save_lesson_progress

    user_id = "u1"
    lesson_id = "l1"

    save_lesson_progress(user_id, lesson_id, "lecture", True, lesson_title="T1")
    lp = LessonProgress.objects.get(user_id=user_id, lesson_id=lesson_id)
    assert lp.status == "completed"

    save_lesson_progress(user_id, lesson_id, "lecture", False, lesson_title="T2", track_id="trk", track_title="Track")
    lp2 = LessonProgress.objects.get(user_id=user_id, lesson_id=lesson_id)
    assert lp2.status == "completed"
    assert lp2.lesson_title == "T2"
    assert lp2.track_id == "trk"
    assert lp2.track_title == "Track"


@pytest.mark.django_db
def test_save_lesson_progress_marks_completed_late(monkeypatch):
    from apps.submissions.documents import LessonProgress
    import apps.submissions.progress as progress

    fixed_now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    class _FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed_now if tz is not None else fixed_now.replace(tzinfo=None)

    monkeypatch.setattr(progress, "datetime", _FixedDateTime)

    user_id = "u2"
    lesson_id = "l2"
    available_until = fixed_now - timedelta(seconds=5)
    progress.save_lesson_progress(user_id, lesson_id, "task", True, available_until=available_until)

    lp = LessonProgress.objects.get(user_id=user_id, lesson_id=lesson_id)
    assert lp.status == "completed"
    assert lp.completed_late is True
    assert lp.late_by_seconds >= 5

