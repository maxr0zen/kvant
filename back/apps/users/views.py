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
from .teacher_utils import get_teacher_group_ids
from common.db_utils import datetime_to_iso_utc, get_doc_by_pk


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
            st = lp.status
            if st == "completed" and getattr(lp, "completed_late", False):
                st = "completed_late"
            activity.append({
                "lesson_id": lp.lesson_id,
                "lesson_title": lp.lesson_title or "Урок",
                "lesson_type": lp.lesson_type,
                "track_id": lp.track_id,
                "track_title": lp.track_title or "Трек",
                "status": st,
                "late_by_seconds": getattr(lp, "late_by_seconds", 0) or 0,
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
                status, _ = get_lesson_status_for_user(user_id, lesson, display_id)
                if status in ("completed", "completed_late"):
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
        group_info = None
        if getattr(user, "group_id", None):
            try:
                g = Group.objects.get(id=ObjectId(user.group_id))
                group_links = {
                    "child_chat_url": getattr(g, "child_chat_url", None) or "",
                    "parent_chat_url": getattr(g, "parent_chat_url", None) or "",
                    "links": getattr(g, "links", None) or [],
                }
                teacher_names = [
                    t.full_name
                    for t in User.objects(role=UserRole.TEACHER.value, group_ids=str(user.group_id))
                ]
                group_info = {
                    "id": str(g.id),
                    "title": g.title,
                    "teacher_name": ", ".join(teacher_names) if teacher_names else None,
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
            "group": group_info,
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
                    status, _ = get_lesson_status_for_user(user_id, lesson, display_id)
                    if status in ("completed", "completed_late"):
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
        LESSON_TYPE_LABELS = {"lecture": "Лекция", "task": "Задача", "puzzle": "Пазл", "question": "Вопрос", "survey": "Опрос"}
        for lesson in track.lessons:
            if lesson.type not in ("lecture", "task", "puzzle", "question", "survey"):
                continue
            display_id = _get_lesson_display_id(lesson)
            status_val, late_by_seconds = get_lesson_status_for_user(user_id, lesson, display_id)
            lessons_out.append({
                "lesson_id": display_id,
                "lesson_title": lesson.title,
                "lesson_type": lesson.type,
                "lesson_type_label": LESSON_TYPE_LABELS.get(lesson.type, lesson.type),
                "status": status_val,
                "late_by_seconds": late_by_seconds,
            })
        return Response({
            "track_title": track.title,
            "student_name": student.full_name,
            "lessons": lessons_out,
        })


def _standalone_visible_to_user(doc, group_ids):
    """Виден ли контент хотя бы одной из групп (пустой visible_group_ids = всем)."""
    vg = getattr(doc, "visible_group_ids", None) or []
    if not vg:
        return True
    return bool(set(vg) & set(group_ids))


def _get_in_track_lesson_ids():
    """Все id уроков, входящих в какой-либо трек (ObjectId и public_id)."""
    from apps.tracks.documents import Track
    from apps.lectures.documents import Lecture
    from apps.tasks.documents import Task
    from apps.puzzles.documents import Puzzle
    from apps.questions.documents import Question
    from apps.surveys.documents import Survey

    ids = set()
    by_type = {"lecture": [], "task": [], "puzzle": [], "question": [], "survey": []}
    for track in Track.objects.all():
        for lesson in getattr(track, "lessons", []) or []:
            lid = getattr(lesson, "id", None)
            if not lid:
                continue
            sid = str(lid)
            ids.add(sid)
            t = getattr(lesson, "type", None)
            if t in by_type:
                by_type[t].append(sid)
    for model, key in [(Lecture, "lecture"), (Task, "task"), (Puzzle, "puzzle"), (Question, "question"), (Survey, "survey")]:
        ref_ids = by_type[key]
        if not ref_ids:
            continue
        oids = []
        for s in ref_ids:
            if len(s) == 24 and ObjectId.is_valid(s):
                try:
                    oids.append(ObjectId(s))
                except Exception:
                    pass
        if oids:
            for doc in model.objects(id__in=oids).only("public_id"):
                pid = getattr(doc, "public_id", None)
                if pid:
                    ids.add(str(pid))
    return ids


class TeacherStandaloneProgressView(APIView):
    """Детализация по одиночным и временным заданиям: кто из учеников выполнил."""
    permission_classes = [IsAuthenticated, IsTeacherOrSuperuser]

    def get(self, request):
        from apps.lectures.documents import Lecture
        from apps.tasks.documents import Task
        from apps.puzzles.documents import Puzzle
        from apps.questions.documents import Question
        from apps.surveys.documents import Survey, SurveyResponse
        from apps.tracks.serializers import get_standalone_status_for_user

        user = request.user
        is_superuser = getattr(user, "role", None) == UserRole.SUPERUSER.value
        teacher_group_ids = list(getattr(user, "group_ids", []) or [])
        teacher_group_ids = [str(g) for g in teacher_group_ids]
        if is_superuser:
            teacher_group_ids = [str(g.id) for g in Group.objects.all()]
        if not teacher_group_ids:
            return Response({"assignments": [], "groups": []})

        group_object_ids = [ObjectId(g) for g in teacher_group_ids if g and ObjectId.is_valid(g)]
        groups_qs = Group.objects.filter(id__in=group_object_ids).order_by("order", "title")
        group_titles = {str(g.id): g.title for g in groups_qs}
        students_qs = User.objects(role="student", group_id__in=teacher_group_ids).order_by("first_name", "last_name")
        in_track_ids = _get_in_track_lesson_ids()

        assignments = []

        for lec in Lecture.objects.all():
            lid = str(getattr(lec, "public_id", None) or lec.id)
            oid = str(lec.id)
            if oid in in_track_ids or lid in in_track_ids:
                continue
            if not _standalone_visible_to_user(lec, teacher_group_ids):
                continue
            lesson_ids = [lid, oid] if lid != oid else [lid]
            students = []
            for s in students_qs:
                status, late_by, completed_at = get_standalone_status_for_user(str(s.id), "lecture", lesson_ids)
                students.append({
                    "user_id": str(s.id),
                    "full_name": s.full_name,
                    "group_id": str(s.group_id) if s.group_id else "",
                    "group_title": group_titles.get(str(s.group_id), ""),
                    "status": status,
                    "late_by_seconds": late_by,
                    "completed_at": completed_at,
                })
            au = getattr(lec, "available_until", None)
            assignments.append({
                "id": lid, "title": lec.title, "type": "lecture", "students": students,
                "available_until": datetime_to_iso_utc(au),
            })

        for task in Task.objects.all():
            lid = str(getattr(task, "public_id", None) or task.id)
            oid = str(task.id)
            if oid in in_track_ids or lid in in_track_ids:
                continue
            if not _standalone_visible_to_user(task, teacher_group_ids):
                continue
            lesson_ids = [lid, oid] if lid != oid else [lid]
            students = []
            for s in students_qs:
                status, late_by, completed_at = get_standalone_status_for_user(str(s.id), "task", lesson_ids)
                students.append({
                    "user_id": str(s.id),
                    "full_name": s.full_name,
                    "group_id": str(s.group_id) if s.group_id else "",
                    "group_title": group_titles.get(str(s.group_id), ""),
                    "status": status,
                    "late_by_seconds": late_by,
                    "completed_at": completed_at,
                })
            au = getattr(task, "available_until", None)
            assignments.append({
                "id": lid, "title": task.title, "type": "task", "students": students,
                "available_until": datetime_to_iso_utc(au),
            })

        for puzzle in Puzzle.objects.all():
            lid = str(getattr(puzzle, "public_id", None) or puzzle.id)
            oid = str(puzzle.id)
            if oid in in_track_ids or lid in in_track_ids:
                continue
            if not _standalone_visible_to_user(puzzle, teacher_group_ids):
                continue
            lesson_ids = [lid, oid] if lid != oid else [lid]
            students = []
            for s in students_qs:
                status, late_by, completed_at = get_standalone_status_for_user(str(s.id), "puzzle", lesson_ids)
                students.append({
                    "user_id": str(s.id),
                    "full_name": s.full_name,
                    "group_id": str(s.group_id) if s.group_id else "",
                    "group_title": group_titles.get(str(s.group_id), ""),
                    "status": status,
                    "late_by_seconds": late_by,
                    "completed_at": completed_at,
                })
            au = getattr(puzzle, "available_until", None)
            assignments.append({
                "id": lid, "title": puzzle.title, "type": "puzzle", "students": students,
                "available_until": datetime_to_iso_utc(au),
            })

        for question in Question.objects.all():
            lid = str(getattr(question, "public_id", None) or question.id)
            oid = str(question.id)
            if oid in in_track_ids or lid in in_track_ids:
                continue
            if not _standalone_visible_to_user(question, teacher_group_ids):
                continue
            lesson_ids = [lid, oid] if lid != oid else [lid]
            students = []
            for s in students_qs:
                status, late_by, completed_at = get_standalone_status_for_user(str(s.id), "question", lesson_ids)
                students.append({
                    "user_id": str(s.id),
                    "full_name": s.full_name,
                    "group_id": str(s.group_id) if s.group_id else "",
                    "group_title": group_titles.get(str(s.group_id), ""),
                    "status": status,
                    "late_by_seconds": late_by,
                    "completed_at": completed_at,
                })
            au = getattr(question, "available_until", None)
            assignments.append({
                "id": lid, "title": question.title, "type": "question", "students": students,
                "available_until": datetime_to_iso_utc(au),
            })

        for survey in Survey.objects.all():
            lid = str(getattr(survey, "public_id", None) or survey.id)
            oid = str(survey.id)
            if oid in in_track_ids or lid in in_track_ids:
                continue
            if not _standalone_visible_to_user(survey, teacher_group_ids):
                continue
            lesson_ids = [lid, oid] if lid != oid else [lid]
            responses_by_user = {
                r.user_id: r.answer
                for r in SurveyResponse.objects(survey_id=oid)
            }
            students = []
            for s in students_qs:
                status, late_by, completed_at = get_standalone_status_for_user(str(s.id), "survey", lesson_ids)
                students.append({
                    "user_id": str(s.id),
                    "full_name": s.full_name,
                    "group_id": str(s.group_id) if s.group_id else "",
                    "group_title": group_titles.get(str(s.group_id), ""),
                    "status": status,
                    "late_by_seconds": late_by,
                    "completed_at": completed_at,
                    "response_text": responses_by_user.get(str(s.id)),
                })
            au = getattr(survey, "available_until", None)
            assignments.append({
                "id": lid, "title": survey.title, "type": "survey", "students": students,
                "available_until": datetime_to_iso_utc(au),
            })

        return Response({
            "assignments": assignments,
            "groups": [{"id": str(g.id), "title": g.title} for g in groups_qs],
        })


class TeacherTaskSubmissionView(APIView):
    """Решение ученика по задаче (код) — для учителя."""
    permission_classes = [IsAuthenticated, IsTeacherOrSuperuser]

    def get(self, request, task_id, student_id):
        from apps.tasks.documents import Task
        from apps.submissions.documents import Submission

        try:
            task = get_doc_by_pk(Task, str(task_id))
        except Exception:
            return Response({"detail": "Задача не найдена."}, status=status.HTTP_404_NOT_FOUND)
        try:
            student = User.objects.get(id=ObjectId(student_id))
        except (User.DoesNotExist, Exception):
            return Response({"detail": "Ученик не найден."}, status=status.HTTP_404_NOT_FOUND)
        if student.role != UserRole.STUDENT.value:
            return Response({"detail": "Пользователь не является учеником."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        is_superuser = getattr(user, "role", None) == UserRole.SUPERUSER.value
        teacher_group_ids = [str(g) for g in (getattr(user, "group_ids", []) or [])]
        if is_superuser:
            teacher_group_ids = [str(g.id) for g in Group.objects.all()]
        if not is_superuser and str(student.group_id) not in teacher_group_ids:
            return Response({"detail": "Нет доступа к этому ученику."}, status=status.HTTP_403_FORBIDDEN)

        task_oid = str(task.id)
        sub = (
            Submission.objects(user_id=str(student_id), task_id=task_oid, passed=True)
            .order_by("-created_at")
            .first()
        )
        if not sub:
            return Response({"detail": "Нет успешной попытки по этой задаче."}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "code": sub.code,
            "passed": sub.passed,
            "created_at": datetime_to_iso_utc(sub.created_at),
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
