from rest_framework import serializers
from common.db_utils import datetime_to_iso_utc, to_utc_datetime, get_doc_by_pk
from .documents import LayoutLesson, LayoutSubtaskEmbed, VALID_EDITABLE


class LayoutSubtaskSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    check_type = serializers.ChoiceField(choices=["selector_exists", "html_contains"])
    check_value = serializers.CharField()


class LayoutSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    track_id = serializers.CharField(required=False, allow_blank=True, default="")
    template_html = serializers.CharField(required=False, allow_blank=True, default="")
    template_css = serializers.CharField(required=False, allow_blank=True, default="")
    template_js = serializers.CharField(required=False, allow_blank=True, default="")
    editable_files = serializers.ListField(
        child=serializers.ChoiceField(choices=list(VALID_EDITABLE)),
        required=False,
        default=list,
    )
    subtasks = LayoutSubtaskSerializer(many=True, required=False, default=list)
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    hints = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    available_from = serializers.DateTimeField(required=False, allow_null=True, default=None)
    available_until = serializers.DateTimeField(required=False, allow_null=True, default=None)
    max_attempts = serializers.IntegerField(required=False, allow_null=True, default=None)
    can_edit = serializers.SerializerMethodField()
    attempts_used = serializers.SerializerMethodField()

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
        # Layout uses realtime check; attempts не ограничиваются как у task
        return None

    def to_representation(self, instance):
        return {
            "id": self.get_id(instance),
            "title": instance.title,
            "description": getattr(instance, "description", "") or "",
            "track_id": getattr(instance, "track_id", "") or "",
            "template_html": getattr(instance, "template_html", "") or "",
            "template_css": getattr(instance, "template_css", "") or "",
            "template_js": getattr(instance, "template_js", "") or "",
            "editable_files": getattr(instance, "editable_files", None) or ["html", "css", "js"],
            "subtasks": [
                {"id": st.id, "title": st.title, "check_type": st.check_type, "check_value": st.check_value}
                for st in (getattr(instance, "subtasks", None) or [])
            ],
            "visible_group_ids": getattr(instance, "visible_group_ids", []) or [],
            "hints": getattr(instance, "hints", []) or [],
            "available_from": datetime_to_iso_utc(getattr(instance, "available_from", None)),
            "available_until": datetime_to_iso_utc(getattr(instance, "available_until", None)),
            "max_attempts": getattr(instance, "max_attempts", None),
            "can_edit": self.get_can_edit(instance),
            "attempts_used": self.get_attempts_used(instance),
        }

    def _validate_editable_files(self, value):
        if not value:
            return ["html", "css", "js"]
        valid = [f.lower() for f in value if f.lower() in VALID_EDITABLE]
        return valid if valid else ["html", "css", "js"]

    def create(self, validated_data):
        subtasks_data = validated_data.pop("subtasks", [])
        editable = self._validate_editable_files(validated_data.pop("editable_files", []))
        visible_group_ids = validated_data.pop("visible_group_ids", [])
        hints = validated_data.pop("hints", [])
        available_from = to_utc_datetime(validated_data.pop("available_from", None))
        available_until = to_utc_datetime(validated_data.pop("available_until", None))
        max_attempts = validated_data.pop("max_attempts", None)
        request = self.context.get("request")
        created_by_id = str(request.user.id) if request and getattr(request.user, "id", None) else ""

        layout = LayoutLesson(
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            track_id=validated_data.get("track_id") or "",
            template_html=validated_data.get("template_html", ""),
            template_css=validated_data.get("template_css", ""),
            template_js=validated_data.get("template_js", ""),
            editable_files=editable,
            visible_group_ids=visible_group_ids,
            hints=hints,
            available_from=available_from,
            available_until=available_until,
            max_attempts=max_attempts,
            created_by_id=created_by_id,
        )
        layout.subtasks = [LayoutSubtaskEmbed(**st) for st in subtasks_data]
        from .documents import _generate_public_id
        layout.public_id = _generate_public_id()
        layout.save()

        track_id_val = validated_data.get("track_id") or ""
        if track_id_val:
            try:
                from apps.tracks.documents import Track, LessonRef
                track = get_doc_by_pk(Track, track_id_val)
                layout_oid = str(layout.id)
                if not any(getattr(lr, "id", None) == layout_oid for lr in track.lessons):
                    order = max((lr.order for lr in track.lessons), default=-1) + 1
                    track.lessons.append(
                        LessonRef(id=layout_oid, type="layout", title=layout.title, order=order)
                    )
                    track.save()
            except Exception:
                pass

        return layout

    def update(self, instance, validated_data):
        subtasks = validated_data.pop("subtasks", None)
        editable = validated_data.pop("editable_files", None)
        for attr in ("title", "description", "track_id", "template_html", "template_css", "template_js",
                     "visible_group_ids", "hints", "max_attempts"):
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        if "available_from" in validated_data:
            instance.available_from = to_utc_datetime(validated_data["available_from"])
        if "available_until" in validated_data:
            instance.available_until = to_utc_datetime(validated_data["available_until"])
        if editable is not None:
            instance.editable_files = self._validate_editable_files(editable)
        if subtasks is not None:
            instance.subtasks = [LayoutSubtaskEmbed(**st) for st in subtasks]
        instance.save()
        return instance


class LayoutCheckSerializer(serializers.Serializer):
    html = serializers.CharField(required=False, allow_blank=True, default="")
    css = serializers.CharField(required=False, allow_blank=True, default="")
    js = serializers.CharField(required=False, allow_blank=True, default="")


class LayoutDraftSerializer(serializers.Serializer):
    html = serializers.CharField(required=False, allow_blank=True, default="")
    css = serializers.CharField(required=False, allow_blank=True, default="")
    js = serializers.CharField(required=False, allow_blank=True, default="")
