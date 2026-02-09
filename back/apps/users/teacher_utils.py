"""Утилиты для проверки доступа учителя к группам."""

from .documents import UserRole


def get_teacher_group_ids(user) -> list[str]:
    """
    Возвращает список id групп, к которым учитель имеет доступ.
    Superuser — все группы (список не ограничивается, возвращаем None как «любые»).
    Teacher — только user.group_ids.
    """
    if not user or not getattr(user, "role", None):
        return []
    if getattr(user, "role", None) == UserRole.SUPERUSER.value:
        return None  # None = все группы (без ограничений)
    if getattr(user, "role", None) == UserRole.TEACHER.value:
        ids = getattr(user, "group_ids", None) or []
        return [str(g) for g in ids]
    return []


def validate_visible_group_ids_for_teacher(user, visible_group_ids: list) -> tuple[bool, str | None]:
    """
    Проверяет, может ли учитель назначить данные группы.
    Возвращает (True, None) если OK, (False, "message") при ошибке.
    """
    if not visible_group_ids:
        return True, None
    allowed = get_teacher_group_ids(user)
    if allowed is None:
        return True, None  # superuser — любые группы
    allowed_set = set(allowed)
    for gid in visible_group_ids:
        if gid and str(gid) not in allowed_set:
            return False, f"Нет доступа к группе {gid}. Можно назначать только свои группы."
    return True, None
