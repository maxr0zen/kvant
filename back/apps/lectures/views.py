from rest_framework import status
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import RetrieveModelMixin, CreateModelMixin, UpdateModelMixin, DestroyModelMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from common.db_utils import get_doc_by_pk
from .documents import Lecture
from .serializers import LectureSerializer
from apps.users.permissions import IsTeacher
from apps.users.teacher_utils import validate_visible_group_ids_for_teacher
from apps.submissions.progress import save_lesson_progress
from apps.tracks.documents import Track


def _get_question_block_ids(blocks):
    """Возвращает список block_id для блоков-вопросов и video_id::pause_point_id для таймкодов видео."""
    if not blocks:
        return []
    ids = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        if b.get("type") == "question" and b.get("id"):
            ids.append(b.get("id"))
        elif b.get("type") == "video" and b.get("id"):
            for pp in b.get("pause_points", []):
                if pp.get("id"):
                    ids.append(f"{b.get('id')}::{pp.get('id')}")
    return ids


def _lecture_has_question_blocks(lecture):
    ids = _get_question_block_ids(getattr(lecture, "blocks", None) or [])
    return len(ids) > 0


class LectureViewSet(GenericViewSet, RetrieveModelMixin, CreateModelMixin, UpdateModelMixin, DestroyModelMixin):
    serializer_class = LectureSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "pk"
    lookup_field = "id"

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update"]:
            return [IsAuthenticated(), IsTeacher()]
        if self.action in ["retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs["pk"]
        return get_doc_by_pk(Lecture, pk)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Lecture.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        # Отметить лекцию при запросе с авторизацией
        # Если есть вопросы — started (completed только после ответов на все)
        # Если вопросов нет — completed (посещение = выполнение)
        if request.user and getattr(request.user, "id", None):
            lesson_id = str(getattr(instance, "public_id", None) or instance.id)
            track_title = ""
            if instance.track_id:
                try:
                    from bson import ObjectId
                    t = Track.objects(id=ObjectId(instance.track_id)).first()
                    if t:
                        track_title = t.title
                except Exception:
                    pass
            has_questions = _lecture_has_question_blocks(instance)
            passed = not has_questions  # completed = True если нет вопросов, иначе started
            save_lesson_progress(
                str(request.user.id),
                lesson_id,
                "lecture",
                passed,
                lesson_title=instance.title,
                track_id=instance.track_id or "",
                track_title=track_title,
                available_until=getattr(instance, "available_until", None),
            )
        ser = self.get_serializer(instance)
        return Response(ser.data)

    def create(self, request, *args, **kwargs):
        visible_group_ids = request.data.get("visible_group_ids") or []
        ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
        if not ok:
            return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        ser = self.get_serializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        lecture = ser.save()
        return Response(self.get_serializer(lecture).data, status=status.HTTP_201_CREATED)

    def _can_edit_lecture(self, request, lecture):
        """Только создатель или superuser может редактировать."""
        if not request.user or not getattr(request.user, "id", None):
            return False
        if getattr(request.user, "role", None) == "superuser":
            return True
        creator = getattr(lecture, "created_by_id", None) or ""
        return creator and str(creator) == str(request.user.id)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        if not self._can_edit_lecture(request, instance):
            return Response(
                {"detail": "Нет прав на редактирование этой лекции."},
                status=status.HTTP_403_FORBIDDEN,
            )
        visible_group_ids = request.data.get("visible_group_ids")
        if visible_group_ids is not None:
            ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
            if not ok:
                return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        ser = self.get_serializer(instance, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        lecture = ser.save()
        return Response(self.get_serializer(lecture).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Lecture.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not self._can_edit_lecture(request, instance):
            return Response(
                {"detail": "Нет прав на удаление этой лекции."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_viewed(self, request, pk=None):
        """Отметить лекцию как просмотренную (для авторизованного пользователя)."""
        try:
            lecture = self.get_object()
        except Lecture.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        lesson_id = str(getattr(lecture, "public_id", None) or lecture.id)
        track_title = ""
        if lecture.track_id:
            try:
                from bson import ObjectId
                t = Track.objects(id=ObjectId(lecture.track_id)).first()
                if t:
                    track_title = t.title
            except Exception:
                pass
        has_questions = _lecture_has_question_blocks(lecture)
        passed = not has_questions
        save_lesson_progress(
            str(request.user.id),
            lesson_id,
            "lecture",
            passed,
            lesson_title=lecture.title,
            track_id=lecture.track_id or "",
            track_title=track_title,
            available_until=getattr(lecture, "available_until", None),
        )
        return Response({"status": "ok"})

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="question-blocks-progress")
    def question_blocks_progress(self, request, pk=None):
        """Возвращает статус блоков-вопросов для текущего пользователя."""
        try:
            lecture = self.get_object()
        except Lecture.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        user_id = str(request.user.id) if request.user and getattr(request.user, "id", None) else None
        if not user_id:
            return Response({"blocks": {}}, status=200)
        from apps.submissions.documents import LessonProgress
        lecture_display_id = str(getattr(lecture, "public_id", None) or lecture.id)
        q_block_ids = _get_question_block_ids(getattr(lecture, "blocks", None) or [])
        blocks_data = {}
        blocks_raw = getattr(lecture, "blocks", None) or []
        for bid in q_block_ids:
            lid = f"{lecture_display_id}::{bid}"
            lp = LessonProgress.objects(user_id=user_id, lesson_id=lid).first()
            block = None
            correct_ids = []
            if "::" in bid:
                vid, ppid = bid.split("::", 1)
                vblock = next((b for b in blocks_raw if isinstance(b, dict) and b.get("type") == "video" and b.get("id") == vid), None)
                if vblock:
                    pp = next((p for p in vblock.get("pause_points", []) if p.get("id") == ppid), None)
                    if pp:
                        block = pp.get("question", {})
            else:
                block = next((b for b in blocks_raw if isinstance(b, dict) and b.get("type") == "question" and b.get("id") == bid), None)
            if block and lp and lp.status == "completed":
                correct_ids = [str(c.get("id")) for c in block.get("choices", []) if c.get("is_correct")]
            blocks_data[bid] = {
                "status": lp.status if lp else None,
                "correct_ids": correct_ids if lp and lp.status == "completed" else None,
            }
        return Response({"blocks": blocks_data})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="check_block_answer")
    def check_block_answer(self, request, pk=None):
        """Проверить ответ на вопрос-блок или таймкод видео. body: {block_id, selected: []}"""
        try:
            lecture = self.get_object()
        except Lecture.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        block_id = request.data.get("block_id")
        selected = request.data.get("selected", [])
        if not block_id or not isinstance(selected, list):
            return Response({"detail": "block_id and selected required."}, status=status.HTTP_400_BAD_REQUEST)
        blocks = getattr(lecture, "blocks", None) or []
        choices = []
        # Обычный блок-вопрос
        block = next((b for b in blocks if isinstance(b, dict) and b.get("type") == "question" and b.get("id") == block_id), None)
        if block:
            choices = block.get("choices", [])
        else:
            # Таймкод видео: block_id = "video_id::pause_point_id"
            if "::" in block_id:
                vid, ppid = block_id.split("::", 1)
                vblock = next((b for b in blocks if isinstance(b, dict) and b.get("type") == "video" and b.get("id") == vid), None)
                if vblock:
                    pp = next((p for p in vblock.get("pause_points", []) if p.get("id") == ppid), None)
                    if pp:
                        block = pp.get("question", {})
                        choices = block.get("choices", [])
        if not choices:
            return Response({"detail": "Question block not found."}, status=status.HTTP_404_NOT_FOUND)
        correct_ids = {str(c.get("id")) for c in choices if c.get("is_correct")}
        selected_set = {str(s) for s in selected}
        passed = correct_ids == selected_set
        user_id = str(request.user.id) if request.user and getattr(request.user, "id", None) else None
        if user_id:
            lecture_display_id = str(getattr(lecture, "public_id", None) or lecture.id)
            block_lesson_id = f"{lecture_display_id}::{block_id}"
            track_title = ""
            if lecture.track_id:
                try:
                    from bson import ObjectId
                    t = Track.objects(id=ObjectId(lecture.track_id)).first()
                    if t:
                        track_title = t.title
                except Exception:
                    pass
            save_lesson_progress(
                user_id, block_lesson_id, "question", passed,
                lesson_title=lecture.title, track_id=lecture.track_id or "", track_title=track_title,
                available_until=getattr(lecture, "available_until", None),
            )
            if passed:
                from apps.submissions.documents import LessonProgress
                q_block_ids = _get_question_block_ids(blocks)
                all_done = True
                for qid in q_block_ids:
                    lid = f"{lecture_display_id}::{qid}"
                    lp = LessonProgress.objects(user_id=user_id, lesson_id=lid).first()
                    if not lp or lp.status != "completed":
                        all_done = False
                        break
                if all_done:
                    save_lesson_progress(
                        user_id, lecture_display_id, "lecture", True,
                        lesson_title=lecture.title, track_id=lecture.track_id or "", track_title=track_title,
                        available_until=getattr(lecture, "available_until", None),
                    )
        return Response({
            "passed": passed,
            "message": "Правильно!" if passed else "Неправильно. Попробуйте ещё раз.",
        })
