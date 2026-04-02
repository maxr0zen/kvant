"""Хелперы для сохранения прогресса по урокам."""
from datetime import datetime, timezone

from apps.submissions.documents import LessonProgress
from common.db_utils import get_doc_by_pk


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
) -> list:
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
        # Не перезаписывать "completed" на "started" (например при повторном открытии лекции)
        if lp.status == "completed" and status == "started":
            if lesson_title:
                lp.lesson_title = lesson_title
            if track_id:
                lp.track_id = track_id
            if track_title:
                lp.track_title = track_title
            lp.save()
            return
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
    unlocked_ids = []
    if passed and lesson_type in ("lecture", "task", "puzzle", "question", "survey", "layout"):
        try:
            from apps.achievements.registry import (
                check_and_award_achievements,
                award_specific_achievements,
                serialize_achievements,
            )

            unlocked_ids.extend(check_and_award_achievements(user_id, lesson_type, passed))

            # Кастомные достижения с конкретного задания
            model_by_type = {
                "lecture": ("apps.lectures.documents", "Lecture"),
                "task": ("apps.tasks.documents", "Task"),
                "puzzle": ("apps.puzzles.documents", "Puzzle"),
                "question": ("apps.questions.documents", "Question"),
                "survey": ("apps.surveys.documents", "Survey"),
                "layout": ("apps.layouts.documents", "LayoutLesson"),
            }
            mod_name, cls_name = model_by_type.get(lesson_type, (None, None))
            if mod_name and cls_name:
                module = __import__(mod_name, fromlist=[cls_name])
                model_cls = getattr(module, cls_name)
                doc = get_doc_by_pk(model_cls, str(lesson_id))
                reward_ids = getattr(doc, "reward_achievement_ids", None) or []
                unlocked_ids.extend(award_specific_achievements(user_id, reward_ids))

            # Убираем дубликаты с сохранением порядка.
            unique_ids = []
            seen = set()
            for aid in unlocked_ids:
                if aid in seen:
                    continue
                seen.add(aid)
                unique_ids.append(aid)
            return serialize_achievements(unique_ids)
        except Exception:
            return []  # не прерываем основной поток при ошибке достижений
    return []
