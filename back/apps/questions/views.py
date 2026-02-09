from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from common.db_utils import get_doc_by_pk
from .documents import Question
from .serializers import QuestionSerializer
from apps.submissions.progress import save_lesson_progress


@api_view(["GET"])
@permission_classes([AllowAny])
def question_list(request):
    """Список всех вопросов"""
    questions = Question.objects.all()
    serializer = QuestionSerializer(questions, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def question_detail(request, question_id):
    """Получить вопрос по ID (ObjectId или public_id)"""
    try:
        question = get_doc_by_pk(Question, question_id)
        serializer = QuestionSerializer(question)
        return Response(serializer.data)
    except Question.DoesNotExist:
        return Response({"error": "Question not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([AllowAny])
def check_question_answer(request, question_id):
    """Проверить ответ на вопрос"""
    try:
        question = get_doc_by_pk(Question, question_id)
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
            )

        return Response({
            "passed": passed,
            "message": "Правильно!" if passed else "Неправильно. Попробуйте ещё раз.",
        })
    except Question.DoesNotExist:
        return Response({"error": "Question not found"}, status=status.HTTP_404_NOT_FOUND)
