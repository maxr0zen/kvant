from datetime import datetime
from mongoengine import Document, StringField, ListField, DateTimeField, DictField, BooleanField


class Submission(Document):
    meta = {
        "collection": "submissions",
        "indexes": ["task_id", "user_id", "created_at"],
    }
    task_id = StringField(required=True)
    user_id = StringField(required=True)
    code = StringField(required=True)
    passed = BooleanField(required=True)
    results = ListField(DictField(), default=list)  # [{case_id, passed, actual_output?, error?}]
    created_at = DateTimeField(default=datetime.utcnow)


class TaskDraft(Document):
    """Черновик кода ученика по задаче (сохраняется при редактировании)."""
    meta = {
        "collection": "task_drafts",
        "indexes": [
            {"fields": ["user_id", "task_id"], "unique": True},
            "user_id",
            "task_id",
        ],
    }
    user_id = StringField(required=True)
    task_id = StringField(required=True)
    code = StringField(required=True)
    updated_at = DateTimeField(default=datetime.utcnow)


class LessonProgress(Document):
    """Прогресс пользователя по уроку (lecture, task, puzzle, question)."""
    meta = {
        "collection": "lesson_progress",
        "indexes": [
            {"fields": ["user_id", "lesson_id"], "unique": True},
            "user_id",
            "lesson_id",
            "updated_at",
        ],
    }
    user_id = StringField(required=True)
    lesson_id = StringField(required=True)  # id урока (ObjectId или public_id)
    lesson_type = StringField(required=True, choices=["lecture", "task", "puzzle", "question"])
    lesson_title = StringField(default="")  # для отображения в активности
    track_id = StringField(default="")  # для отображения в активности
    track_title = StringField(default="")  # для отображения в активности
    status = StringField(required=True, choices=["completed", "started"])
    updated_at = DateTimeField(default=datetime.utcnow)
