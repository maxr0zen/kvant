from rest_framework import serializers
from .documents import Task, TestCaseEmbed


class TestCaseSerializer(serializers.Serializer):
    id = serializers.CharField()
    input = serializers.CharField(required=False, allow_blank=True)
    expected_output = serializers.CharField()
    is_public = serializers.BooleanField(required=False, default=True)


class TaskSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    starter_code = serializers.CharField(required=False, allow_blank=True, default="")
    track_id = serializers.CharField(required=False, allow_null=True, default=None)
    test_cases = TestCaseSerializer(many=True, required=False, default=list)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        tcs = validated_data.pop("test_cases", [])
        task = Task(
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            starter_code=validated_data.get("starter_code", ""),
            track_id=validated_data.get("track_id"),
        )
        task.test_cases = [TestCaseEmbed(**tc) for tc in tcs]
        task.save()
        return task


class RunCodeSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)


class SubmitResultSerializer(serializers.Serializer):
    passed = serializers.BooleanField()
    results = serializers.ListField(child=serializers.DictField())
    message = serializers.CharField(required=False, allow_blank=True)
