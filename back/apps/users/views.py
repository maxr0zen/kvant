from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import AccessToken

from bson import ObjectId

from apps.groups.documents import Group
from .documents import User, UserRole
from .serializers import (
    LoginSerializer,
    UserSerializer,
    UserListSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
)
from .permissions import IsSuperuser, IsTeacher, IsTeacherOrSuperuser


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


class ProfileView(APIView):
    """Личный кабинет: активность и успеваемость по трекам (для учеников)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        user_id = str(user.id)

        # Активность: последние действия по урокам
        from apps.submissions.documents import LessonProgress
        from apps.tracks.documents import Track

        activity = []
        for lp in LessonProgress.objects(user_id=user_id).order_by("-updated_at")[:20]:
            activity.append({
                "lesson_id": lp.lesson_id,
                "lesson_title": lp.lesson_title or "Урок",
                "lesson_type": lp.lesson_type,
                "track_id": lp.track_id,
                "track_title": lp.track_title or "Трек",
                "status": lp.status,
                "updated_at": lp.updated_at.isoformat() if lp.updated_at else None,
            })

        # Успеваемость по доступным трекам
        user_group_ids = []
        if getattr(user, "group_id", None):
            user_group_ids.append(str(user.group_id))
        if getattr(user, "group_ids", None):
            user_group_ids.extend([str(g) for g in user.group_ids])

        tracks_qs = Track.objects.order_by("order")
        if not user_group_ids:
            tracks_qs = tracks_qs.filter(__raw__={"$or": [{"visible_group_ids": {"$exists": False}}, {"visible_group_ids": []}]})
        else:
            tracks_qs = tracks_qs.filter(__raw__={
                "$or": [
                    {"visible_group_ids": {"$exists": False}},
                    {"visible_group_ids": []},
                    {"visible_group_ids": {"$in": user_group_ids}},
                ]
            })

        progress_summary = []
        from apps.tracks.serializers import _get_lesson_display_id, get_lesson_status_for_user
        for track in tracks_qs:
            total = sum(1 for l in track.lessons if l.type in ("lecture", "task", "puzzle", "question"))
            if total == 0:
                continue
            completed = 0
            started = 0
            for lesson in track.lessons:
                if lesson.type not in ("lecture", "task", "puzzle", "question"):
                    continue
                display_id = _get_lesson_display_id(lesson)
                status = get_lesson_status_for_user(user_id, lesson, display_id)
                if status == "completed":
                    completed += 1
                elif status == "started":
                    started += 1
            progress_summary.append({
                "track_id": str(getattr(track, "public_id", None) or track.id),
                "track_title": track.title,
                "total": total,
                "completed": completed,
                "started": started,
                "percent": round(100 * completed / total) if total else 0,
            })

        group_links = None
        if getattr(user, "group_id", None):
            from apps.groups.documents import Group
            try:
                g = Group.objects.get(id=ObjectId(user.group_id))
                group_links = {
                    "child_chat_url": getattr(g, "child_chat_url", None) or "",
                    "parent_chat_url": getattr(g, "parent_chat_url", None) or "",
                    "links": getattr(g, "links", None) or [],
                }
            except Exception:
                pass

        achievements_list = []
        try:
            from apps.achievements.documents import UserAchievement
            from apps.achievements.registry import ACHIEVEMENTS
            for ua in UserAchievement.objects(user_id=user_id).order_by("unlocked_at"):
                ach = ACHIEVEMENTS.get(ua.achievement_id)
                if ach:
                    achievements_list.append({
                        "id": ach["id"],
                        "title": ach["title"],
                        "description": ach["description"],
                        "icon": ach["icon"],
                        "unlocked_at": ua.unlocked_at.isoformat() if ua.unlocked_at else None,
                    })
        except Exception:
            achievements_list = []

        return Response({
            "user": {
                "id": str(user.id),
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.full_name,
                "role": getattr(user.role, "value", user.role),
            },
            "activity": activity,
            "progress": progress_summary,
            "group_links": group_links,
            "achievements": achievements_list,
        })


class TeacherGroupsProgressView(APIView):
    """Прогресс учеников по группам (для учителей). Учитель видит только свои группы; superuser — все."""
    permission_classes = [IsAuthenticated, IsTeacherOrSuperuser]

    def get(self, request):
        from apps.groups.documents import Group
        from apps.tracks.documents import Track

        user = request.user
        is_superuser = getattr(user, "role", None) == UserRole.SUPERUSER.value
        teacher_group_ids = list(getattr(user, "group_ids", []) or [])
        teacher_group_ids = [str(g) for g in teacher_group_ids]

        if is_superuser:
            groups_qs_all = Group.objects.all().order_by("order", "title")
            teacher_group_ids = [str(g.id) for g in groups_qs_all]
            if not teacher_group_ids:
                return Response({"groups": []})
        elif not teacher_group_ids:
            return Response({"groups": []})

        group_object_ids = [ObjectId(g) for g in teacher_group_ids if g and ObjectId.is_valid(g)]
        if not group_object_ids:
            return Response({"groups": []})

        groups_qs = Group.objects.filter(id__in=group_object_ids).order_by("order", "title")
        students_qs = User.objects(role="student", group_id__in=teacher_group_ids).order_by("first_name", "last_name")

        def get_student_progress(student_id: str):
            from apps.tracks.serializers import _get_lesson_display_id, get_lesson_status_for_user

            user_id = str(student_id)
            progress_list = []
            tracks_qs = Track.objects.order_by("order").filter(__raw__={
                "$or": [
                    {"visible_group_ids": {"$exists": False}},
                    {"visible_group_ids": []},
                    {"visible_group_ids": {"$in": teacher_group_ids}},
                ]
            })
            for track in tracks_qs:
                total = sum(1 for l in track.lessons if l.type in ("lecture", "task", "puzzle", "question"))
                if total == 0:
                    continue
                completed = 0
                started = 0
                for lesson in track.lessons:
                    if lesson.type not in ("lecture", "task", "puzzle", "question"):
                        continue
                    display_id = _get_lesson_display_id(lesson)
                    status = get_lesson_status_for_user(user_id, lesson, display_id)
                    if status == "completed":
                        completed += 1
                    elif status == "started":
                        started += 1
                progress_list.append({
                    "track_id": str(getattr(track, "public_id", None) or track.id),
                    "track_title": track.title,
                    "total": total,
                    "completed": completed,
                    "started": started,
                    "percent": round(100 * completed / total) if total else 0,
                })
            return progress_list

        result = []
        for group in groups_qs:
            group_id_str = str(group.id)
            students_in_group = [s for s in students_qs if str(s.group_id) == group_id_str]
            students_data = []
            for student in students_in_group:
                students_data.append({
                    "id": str(student.id),
                    "username": student.username,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "full_name": student.full_name,
                    "progress": get_student_progress(student.id),
                })
            result.append({
                "id": str(group.id),
                "title": group.title,
                "order": group.order,
                "child_chat_url": getattr(group, "child_chat_url", None) or "",
                "parent_chat_url": getattr(group, "parent_chat_url", None) or "",
                "links": getattr(group, "links", None) or [],
                "students": students_data,
            })

        return Response({"groups": result})


class TeacherGroupLinksView(APIView):
    """Обновление ссылок группы (Детский чат, Родительский чат, доп. ссылки). Учитель — только свои группы."""
    permission_classes = [IsAuthenticated, IsTeacherOrSuperuser]

    def patch(self, request, group_id):
        user = request.user
        is_superuser = getattr(user, "role", None) == UserRole.SUPERUSER.value
        teacher_group_ids = [str(g) for g in (getattr(user, "group_ids", []) or [])]
        if not is_superuser and (not teacher_group_ids or group_id not in teacher_group_ids):
            return Response({"detail": "Нет доступа к этой группе."}, status=status.HTTP_403_FORBIDDEN)
        try:
            group = Group.objects.get(id=ObjectId(group_id))
        except (Group.DoesNotExist, Exception):
            return Response({"detail": "Группа не найдена."}, status=status.HTTP_404_NOT_FOUND)
        data = request.data or {}
        if "child_chat_url" in data:
            group.child_chat_url = str(data.get("child_chat_url", "") or "")
        if "parent_chat_url" in data:
            group.parent_chat_url = str(data.get("parent_chat_url", "") or "")
        if "links" in data:
            links = data.get("links", [])
            if isinstance(links, list):
                group.links = [{"label": str(l.get("label", "")), "url": str(l.get("url", ""))} for l in links if l]
            else:
                group.links = []
        group.save()
        return Response({
            "id": str(group.id),
            "child_chat_url": group.child_chat_url,
            "parent_chat_url": group.parent_chat_url,
            "links": group.links,
        })


class TeacherStudentTrackProgressView(APIView):
    """Детальный прогресс ученика по треку: какие задания сделаны, какие нет."""
    permission_classes = [IsAuthenticated, IsTeacherOrSuperuser]

    def get(self, request, student_id, track_id):
        from apps.tracks.documents import Track
        from apps.tracks.serializers import _get_lesson_display_id, get_lesson_status_for_user

        user = request.user
        is_superuser = getattr(user, "role", None) == UserRole.SUPERUSER.value
        teacher_group_ids = [str(g) for g in (getattr(user, "group_ids", []) or [])]
        if not is_superuser and not teacher_group_ids:
            return Response({"detail": "Нет доступа."}, status=status.HTTP_403_FORBIDDEN)

        try:
            student = User.objects.get(id=ObjectId(student_id))
        except (User.DoesNotExist, Exception):
            return Response({"detail": "Ученик не найден."}, status=status.HTTP_404_NOT_FOUND)
        if student.role != UserRole.STUDENT.value:
            return Response({"detail": "Пользователь не является учеником."}, status=status.HTTP_400_BAD_REQUEST)
        if not is_superuser and str(student.group_id) not in teacher_group_ids:
            return Response({"detail": "Нет доступа к этому ученику."}, status=status.HTTP_403_FORBIDDEN)

        track = None
        for t in Track.objects.all():
            tid = str(getattr(t, "public_id", None) or t.id)
            if tid == track_id:
                track = t
                break
        if not track:
            return Response({"detail": "Трек не найден."}, status=status.HTTP_404_NOT_FOUND)

        user_id = str(student_id)
        lessons_out = []
        LESSON_TYPE_LABELS = {"lecture": "Лекция", "task": "Задача", "puzzle": "Пазл", "question": "Вопрос"}
        for lesson in track.lessons:
            if lesson.type not in ("lecture", "task", "puzzle", "question"):
                continue
            display_id = _get_lesson_display_id(lesson)
            status_val = get_lesson_status_for_user(user_id, lesson, display_id)
            lessons_out.append({
                "lesson_id": display_id,
                "lesson_title": lesson.title,
                "lesson_type": lesson.type,
                "lesson_type_label": LESSON_TYPE_LABELS.get(lesson.type, lesson.type),
                "status": status_val,
            })
        return Response({
            "track_title": track.title,
            "student_name": student.full_name,
            "lessons": lessons_out,
        })


class ResetStudentPasswordView(APIView):
    """Сброс пароля ученика. Учитель — только для своих групп; superuser — для любого."""
    permission_classes = [IsAuthenticated, IsTeacherOrSuperuser]

    def post(self, request, pk):
        import secrets
        try:
            target = User.objects.get(id=ObjectId(pk))
        except (User.DoesNotExist, Exception):
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)
        if target.role != UserRole.STUDENT.value:
            return Response({"detail": "Можно сбрасывать пароль только ученикам."}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        if getattr(user, "role", None) != UserRole.SUPERUSER.value:
            teacher_group_ids = [str(g) for g in (getattr(user, "group_ids", []) or [])]
            if not teacher_group_ids or str(target.group_id) not in teacher_group_ids:
                return Response({"detail": "Нет доступа к этому ученику."}, status=status.HTTP_403_FORBIDDEN)
        new_password = secrets.token_urlsafe(10)
        target.set_password(new_password)
        target.save()
        return Response({
            "username": target.username,
            "password": new_password,
        })


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
