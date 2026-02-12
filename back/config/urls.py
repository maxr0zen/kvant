from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("api/auth/", include("apps.users.urls")),
    path("api/groups/", include("apps.groups.urls")),
    path("api/tracks/", include("apps.tracks.urls")),
    path("api/lectures/", include("apps.lectures.urls")),
    path("api/tasks/", include("apps.tasks.urls")),
    path("api/puzzles/", include("apps.puzzles.urls")),
    path("api/questions/", include("apps.questions.urls")),
    path("api/surveys/", include("apps.surveys.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
