from django.urls import path
from .views import GroupListCreateView, GroupDetailView

urlpatterns = [
    path("", GroupListCreateView.as_view(), name="group-list-create"),
    path("<str:pk>/", GroupDetailView.as_view(), name="group-detail"),
]
