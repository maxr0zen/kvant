from mongoengine import (
    Document,
    StringField,
    ListField,
    EmbeddedDocumentField,
    EmbeddedDocument,
    BooleanField,
)


class QuestionChoiceEmbed(EmbeddedDocument):
    """Вариант ответа. is_correct используется только при проверке, не отдаётся клиенту."""
    id = StringField(required=True)
    text = StringField(required=True)
    is_correct = BooleanField(default=False)


class Question(Document):
    meta = {
        "collection": "questions",
        "indexes": ["track_id", {"fields": ["public_id"], "unique": True, "sparse": True}],
    }
    title = StringField(required=True, max_length=500)
    prompt = StringField(default="")
    track_id = StringField(required=True)
    choices = ListField(EmbeddedDocumentField(QuestionChoiceEmbed), default=list)
    multiple = BooleanField(default=False)  # True — можно выбрать несколько ответов
    public_id = StringField()
    # Список id групп, которым доступен вопрос. Пустой — доступен всем.
    visible_group_ids = ListField(StringField(), default=list)
