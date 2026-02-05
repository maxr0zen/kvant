from django.urls import path
from .views import LoginView, UserListCreateView, UserDetailUpdateView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("users/", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<str:pk>/", UserDetailUpdateView.as_view(), name="user-detail-update"),
]
