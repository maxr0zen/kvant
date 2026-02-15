"""
System stats endpoint for superuser: server (CPU/RAM/disk), MongoDB, app metrics.
"""
import psutil
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from mongoengine import get_db

from .permissions import IsSuperuser
from .documents import User, UserRole
from apps.groups.documents import Group
from apps.tracks.documents import Track
from apps.submissions.documents import Submission, LessonProgress


class SystemStatsView(APIView):
    """GET /api/auth/admin/system-stats/ — superuser only."""
    permission_classes = [IsSuperuser]

    def get(self, request):
        # Server: CPU, RAM, disk
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        ram_used_mb = round(mem.used / (1024 * 1024))
        ram_total_mb = round(mem.total / (1024 * 1024))
        disk = psutil.disk_usage("/")
        try:
            disk = psutil.disk_usage("C:\\") if disk.total == 0 else disk
        except Exception:
            pass
        disk_used_gb = round(disk.used / (1024 ** 3), 2)
        disk_total_gb = round(disk.total / (1024 ** 3), 2)

        server = {
            "cpu_percent": cpu_percent,
            "ram_used_mb": ram_used_mb,
            "ram_total_mb": ram_total_mb,
            "disk_used_gb": disk_used_gb,
            "disk_total_gb": disk_total_gb,
        }

        # MongoDB: collection counts and DB size
        db = get_db()
        coll_names = ["users", "groups", "tracks", "submissions", "lesson_progress"]
        collections = {}
        for name in coll_names:
            try:
                collections[name] = db[name].estimated_document_count()
            except Exception:
                collections[name] = 0
        try:
            db_stats = db.command("dbStats")
            db_size_mb = round(db_stats.get("dataSize", 0) / (1024 * 1024), 2)
        except Exception:
            db_size_mb = 0

        mongodb = {
            "db_size_mb": db_size_mb,
            "collections": collections,
        }

        # App stats
        users_by_role = {}
        for r in [UserRole.STUDENT.value, UserRole.TEACHER.value, UserRole.SUPERUSER.value]:
            users_by_role[r] = User.objects(role=r).count()
        total_groups = Group.objects.count()
        total_tracks = Track.objects.count()

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        from datetime import timedelta
        week_start = today_start - timedelta(days=today_start.weekday())

        submissions_today = Submission.objects(created_at__gte=today_start).count()
        submissions_week = Submission.objects(created_at__gte=week_start).count()

        # Active users today: users with LessonProgress.updated_at today
        active_user_ids = set()
        for lp in LessonProgress.objects(updated_at__gte=today_start).only("user_id"):
            active_user_ids.add(lp.user_id)
        active_users_today = len(active_user_ids)

        # Recent activity: last 20 LessonProgress
        recent_activity = []
        for lp in LessonProgress.objects.order_by("-updated_at")[:20]:
            recent_activity.append({
                "user_id": lp.user_id,
                "lesson_title": lp.lesson_title or "Урок",
                "lesson_type": getattr(lp, "lesson_type", ""),
                "updated_at": lp.updated_at.isoformat() if lp.updated_at else None,
            })

        app = {
            "users_by_role": users_by_role,
            "total_groups": total_groups,
            "total_tracks": total_tracks,
            "submissions_today": submissions_today,
            "submissions_week": submissions_week,
            "active_users_today": active_users_today,
            "recent_activity": recent_activity,
        }

        return Response({
            "server": server,
            "mongodb": mongodb,
            "app": app,
        })
