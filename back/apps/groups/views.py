from bson import ObjectId
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .documents import Group
from .serializers import GroupSerializer
from apps.users.permissions import IsSuperuser


class GroupListCreateView(APIView):
    """Список групп и создание (только superuser)."""
    permission_classes = [IsSuperuser]

    def get(self, request):
        groups = Group.objects.all().order_by("order", "title")
        return Response(GroupSerializer(groups, many=True).data)

    def post(self, request):
        ser = GroupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        group = ser.save()
        return Response(GroupSerializer(group).data, status=status.HTTP_201_CREATED)


class GroupDetailView(APIView):
    """Просмотр, изменение, удаление группы (только superuser)."""
    permission_classes = [IsSuperuser]

    def get_object(self, pk):
        return Group.objects.get(id=ObjectId(pk))

    def get(self, request, pk):
        try:
            group = self.get_object(pk)
        except (Group.DoesNotExist, Exception):
            return Response({"detail": "Группа не найдена."}, status=status.HTTP_404_NOT_FOUND)
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
