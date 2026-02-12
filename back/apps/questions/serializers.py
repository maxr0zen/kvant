from rest_framework import serializers
from common.db_utils import datetime_to_iso_utc, to_utc_datetime, get_doc_by_pk
from .documents import Question, QuestionChoiceEmbed


class QuestionChoiceSerializer(serializers.Serializer):
    id = serializers.CharField()
    text = serializers.CharField()
    is_correct = serializers.BooleanField(required=False, default=False)


class QuestionSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=500)
    prompt = serializers.CharField(required=False, allow_blank=True)
    track_id = serializers.CharField(required=False, allow_null=True)
    choices = QuestionChoiceSerializer(many=True)
    multiple = serializers.BooleanField(default=False)
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    hints = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    available_from = serializers.DateTimeField(required=False, allow_null=True, default=None)
    available_until = serializers.DateTimeField(required=False, allow_null=True, default=None)
    max_attempts = serializers.IntegerField(required=False, allow_null=True, default=None)

    def to_representation(self, instance):
        from apps.submissions.documents import AssignmentAttempt
        request = self.context.get("request")
        attempts_used = None
        can_edit = False
        if request and getattr(request, "user", None) and getattr(request.user, "id", None):
            attempts_used = AssignmentAttempt.objects(
                user_id=str(request.user.id), target_type="question", target_id=str(instance.id)
            ).count()
            if getattr(request.user, "role", None) == "superuser":
                can_edit = True
            else:
                creator = getattr(instance, "created_by_id", None) or ""
                if creator and str(creator) == str(request.user.id):
                    can_edit = True
        choices_payload = [{"id": c.id, "text": c.text} for c in instance.choices]
        if can_edit:
            choices_payload = [{"id": c.id, "text": c.text, "is_correct": c.is_correct} for c in instance.choices]
        return {
            "id": str(getattr(instance, "public_id", None) or instance.id),
            "title": instance.title,
            "prompt": instance.prompt,
            "track_id": instance.track_id,
            "choices": choices_payload,
            "multiple": instance.multiple,
            "visible_group_ids": getattr(instance, "visible_group_ids", []) or [],
            "hints": getattr(instance, "hints", []) or [],
            "available_from": datetime_to_iso_utc(getattr(instance, "available_from", None)),
            "available_until": datetime_to_iso_utc(getattr(instance, "available_until", None)),
            "max_attempts": getattr(instance, "max_attempts", None),
            "attempts_used": attempts_used,
            "can_edit": can_edit,
        }

    def create(self, validated_data):
        choices_data = validated_data.pop("choices", [])
        visible_group_ids = validated_data.pop("visible_group_ids", [])
        available_from = to_utc_datetime(validated_data.pop("available_from", None))
        available_until = to_utc_datetime(validated_data.pop("available_until", None))
        hints = validated_data.pop("hints", [])
        max_attempts = validated_data.pop("max_attempts", None)
        request = self.context.get("request")
        created_by_id = str(request.user.id) if request and getattr(request.user, "id", None) else ""
        track_id = validated_data.get("track_id") or ""
        choices = [
            QuestionChoiceEmbed(
                id=c.get("id", ""),
                text=c.get("text", ""),
                is_correct=c.get("is_correct", False),
            )
            for c in choices_data
        ]
        question = Question(
            title=validated_data["title"],
            prompt=validated_data.get("prompt", ""),
            track_id=track_id,
            choices=choices,
            multiple=validated_data.get("multiple", False),
            visible_group_ids=visible_group_ids,
            hints=hints or [],
            available_from=available_from,
            available_until=available_until,
            max_attempts=max_attempts,
            created_by_id=created_by_id,
        )
        question.save()

        if track_id:
            try:
                from apps.tracks.documents import Track, LessonRef
                track = get_doc_by_pk(Track, track_id)
                q_oid = str(question.id)
                if not any(getattr(lr, "id", None) == q_oid for lr in track.lessons):
                    order = max((lr.order for lr in track.lessons), default=-1) + 1
                    track.lessons.append(
                        LessonRef(id=q_oid, type="question", title=question.title, order=order)
                    )
                    track.save()
            except Exception:
                pass

        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop("choices", None)
        for attr in ("title", "prompt", "track_id", "multiple", "visible_group_ids", "hints", "max_attempts"):
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        if "available_from" in validated_data:
            instance.available_from = to_utc_datetime(validated_data["available_from"])
        if "available_until" in validated_data:
            instance.available_until = to_utc_datetime(validated_data["available_until"])
        if "track_id" in validated_data and validated_data["track_id"] is None:
            instance.track_id = ""
        if choices_data is not None:
            existing_by_id = {c.id: c for c in instance.choices}
            new_choices = []
            for c in choices_data:
                if isinstance(c, dict):
                    cid = c.get("id", "")
                    text = c.get("text", "")
                    is_correct = c.get("is_correct") if "is_correct" in c else (existing_by_id[cid].is_correct if cid in existing_by_id else False)
                    new_choices.append(QuestionChoiceEmbed(id=cid, text=text, is_correct=is_correct))
                else:
                    new_choices.append(c)
            instance.choices = new_choices
        instance.save()
        return instance
