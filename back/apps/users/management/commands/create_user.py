from django.core.management.base import BaseCommand
from apps.users.documents import User, UserRole


class Command(BaseCommand):
    help = "Create a user (superuser, teacher or student)."

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Unique login")
        parser.add_argument("password", type=str)
        parser.add_argument("--name", type=str, default="")
        parser.add_argument("--superuser", action="store_true", help="Create as superuser")
        parser.add_argument("--teacher", action="store_true", help="Create as teacher")

    def handle(self, *args, **options):
        username = options["username"].strip()
        password = options["password"]
        name = (options["name"] or username).strip()
        if options["superuser"]:
            role = UserRole.SUPERUSER.value
        elif options["teacher"]:
            role = UserRole.TEACHER.value
        else:
            role = UserRole.STUDENT.value
        if User.objects(username=username).first():
            self.stdout.write(self.style.WARNING(f"User {username} already exists."))
            return
        user = User(username=username, name=name, role=role)
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"User created: {username} ({role})"))
