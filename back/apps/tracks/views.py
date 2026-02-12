from datetime import datetime, timezone

from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from common.db_utils import get_doc_by_pk, datetime_to_iso_utc
from .documents import Track
from .serializers import TrackSerializer
from apps.users.permissions import IsTeacher, IsTeacherOrSuperuser
from apps.users.teacher_utils import validate_visible_group_ids_for_teacher


def _get_user_group_ids(user):
    """Группы пользователя для фильтрации видимости."""
    if not user or not getattr(user, "id", None):
        return []
    ids = []
    if getattr(user, "group_id", None):
        ids.append(str(user.group_id))
    if getattr(user, "group_ids", None):
        ids.extend([str(g) for g in user.group_ids])
    return ids


def _visible_to_user(doc, user_group_ids, is_anonymous):
    """Проверяет, виден ли контент пользователю (visible_group_ids)."""
    vg = getattr(doc, "visible_group_ids", None) or []
    if not vg:
        return True  # пустой = доступно всем
    if is_anonymous or not user_group_ids:
        return False
    return bool(set(vg) & set(user_group_ids))


def _get_lesson_ids_from_tracks(tracks_qs):
    """Собирает все id уроков из треков (ObjectId и public_id), чтобы ни один урок из трека не попал в одиночные."""
    from bson import ObjectId
    from apps.lectures.documents import Lecture
    from apps.tasks.documents import Task
    from apps.puzzles.documents import Puzzle
    from apps.questions.documents import Question
    from apps.surveys.documents import Survey

    ids = set()
    by_type = {"lecture": [], "task": [], "puzzle": [], "question": [], "survey": []}
    for track in tracks_qs:
        for lesson in getattr(track, "lessons", []) or []:
            lid = getattr(lesson, "id", None)
            if not lid:
                continue
            sid = str(lid)
            ids.add(sid)
            t = getattr(lesson, "type", None)
            if t in by_type:
                by_type[t].append(sid)

    # Добавляем public_id всех уроков, чтобы исключать и по 12-символьному id (на случай разного формата в ref)
    for model, key in [(Lecture, "lecture"), (Task, "task"), (Puzzle, "puzzle"), (Question, "question"), (Survey, "survey")]:
        ref_ids = by_type[key]
        if not ref_ids:
            continue
        oids = []
        for s in ref_ids:
            if len(s) == 24 and ObjectId.is_valid(s):
                try:
                    oids.append(ObjectId(s))
                except Exception:
                    pass
        if oids:
            for doc in model.objects(id__in=oids).only("public_id"):
                pid = getattr(doc, "public_id", None)
                if pid:
                    ids.add(str(pid))
    return ids


