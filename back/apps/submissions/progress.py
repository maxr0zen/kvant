"""Хелперы для сохранения прогресса по урокам."""
from datetime import datetime, timezone

from apps.submissions.documents import LessonProgress


def save_lesson_progress(
    user_id: str,
    lesson_id: str,
    lesson_type: str,
    passed: bool,
    *,
    lesson_title: str = "",
    track_id: str = "",
    track_title: str = "",
    available_until=None,
) -> None:
    """
    Сохраняет или обновляет прогресс пользователя по уроку.
    lesson_id — display id (public_id или ObjectId), как в API.
    available_until — datetime или None; при passed=True и now > available_until сохраняет completed_late.
    """
    status = "completed" if passed else "started"
    completed_late = False
    late_by_seconds = 0
    if passed and available_until is not None:
        now = datetime.now(timezone.utc)
        au = available_until
        if au.tzinfo is None:
            au = au.replace(tzinfo=timezone.utc)
        else:
            au = au.astimezone(timezone.utc)
        if now > au:
            completed_late = True
            late_by_seconds = max(0, int((now - au).total_seconds()))

    lp = LessonProgress.objects(user_id=user_id, lesson_id=lesson_id).first()
    if lp:
        lp.status = status
        if lesson_title:
            lp.lesson_title = lesson_title
        if track_id:
            lp.track_id = track_id
        if track_title:
            lp.track_title = track_title
        if passed:
            lp.completed_late = completed_late
            lp.late_by_seconds = late_by_seconds
        lp.save()
    else:
        LessonProgress(
            user_id=user_id,
            lesson_id=lesson_id,
            lesson_type=lesson_type,
            lesson_title=lesson_title,
            track_id=track_id,
            track_title=track_title,
            status=status,
            completed_late=completed_late,
            late_by_seconds=late_by_seconds,
        ).save()

    # Начисление достижений при завершении урока (только для основных типов)
    if passed and lesson_type in ("lecture", "task", "puzzle", "survey"):
        try:
            from apps.achievements.registry import check_and_award_achievements
            check_and_award_achievements(user_id, lesson_type, passed)
        except Exception:
            pass  # не прерываем основной поток при ошибке достижений
