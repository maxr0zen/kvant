from datetime import datetime
from mongoengine import Document, StringField, DateTimeField


class UserAchievement(Document):
    """Достижение, полученное пользователем."""
    meta = {
        "collection": "user_achievements",
        "indexes": [
            {"fields": ["user_id", "achievement_id"], "unique": True},
            "user_id",
            "achievement_id",
        ],
    }
    user_id = StringField(required=True)
    achievement_id = StringField(required=True)
    unlocked_at = DateTimeField(default=datetime.utcnow)
