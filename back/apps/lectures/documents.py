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
        "indexes": ["track_id"],
    }
    title = StringField(required=True, max_length=500)
    track_id = StringField(required=True)  # Обязательное поле - каждая лекция должна быть в треке
    content = StringField(default="")  # legacy
    # blocks: list of dicts {type: "text"|"image"|"code", ...}
    blocks = ListField(DictField(), default=list)
