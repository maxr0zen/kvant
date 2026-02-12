"""
Реестр достижений. Каждое достижение имеет:
- id: уникальный идентификатор
- title: название
- description: описание
- icon: иконка (emoji или имя)
- condition: функция проверки (user_id) -> bool
"""


ACHIEVEMENTS = {
    "first_lecture": {
        "id": "first_lecture",
        "title": "Первая лекция",
        "description": "Завершить первую лекцию",
        "icon": "📖",
    },
    "first_task": {
        "id": "first_task",
        "title": "Первая задача",
        "description": "Решить первую задачу",
        "icon": "✅",
    },
    "first_puzzle": {
        "id": "first_puzzle",
        "title": "Первый пазл",
        "description": "Собрать первый пазл",
        "icon": "🧩",
    },
    "lectures_5": {
        "id": "lectures_5",
        "title": "Усердный читатель",
        "description": "Завершить 5 лекций",
        "icon": "📚",
    },
    "tasks_3": {
        "id": "tasks_3",
        "title": "Начинающий кодер",
        "description": "Решить 3 задачи",
        "icon": "💻",
    },
    "puzzles_3": {
        "id": "puzzles_3",
        "title": "Собиратель пазлов",
        "description": "Собрать 3 пазла",
        "icon": "🎯",
    },
    "lectures_with_questions_3": {
        "id": "lectures_with_questions_3",
        "title": "Внимательный ученик",
        "description": "Завершить 3 лекции с вопросами",
        "icon": "🎓",
    },
}


def _count_completed_by_type(user_id: str) -> dict:
    """Подсчёт завершённых уроков по типам."""
    from apps.submissions.documents import LessonProgress

    completed = {"lecture": 0, "task": 0, "puzzle": 0, "question": 0}
    for lp in LessonProgress.objects(user_id=user_id, status="completed"):
        completed[lp.lesson_type] = completed.get(lp.lesson_type, 0) + 1
    return completed


def _count_lectures_with_questions_completed(user_id: str) -> int:
    """Количество завершённых лекций с question-блоками (по lecture_id::block_id = completed)."""
    from apps.submissions.documents import LessonProgress

    # lesson_id вида "lecture_id::block_id" — это блок вопроса
    # Нужно посчитать уникальные lecture_id, у которых все блоки completed
    from apps.tracks.documents import Track
    from apps.tracks.serializers import _get_lesson_display_id, get_lesson_status_for_user

    count = 0
    for track in Track.objects.all():
        for lesson in track.lessons:
            if lesson.type != "lecture":
                continue
            display_id = _get_lesson_display_id(lesson)
            status, _ = get_lesson_status_for_user(user_id, lesson, display_id)
            if status in ("completed", "completed_late"):
                # Проверяем, есть ли в лекции question-блоки
                from apps.tracks.serializers import _get_lecture_for_lesson
                lecture = _get_lecture_for_lesson(lesson)
                blocks = getattr(lecture, "blocks", None) or []
                q_count = sum(1 for b in blocks if isinstance(b, dict) and b.get("type") == "question" and b.get("id"))
                if q_count > 0:
                    count += 1
    return count


def check_and_award_achievements(user_id: str, lesson_type: str, passed: bool) -> list:
    """
    Проверяет и начисляет достижения после завершения урока.
    Возвращает список ID новых разблокированных достижений.
    """
    if not passed:
        return []

    from .documents import UserAchievement

    unlocked = []
    completed = _count_completed_by_type(user_id)
    lectures_with_q = _count_lectures_with_questions_completed(user_id)

    def already_has(aid):
        return UserAchievement.objects(user_id=user_id, achievement_id=aid).first() is not None

    def award(aid):
        if not already_has(aid):
            UserAchievement(user_id=user_id, achievement_id=aid).save()
            unlocked.append(aid)

    # Первая лекция
    if lesson_type == "lecture" and completed.get("lecture", 0) >= 1:
        award("first_lecture")

    # Первая задача
    if lesson_type == "task" and completed.get("task", 0) >= 1:
        award("first_task")

    # Первый пазл
    if lesson_type == "puzzle" and completed.get("puzzle", 0) >= 1:
        award("first_puzzle")

    # 5 лекций
    if completed.get("lecture", 0) >= 5:
        award("lectures_5")

    # 3 задачи
    if completed.get("task", 0) >= 3:
        award("tasks_3")

    # 3 пазла
    if completed.get("puzzle", 0) >= 3:
        award("puzzles_3")

    # 3 лекции с вопросами
    if lectures_with_q >= 3:
        award("lectures_with_questions_3")

    return unlocked
