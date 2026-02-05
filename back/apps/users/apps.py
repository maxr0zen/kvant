from django.apps import AppConfig
from django.conf import settings


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    label = "users"
    verbose_name = "Users"

    def ready(self):
        import mongoengine
        mongoengine.connect(
            db=settings.MONGODB_NAME,
            host=settings.MONGODB_HOST,
            alias="default",
        )
