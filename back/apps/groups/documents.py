from mongoengine import Document, StringField, IntField, ListField, DictField


class Group(Document):
    meta = {
        "collection": "groups",
        "indexes": ["order"],
    }
    title = StringField(required=True, max_length=255)
    order = IntField(default=0)
    child_chat_url = StringField(default="")  # Ссылка для QR «Детский чат»
    parent_chat_url = StringField(default="")  # Ссылка для QR «Родительский чат»
    links = ListField(DictField(), default=list)  # [{label, url}, ...] — доп. ссылки для QR
