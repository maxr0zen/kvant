from datetime import datetime
from mongoengine import Document, StringField, ListField, DateTimeField


class Notification(Document):
    """Уведомление для одной, нескольких или всех групп. Показывается на main над треками.
    Если задано available_until — уведомление показывается только до этого времени (UTC)."""
    meta = {
        "collection": "notifications",
        "indexes": ["created_at", "group_ids", "available_until"],
    }
    message = StringField(required=True, max_length=2000)
    # Пустой список = для всех групп. Иначе — список id групп (ObjectId как строка).
    group_ids = ListField(StringField(), default=list)
    # Уровень для отображения: info, success, warning, error
    level = StringField(default="info", choices=["info", "success", "warning", "error"])
    created_at = DateTimeField(default=datetime.utcnow)
    created_by_id = StringField(default="")
    # До какого времени (UTC) показывать. None — без ограничения.
    available_until = DateTimeField(default=None)
