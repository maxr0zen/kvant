from django.urls import path
from .views import (
    LoginView,
    ProfileView,
    TeacherGroupsProgressView,
    TeacherAnalyticsView,
    TeacherCreateStudentInGroupView,
    TeacherGroupLinksView,
    TeacherStudentTrackProgressView,
    TeacherStandaloneProgressView,
    TeacherTaskSubmissionView,
    ResetStudentPasswordView,
    UserListCreateView,
    UserDetailUpdateView,
)
from .system_stats import SystemStatsView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("profile/", ProfileView.as_view(), name="auth-profile"),
    path("admin/system-stats/", SystemStatsView.as_view(), name="admin-system-stats"),
    path("teacher/analytics/", TeacherAnalyticsView.as_view(), name="teacher-analytics"),
    path("teacher/groups-progress/", TeacherGroupsProgressView.as_view(), name="teacher-groups-progress"),
    path("teacher/groups/<str:group_id>/students/", TeacherCreateStudentInGroupView.as_view(), name="teacher-group-create-student"),
    path("teacher/groups/<str:group_id>/links/", TeacherGroupLinksView.as_view(), name="teacher-group-links"),
    path("teacher/students/<str:student_id>/track/<str:track_id>/progress/", TeacherStudentTrackProgressView.as_view(), name="teacher-student-track-progress"),
    path("teacher/standalone-progress/", TeacherStandaloneProgressView.as_view(), name="teacher-standalone-progress"),
    path("teacher/tasks/<str:task_id>/submissions/<str:student_id>/", TeacherTaskSubmissionView.as_view(), name="teacher-task-submission"),
    path("users/", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<str:pk>/reset-password/", ResetStudentPasswordView.as_view(), name="user-reset-password"),
    path("users/<str:pk>/", UserDetailUpdateView.as_view(), name="user-detail-update"),
]
