from rest_framework import serializers
from .documents import Group


class GroupSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=255)
    order = serializers.IntegerField(required=False, default=0)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        group = Group(
            title=validated_data["title"].strip(),
            order=validated_data.get("order", 0),
        )
        group.save()
        return group

    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.order = validated_data.get("order", instance.order)
        instance.save()
        return instance
