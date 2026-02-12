from rest_framework import serializers
from common.db_utils import datetime_to_iso_utc, to_utc_datetime, get_doc_by_pk
from .documents import Task, TaskCaseEmbed


class TestCaseSerializer(serializers.Serializer):
    id = serializers.CharField()
    input = serializers.CharField(required=False, allow_blank=True)
    expected_output = serializers.CharField()
    is_public = serializers.BooleanField(required=False, default=True)


class TaskSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    starter_code = serializers.CharField(required=False, allow_blank=True, default="")
    track_id = serializers.CharField(required=False, allow_null=True, default=None)
    test_cases = TestCaseSerializer(many=True, required=False, default=list)
    hard = serializers.BooleanField(required=False, default=False)
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    hints = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    available_from = serializers.DateTimeField(required=False, allow_null=True, default=None)
    available_until = serializers.DateTimeField(required=False, allow_null=True, default=None)
    max_attempts = serializers.IntegerField(required=False, allow_null=True, default=None)
    attempts_used = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    def get_id(self, obj):
        return str(getattr(obj, "public_id", None) or obj.id)

    def get_can_edit(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not getattr(request.user, "id", None):
            return False
        if getattr(request.user, "role", None) == "superuser":
            return True
        creator = getattr(obj, "created_by_id", None) or ""
        return creator and str(creator) == str(request.user.id)

    def get_attempts_used(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not getattr(request.user, "id", None):
            return None
        from apps.submissions.documents import Submission
        return Submission.objects(user_id=str(request.user.id), task_id=str(obj.id)).count()

    def create(self, validated_data):
        tcs = validated_data.pop("test_cases", [])
        hard = validated_data.pop("hard", False)
        visible_group_ids = validated_data.pop("visible_group_ids", [])
        hints = validated_data.pop("hints", [])
        available_from = to_utc_datetime(validated_data.pop("available_from", None))
        available_until = to_utc_datetime(validated_data.pop("available_until", None))
        max_attempts = validated_data.pop("max_attempts", None)
        request = self.context.get("request")
        created_by_id = str(request.user.id) if request and getattr(request.user, "id", None) else ""
        task = Task(
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            starter_code=validated_data.get("starter_code", ""),
            track_id=validated_data.get("track_id") or "",
            hard=hard,
            visible_group_ids=visible_group_ids,
            hints=hints,
            available_from=available_from,
            available_until=available_until,
            max_attempts=max_attempts,
            created_by_id=created_by_id,
        )
        task.test_cases = [TaskCaseEmbed(**tc) for tc in tcs]
        task.save()

        # Автоматически добавляем задачу в lessons трека, если указан track_id
        track_id_val = validated_data.get("track_id") or ""
        if track_id_val:
            try:
                from apps.tracks.documents import Track, LessonRef
                track = get_doc_by_pk(Track, track_id_val)
                task_oid = str(task.id)
                if not any(getattr(lr, "id", None) == task_oid for lr in track.lessons):
                    order = max((lr.order for lr in track.lessons), default=-1) + 1
                    track.lessons.append(
                        LessonRef(id=task_oid, type="task", title=task.title, order=order)
                    )
                    track.save()
            except Exception:
                pass  # не ломаем создание задачи при ошибке обновления трека

        return task

    def update(self, instance, validated_data):
        tcs = validated_data.pop("test_cases", None)
        for attr in ("title", "description", "starter_code", "hard", "visible_group_ids",
                     "hints", "max_attempts"):
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        if "available_from" in validated_data:
            instance.available_from = to_utc_datetime(validated_data["available_from"])
        if "available_until" in validated_data:
            instance.available_until = to_utc_datetime(validated_data["available_until"])
        if "track_id" in validated_data:
            instance.track_id = validated_data["track_id"] or ""
        if tcs is not None:
            instance.test_cases = [TaskCaseEmbed(**tc) for tc in tcs]
        instance.save()
        return instance


class RunCodeSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)


class SubmitResultSerializer(serializers.Serializer):
    passed = serializers.BooleanField()
    results = serializers.ListField(child=serializers.DictField())
    message = serializers.CharField(required=False, allow_blank=True)
