from rest_framework import serializers
from .documents import Track, LessonRef
from common.db_utils import get_doc_by_pk, datetime_to_iso_utc


def _resolve_lesson_id(lesson_type: str, lesson_id: str) -> str:
    """Resolve lesson id (public_id or ObjectId) to MongoDB ObjectId string for storage in LessonRef."""
    if not lesson_id:
        raise serializers.ValidationError({"lessons": "Lesson id is required."})
    if lesson_type == "lecture":
        from apps.lectures.documents import Lecture
        doc = get_doc_by_pk(Lecture, str(lesson_id))
    elif lesson_type == "task":
        from apps.tasks.documents import Task
        doc = get_doc_by_pk(Task, str(lesson_id))
    elif lesson_type == "puzzle":
        from apps.puzzles.documents import Puzzle
        doc = get_doc_by_pk(Puzzle, str(lesson_id))
    elif lesson_type == "question":
        from apps.questions.documents import Question
        doc = get_doc_by_pk(Question, str(lesson_id))
    elif lesson_type == "survey":
        from apps.surveys.documents import Survey
        doc = get_doc_by_pk(Survey, str(lesson_id))
    else:
        raise serializers.ValidationError({"lessons": f"Unknown lesson type: {lesson_type}."})
    return str(doc.id)


def _get_lesson_display_id(lesson_ref) -> str:
    """Возвращает id урока для API (public_id или ObjectId) — совпадает с LessonRefSerializer.get_id."""
    try:
        from bson import ObjectId
        if getattr(lesson_ref, "type", None) == "lecture":
            from apps.lectures.documents import Lecture
            try:
                lec = Lecture.objects.get(id=ObjectId(lesson_ref.id))
                return str(getattr(lec, "public_id", None) or str(lec.id))
            except Exception:
                return str(lesson_ref.id)
        if getattr(lesson_ref, "type", None) == "task":
            from apps.tasks.documents import Task
            try:
                task = Task.objects.get(id=ObjectId(lesson_ref.id))
                return str(getattr(task, "public_id", None) or str(task.id))
            except Exception:
                return str(lesson_ref.id)
        if getattr(lesson_ref, "type", None) == "puzzle":
            from apps.puzzles.documents import Puzzle
            try:
                p = Puzzle.objects.get(id=ObjectId(lesson_ref.id))
                return str(getattr(p, "public_id", None) or str(p.id))
            except Exception:
                return str(lesson_ref.id)
        if getattr(lesson_ref, "type", None) == "question":
            from apps.questions.documents import Question
            try:
                q = Question.objects.get(id=ObjectId(lesson_ref.id))
                return str(getattr(q, "public_id", None) or str(q.id))
            except Exception:
                return str(lesson_ref.id)
        if getattr(lesson_ref, "type", None) == "survey":
            from apps.surveys.documents import Survey
            try:
                s = Survey.objects.get(id=ObjectId(lesson_ref.id))
                return str(getattr(s, "public_id", None) or str(s.id))
            except Exception:
                return str(lesson_ref.id)
    except Exception:
        pass
    return str(getattr(lesson_ref, "id", ""))


def _get_lesson_availability(lesson_ref):
    """Return (available_from, available_until) as isoformat strings or None."""
    try:
        from bson import ObjectId
        if getattr(lesson_ref, "type", None) == "lecture":
            from apps.lectures.documents import Lecture
            doc = Lecture.objects.get(id=ObjectId(lesson_ref.id))
        elif getattr(lesson_ref, "type", None) == "task":
            from apps.tasks.documents import Task
            doc = Task.objects.get(id=ObjectId(lesson_ref.id))
        elif getattr(lesson_ref, "type", None) == "puzzle":
            from apps.puzzles.documents import Puzzle
            doc = Puzzle.objects.get(id=ObjectId(lesson_ref.id))
        elif getattr(lesson_ref, "type", None) == "question":
            from apps.questions.documents import Question
            doc = Question.objects.get(id=ObjectId(lesson_ref.id))
        elif getattr(lesson_ref, "type", None) == "survey":
            from apps.surveys.documents import Survey
            doc = Survey.objects.get(id=ObjectId(lesson_ref.id))
        else:
            return None, None
        af = getattr(doc, "available_from", None)
        au = getattr(doc, "available_until", None)
        return (datetime_to_iso_utc(af), datetime_to_iso_utc(au))
    except Exception:
        return None, None


def _get_lecture_for_lesson(lesson_ref):
    """Возвращает Lecture для lesson_ref типа lecture, либо None."""
    if getattr(lesson_ref, "type", None) != "lecture":
        return None
    try:
        from common.db_utils import get_doc_by_pk
        from apps.lectures.documents import Lecture
        return get_doc_by_pk(Lecture, str(lesson_ref.id))
    except Exception:
        return None


