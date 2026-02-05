from bson import ObjectId
from rest_framework import status
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import RetrieveModelMixin, CreateModelMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .documents import Task, TestCaseEmbed
from .serializers import TaskSerializer, RunCodeSerializer
from apps.users.permissions import IsTeacher
from apps.submissions.documents import Submission


class TaskViewSet(GenericViewSet, RetrieveModelMixin, CreateModelMixin):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "pk"

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsTeacher()]
        # Allow anonymous retrieve so task pages can be rendered publicly (listening by client/server)
        if self.action in ["retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs["pk"]
        # Try ObjectId first, then fallback to public_id
        try:
            return Task.objects.get(id=ObjectId(pk))
        except Exception:
            try:
                return Task.objects.get(public_id=pk)
            except Exception:
                raise

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Task.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = self.get_serializer(instance)
        return Response(ser.data)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        task = ser.save()
        return Response(self.get_serializer(task).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def run(self, request, pk=None):
        """Run code against test cases (stub: no real execution)."""
        ser = RunCodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            task = self.get_object()
        except Task.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        code = ser.validated_data["code"]
        results = _run_tests_stub(task, code)
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
        results = _run_tests_stub(task, code)
        passed = all(r.get("passed", False) for r in results)
        Submission(
            task_id=str(task.id),
            user_id=user_id,
            code=code,
            passed=passed,
            results=results,
        ).save()
        message = "Все тесты пройдены." if passed else "Часть тестов не пройдена."
        return Response({
            "passed": passed,
            "results": results,
            "message": message,
        })


def _run_tests_stub(task: Task, code: str) -> list[dict]:
    """Stub: no real code execution; return placeholder results."""
    out = []
    for tc in task.test_cases:
        out.append({
            "caseId": tc.id,
            "passed": True,
            "actualOutput": tc.expected_output,
        })
    return out
