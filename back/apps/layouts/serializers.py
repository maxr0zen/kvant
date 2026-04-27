from rest_framework import serializers
from common.db_utils import datetime_to_iso_utc, to_utc_datetime, get_doc_by_pk
from .documents import LayoutLesson, LayoutSubtaskEmbed, VALID_EDITABLE, VALID_CHECK_MODES


def _attached_lecture_id_for_api(raw: str) -> str:
    """Сырый id из БД (ObjectId или public_id) → id для API (предпочтительно public_id лекции)."""
    v = (raw or "").strip()
    if not v:
        return ""
    try:
        from apps.lectures.documents import Lecture

        lec = get_doc_by_pk(Lecture, v)
        return str(getattr(lec, "public_id", None) or str(lec.id))
    except Exception:
        return v


def _embedded_attached_lecture(raw_attached: str, request):
    """
    Полное тело лекции для встроенного просмотра на странице верстки.
    Убирает второй HTTP-запрос на клиенте (важно при CORS / NEXT_PUBLIC_API_URL / JWT).
    """
    v = (raw_attached or "").strip()
    if not v:
        return None
    try:
        from apps.lectures.documents import Lecture
        from apps.lectures.serializers import LectureSerializer

        lec = get_doc_by_pk(Lecture, v)
        return LectureSerializer(lec, context={"request": request}).data
    except Exception:
        return None


class LayoutSubtaskSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    check_type = serializers.ChoiceField(choices=["selector_exists", "html_contains", "css_contains", "js_contains"])
    check_value = serializers.CharField()


class LayoutSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    attached_lecture_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    track_id = serializers.CharField(required=False, allow_blank=True, default="")
    template_html = serializers.CharField(required=False, allow_blank=True, default="")
    template_css = serializers.CharField(required=False, allow_blank=True, default="")
    template_js = serializers.CharField(required=False, allow_blank=True, default="")
    reference_html = serializers.CharField(required=False, allow_blank=True, default="")
    reference_css = serializers.CharField(required=False, allow_blank=True, default="")
    reference_js = serializers.CharField(required=False, allow_blank=True, default="")
    check_mode = serializers.ChoiceField(choices=list(VALID_CHECK_MODES), required=False, default="subtasks")
    editable_files = serializers.ListField(
        child=serializers.ChoiceField(choices=list(VALID_EDITABLE)),
        required=False,
        default=list,
    )
    subtasks = LayoutSubtaskSerializer(many=True, required=False, default=list)
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    hints = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    reward_achievement_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
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

    def validate_attached_lecture_id(self, value):
        if value is None:
            return ""
        v = str(value).strip()
        if not v:
            return ""
        from apps.lectures.documents import Lecture

        try:
            lec = get_doc_by_pk(Lecture, v)
        except Lecture.DoesNotExist:
            raise serializers.ValidationError("Лекция не найдена.")
        return str(getattr(lec, "public_id", None) or str(lec.id))

    def to_representation(self, instance):
        raw_attached = getattr(instance, "attached_lecture_id", "") or ""
        request = self.context.get("request")
        return {
            "id": self.get_id(instance),
            "title": instance.title,
            "description": getattr(instance, "description", "") or "",
            "attached_lecture_id": _attached_lecture_id_for_api(raw_attached),
            "attached_lecture": _embedded_attached_lecture(raw_attached, request),
            "track_id": getattr(instance, "track_id", "") or "",
            "template_html": getattr(instance, "template_html", "") or "",
            "template_css": getattr(instance, "template_css", "") or "",
            "template_js": getattr(instance, "template_js", "") or "",
            "check_mode": getattr(instance, "check_mode", "subtasks") or "subtasks",
            # Эталон отдаем только редактору задания.
            "reference_html": (getattr(instance, "reference_html", "") or "") if self.get_can_edit(instance) else "",
            "reference_css": (getattr(instance, "reference_css", "") or "") if self.get_can_edit(instance) else "",
            "reference_js": (getattr(instance, "reference_js", "") or "") if self.get_can_edit(instance) else "",
            "editable_files": getattr(instance, "editable_files", None) or ["html", "css", "js"],
            "subtasks": [
                {"id": st.id, "title": st.title, "check_type": st.check_type, "check_value": st.check_value}
                for st in (getattr(instance, "subtasks", None) or [])
            ],
            "visible_group_ids": getattr(instance, "visible_group_ids", []) or [],
            "hints": getattr(instance, "hints", []) or [],
            "reward_achievement_ids": getattr(instance, "reward_achievement_ids", []) or [],
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
        reward_achievement_ids = validated_data.pop("reward_achievement_ids", [])
        available_from = to_utc_datetime(validated_data.pop("available_from", None))
        available_until = to_utc_datetime(validated_data.pop("available_until", None))
        max_attempts = validated_data.pop("max_attempts", None)
        request = self.context.get("request")
        created_by_id = str(request.user.id) if request and getattr(request.user, "id", None) else ""

        layout = LayoutLesson(
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            attached_lecture_id=validated_data.get("attached_lecture_id", "") or "",
            track_id=validated_data.get("track_id") or "",
            template_html=validated_data.get("template_html", ""),
            template_css=validated_data.get("template_css", ""),
            template_js=validated_data.get("template_js", ""),
            reference_html=validated_data.get("reference_html", "") or validated_data.get("template_html", ""),
            reference_css=validated_data.get("reference_css", "") or validated_data.get("template_css", ""),
            reference_js=validated_data.get("reference_js", "") or validated_data.get("template_js", ""),
            check_mode=validated_data.get("check_mode", "subtasks"),
            editable_files=editable,
            visible_group_ids=visible_group_ids,
            hints=hints,
            reward_achievement_ids=reward_achievement_ids,
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
        for attr in ("title", "description", "attached_lecture_id", "track_id", "template_html", "template_css", "template_js",
                     "reference_html", "reference_css", "reference_js", "check_mode",
                     "visible_group_ids", "hints", "reward_achievement_ids", "max_attempts"):
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