def _get_all_lesson_ids_for_lookup(lesson_ref) -> list:
    """Все возможные lesson_id, под которыми мог сохраниться прогресс."""
    ids = set()
    ids.add(str(lesson_ref.id))
    ids.add(_get_lesson_display_id(lesson_ref))
    try:
        from bson import ObjectId
        if getattr(lesson_ref, "type", None) == "lecture":
            from apps.lectures.documents import Lecture
            lec = Lecture.objects.get(id=ObjectId(lesson_ref.id))
            if getattr(lec, "public_id", None):
                ids.add(str(lec.public_id))
            ids.add(str(lec.id))
        elif getattr(lesson_ref, "type", None) == "task":
            from apps.tasks.documents import Task
            task = Task.objects.get(id=ObjectId(lesson_ref.id))
            if getattr(task, "public_id", None):
                ids.add(str(task.public_id))
            ids.add(str(task.id))
        elif getattr(lesson_ref, "type", None) == "puzzle":
            from apps.puzzles.documents import Puzzle
            p = Puzzle.objects.get(id=ObjectId(lesson_ref.id))
            if getattr(p, "public_id", None):
                ids.add(str(p.public_id))
            ids.add(str(p.id))
        elif getattr(lesson_ref, "type", None) == "question":
            from apps.questions.documents import Question
            q = Question.objects.get(id=ObjectId(lesson_ref.id))
            if getattr(q, "public_id", None):
                ids.add(str(q.public_id))
            ids.add(str(q.id))
        elif getattr(lesson_ref, "type", None) == "survey":
            from apps.surveys.documents import Survey
            s = Survey.objects.get(id=ObjectId(lesson_ref.id))
            if getattr(s, "public_id", None):
                ids.add(str(s.public_id))
            ids.add(str(s.id))
    except Exception:
        pass
    return [i for i in ids if i]


def _format_status_late(lp) -> tuple:
    """(status, late_by_seconds) — completed_late даёт status='completed_late'."""
    if not lp:
        return ("not_started", 0)
    st = lp.status
    late = getattr(lp, "late_by_seconds", 0) or 0
    if st == "completed" and getattr(lp, "completed_late", False):
        return ("completed_late", late)
    return (st, 0)


def _format_status_late_with_time(lp, completed_at=None):
    """(status, late_by_seconds, completed_at). completed_at — ISO или None."""
    if not lp:
        return ("not_started", 0, None)
    st, late = _format_status_late(lp)
    if completed_at is None and st in ("completed", "completed_late"):
        completed_at = getattr(lp, "updated_at", None)
    if completed_at:
        completed_at = datetime_to_iso_utc(completed_at)
    return (st, late, completed_at)


def get_lesson_status_for_user(user_id: str, lesson_ref, display_id: str):
    """
    Возвращает (status, late_by_seconds).
    status: 'completed', 'completed_late', 'started', 'not_started'.
    """
    from apps.submissions.documents import LessonProgress, Submission

    lp = None
    for lid in _get_all_lesson_ids_for_lookup(lesson_ref):
        lp = LessonProgress.objects(user_id=user_id, lesson_id=lid).first()
        if lp:
            break

    if getattr(lesson_ref, "type", None) == "lecture":
        lecture = _get_lecture_for_lesson(lesson_ref)
        blocks = getattr(lecture, "blocks", None) or []
        q_block_ids = []
        for b in blocks:
            if not isinstance(b, dict):
                continue
            if b.get("type") == "question" and b.get("id"):
                q_block_ids.append(b.get("id"))
            elif b.get("type") == "video" and b.get("id"):
                for pp in b.get("pause_points", []):
                    if pp.get("id"):
                        q_block_ids.append(f"{b.get('id')}::{pp.get('id')}")
        if lecture and q_block_ids:
            all_completed = True
            any_progress = False
            for qid in q_block_ids:
                block_lesson_id = f"{display_id}::{qid}"
                q_lp = LessonProgress.objects(user_id=user_id, lesson_id=block_lesson_id).first()
                if q_lp:
                    any_progress = True
                    if q_lp.status != "completed":
                        all_completed = False
                else:
                    all_completed = False
            if all_completed:
                return _format_status_late(lp)
            return ("started" if (lp or any_progress) else "not_started", 0)
        if lp:
            return _format_status_late(lp)
        return ("not_started", 0)

    if getattr(lesson_ref, "type", None) == "task":
        if lp:
            return _format_status_late(lp)
        last = (
            Submission.objects(user_id=user_id, task_id=lesson_ref.id)
            .order_by("-created_at")
            .first()
        )
        if last:
            return ("completed" if last.passed else "started", 0)
        return ("not_started", 0)

    if lp:
        return _format_status_late(lp)
    return ("not_started", 0)


