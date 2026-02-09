from bson import ObjectId
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .documents import Group
from .serializers import GroupSerializer
from apps.users.permissions import IsSuperuser, IsTeacherOrSuperuser
from apps.users.teacher_utils import get_teacher_group_ids


class GroupListCreateView(APIView):
    """Список групп — учителя видят только свои группы. Создание — только superuser."""
    permission_classes = [IsTeacherOrSuperuser]

    def get_permissions(self):
        if self.request.method != "GET":
            return [IsSuperuser()]
        return [IsTeacherOrSuperuser()]

    def get(self, request):
        groups_qs = Group.objects.all().order_by("order", "title")
        teacher_group_ids = get_teacher_group_ids(request.user)
        if teacher_group_ids is not None:
            # Учитель — только свои группы
            group_object_ids = [ObjectId(g) for g in teacher_group_ids if g and ObjectId.is_valid(g)]
            if group_object_ids:
                groups_qs = groups_qs.filter(id__in=group_object_ids)
            else:
                groups_qs = groups_qs.none()
        return Response(GroupSerializer(groups_qs, many=True).data)

    def post(self, request):
        ser = GroupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        group = ser.save()
        return Response(GroupSerializer(group).data, status=status.HTTP_201_CREATED)


class GroupDetailView(APIView):
    """Просмотр — учителя только свои группы. Изменение и удаление — только superuser."""
    permission_classes = [IsTeacherOrSuperuser]

    def get_permissions(self):
        if self.request.method not in ("GET", "HEAD", "OPTIONS"):
            return [IsSuperuser()]
        return [IsTeacherOrSuperuser()]

    def get_object(self, pk):
        return Group.objects.get(id=ObjectId(pk))

    def get(self, request, pk):
        try:
            group = self.get_object(pk)
        except (Group.DoesNotExist, Exception):
            return Response({"detail": "Группа не найдена."}, status=status.HTTP_404_NOT_FOUND)
        teacher_group_ids = get_teacher_group_ids(request.user)
        if teacher_group_ids is not None and str(group.id) not in teacher_group_ids:
            return Response({"detail": "Нет доступа к этой группе."}, status=status.HTTP_403_FORBIDDEN)
        return Response(GroupSerializer(group).data)

    def patch(self, request, pk):
        try:
            group = self.get_object(pk)
        except (Group.DoesNotExist, Exception):
            return Response({"detail": "Группа не найдена."}, status=status.HTTP_404_NOT_FOUND)
        ser = GroupSerializer(group, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        try:
            group = self.get_object(pk)
        except (Group.DoesNotExist, Exception):
            return Response({"detail": "Группа не найдена."}, status=status.HTTP_404_NOT_FOUND)
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