def _dt_utc_for_compare(dt):
    """Приводит datetime к timezone-aware UTC для сравнения с now_utc."""
    if dt is None:
        return None
    if not hasattr(dt, "tzinfo"):
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _get_orphan_lessons(tracks_qs, user_group_ids, is_anonymous):
    """Лекции, задания, пазлы и вопросы, не входящие ни в один трек. С учётом видимости.
    Истёкшие (available_until < now UTC) не включаются."""
    from apps.lectures.documents import Lecture
    from apps.tasks.documents import Task
    from apps.puzzles.documents import Puzzle
    from apps.questions.documents import Question
    from apps.surveys.documents import Survey

    now_utc = datetime.now(timezone.utc)
    all_tracks = Track.objects.all()
    in_track_ids = _get_lesson_ids_from_tracks(all_tracks)
    orphan_lectures = []
    orphan_tasks = []
    orphan_puzzles = []
    orphan_questions = []
    orphan_surveys = []

    for lec in Lecture.objects.all():
        lid = str(getattr(lec, "public_id", None) or lec.id)
        oid = str(lec.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(lec, user_group_ids, is_anonymous):
            continue
        af = getattr(lec, "available_from", None)
        au = getattr(lec, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is not None and au_utc < now_utc:
            continue
        orphan_lectures.append({
            "id": lid,
            "title": lec.title,
            "available_from": datetime_to_iso_utc(af),
            "available_until": datetime_to_iso_utc(au),
        })

    for task in Task.objects.all():
        lid = str(getattr(task, "public_id", None) or task.id)
        oid = str(task.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(task, user_group_ids, is_anonymous):
            continue
        af = getattr(task, "available_from", None)
        au = getattr(task, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is not None and au_utc < now_utc:
            continue
        orphan_tasks.append({
            "id": lid,
            "title": task.title,
            "hard": bool(getattr(task, "hard", False)),
            "available_from": datetime_to_iso_utc(af),
            "available_until": datetime_to_iso_utc(au),
        })

    for puzzle in Puzzle.objects.all():
        lid = str(getattr(puzzle, "public_id", None) or puzzle.id)
        oid = str(puzzle.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(puzzle, user_group_ids, is_anonymous):
            continue
        af = getattr(puzzle, "available_from", None)
        au = getattr(puzzle, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is not None and au_utc < now_utc:
            continue
        orphan_puzzles.append({
            "id": lid,
            "title": puzzle.title,
            "available_from": datetime_to_iso_utc(af),
            "available_until": datetime_to_iso_utc(au),
        })

    for question in Question.objects.all():
        lid = str(getattr(question, "public_id", None) or question.id)
        oid = str(question.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(question, user_group_ids, is_anonymous):
            continue
        af = getattr(question, "available_from", None)
        au = getattr(question, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is not None and au_utc < now_utc:
            continue
        orphan_questions.append({
            "id": lid,
            "title": question.title,
            "available_from": datetime_to_iso_utc(af),
            "available_until": datetime_to_iso_utc(au),
        })

    for survey in Survey.objects.all():
        lid = str(getattr(survey, "public_id", None) or survey.id)
        oid = str(survey.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(survey, user_group_ids, is_anonymous):
            continue
        af = getattr(survey, "available_from", None)
        au = getattr(survey, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is not None and au_utc < now_utc:
            continue
        orphan_surveys.append({
            "id": lid,
            "title": survey.title,
            "available_from": datetime_to_iso_utc(af),
            "available_until": datetime_to_iso_utc(au),
        })

    return orphan_lectures, orphan_tasks, orphan_puzzles, orphan_questions, orphan_surveys


def _get_overdue_orphan_lessons(tracks_qs, user_group_ids, is_anonymous):
    """Орфаны с истёкшим сроком (available_until < now UTC). Только для авторизованных."""
    if is_anonymous:
        return [], [], [], [], []
    from apps.lectures.documents import Lecture
    from apps.tasks.documents import Task
    from apps.puzzles.documents import Puzzle
    from apps.questions.documents import Question
    from apps.surveys.documents import Survey

    now_utc = datetime.now(timezone.utc)
    all_tracks = Track.objects.all()
    in_track_ids = _get_lesson_ids_from_tracks(all_tracks)
    overdue_lectures = []
    overdue_tasks = []
    overdue_puzzles = []
    overdue_questions = []
    overdue_surveys = []

    for lec in Lecture.objects.all():
        lid = str(getattr(lec, "public_id", None) or lec.id)
        oid = str(lec.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(lec, user_group_ids, is_anonymous):
            continue
        au = getattr(lec, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is None or au_utc >= now_utc:
            continue
        overdue_lectures.append({
            "id": lid,
            "title": lec.title,
            "available_from": datetime_to_iso_utc(getattr(lec, "available_from", None)),
            "available_until": datetime_to_iso_utc(au),
        })

    for task in Task.objects.all():
        lid = str(getattr(task, "public_id", None) or task.id)
        oid = str(task.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(task, user_group_ids, is_anonymous):
            continue
        au = getattr(task, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is None or au_utc >= now_utc:
            continue
        overdue_tasks.append({
            "id": lid,
            "title": task.title,
            "hard": bool(getattr(task, "hard", False)),
            "available_from": datetime_to_iso_utc(getattr(task, "available_from", None)),
            "available_until": datetime_to_iso_utc(au),
        })

    for puzzle in Puzzle.objects.all():
        lid = str(getattr(puzzle, "public_id", None) or puzzle.id)
        oid = str(puzzle.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(puzzle, user_group_ids, is_anonymous):
            continue
        au = getattr(puzzle, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is None or au_utc >= now_utc:
            continue
        overdue_puzzles.append({
            "id": lid,
            "title": puzzle.title,
            "available_from": datetime_to_iso_utc(getattr(puzzle, "available_from", None)),
            "available_until": datetime_to_iso_utc(au),
        })

    for question in Question.objects.all():
        lid = str(getattr(question, "public_id", None) or question.id)
        oid = str(question.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(question, user_group_ids, is_anonymous):
            continue
        au = getattr(question, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is None or au_utc >= now_utc:
            continue
        overdue_questions.append({
            "id": lid,
            "title": question.title,
            "available_from": datetime_to_iso_utc(getattr(question, "available_from", None)),
            "available_until": datetime_to_iso_utc(au),
        })

    for survey in Survey.objects.all():
        lid = str(getattr(survey, "public_id", None) or survey.id)
        oid = str(survey.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(survey, user_group_ids, is_anonymous):
            continue
        au = getattr(survey, "available_until", None)
        au_utc = _dt_utc_for_compare(au)
        if au_utc is None or au_utc >= now_utc:
            continue
        overdue_surveys.append({
            "id": lid,
            "title": survey.title,
            "available_from": datetime_to_iso_utc(getattr(survey, "available_from", None)),
            "available_until": datetime_to_iso_utc(au),
        })

    return overdue_lectures, overdue_tasks, overdue_puzzles, overdue_questions, overdue_surveys


class TrackViewSet(ModelViewSet):
    serializer_class = TrackSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        # Return tracks filtered by visibility. If a track has empty `visible_group_ids`, it's public.
        try:
            request = self.request
        except Exception:
            request = None

        base_qs = Track.objects.order_by("order")

        # If there's no request or anonymous user, show only public tracks (visible_group_ids empty)
        if not request or not getattr(request, "user", None) or not getattr(request.user, "id", None):
            return base_qs.filter(__raw__={"$or": [{"visible_group_ids": {"$exists": False}}, {"visible_group_ids": []}]})

        # Authenticated user: collect their group ids and include tracks visible to any of them or public tracks
        user = request.user
        user_group_ids = []
        if getattr(user, "group_id", None):
            user_group_ids.append(str(user.group_id))
        if getattr(user, "group_ids", None):
            user_group_ids.extend([str(g) for g in user.group_ids])

        if not user_group_ids:
            return base_qs.filter(__raw__={"$or": [{"visible_group_ids": {"$exists": False}}, {"visible_group_ids": []}]})

        return base_qs.filter(__raw__={
            "$or": [
                {"visible_group_ids": {"$exists": False}},
                {"visible_group_ids": []},
                {"visible_group_ids": {"$in": user_group_ids}},
            ]
        })

    def get_permissions(self):
        # Allow anonymous users to list and retrieve tracks so site navigation works
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrSuperuser()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs.get("pk")
        return get_doc_by_pk(Track, pk)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        ser = self.get_serializer(qs, many=True, context={"request": request})
        user = getattr(request, "user", None)
        is_anonymous = not user or not getattr(user, "id", None)
        user_group_ids = _get_user_group_ids(user)
        orphan_lectures, orphan_tasks, orphan_puzzles, orphan_questions, orphan_surveys = _get_orphan_lessons(
            qs, user_group_ids, is_anonymous
        )
        data = {
            "tracks": ser.data,
            "orphan_lectures": orphan_lectures,
            "orphan_tasks": orphan_tasks,
            "orphan_puzzles": orphan_puzzles,
            "orphan_questions": orphan_questions,
            "orphan_surveys": orphan_surveys,
        }
        if not is_anonymous:
            od_lec, od_task, od_puz, od_q, od_s = _get_overdue_orphan_lessons(qs, user_group_ids, is_anonymous)
            data["orphan_overdue_lectures"] = od_lec
            data["orphan_overdue_tasks"] = od_task
            data["orphan_overdue_puzzles"] = od_puz
            data["orphan_overdue_questions"] = od_q
            data["orphan_overdue_surveys"] = od_s
        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Track.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = self.get_serializer(instance, context={"request": request})
        return Response(ser.data)

    def create(self, request, *args, **kwargs):
        visible_group_ids = request.data.get("visible_group_ids") or []
        ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
        if not ok:
            return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        track = ser.save()
        return Response(self.get_serializer(track).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        visible_group_ids = request.data.get("visible_group_ids")
        if visible_group_ids is not None:
            ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
            if not ok:
                return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Удалить трек может только создатель или superuser."""
        instance = self.get_object()
        creator = getattr(instance, "created_by_id", None) or ""
        is_superuser = getattr(request.user, "role", None) == "superuser"
        if not is_superuser and (not creator or str(creator) != str(request.user.id)):
            return Response(
                {"detail": "Удалить трек может только его создатель."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
