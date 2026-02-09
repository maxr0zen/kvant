from rest_framework import serializers
from .documents import Track, LessonRef


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
    except Exception:
        pass
    return str(getattr(lesson_ref, "id", ""))


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
    except Exception:
        pass
    return [i for i in ids if i]


def get_lesson_status_for_user(user_id: str, lesson_ref, display_id: str) -> str:
    """
    Возвращает статус урока для пользователя: 'completed', 'started', 'not_started'.
    Использует ту же логику, что и TrackSerializer.get_progress.
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
            return "completed" if all_completed else ("started" if (lp or any_progress) else "not_started")
        if lp:
            return lp.status
        return "not_started"

    if getattr(lesson_ref, "type", None) == "task":
        if lp:
            return lp.status
        last = (
            Submission.objects(user_id=user_id, task_id=lesson_ref.id)
            .order_by("-created_at")
            .first()
        )
        if last:
            return "completed" if last.passed else "started"
        return "not_started"

    if lp:
        return lp.status
    return "not_started"


class LessonRefSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    type = serializers.ChoiceField(choices=["lecture", "task", "puzzle", "question"])
    title = serializers.CharField()
    order = serializers.IntegerField()
    hard = serializers.SerializerMethodField()

    def get_id(self, obj):
        return _get_lesson_display_id(obj)

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
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def get_id(self, obj):
        # Prefer human-friendly public_id when present, otherwise fallback to mongo id
        return str(getattr(obj, "public_id", None) or str(obj.id))

    def get_progress(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not getattr(request.user, "id", None):
            return {}
        from apps.submissions.documents import Submission, LessonProgress
        user_id = str(request.user.id)
        result = {}
        for lesson in obj.lessons:
            if lesson.type not in ("lecture", "task", "puzzle", "question"):
                continue
            display_id = _get_lesson_display_id(lesson)
            lp = None
            for lid in _get_all_lesson_ids_for_lookup(lesson):
                lp = LessonProgress.objects(user_id=user_id, lesson_id=lid).first()
                if lp:
                    break
            # Для лекций с question-блоками — completed только когда все блоки отвечены
            if lesson.type == "lecture":
                lecture = _get_lecture_for_lesson(lesson)
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
                    lecture_display_id = display_id
                    all_completed = True
                    any_progress = False
                    for qid in q_block_ids:
                        block_lesson_id = f"{lecture_display_id}::{qid}"
                        q_lp = LessonProgress.objects(user_id=user_id, lesson_id=block_lesson_id).first()
                        if q_lp:
                            any_progress = True
                            if q_lp.status != "completed":
                                all_completed = False
                        else:
                            all_completed = False
                    result[display_id] = "completed" if all_completed else ("started" if (lp or any_progress) else "not_started")
                    continue
                # Лекция без question-блоков — просмотр = completed
            if lp:
                result[display_id] = lp.status
                continue
            if lesson.type == "lecture":
                result[display_id] = "not_started"
                continue
            # Для задач — fallback на Submission (обратная совместимость)
            if lesson.type == "task":
                last = (
                    Submission.objects(user_id=user_id, task_id=lesson.id)
                    .order_by("-created_at")
                    .first()
                )
                if last:
                    result[display_id] = "completed" if last.passed else "started"
                else:
                    result[display_id] = "not_started"
            else:
                result[display_id] = "not_started"
        return result

    def create(self, validated_data):
        lessons_data = validated_data.pop("lessons", [])
        track = Track(
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            order=validated_data.get("order", 0),
            visible_group_ids=validated_data.get("visible_group_ids", []),
        )
        track.lessons = [LessonRef(**r) for r in lessons_data]
        track.save()
        return track

    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.order = validated_data.get("order", instance.order)
        if "visible_group_ids" in validated_data:
            instance.visible_group_ids = validated_data.get("visible_group_ids", instance.visible_group_ids)
        if "lessons" in validated_data:
            instance.lessons = [LessonRef(**r) for r in validated_data["lessons"]]
        instance.save()
        return instance
