from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .documents import User


class MongoJWTAuthentication(JWTAuthentication):
    """Validates JWT and sets request.user to MongoEngine User document."""

    def get_user(self, validated_token):
        from bson import ObjectId
        user_id = validated_token.get("user_id")
        if not user_id:
            raise InvalidToken("Token contains no user_id")
        try:
            uid = user_id if isinstance(user_id, ObjectId) else ObjectId(user_id)
            user = User.objects.get(id=uid)
        except (User.DoesNotExist, Exception):
            raise InvalidToken("User not found")
        return user
