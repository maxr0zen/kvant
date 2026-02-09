from rest_framework import status
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import RetrieveModelMixin, CreateModelMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from common.db_utils import get_doc_by_pk
from .documents import Task, TestCaseEmbed
from .serializers import TaskSerializer, RunCodeSerializer
from .runner import run_tests
from apps.users.permissions import IsTeacher
from apps.users.teacher_utils import validate_visible_group_ids_for_teacher
from apps.submissions.documents import Submission, TaskDraft
from apps.submissions.progress import save_lesson_progress


class TaskViewSet(GenericViewSet, RetrieveModelMixin, CreateModelMixin):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "pk"

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsTeacher()]
        if self.action in ["retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs["pk"]
        return get_doc_by_pk(Task, pk)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Task.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = self.get_serializer(instance)
        return Response(ser.data)

    def create(self, request, *args, **kwargs):
        visible_group_ids = request.data.get("visible_group_ids") or []
        ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
        if not ok:
            return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        task = ser.save()
        return Response(self.get_serializer(task).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def run(self, request, pk=None):
        """Run code against test cases."""
        ser = RunCodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            task = self.get_object()
        except Task.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        code = ser.validated_data["code"]
        results = run_tests(task, code)
        return Response({"results": results})

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit solution, run tests, save submission."""
        ser = RunCodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            task = self.get_object()
        except Task.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        code = ser.validated_data["code"]
        user_id = str(request.user.id)
        results = run_tests(task, code)
        passed = all(r.get("passed", False) for r in results)
        Submission(
            task_id=str(task.id),
            user_id=user_id,
            code=code,
            passed=passed,
            results=results,
        ).save()
        lesson_id = str(getattr(task, "public_id", None) or task.id)
        track_title = ""
        if task.track_id:
            try:
                from bson import ObjectId
                from apps.tracks.documents import Track
                t = Track.objects(id=ObjectId(task.track_id)).first()
                if t:
                    track_title = t.title
            except Exception:
                pass
        save_lesson_progress(
            user_id, lesson_id, "task", passed,
            lesson_title=task.title, track_id=task.track_id or "", track_title=track_title,
        )
        message = "Все тесты пройдены." if passed else "Часть тестов не пройдена."
        return Response({
            "passed": passed,
            "results": results,
            "message": message,
        })

    @action(detail=True, methods=["get", "put", "patch"], url_path="draft")
    def draft(self, request, pk=None):
        """GET: черновик или код последней попытки. PUT: сохранить черновик."""
        try:
            task = self.get_object()
        except Task.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not request.user or not getattr(request.user, "id", None):
            if request.method == "GET":
                return Response({"code": None})
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        user_id = str(request.user.id)
        task_id = str(task.id)
        if request.method == "GET":
            draft = TaskDraft.objects(user_id=user_id, task_id=task_id).first()
            if draft:
                return Response({"code": draft.code})
            last = (
                Submission.objects(user_id=user_id, task_id=task_id)
                .order_by("-created_at")
                .first()
            )
            if last:
                return Response({"code": last.code})
            return Response({"code": None})
        ser = RunCodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        code = ser.validated_data["code"]
        from datetime import datetime
        draft = TaskDraft.objects(user_id=user_id, task_id=task_id).first()
        if draft:
            draft.code = code
            draft.updated_at = datetime.utcnow()
            draft.save()
        else:
            TaskDraft(user_id=user_id, task_id=task_id, code=code).save()
        return Response({"status": "ok"})


