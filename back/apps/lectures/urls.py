from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LectureViewSet, WebLectureUploadView

router = DefaultRouter()
router.register(r"", LectureViewSet, basename="lecture")

urlpatterns = [
    path("upload-web-lecture/", WebLectureUploadView.as_view(), name="upload-web-lecture"),
    path("", include(router.urls)),
]
