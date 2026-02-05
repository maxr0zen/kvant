import enum
from datetime import datetime
from mongoengine import Document, StringField, DateTimeField, ListField

import hashlib
import secrets


class UserRole(str, enum.Enum):
    SUPERUSER = "superuser"
    TEACHER = "teacher"
    STUDENT = "student"


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    if salt is None:
        salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return h.hex(), salt


def check_password(password: str, stored_hash: str, salt: str) -> bool:
    h, _ = hash_password(password, salt)
    return h == stored_hash


class User(Document):
    meta = {
        "collection": "users",
        "indexes": ["username"],
    }
    username = StringField(required=True, unique=True, max_length=255)
    first_name = StringField(required=True, max_length=100)
    last_name = StringField(required=True, max_length=100)
    role = StringField(
        required=True,
        default=UserRole.STUDENT.value,
        choices=[UserRole.SUPERUSER.value, UserRole.TEACHER.value, UserRole.STUDENT.value],
    )
    password_hash = StringField(required=True)
    password_salt = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    # Ученик: одна группа
    group_id = StringField(default=None)
    # Учитель: список групп, в которых преподаёт
    group_ids = ListField(StringField(), default=list)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def set_password(self, raw_password: str) -> None:
        h, salt = hash_password(raw_password)
        self.password_hash = h
        self.password_salt = salt

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.password_hash, self.password_salt)

    @property
    def id_str(self) -> str:
        return str(self.id)

    @property
    def is_authenticated(self) -> bool:
        """Always return True for authenticated users"""
        return True
