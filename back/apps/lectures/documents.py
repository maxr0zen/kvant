from mongoengine import Document, StringField, ListField, EmbeddedDocumentField, EmbeddedDocument, DictField


class BlockText(EmbeddedDocument):
    type = StringField(required=True, default="text")
    content = StringField(required=True)


class BlockImage(EmbeddedDocument):
    type = StringField(required=True, default="image")
    url = StringField(required=True)
    alt = StringField(default="")


class BlockCode(EmbeddedDocument):
    type = StringField(required=True, default="code")
    explanation = StringField(default="")
    code = StringField(required=True)
    language = StringField(default="python")


class Lecture(Document):
    meta = {
        "collection": "lectures",
        "indexes": [
            "track_id",
            {"fields": ["public_id"], "unique": True, "sparse": True},
        ],
    }
    title = StringField(required=True, max_length=500)
    track_id = StringField(required=True)
    content = StringField(default="")  # legacy
    blocks = ListField(DictField(), default=list)  # text, image, code, question
    public_id = StringField()  # Человекочитаемый id для URL (12 hex символов)
    # Список id групп, которым доступна лекция. Пустой — доступна всем.
    visible_group_ids = ListField(StringField(), default=list)
    # ID пользователя (учителя), создавшего лекцию. Пустой — старые лекции без автора.
    created_by_id = StringField(default="")
