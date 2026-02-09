from django.urls import path
from .views import (
    LoginView,
    ProfileView,
    TeacherGroupsProgressView,
    TeacherGroupLinksView,
    TeacherStudentTrackProgressView,
    ResetStudentPasswordView,
    UserListCreateView,
    UserDetailUpdateView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("profile/", ProfileView.as_view(), name="auth-profile"),
    path("teacher/groups-progress/", TeacherGroupsProgressView.as_view(), name="teacher-groups-progress"),
    path("teacher/groups/<str:group_id>/links/", TeacherGroupLinksView.as_view(), name="teacher-group-links"),
    path("teacher/students/<str:student_id>/track/<str:track_id>/progress/", TeacherStudentTrackProgressView.as_view(), name="teacher-student-track-progress"),
    path("users/", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<str:pk>/reset-password/", ResetStudentPasswordView.as_view(), name="user-reset-password"),
    path("users/<str:pk>/", UserDetailUpdateView.as_view(), name="user-detail-update"),
]
