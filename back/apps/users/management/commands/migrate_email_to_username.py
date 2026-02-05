"""
Однократная миграция: для всех пользователей с полем email
устанавливает username = email и удаляет поле email.
Перед обновлением удаляет уникальный индекс по email.
Запуск: python manage.py migrate_email_to_username
"""
from django.core.management.base import BaseCommand
from mongoengine import get_db


class Command(BaseCommand):
    help = "Copy email to username and remove email from users collection (one-time migration)."

    def handle(self, *args, **options):
        db = get_db()
        coll = db["users"]
        # Удаляем старый уникальный индекс по email, иначе $unset email даст дубликаты null
        try:
            coll.drop_index("email_1")
            self.stdout.write("Dropped index email_1.")
        except Exception:
            pass
        result = coll.update_many(
            {"email": {"$exists": True}},
            [{"$set": {"username": "$email"}}, {"$unset": "email"}],
        )
        # Уникальный индекс по username создаётся через meta.indexes в документе User
        self.stdout.write(
            self.style.SUCCESS(f"Updated {result.modified_count} user(s): email -> username.")
        )
