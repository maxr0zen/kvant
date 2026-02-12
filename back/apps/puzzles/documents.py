from mongoengine import (
    Document,
    StringField,
    ListField,
    EmbeddedDocumentField,
    EmbeddedDocument,
    BooleanField,
    DateTimeField,
    IntField,
)


class CodeBlockEmbed(EmbeddedDocument):
    id = StringField(required=True)
    code = StringField(required=True)
    order = StringField(required=True)  # правильный порядок
    indent = StringField(default="")  # отступы для правильного форматирования


class Puzzle(Document):
    meta = {
        "collection": "puzzles",
        "indexes": ["track_id", {"fields": ["public_id"], "unique": True, "sparse": True}],
    }
    title = StringField(required=True, max_length=500)
    description = StringField(default="")
    track_id = StringField(required=True)
    language = StringField(default="python")
    blocks = ListField(EmbeddedDocumentField(CodeBlockEmbed), default=list)
    solution = StringField(default="")
    public_id = StringField()  # Человекочитаемый id для URL (12 hex символов)
    # Список id групп, которым доступен puzzle. Пустой — доступен всем.
    visible_group_ids = ListField(StringField(), default=list)
    hints = ListField(StringField(), default=list)
    available_from = DateTimeField(default=None)
    available_until = DateTimeField(default=None)
    max_attempts = IntField(default=None)
    created_by_id = StringField(default="")
