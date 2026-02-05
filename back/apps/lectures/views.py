from bson import ObjectId
from rest_framework import status
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import RetrieveModelMixin, CreateModelMixin
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .documents import Lecture
from .serializers import LectureSerializer
from apps.users.permissions import IsTeacher


class LectureViewSet(GenericViewSet, RetrieveModelMixin, CreateModelMixin):
    serializer_class = LectureSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "pk"
    lookup_field = "id"

    def get_permissions(self):
        # Allow anonymous retrieve so lecture pages can be rendered publically
        if self.action == "create":
            return [IsAuthenticated(), IsTeacher()]
        if self.action in ["retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs["pk"]
        # Try ObjectId first, then fallback to public_id
        try:
            return Lecture.objects.get(id=ObjectId(pk))
        except Exception:
            try:
                return Lecture.objects.get(public_id=pk)
            except Exception:
                raise

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Lecture.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = self.get_serializer(instance)
        return Response(ser.data)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        lecture = ser.save()
        return Response(self.get_serializer(lecture).data, status=status.HTTP_201_CREATED)
