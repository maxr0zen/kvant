from mongoengine import (
    Document,
    StringField,
    ListField,
    EmbeddedDocumentField,
    EmbeddedDocument,
    BooleanField,
)


class TestCaseEmbed(EmbeddedDocument):
    id = StringField(required=True)
    input = StringField(default="")
    expected_output = StringField(required=True)
    is_public = BooleanField(default=True)


class Task(Document):
    meta = {
        "collection": "tasks",
        "indexes": ["track_id", {"fields": ["public_id"], "unique": True, "sparse": True}],
    }
    title = StringField(required=True, max_length=500)
    description = StringField(default="")
    starter_code = StringField(default="")
    track_id = StringField(required=True)
    test_cases = ListField(EmbeddedDocumentField(TestCaseEmbed), default=list)
    public_id = StringField()  # Человекочитаемый id для URL (12 hex символов)
    hard = BooleanField(default=False)  # Повышенная сложность (со звёздочкой)
    # Список id групп, которым доступна задача. Пустой — доступна всем.
    visible_group_ids = ListField(StringField(), default=list)
