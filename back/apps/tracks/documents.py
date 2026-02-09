from mongoengine import Document, StringField, IntField, ListField, EmbeddedDocumentField, EmbeddedDocument


class LessonRef(EmbeddedDocument):
    id = StringField(required=True)
    type = StringField(required=True, choices=["lecture", "task", "puzzle", "question"])
    title = StringField(required=True)
    order = IntField(required=True, default=0)


class Track(Document):
    meta = {
        "collection": "tracks",
        "indexes": ["order", {"fields": ["public_id"], "unique": True, "sparse": True}],
    }
    title = StringField(required=True, max_length=500)
    description = StringField(default="")
    order = IntField(default=0)
    lessons = ListField(EmbeddedDocumentField(LessonRef), default=list)
    # A human-friendly/public identifier (e.g. slug or short id). Will be filled for existing docs by a script.
    # Index uniqueness is handled in `meta` with a sparse unique index; field level `unique=True`
    # would create a non-sparse index and cause duplicate-null errors during rollout.
    public_id = StringField()
    # List of group ids (strings) that may see this track. Empty list = visible to all.
    visible_group_ids = ListField(StringField(), default=list)
