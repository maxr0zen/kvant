from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from common.db_utils import get_doc_by_pk
from .documents import Question
from .serializers import QuestionSerializer
from apps.submissions.progress import save_lesson_progress
from apps.submissions.documents import AssignmentAttempt
from apps.users.permissions import IsTeacher
from apps.users.teacher_utils import validate_visible_group_ids_for_teacher


def _can_edit_question(request, question):
    if not request.user or not getattr(request.user, "id", None):
        return False
    if getattr(request.user, "role", None) == "superuser":
        return True
    creator = getattr(question, "created_by_id", None) or ""
    return creator and str(creator) == str(request.user.id)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def question_list(request):
    """GET: список всех вопросов. POST: создать вопрос (учитель)."""
    if request.method == "GET":
        questions = Question.objects.all()
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        if not IsTeacher().has_permission(request, None):
            return Response({"detail": "Только для учителей."}, status=status.HTTP_403_FORBIDDEN)
        visible_group_ids = request.data.get("visible_group_ids") or []
        ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
        if not ok:
            return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        serializer = QuestionSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        question = serializer.save()
        return Response(
            QuestionSerializer(question, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    return Response({"detail": "Method not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def question_detail(request, question_id):
    """GET: получить вопрос. PUT/PATCH: редактировать (владелец/superuser). DELETE: удалить (владелец/superuser)."""
    try:
        question = get_doc_by_pk(Question, question_id)
    except Question.DoesNotExist:
        return Response({"error": "Question not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = QuestionSerializer(question, context={"request": request})
        return Response(serializer.data)

    if request.method in ("PUT", "PATCH"):
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        if not _can_edit_question(request, question):
            return Response(
                {"detail": "Нет прав на редактирование этого задания."},
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = request.method == "PATCH"
        serializer = QuestionSerializer(question, data=request.data, partial=partial, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(QuestionSerializer(question, context={"request": request}).data)

    if request.method == "DELETE":
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        if not _can_edit_question(request, question):
            return Response(
                {"detail": "Нет прав на удаление этого задания."},
                status=status.HTTP_403_FORBIDDEN,
            )
        question.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response({"detail": "Method not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(["POST"])
@permission_classes([AllowAny])
def check_question_answer(request, question_id):
    """Проверить ответ на вопрос"""
    try:
        question = get_doc_by_pk(Question, question_id)
        user_id = str(request.user.id) if request.user and getattr(request.user, "id", None) else None
        max_attempts = getattr(question, "max_attempts", None)
        if max_attempts is not None and user_id:
            attempt_count = AssignmentAttempt.objects(
                user_id=user_id, target_type="question", target_id=str(question.id)
            ).count()
            if attempt_count >= max_attempts:
                return Response(
                    {"detail": "Превышено максимальное число попыток для этого задания."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        if user_id:
            AssignmentAttempt(user_id=user_id, target_type="question", target_id=str(question.id)).save()
        selected = request.data.get("selected", [])
        if not isinstance(selected, list):
            selected = []

        correct_ids = {c.id for c in question.choices if c.is_correct}
        selected_set = set(selected)

        passed = correct_ids == selected_set

        if request.user and getattr(request.user, "id", None):
            lesson_id = str(getattr(question, "public_id", None) or question.id)
            track_title = ""
            if question.track_id:
                try:
                    from bson import ObjectId
                    from apps.tracks.documents import Track
                    t = Track.objects(id=ObjectId(question.track_id)).first()
                    if t:
                        track_title = t.title
                except Exception:
                    pass
            save_lesson_progress(
                str(request.user.id), lesson_id, "question", passed,
                lesson_title=question.title, track_id=question.track_id or "", track_title=track_title,
                available_until=getattr(question, "available_until", None),
            )

        return Response({
            "passed": passed,
            "message": "Правильно!" if passed else "Неправильно. Попробуйте ещё раз.",
        })
    except Question.DoesNotExist:
        return Response({"error": "Question not found"}, status=status.HTTP_404_NOT_FOUND)
