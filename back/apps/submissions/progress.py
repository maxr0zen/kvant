"""Хелперы для сохранения прогресса по урокам."""
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
) -> None:
    """
    Сохраняет или обновляет прогресс пользователя по уроку.
    lesson_id — display id (public_id или ObjectId), как в API.
    """
    status = "completed" if passed else "started"
    lp = LessonProgress.objects(user_id=user_id, lesson_id=lesson_id).first()
    if lp:
        lp.status = status
        if lesson_title:
            lp.lesson_title = lesson_title
        if track_id:
            lp.track_id = track_id
        if track_title:
            lp.track_title = track_title
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
        ).save()

    # Начисление достижений при завершении урока (только для основных типов)
    if passed and lesson_type in ("lecture", "task", "puzzle"):
        try:
            from apps.achievements.registry import check_and_award_achievements
            check_and_award_achievements(user_id, lesson_type, passed)
        except Exception:
            pass  # не прерываем основной поток при ошибке достижений
