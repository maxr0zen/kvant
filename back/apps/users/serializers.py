from rest_framework import serializers
from .documents import User, UserRole


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, write_only=True, max_length=255)
    password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})


class UserSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    def get_id(self, obj):
        return str(obj.id)

    def get_full_name(self, obj):
        return obj.full_name

    def get_role(self, obj):
        return getattr(obj.role, "value", obj.role) or obj.role


class UserListSerializer(serializers.Serializer):
    """Для таблицы: id, username, first_name, last_name, role, group_id/group_ids, created_at."""
    id = serializers.SerializerMethodField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    group_id = serializers.SerializerMethodField()
    group_ids = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_full_name(self, obj):
        return obj.full_name

    def get_role(self, obj):
        return getattr(obj.role, "value", obj.role) or obj.role

    def get_group_id(self, obj):
        return getattr(obj, "group_id", None) or None

    def get_group_ids(self, obj):
        return getattr(obj, "group_ids", None) or []


class UserCreateSerializer(serializers.Serializer):
    """Создание учителя или ученика (только superuser)."""
    username = serializers.CharField(required=True, max_length=255)
    first_name = serializers.CharField(required=True, max_length=100)
    last_name = serializers.CharField(required=True, max_length=100)
    password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"}, min_length=6)
    role = serializers.ChoiceField(choices=[UserRole.TEACHER.value, UserRole.STUDENT.value], required=True)
    group_id = serializers.CharField(required=False, allow_null=True)
    group_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def create(self, validated_data):
        username = validated_data["username"].strip()
        if User.objects(username=username).first():
            raise serializers.ValidationError({"username": "Пользователь с таким логином уже существует."})
        user = User(
            username=username,
            first_name=validated_data["first_name"].strip(),
            last_name=validated_data["last_name"].strip(),
            role=validated_data["role"],
            group_id=validated_data.get("group_id"),
            group_ids=validated_data.get("group_ids") or [],
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class TeacherCreateStudentSerializer(serializers.Serializer):
    """Создание ученика в группе (учитель или superuser)."""
    username = serializers.CharField(required=True, max_length=255)
    first_name = serializers.CharField(required=True, max_length=100)
    last_name = serializers.CharField(required=True, max_length=100)
    password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"}, min_length=6)

    def create(self, validated_data, **kwargs):
        group_id = kwargs.get("group_id")
        if not group_id:
            raise serializers.ValidationError("group_id is required")
        username = validated_data["username"].strip()
        if User.objects(username=username).first():
            raise serializers.ValidationError({"username": "Пользователь с таким логином уже существует."})
        user = User(
            username=username,
            first_name=validated_data["first_name"].strip(),
            last_name=validated_data["last_name"].strip(),
            role=UserRole.STUDENT.value,
            group_id=group_id,
            group_ids=[],
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class UserUpdateSerializer(serializers.Serializer):
    """Обновление пользователя: first_name, last_name, group_id (ученик), group_ids (учитель)."""
    first_name = serializers.CharField(required=False, max_length=100)
    last_name = serializers.CharField(required=False, max_length=100)
    group_id = serializers.CharField(required=False, allow_null=True)
    group_ids = serializers.ListField(child=serializers.CharField(), required=False)

    def update(self, instance, validated_data):
        if "first_name" in validated_data:
            instance.first_name = validated_data["first_name"].strip()
        if "last_name" in validated_data:
            instance.last_name = validated_data["last_name"].strip()
        if "group_id" in validated_data:
            instance.group_id = validated_data["group_id"]
        if "group_ids" in validated_data:
            instance.group_ids = validated_data["group_ids"]
        instance.save()
        return instance
