from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from common.db_utils import get_doc_by_pk
from .documents import Survey, SurveyResponse
from .serializers import SurveySerializer
from apps.submissions.progress import save_lesson_progress
from apps.users.teacher_utils import validate_visible_group_ids_for_teacher


def _can_edit_survey(request, survey):
    if not request.user or not getattr(request.user, "id", None):
        return False
    if getattr(request.user, "role", None) == "superuser":
        return True
    creator = getattr(survey, "created_by_id", None) or ""
    return creator and str(creator) == str(request.user.id)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def survey_list(request):
    """GET: список всех опросов. POST: создать опрос (только teacher/superuser)."""
    if request.method == "POST":
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        role = getattr(request.user, "role", None)
        if role not in ("teacher", "superuser"):
            return Response({"detail": "Только преподаватель или администратор может создавать опросы."}, status=status.HTTP_403_FORBIDDEN)
        visible_group_ids = request.data.get("visible_group_ids") or []
        ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
        if not ok:
            return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        serializer = SurveySerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        survey = serializer.save()
        return Response(SurveySerializer(survey, context={"request": request}).data, status=status.HTTP_201_CREATED)
    surveys = Survey.objects.all()
    serializer = SurveySerializer(surveys, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def survey_detail(request, survey_id):
    """GET: получить опрос. PUT/PATCH: редактировать (владелец/superuser). DELETE: удалить."""
    try:
        survey = get_doc_by_pk(Survey, survey_id)
    except Survey.DoesNotExist:
        return Response({"error": "Survey not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = SurveySerializer(survey, context={"request": request})
        data = serializer.data
        # Для преподавателя/админа — добавить ответ текущего пользователя (если студент) или не добавлять; ответы всех показываются отдельным эндпоинтом или в standalone-progress
        if request.user and getattr(request.user, "id", None):
            resp = SurveyResponse.objects(survey_id=str(survey.id), user_id=str(request.user.id)).first()
            if resp:
                data["my_response"] = resp.answer
            else:
                data["my_response"] = None
        return Response(data)

    if request.method in ("PUT", "PATCH"):
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        if not _can_edit_survey(request, survey):
            return Response(
                {"detail": "Нет прав на редактирование этого задания."},
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = request.method == "PATCH"
        serializer = SurveySerializer(survey, data=request.data, partial=partial, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(SurveySerializer(survey, context={"request": request}).data)

    if request.method == "DELETE":
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        if not _can_edit_survey(request, survey):
            return Response(
                {"detail": "Нет прав на удаление этого задания."},
                status=status.HTTP_403_FORBIDDEN,
            )
        sid = str(survey.id)
        SurveyResponse.objects(survey_id=sid).delete()
        survey.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response({"detail": "Method not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_survey_response(request, survey_id):
    """Отправить ответ на опрос (свободная форма). Один ответ на пользователя — перезаписывается."""
    try:
        survey = get_doc_by_pk(Survey, survey_id)
    except Survey.DoesNotExist:
        return Response({"error": "Survey not found"}, status=status.HTTP_404_NOT_FOUND)

    user_id = str(request.user.id)
    answer = request.data.get("answer", "")
    if not isinstance(answer, str):
        answer = str(answer)

    resp = SurveyResponse.objects(survey_id=str(survey.id), user_id=user_id).first()
    if resp:
        resp.answer = answer
        resp.save()
    else:
        SurveyResponse(survey_id=str(survey.id), user_id=user_id, answer=answer).save()

    lesson_id = str(getattr(survey, "public_id", None) or survey.id)
    track_title = ""
    if survey.track_id:
        try:
            from bson import ObjectId
            from apps.tracks.documents import Track
            t = Track.objects(id=ObjectId(survey.track_id)).first()
            if t:
                track_title = t.title
        except Exception:
            pass
    save_lesson_progress(
        user_id, lesson_id, "survey", True,
        lesson_title=survey.title, track_id=survey.track_id or "", track_title=track_title,
        available_until=getattr(survey, "available_until", None),
    )

    return Response({"ok": True, "message": "Ответ сохранён."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def survey_responses_list(request, survey_id):
    """Список ответов на опрос. Только для преподавателя/админа (доступ к группам опроса)."""
    from apps.users.documents import User, UserRole
    from apps.groups.documents import Group
    from bson import ObjectId

    try:
        survey = get_doc_by_pk(Survey, survey_id)
    except Survey.DoesNotExist:
        return Response({"detail": "Опрос не найден."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    is_superuser = getattr(user, "role", None) == UserRole.SUPERUSER.value
    teacher_group_ids = [str(g) for g in (getattr(user, "group_ids", []) or [])]
    if is_superuser:
        teacher_group_ids = [str(g.id) for g in Group.objects.all()]
    survey_vg = getattr(survey, "visible_group_ids", None) or []
    if not is_superuser and not teacher_group_ids:
        return Response({"detail": "Нет доступа."}, status=status.HTTP_403_FORBIDDEN)
    if survey_vg and not is_superuser and not (set(survey_vg) & set(teacher_group_ids)):
        return Response({"detail": "Нет доступа к этому опросу."}, status=status.HTTP_403_FORBIDDEN)

    responses = SurveyResponse.objects(survey_id=str(survey.id))
    user_ids = list({r.user_id for r in responses})
    users = {str(u.id): u for u in User.objects(id__in=[ObjectId(uid) for uid in user_ids if len(uid) == 24 and ObjectId.is_valid(uid)])}
    group_titles = {}
    for u in users.values():
        if getattr(u, "group_id", None):
            gid = str(u.group_id)
            if gid not in group_titles:
                try:
                    g = Group.objects.get(id=ObjectId(gid))
                    group_titles[gid] = g.title
                except Exception:
                    group_titles[gid] = ""
    result = []
    for r in responses:
        u = users.get(r.user_id)
        result.append({
            "user_id": r.user_id,
            "full_name": u.full_name if u else r.user_id,
            "group_id": str(u.group_id) if u and getattr(u, "group_id", None) else "",
            "group_title": group_titles.get(str(u.group_id) if u and getattr(u, "group_id", None) else "", ""),
            "answer": r.answer,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    result.sort(key=lambda x: (x["group_title"], x["full_name"]))
    return Response({"responses": result})
