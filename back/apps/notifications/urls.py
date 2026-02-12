from django.urls import path
from .views import NotificationListCreateView
from .detail_views import NotificationDetailView

urlpatterns = [
    path("", NotificationListCreateView.as_view(), name="notification-list-create"),
    path("<str:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
]
