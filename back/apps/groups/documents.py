from mongoengine import Document, StringField, IntField


class Group(Document):
    meta = {
        "collection": "groups",
        "indexes": ["order"],
    }
    title = StringField(required=True, max_length=255)
    order = IntField(default=0)
