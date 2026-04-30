from datetime import datetime, timezone
from rest_framework import status
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import RetrieveModelMixin, CreateModelMixin, UpdateModelMixin, DestroyModelMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from common.db_utils import get_doc_by_pk
from .documents import LayoutLesson
from .serializers import LayoutSerializer, LayoutCheckSerializer, LayoutDraftSerializer
from .checker import check_layout
from apps.users.permissions import IsTeacher
from apps.users.teacher_utils import validate_visible_group_ids_for_teacher
from apps.submissions.documents import LayoutDraft
from apps.submissions.progress import save_lesson_progress


def _can_edit_layout(request, layout):
    if not request.user or not getattr(request.user, "id", None):
        return False
    if getattr(request.user, "role", None) == "superuser":
        return True
    creator = getattr(layout, "created_by_id", None) or ""
    return creator and str(creator) == str(request.user.id)


def _is_visible_group_only_patch(data):
    keys = set(data.keys())
    return bool(keys) and not (keys - {"visible_group_ids"})


class LayoutViewSet(GenericViewSet, RetrieveModelMixin, CreateModelMixin, UpdateModelMixin, DestroyModelMixin):
    serializer_class = LayoutSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "pk"

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsTeacher()]
        if self.action in ["retrieve"]:
            return [AllowAny()]
        if self.action == "draft" and self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs["pk"]
        return get_doc_by_pk(LayoutLesson, pk)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except LayoutLesson.DoesNotExist:
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
        layout = ser.save()
        return Response(self.get_serializer(layout).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except LayoutLesson.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        can_edit = _can_edit_layout(request, instance)
        if not can_edit:
            if getattr(request.user, "role", None) != "teacher" or not _is_visible_group_only_patch(request.data):
                return Response(
                    {"detail": "Нет прав на редактирование этого задания."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        visible_group_ids = request.data.get("visible_group_ids")
        if visible_group_ids is not None:
            ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
            if not ok:
                return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        partial = kwargs.get("partial", False)
        if not can_edit:
            partial = True
        ser = self.get_serializer(instance, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        layout = ser.save()
        return Response(self.get_serializer(layout).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except LayoutLesson.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_edit_layout(request, instance):
            return Response(
                {"detail": "Нет прав на удаление этого задания."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def check(self, request, pk=None):
        """Проверить верстку, вернуть статусы подзадач и общий passed."""
        try:
            layout = self.get_object()
        except LayoutLesson.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = LayoutCheckSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        html = ser.validated_data.get("html", "") or ""
        css = ser.validated_data.get("css", "") or ""
        js = ser.validated_data.get("js", "") or ""
        result = check_layout(layout, html, css, js)
        checker_passed = bool((result or {}).get("passed")) if isinstance(result, dict) else False
        has_blocking_errors = bool((result.get("errors") if isinstance(result, dict) else []) or [])
        final_passed = checker_passed and not has_blocking_errors
        if isinstance(result, dict):
            result["passed"] = final_passed
        user_id = str(request.user.id) if request.user and getattr(request.user, "id", None) else None
        if user_id:
            lesson_id = str(getattr(layout, "public_id", None) or layout.id)
            track_title = ""
            if layout.track_id:
                try:
                    from bson import ObjectId
                    from apps.tracks.documents import Track
                    t = Track.objects(id=ObjectId(layout.track_id)).first()
                    if t:
                        track_title = t.title
                except Exception:
                    pass
            unlocked_achievements = save_lesson_progress(
                user_id, lesson_id, "layout", final_passed,
                lesson_title=layout.title, track_id=layout.track_id or "", track_title=track_title,
                available_until=getattr(layout, "available_until", None),
            )
            if isinstance(result, dict):
                result["unlocked_achievements"] = unlocked_achievements
        return Response(result)

    @action(detail=True, methods=["get", "put", "patch"], url_path="draft")
    def draft(self, request, pk=None):
        """GET: черновик. PUT/PATCH: сохранить черновик."""
        try:
            layout = self.get_object()
        except LayoutLesson.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not request.user or not getattr(request.user, "id", None):
            if request.method == "GET":
                return Response({
                    "html": layout.template_html,
                    "css": layout.template_css,
                    "js": layout.template_js,
                })
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        user_id = str(request.user.id)
        layout_id = str(layout.id)
        if request.method == "GET":
            draft = LayoutDraft.objects(user_id=user_id, layout_id=layout_id).first()
            if draft:
                return Response({"html": draft.html, "css": draft.css, "js": draft.js})
            return Response({
                "html": layout.template_html,
                "css": layout.template_css,
                "js": layout.template_js,
            })
        ser = LayoutDraftSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        html = ser.validated_data.get("html", "") or ""
        css = ser.validated_data.get("css", "") or ""
        js = ser.validated_data.get("js", "") or ""
        draft = LayoutDraft.objects(user_id=user_id, layout_id=layout_id).first()
        now = datetime.now(timezone.utc)
        if draft:
            draft.html = html
            draft.css = css
            draft.js = js
            draft.updated_at = now
            draft.save()
        else:
            LayoutDraft(user_id=user_id, layout_id=layout_id, html=html, css=css, js=js).save()
        return Response({"status": "ok"})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsTeacher])
    def copy(self, request, pk=None):
        try:
            instance = self.get_object()
        except LayoutLesson.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        from .documents import _generate_public_id, LayoutSubtaskEmbed
        new_layout = LayoutLesson(
            title=instance.title + " (копия)",
            track_id="",
            description=instance.description,
            attached_lecture_id=instance.attached_lecture_id,
            template_html=instance.template_html,
            template_css=instance.template_css,
            template_js=instance.template_js,
            reference_html=instance.reference_html,
            reference_css=instance.reference_css,
            reference_js=instance.reference_js,
            check_mode=instance.check_mode,
            editable_files=instance.editable_files,
            subtasks=[LayoutSubtaskEmbed(**{"id": st.id, "title": st.title, "check_type": st.check_type, "check_value": st.check_value}) for st in instance.subtasks],
            visible_group_ids=[],
            created_by_id=str(request.user.id),
            available_from=None,
            available_until=None,
            hints=instance.hints,
            max_attempts=instance.max_attempts,
            reward_achievement_ids=instance.reward_achievement_ids,
            copied_from_id=str(getattr(instance, "public_id", None) or instance.id),
        )
        new_layout.public_id = _generate_public_id()
        new_layout.save()
        ser = self.get_serializer(new_layout, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)

