from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import AccessToken

from bson import ObjectId

from .documents import User
from .serializers import (
    LoginSerializer,
    UserSerializer,
    UserListSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
)
from .permissions import IsSuperuser


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        username = ser.validated_data["username"].strip()
        password = ser.validated_data["password"]
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"detail": "Неверный логин или пароль."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.check_password(password):
            return Response(
                {"detail": "Неверный логин или пароль."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        token = AccessToken.for_user(_UserWrapper(user))
        return Response({
            "token": str(token),
            "user": UserSerializer(user).data,
        })


class _UserWrapper:
    """Minimal wrapper so AccessToken.for_user() can read user id."""
    def __init__(self, user: User):
        self.id = str(user.id)


class UserListCreateView(APIView):
    """Список пользователей и создание учителя/ученика (только superuser)."""
    permission_classes = [IsSuperuser]

    def get(self, request):
        users = User.objects.all().order_by("-created_at")
        return Response(UserListSerializer(users, many=True).data)

    def post(self, request):
        ser = UserCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(
            UserListSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class UserDetailUpdateView(APIView):
    """Просмотр и редактирование пользователя (только superuser)."""
    permission_classes = [IsSuperuser]

    def get_object(self, pk):
        return User.objects.get(id=ObjectId(pk))

    def get(self, request, pk):
        try:
            user = self.get_object(pk)
        except (User.DoesNotExist, Exception):
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserListSerializer(user).data)

    def patch(self, request, pk):
        try:
            user = self.get_object(pk)
        except (User.DoesNotExist, Exception):
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)
        ser = UserUpdateSerializer(user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserListSerializer(user).data)
