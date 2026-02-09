from rest_framework import serializers
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

    def get_id(self, obj):
        return str(getattr(obj, "public_id", None) or obj.id)

    def to_representation(self, instance):
        data = super().to_representation(instance)
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
        )
        lecture.save()
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
        instance.save()
        return instance
