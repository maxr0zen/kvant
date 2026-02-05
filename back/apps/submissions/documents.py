from datetime import datetime
from mongoengine import Document, StringField, ListField, DateTimeField, DictField, BooleanField


class Submission(Document):
    meta = {
        "collection": "submissions",
        "indexes": ["task_id", "user_id", "created_at"],
    }
    task_id = StringField(required=True)
    user_id = StringField(required=True)
    code = StringField(required=True)
    passed = BooleanField(required=True)
    results = ListField(DictField(), default=list)  # [{case_id, passed, actual_output?, error?}]
    created_at = DateTimeField(default=datetime.utcnow)
