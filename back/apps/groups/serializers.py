from rest_framework import serializers
from .documents import Group


class GroupSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=255)
    order = serializers.IntegerField(required=False, default=0)
    child_chat_url = serializers.CharField(required=False, allow_blank=True, default="")
    parent_chat_url = serializers.CharField(required=False, allow_blank=True, default="")
    links = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=False,
        default=list,
    )

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        group = Group(
            title=validated_data["title"].strip(),
            order=validated_data.get("order", 0),
            child_chat_url=validated_data.get("child_chat_url", ""),
            parent_chat_url=validated_data.get("parent_chat_url", ""),
            links=validated_data.get("links", []),
        )
        group.save()
        return group

    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.order = validated_data.get("order", instance.order)
        if "child_chat_url" in validated_data:
            instance.child_chat_url = validated_data.get("child_chat_url", "")
        if "parent_chat_url" in validated_data:
            instance.parent_chat_url = validated_data.get("parent_chat_url", "")
        if "links" in validated_data:
            instance.links = validated_data.get("links", [])
        instance.save()
        return instance
