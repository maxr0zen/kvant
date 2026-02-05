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
        "indexes": ["track_id"],
    }
    title = StringField(required=True, max_length=500)
    description = StringField(default="")
    starter_code = StringField(default="")
    track_id = StringField(required=True)  # Обязательное поле - каждая задача должна быть в треке
    test_cases = ListField(EmbeddedDocumentField(TestCaseEmbed), default=list)
