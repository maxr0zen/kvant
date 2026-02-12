from django.urls import path
from . import views

app_name = "surveys"

urlpatterns = [
    path("", views.survey_list, name="survey_list"),
    path("<str:survey_id>/", views.survey_detail, name="survey_detail"),
    path("<str:survey_id>/submit/", views.submit_survey_response, name="submit_survey_response"),
    path("<str:survey_id>/responses/", views.survey_responses_list, name="survey_responses_list"),
]
