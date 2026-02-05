from mongoengine import (
    Document,
    StringField,
    ListField,
    EmbeddedDocumentField,
    EmbeddedDocument,
    BooleanField,
)


class CodeBlockEmbed(EmbeddedDocument):
    id = StringField(required=True)
    code = StringField(required=True)
    order = StringField(required=True)  # правильный порядок
    indent = StringField(default="")  # отступы для правильного форматирования


class Puzzle(Document):
    meta = {
        "collection": "puzzles",
        "indexes": ["track_id"],
    }
    title = StringField(required=True, max_length=500)
    description = StringField(default="")
    track_id = StringField(required=True)  # Обязательное поле - каждый puzzle должен быть в треке
    language = StringField(default="python")  # язык программирования
    blocks = ListField(EmbeddedDocumentField(CodeBlockEmbed), default=list)
    solution = StringField(default="")  # полный правильный код для проверки
