from rest_framework import serializers
from common.db_utils import datetime_to_iso_utc, to_utc_datetime
from .documents import Survey


class SurveySerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=500)
    prompt = serializers.CharField(required=False, allow_blank=True)
    track_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    available_from = serializers.DateTimeField(required=False, allow_null=True, default=None)
    available_until = serializers.DateTimeField(required=False, allow_null=True, default=None)

    def to_representation(self, instance):
        request = self.context.get("request")
        can_edit = False
        is_teacher_or_admin = False
        if request and getattr(request, "user", None) and getattr(request.user, "id", None):
            role = getattr(request.user, "role", None)
            if role == "superuser":
                can_edit = True
                is_teacher_or_admin = True
            elif role == "teacher":
                is_teacher_or_admin = True
                creator = getattr(instance, "created_by_id", None) or ""
                if creator and str(creator) == str(request.user.id):
                    can_edit = True
            else:
                creator = getattr(instance, "created_by_id", None) or ""
                if creator and str(creator) == str(request.user.id):
                    can_edit = True
        return {
            "id": str(getattr(instance, "public_id", None) or instance.id),
            "title": instance.title,
            "prompt": instance.prompt,
            "track_id": getattr(instance, "track_id", "") or "",
            "visible_group_ids": getattr(instance, "visible_group_ids", []) or [],
            "available_from": datetime_to_iso_utc(getattr(instance, "available_from", None)),
            "available_until": datetime_to_iso_utc(getattr(instance, "available_until", None)),
            "can_edit": can_edit,
            "is_teacher_or_admin": is_teacher_or_admin,
        }

    def create(self, validated_data):
        for key in ("available_from", "available_until"):
            if key in validated_data and validated_data[key] is not None:
                validated_data[key] = to_utc_datetime(validated_data[key])
        validated_data.setdefault("track_id", "")
        if validated_data.get("track_id") is None:
            validated_data["track_id"] = ""
        request = self.context.get("request")
        created_by = ""
        if request and getattr(request, "user", None) and getattr(request.user, "id", None):
            created_by = str(request.user.id)
        return Survey.objects.create(**validated_data, created_by_id=created_by)

    def update(self, instance, validated_data):
        for attr in ("title", "prompt", "track_id", "visible_group_ids"):
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        if "track_id" in validated_data and validated_data["track_id"] is None:
            instance.track_id = ""
        if "available_from" in validated_data:
            instance.available_from = to_utc_datetime(validated_data["available_from"])
        if "available_until" in validated_data:
            instance.available_until = to_utc_datetime(validated_data["available_until"])
        instance.save()
        return instance
