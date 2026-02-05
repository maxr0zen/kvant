from rest_framework import serializers
from .documents import Track, LessonRef


class LessonRefSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    type = serializers.ChoiceField(choices=["lecture", "task", "puzzle"])
    title = serializers.CharField()
    order = serializers.IntegerField()

    def get_id(self, obj):
        # Try to return human-friendly public_id for referenced lesson if it exists,
        # otherwise return the stored id (usually Mongo ObjectId string).
        try:
            from bson import ObjectId
            if getattr(obj, "type", None) == "lecture":
                from apps.lectures.documents import Lecture
                try:
                    lec = Lecture.objects.get(id=ObjectId(obj.id))
                    return str(getattr(lec, "public_id", None) or str(lec.id))
                except Exception:
                    return str(obj.id)
            if getattr(obj, "type", None) == "task":
                from apps.tasks.documents import Task
                try:
                    task = Task.objects.get(id=ObjectId(obj.id))
                    return str(getattr(task, "public_id", None) or str(task.id))
                except Exception:
                    return str(obj.id)
            if getattr(obj, "type", None) == "puzzle":
                from apps.puzzles.documents import Puzzle
                try:
                    p = Puzzle.objects.get(id=ObjectId(obj.id))
                    return str(getattr(p, "public_id", None) or str(p.id))
                except Exception:
                    return str(obj.id)
        except Exception:
            return str(getattr(obj, "id", ""))


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
        if not request or not getattr(request, "user", None):
            return {}
        from apps.submissions.documents import Submission
        user_id = str(request.user.id)
        task_ids = [l.id for l in obj.lessons if l.type == "task"]
        result = {}
        for task_id in task_ids:
            last = (
                Submission.objects(user_id=user_id, task_id=task_id)
                .order_by("-created_at")
                .first()
            )
            if last:
                result[task_id] = "completed" if last.passed else "started"
            else:
                result[task_id] = "not_started"
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
