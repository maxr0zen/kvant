from rest_framework import serializers
from common.db_utils import datetime_to_iso_utc, to_utc_datetime, get_doc_by_pk
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
    visible_group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    hints = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    available_from = serializers.DateTimeField(required=False, allow_null=True, default=None)
    available_until = serializers.DateTimeField(required=False, allow_null=True, default=None)
    max_attempts = serializers.IntegerField(required=False, allow_null=True, default=None)

    def create(self, validated_data):
        blocks_data = validated_data.pop('blocks', [])
        visible_group_ids = validated_data.pop('visible_group_ids', [])
        hints = validated_data.pop('hints', [])
        available_from = to_utc_datetime(validated_data.pop('available_from', None))
        available_until = to_utc_datetime(validated_data.pop('available_until', None))
        max_attempts = validated_data.pop('max_attempts', None)
        blocks = [CodeBlockEmbed(**block_data) for block_data in blocks_data]

        track_id = validated_data.pop("track_id", None) or ""
        request = self.context.get("request")
        created_by_id = str(request.user.id) if request and getattr(request.user, "id", None) else ""
        puzzle = Puzzle(
            track_id=track_id,
            blocks=blocks,
            visible_group_ids=visible_group_ids,
            hints=hints,
            available_from=available_from,
            available_until=available_until,
            max_attempts=max_attempts,
            created_by_id=created_by_id,
            **validated_data
        )
        puzzle.save()

        # Автоматически добавляем puzzle в lessons трека, если указан track_id
        if track_id:
            try:
                from apps.tracks.documents import Track, LessonRef
                track = get_doc_by_pk(Track, track_id)
                puz_oid = str(puzzle.id)
                if not any(getattr(lr, "id", None) == puz_oid for lr in track.lessons):
                    order = max((lr.order for lr in track.lessons), default=-1) + 1
                    track.lessons.append(
                        LessonRef(id=puz_oid, type="puzzle", title=puzzle.title, order=order)
                    )
                    track.save()
            except Exception:
                pass

        return puzzle

    def to_representation(self, instance):
        from apps.submissions.documents import AssignmentAttempt
        request = self.context.get("request")
        can_edit = False
        if request and getattr(request, "user", None) and getattr(request.user, "id", None):
            if getattr(request.user, "role", None) == "superuser":
                can_edit = True
            else:
                creator = getattr(instance, "created_by_id", None) or ""
                if creator and str(creator) == str(request.user.id):
                    can_edit = True
        data = {
            'id': str(getattr(instance, "public_id", None) or instance.id),
            'title': instance.title,
            'can_edit': can_edit,
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
            'solution': instance.solution,
            'visible_group_ids': getattr(instance, 'visible_group_ids', []) or [],
            'hints': getattr(instance, 'hints', []) or [],
            'available_from': datetime_to_iso_utc(getattr(instance, 'available_from', None)),
            'available_until': datetime_to_iso_utc(getattr(instance, 'available_until', None)),
            'max_attempts': getattr(instance, 'max_attempts', None),
        }
        request = self.context.get("request")
        if request and getattr(request, "user", None) and getattr(request.user, "id", None):
            data['attempts_used'] = AssignmentAttempt.objects(
                user_id=str(request.user.id), target_type="puzzle", target_id=str(instance.id)
            ).count()
        else:
            data['attempts_used'] = None
        return data

    def update(self, instance, validated_data):
        blocks_data = validated_data.pop("blocks", None)
        for attr in ("title", "description", "track_id", "language", "solution", "visible_group_ids",
                     "hints", "max_attempts"):
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        if "available_from" in validated_data:
            instance.available_from = to_utc_datetime(validated_data["available_from"])
        if "available_until" in validated_data:
            instance.available_until = to_utc_datetime(validated_data["available_until"])
        if "track_id" in validated_data and validated_data["track_id"] is None:
            instance.track_id = ""
        if blocks_data is not None:
            instance.blocks = [CodeBlockEmbed(**b) for b in blocks_data]
        instance.save()
        return instance
