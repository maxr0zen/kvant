from django.urls import path
from . import views

app_name = "questions"

urlpatterns = [
    path("", views.question_list, name="question_list"),
    path("<str:question_id>/", views.question_detail, name="question_detail"),
    path("<str:question_id>/check/", views.check_question_answer, name="check_question_answer"),
]
