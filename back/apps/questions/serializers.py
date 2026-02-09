from rest_framework import serializers
from .documents import Question, QuestionChoiceEmbed


class QuestionChoiceSerializer(serializers.Serializer):
    id = serializers.CharField()
    text = serializers.CharField()


class QuestionSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=500)
    prompt = serializers.CharField(required=False, allow_blank=True)
    track_id = serializers.CharField(required=False, allow_null=True)
    choices = QuestionChoiceSerializer(many=True)
    multiple = serializers.BooleanField(default=False)
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def to_representation(self, instance):
        return {
            "id": str(getattr(instance, "public_id", None) or instance.id),
            "title": instance.title,
            "prompt": instance.prompt,
            "track_id": instance.track_id,
            "choices": [{"id": c.id, "text": c.text} for c in instance.choices],
            "multiple": instance.multiple,
            "visible_group_ids": getattr(instance, "visible_group_ids", []) or [],
        }
