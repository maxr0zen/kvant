from datetime import datetime
from mongoengine import Document, StringField, DateTimeField, ListField


class Survey(Document):
    """Опрос: свободная форма ответа. Ответ виден преподавателю/админу в детализации и на странице опроса."""
    meta = {
        "collection": "surveys",
        "indexes": ["track_id", {"fields": ["public_id"], "unique": True, "sparse": True}],
    }
    title = StringField(required=True, max_length=500)
    prompt = StringField(default="")  # описание / вопрос
    track_id = StringField(required=True)
    public_id = StringField()
    visible_group_ids = ListField(StringField(), default=list)
    available_from = DateTimeField(default=None)
    available_until = DateTimeField(default=None)
    created_by_id = StringField(default="")


class SurveyResponse(Document):
    """Ответ пользователя на опрос (свободный текст)."""
    meta = {
        "collection": "survey_responses",
        "indexes": [
            {"fields": ["survey_id", "user_id"], "unique": True},
            "survey_id",
            "user_id",
        ],
    }
    survey_id = StringField(required=True)
    user_id = StringField(required=True)
    answer = StringField(required=True, default="")  # свободная форма
    created_at = DateTimeField(default=datetime.utcnow)
