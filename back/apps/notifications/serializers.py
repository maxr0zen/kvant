from datetime import datetime, timezone, timedelta

from rest_framework import serializers
from common.db_utils import datetime_to_iso_utc, to_utc_datetime


class NotificationSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    message = serializers.CharField(max_length=2000)
    group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    level = serializers.ChoiceField(choices=["info", "success", "warning", "error"], default="info")
    created_at = serializers.DateTimeField(read_only=True)
    available_until = serializers.DateTimeField(required=False, allow_null=True, default=None)
    # Только для создания/обновления: показывать N минут с момента создания/сейчас (вместо available_until).
    duration_minutes = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def to_representation(self, instance):
        data = {
            "id": str(instance.id),
            "message": instance.message,
            "group_ids": getattr(instance, "group_ids", []) or [],
            "level": getattr(instance, "level", "info"),
            "created_at": instance.created_at.isoformat() if instance.created_at else None,
            "available_until": datetime_to_iso_utc(getattr(instance, "available_until", None)),
        }
        return data

    def _compute_available_until(self, validated_data):
        """Общая логика для create/update: available_until или duration_minutes."""
        available_until = to_utc_datetime(validated_data.pop("available_until", None))
        duration_minutes = validated_data.pop("duration_minutes", None)
        if available_until is None and duration_minutes is not None:
            try:
                minutes = int(duration_minutes)
                if minutes > 0:
                    now = datetime.now(timezone.utc)
                    available_until = now + timedelta(minutes=minutes)
            except (TypeError, ValueError):
                pass
        return available_until

    def create(self, validated_data):
        from .documents import Notification
        request = self.context.get("request")
        created_by_id = ""
        if request and getattr(request.user, "id", None):
            created_by_id = str(request.user.id)

        available_until = self._compute_available_until(validated_data)

        notification = Notification(
            message=validated_data["message"],
            group_ids=validated_data.get("group_ids") or [],
            level=validated_data.get("level") or "info",
            created_by_id=created_by_id,
            available_until=available_until,
        )
        notification.save()
        return notification

    def update(self, instance, validated_data):
        # message, group_ids, level можно обновлять
        if "message" in validated_data:
            instance.message = validated_data["message"]
        if "group_ids" in validated_data:
            instance.group_ids = validated_data.get("group_ids") or []
        if "level" in validated_data:
            instance.level = validated_data.get("level") or instance.level

        # available_until / duration_minutes
        if "available_until" in validated_data or "duration_minutes" in validated_data:
            new_available_until = self._compute_available_until(validated_data)
            # Если явно передали null в available_until и нет duration_minutes — снимаем ограничение
            if (
                "available_until" in self.initial_data
                and (self.initial_data.get("available_until") in (None, "", "null"))
                and new_available_until is None
            ):
                instance.available_until = None
            elif new_available_until is not None:
                instance.available_until = new_available_until

        instance.save()
        return instance
