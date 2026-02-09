from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from common.db_utils import get_doc_by_pk
from .documents import Track
from .serializers import TrackSerializer
from apps.users.permissions import IsTeacher
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
    """Собирает все id уроков из треков (для определения orphan)."""
    ids = set()
    for track in tracks_qs:
        for lesson in getattr(track, "lessons", []) or []:
            lid = getattr(lesson, "id", None)
            if lid:
                ids.add(str(lid))
    return ids


def _get_orphan_lectures_and_tasks(tracks_qs, user_group_ids, is_anonymous):
    """Лекции и задания, не входящие ни в один трек. С учётом видимости."""
    from apps.lectures.documents import Lecture
    from apps.tasks.documents import Task

    in_track_ids = _get_lesson_ids_from_tracks(tracks_qs)
    orphan_lectures = []
    orphan_tasks = []

    for lec in Lecture.objects.all():
        lid = str(getattr(lec, "public_id", None) or lec.id)
        oid = str(lec.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(lec, user_group_ids, is_anonymous):
            continue
        orphan_lectures.append({
            "id": lid,
            "title": lec.title,
        })

    for task in Task.objects.all():
        lid = str(getattr(task, "public_id", None) or task.id)
        oid = str(task.id)
        if oid in in_track_ids or lid in in_track_ids:
            continue
        if not _visible_to_user(task, user_group_ids, is_anonymous):
            continue
        orphan_tasks.append({
            "id": lid,
            "title": task.title,
            "hard": bool(getattr(task, "hard", False)),
        })

    return orphan_lectures, orphan_tasks


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
            return [IsAuthenticated(), IsTeacher()]
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
        orphan_lectures, orphan_tasks = _get_orphan_lectures_and_tasks(qs, user_group_ids, is_anonymous)
        return Response({
            "tracks": ser.data,
            "orphan_lectures": orphan_lectures,
            "orphan_tasks": orphan_tasks,
        })

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
