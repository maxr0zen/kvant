from rest_framework import serializers
from .documents import Puzzle, CodeBlockEmbed


class CodeBlockSerializer(serializers.Serializer):
    id = serializers.CharField()
    code = serializers.CharField()
    order = serializers.CharField()
    indent = serializers.CharField(required=False, allow_blank=True)


class PuzzleSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True)
    track_id = serializers.CharField(required=False, allow_null=True)
    language = serializers.CharField(default="python")
    blocks = CodeBlockSerializer(many=True)
    solution = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        blocks_data = validated_data.pop('blocks', [])
        blocks = [CodeBlockEmbed(**block_data) for block_data in blocks_data]
        
        puzzle = Puzzle(
            blocks=blocks,
            **validated_data
        )
        puzzle.save()
        return puzzle

    def to_representation(self, instance):
        return {
            'id': str(instance.id),
            'title': instance.title,
            'description': instance.description,
            'track_id': instance.track_id,
            'language': instance.language,
            'blocks': [
                {
                    'id': block.id,
                    'code': block.code,
                    'order': block.order,
                    'indent': block.indent
                }
                for block in instance.blocks
            ],
            'solution': instance.solution
        }
