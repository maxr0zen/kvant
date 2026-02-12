from django.urls import path
from . import views

app_name = 'puzzles'

urlpatterns = [
    path('', views.puzzle_list, name='puzzle_list'),
    path('create/', views.create_puzzle, name='create_puzzle'),
    path('<str:puzzle_id>/check/', views.check_puzzle_solution, name='check_puzzle_solution'),
    path('<str:puzzle_id>/', views.puzzle_detail, name='puzzle_detail'),
]
