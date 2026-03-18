from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LayoutViewSet

router = DefaultRouter()
router.register(r"", LayoutViewSet, basename="layout")

urlpatterns = [
    path("", include(router.urls)),
]
