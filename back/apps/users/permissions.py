from rest_framework.permissions import BasePermission
from .documents import UserRole


def _role_match(user_role, expected):
    if not user_role:
        return False
    return user_role == expected.value if hasattr(expected, "value") else user_role == expected


class IsTeacher(BasePermission):
    """Only users with role teacher."""
    message = "Только для учителей."

    def has_permission(self, request, view):
        if not request.user or not getattr(request.user, "role", None):
            return False
        return _role_match(request.user.role, UserRole.TEACHER)


class IsSuperuser(BasePermission):
    """Only users with role superuser."""
    message = "Только для суперпользователя."

    def has_permission(self, request, view):
        if not request.user or not getattr(request.user, "role", None):
            return False
        return _role_match(request.user.role, UserRole.SUPERUSER)


class IsTeacherOrSuperuser(BasePermission):
    """Teachers or superusers."""
    message = "Только для учителей или суперпользователя."

    def has_permission(self, request, view):
        if not request.user or not getattr(request.user, "role", None):
            return False
        return _role_match(request.user.role, UserRole.TEACHER) or _role_match(request.user.role, UserRole.SUPERUSER)
