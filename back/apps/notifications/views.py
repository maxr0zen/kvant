from datetime import datetime, timezone

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .documents import Notification
from .serializers import NotificationSerializer
from apps.users.permissions import IsTeacherOrSuperuser
from apps.users.teacher_utils import get_teacher_group_ids


def _get_user_group_ids(user):
    """Группы пользователя: у студента одна (group_id), у учителя — group_ids."""
    if not user or not getattr(user, "id", None):
        return []
    ids = []
    if getattr(user, "group_id", None):
        ids.append(str(user.group_id))
    if getattr(user, "group_ids", None):
        ids.extend([str(g) for g in user.group_ids])
    return ids


class NotificationListCreateView(APIView):
    """
    GET: список уведомлений, видимых текущему пользователю (по его группе/группам).
    POST: создание уведомления (только учитель/админ). group_ids пустой = для всех групп.
    """
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]  # даже аноним может видеть (пустой список)
        return [IsAuthenticated(), IsTeacherOrSuperuser()]

    def get(self, request):
        user = getattr(request, "user", None)
        user_group_ids = _get_user_group_ids(user) if user else []
        # Для неавторизованного показываем только уведомления "для всех" (group_ids пустой)
        qs = Notification.objects.all().order_by("-created_at")
        if not user_group_ids:
            qs = qs.filter(group_ids=[])
        else:
            # Показать: либо group_ids пустой (всем), либо пересечение с группами пользователя
            from mongoengine.queryset.visitor import Q
            qs = qs.filter(Q(group_ids=[]) | Q(group_ids__in=user_group_ids))
        now_utc = datetime.now(timezone.utc)
        # Исключить истёкшие: available_until в прошлом
        notifications = []
        for n in qs[:50]:  # чуть больше для фильтрации
            au = getattr(n, "available_until", None)
            if au is not None:
                au_utc = au.replace(tzinfo=timezone.utc) if getattr(au, "tzinfo", None) is None else au.astimezone(timezone.utc)
                if au_utc < now_utc:
                    continue
            notifications.append(n)
            if len(notifications) >= 20:
                break
        return Response(NotificationSerializer(notifications, many=True).data)

    def post(self, request):
        ser = NotificationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        group_ids = ser.validated_data.get("group_ids") or []
        teacher_group_ids = get_teacher_group_ids(request.user)
        if teacher_group_ids is not None:
            allowed = set(teacher_group_ids)
            for gid in group_ids:
                if gid and str(gid) not in allowed:
                    return Response(
                        {"detail": "Нет доступа к одной из выбранных групп."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
        notification = ser.save()
        return Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED)
