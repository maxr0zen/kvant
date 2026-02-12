from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .documents import Notification
from .serializers import NotificationSerializer
from apps.users.permissions import IsTeacherOrSuperuser
from apps.users.teacher_utils import get_teacher_group_ids


class NotificationDetailView(APIView):
    """
    GET: получить одно уведомление.
    PATCH: отредактировать (только учитель/админ, в пределах своих групп).
    DELETE: удалить (только учитель/админ, в пределах своих групп).
    """

    permission_classes = [IsAuthenticated, IsTeacherOrSuperuser]

    def get_object(self, pk):
        try:
            return Notification.objects.get(id=pk)
        except Notification.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(NotificationSerializer(obj).data)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = NotificationSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        # Проверка групп, если учитель (не superuser)
        group_ids = ser.validated_data.get("group_ids")
        if group_ids is not None:
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
        return Response(NotificationSerializer(notification).data)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        # Учитель может удалять только уведомления в своих группах (если не superuser)
        teacher_group_ids = get_teacher_group_ids(request.user)
        if teacher_group_ids is not None:
            allowed = set(teacher_group_ids)
            for gid in (obj.group_ids or []):
                if gid and str(gid) not in allowed:
                    return Response(
                        {"detail": "Нет доступа к этой группе уведомления."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

