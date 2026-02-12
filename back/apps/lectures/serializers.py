from rest_framework import serializers
from common.db_utils import datetime_to_iso_utc, to_utc_datetime, get_doc_by_pk
from .documents import Lecture


def _sanitize_choices(choices, strip_correct=False):
    """strip_correct=True — убрать is_correct (для учеников)."""
    result = []
    for c in (choices or []):
        item = {"id": c.get("id", ""), "text": c.get("text", "")}
        if not strip_correct and "is_correct" in c:
            item["is_correct"] = c.get("is_correct")
        result.append(item)
    return result


def _sanitize_blocks_for_client(blocks, for_editor=False):
    """Скрывает is_correct при отдаче ученикам. for_editor=True — сохраняем is_correct для редактирования."""
    if not blocks:
        return blocks
    result = []
    for b in blocks:
        if isinstance(b, dict) and b.get("type") == "question":
            result.append({
                "type": "question",
                "id": b.get("id", ""),
                "title": b.get("title", ""),
                "prompt": b.get("prompt", ""),
                "choices": _sanitize_choices(b.get("choices", []), strip_correct=not for_editor),
                "multiple": b.get("multiple", False),
                "hints": b.get("hints") if isinstance(b.get("hints"), list) else [],
            })
        elif isinstance(b, dict) and b.get("type") == "video":
            pause_points = []
            for pp in b.get("pause_points", []):
                q = pp.get("question", {}) or {}
                pause_points.append({
                    "id": pp.get("id", ""),
                    "timestamp": int(pp.get("timestamp", 0) or 0),
                    "question": {
                        "id": q.get("id", ""),
                        "title": q.get("title", ""),
                        "prompt": q.get("prompt", ""),
                        "choices": _sanitize_choices(q.get("choices", []), strip_correct=not for_editor),
                        "multiple": bool(q.get("multiple", False)),
                    },
                })
            result.append({
                "type": "video",
                "id": b.get("id", ""),
                "url": b.get("url", ""),
                "pause_points": pause_points,
            })
        else:
            result.append(b)
    return result


class LectureSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=500)
    track_id = serializers.CharField(required=False, allow_null=True, default=None)
    content = serializers.CharField(required=False, allow_blank=True, default="")
    blocks = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    available_from = serializers.DateTimeField(required=False, allow_null=True, default=None)
    available_until = serializers.DateTimeField(required=False, allow_null=True, default=None)
    hints = serializers.ListField(child=serializers.CharField(allow_blank=True), required=False, default=list)
    max_attempts = serializers.IntegerField(required=False, allow_null=True, default=None)

    def get_id(self, obj):
        return str(getattr(obj, "public_id", None) or obj.id)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["available_from"] = datetime_to_iso_utc(getattr(instance, "available_from", None))
        data["available_until"] = datetime_to_iso_utc(getattr(instance, "available_until", None))
        request = self.context.get("request")
        can_edit = False
        if request and getattr(request.user, "id", None):
            if getattr(request.user, "role", None) == "superuser":
                can_edit = True
            else:
                creator = getattr(instance, "created_by_id", None) or ""
                if creator and str(creator) == str(request.user.id):
                    can_edit = True
        data["can_edit"] = can_edit
        if hasattr(instance, "blocks") and instance.blocks:
            data["blocks"] = _sanitize_blocks_for_client(instance.blocks, for_editor=can_edit)
        return data

    def create(self, validated_data):
        blocks = validated_data.pop("blocks", [])
        visible_group_ids = validated_data.pop("visible_group_ids", [])
        available_from = to_utc_datetime(validated_data.pop("available_from", None))
        available_until = to_utc_datetime(validated_data.pop("available_until", None))
        hints = validated_data.pop("hints", [])
        max_attempts = validated_data.pop("max_attempts", None)
        request = self.context.get("request")
        created_by_id = ""
        if request and getattr(request.user, "id", None):
            created_by_id = str(request.user.id)
        lecture = Lecture(
            title=validated_data["title"],
            track_id=validated_data.get("track_id") or "",
            content=validated_data.get("content", ""),
            blocks=blocks,
            visible_group_ids=visible_group_ids,
            created_by_id=created_by_id,
            available_from=available_from,
            available_until=available_until,
            hints=hints or [],
            max_attempts=max_attempts,
        )
        lecture.save()

        # Автоматически добавляем лекцию в lessons трека, если указан track_id
        track_id_val = validated_data.get("track_id") or ""
        if track_id_val:
            try:
                from apps.tracks.documents import Track, LessonRef
                track = get_doc_by_pk(Track, track_id_val)
                lec_oid = str(lecture.id)
                if not any(getattr(lr, "id", None) == lec_oid for lr in track.lessons):
                    order = max((lr.order for lr in track.lessons), default=-1) + 1
                    track.lessons.append(
                        LessonRef(id=lec_oid, type="lecture", title=lecture.title, order=order)
                    )
                    track.save()
            except Exception:
                pass

        return lecture

    def update(self, instance, validated_data):
        if "title" in validated_data:
            instance.title = validated_data["title"]
        if "track_id" in validated_data:
            instance.track_id = validated_data.get("track_id") or ""
        if "content" in validated_data:
            instance.content = validated_data["content"]
        if "blocks" in validated_data:
            instance.blocks = validated_data["blocks"]
        if "visible_group_ids" in validated_data:
            instance.visible_group_ids = validated_data.get("visible_group_ids", instance.visible_group_ids)
        if "available_from" in validated_data:
            instance.available_from = to_utc_datetime(validated_data.get("available_from"))
        if "available_until" in validated_data:
            instance.available_until = to_utc_datetime(validated_data.get("available_until"))
        if "hints" in validated_data:
            instance.hints = validated_data.get("hints", instance.hints) or []
        if "max_attempts" in validated_data:
            instance.max_attempts = validated_data.get("max_attempts")
        instance.save()
        return instance