def get_standalone_status_for_user(user_id: str, lesson_type: str, lesson_ids: list) -> tuple:
    """
    Статус по одиночному заданию (без lesson_ref). lesson_ids — список id (objectid, public_id).
    Возвращает (status, late_by_seconds, completed_at_iso).
    """
    from apps.submissions.documents import LessonProgress, Submission

    lp = None
    for lid in lesson_ids:
        if not lid:
            continue
        lp = LessonProgress.objects(user_id=user_id, lesson_id=lid).first()
        if lp:
            break
    if lesson_type == "task":
        if lp:
            return _format_status_late_with_time(lp)
        for tid in lesson_ids:
            if not tid:
                continue
            last = Submission.objects(user_id=user_id, task_id=tid).order_by("-created_at").first()
            if last:
                st = "completed" if last.passed else "started"
                completed_at = datetime_to_iso_utc(last.created_at) if last.passed else None
                return (st, 0, completed_at)
        return ("not_started", 0, None)
    if lp:
        return _format_status_late_with_time(lp)
    return ("not_started", 0, None)


class LessonRefSerializer(serializers.Serializer):
    id = serializers.CharField(required=True)  # for write (public_id or ObjectId); for read see to_representation
    type = serializers.ChoiceField(choices=["lecture", "task", "puzzle", "question", "survey"])
    title = serializers.CharField()
    order = serializers.IntegerField()
    hard = serializers.SerializerMethodField()

    def to_representation(self, instance):
        """Output display id (public_id) when serializing; instance is LessonRef."""
        available_from, available_until = _get_lesson_availability(instance)
        return {
            "id": _get_lesson_display_id(instance),
            "type": instance.type,
            "title": instance.title,
            "order": instance.order,
            "hard": self.get_hard(instance),
            "available_from": available_from,
            "available_until": available_until,
        }

    def get_hard(self, obj):
        """Повышенная сложность (звёздочка) — только для задач."""
        if getattr(obj, "type", None) != "task":
            return False
        try:
            from bson import ObjectId
            from apps.tasks.documents import Task
            task = Task.objects.get(id=ObjectId(obj.id))
            return bool(getattr(task, "hard", False))
        except Exception:
            return False


class TrackSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    lessons = LessonRefSerializer(many=True, required=False, default=list)
    order = serializers.IntegerField(required=False, default=0)
    progress = serializers.SerializerMethodField()
    progress_late = serializers.SerializerMethodField()
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    can_edit = serializers.SerializerMethodField()

    def get_id(self, obj):
        # Prefer human-friendly public_id when present, otherwise fallback to mongo id
        return str(getattr(obj, "public_id", None) or str(obj.id))

    def get_can_edit(self, obj):
        """Создатель или superuser может удалить трек."""
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not getattr(request.user, "id", None):
            return False
        if getattr(request.user, "role", None) == "superuser":
            return True
        creator = getattr(obj, "created_by_id", None) or ""
        return creator and str(creator) == str(request.user.id)

    def get_progress(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not getattr(request.user, "id", None):
            return {}
        user_id = str(request.user.id)
        result = {}
        for lesson in obj.lessons:
            if lesson.type not in ("lecture", "task", "puzzle", "question", "survey"):
                continue
            display_id = _get_lesson_display_id(lesson)
            status_val, _ = get_lesson_status_for_user(user_id, lesson, display_id)
            result[display_id] = status_val
        return result

    def get_progress_late(self, obj):
        """Просрочка в секундах для уроков со статусом completed_late."""
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not getattr(request.user, "id", None):
            return {}
        user_id = str(request.user.id)
        result = {}
        for lesson in obj.lessons:
            if lesson.type not in ("lecture", "task", "puzzle", "question", "survey"):
                continue
            display_id = _get_lesson_display_id(lesson)
            status_val, late_by = get_lesson_status_for_user(user_id, lesson, display_id)
            if status_val == "completed_late" and late_by:
                result[display_id] = late_by
        return result

    def _normalize_lessons(self, lessons_data):
        """Resolve each lesson id (public_id or ObjectId) to MongoDB ObjectId for storage."""
        result = []
        for i, r in enumerate(lessons_data):
            lesson_type = r.get("type") or ""
            lesson_id = r.get("id") or ""
            try:
                stored_id = _resolve_lesson_id(lesson_type, lesson_id)
            except Exception as e:
                raise serializers.ValidationError({"lessons": f"Урок #{i + 1}: не найден объект (id={lesson_id}, type={lesson_type}). {e}"})
            result.append({
                "id": stored_id,
                "type": lesson_type,
                "title": r.get("title", ""),
                "order": r.get("order", i),
            })
        return result

    def create(self, validated_data):
        lessons_data = validated_data.pop("lessons", [])
        request = self.context.get("request")
        created_by_id = str(request.user.id) if request and getattr(request.user, "id", None) else ""
        track = Track(
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            order=validated_data.get("order", 0),
            visible_group_ids=validated_data.get("visible_group_ids", []),
            created_by_id=created_by_id,
        )
        track.lessons = [LessonRef(**r) for r in self._normalize_lessons(lessons_data)]
        track.save()
        return track

    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.order = validated_data.get("order", instance.order)
        if "visible_group_ids" in validated_data:
            instance.visible_group_ids = validated_data.get("visible_group_ids", instance.visible_group_ids)
        if "lessons" in validated_data:
            instance.lessons = [LessonRef(**r) for r in self._normalize_lessons(validated_data["lessons"])]
        instance.save()
        return instance
