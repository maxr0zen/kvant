from rest_framework import serializers
from .documents import Lecture


class LectureSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=500)
    track_id = serializers.CharField(required=False, allow_null=True, default=None)
    content = serializers.CharField(required=False, allow_blank=True, default="")
    blocks = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    def get_id(self, obj):
        return str(obj.id)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # blocks are stored as dicts; pass through as-is for polymorphic shape
        if hasattr(instance, "blocks") and instance.blocks:
            data["blocks"] = instance.blocks
        return data

    def create(self, validated_data):
        blocks = validated_data.pop("blocks", [])
        lecture = Lecture(
            title=validated_data["title"],
            track_id=validated_data.get("track_id"),
            content=validated_data.get("content", ""),
            blocks=blocks,
        )
        lecture.save()
        return lecture
