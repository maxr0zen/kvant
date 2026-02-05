#!/usr/bin/env python3
"""
Универсальный скрипт для создания тестовых данных в MongoDB
Запуск: python mock_data_universal.py
"""

import os
import sys
from datetime import datetime

# Добавляем корень проекта в путь
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongoengine import connect, disconnect
from apps.users.documents import User
from apps.groups.documents import Group
from apps.tracks.documents import Track, LessonRef
from apps.lectures.documents import Lecture
from apps.tasks.documents import Task, TestCaseEmbed
from apps.puzzles.documents import Puzzle, CodeBlockEmbed

GLOBAL_CREATED_GROUPS = []

def create_test_groups():
    """Создание тестовых групп"""
    print("🏫 Создание тестовых групп...")
    
    groups_data = [
        {"title": "Группа ИТ-101", "order": 1},
        {"title": "Группа ИТ-102", "order": 2},
        {"title": "Группа ИТ-201", "order": 3},
        {"title": "Группа ИТ-202", "order": 4},
        {"title": "Группа ИТ-301", "order": 5},
    ]
    
    created_groups = []
    for group_data in groups_data:
        existing_group = Group.objects(title=group_data["title"]).first()
        if existing_group:
            print(f"  ✅ Группа '{group_data['title']}' уже существует")
            created_groups.append(existing_group)
        else:
            group = Group(
                title=group_data["title"],
                order=group_data["order"]
            )
            group.save()
            print(f"  ✅ Создана группа: {group_data['title']}")
            created_groups.append(group)
    
    return created_groups

def create_test_users():
    """Создание тестовых пользователей с разделенными именами и группами"""
    print("\n📝 Создание тестовых пользователей...")
    
    # Сначала получаем группы
    groups = create_test_groups()
    group_ids = [str(g.id) for g in groups]
    
    users_data = [
        {
            "username": "admin",
            "first_name": "Александр",
            "last_name": "Админов",
            "role": "superuser",
            "password": "admin123"
        },
        {
            "username": "teacher1", 
            "first_name": "Иван",
            "last_name": "Иванов",
            "role": "teacher",
            "password": "teacher123",
            "group_ids": group_ids[:2]  # Учитель ведет 2 группы
        },
        {
            "username": "teacher2", 
            "first_name": "Мария",
            "last_name": "Петрова",
            "role": "teacher",
            "password": "teacher123",
            "group_ids": group_ids[2:4]  # Учитель ведет 2 группы
        },
        {
            "username": "student1",
            "first_name": "Петр",
            "last_name": "Сидоров",
            "role": "student", 
            "password": "student123",
            "group_id": group_ids[0]  # Студент в одной группе
        },
        {
            "username": "student2",
            "first_name": "Анна",
            "last_name": "Козлова",
            "role": "student",
            "password": "student123",
            "group_id": group_ids[1]
        },
        {
            "username": "student3",
            "first_name": "Дмитрий",
            "last_name": "Новиков",
            "role": "student",
            "password": "student123",
            "group_id": group_ids[2]
        },
        {
            "username": "student4",
            "first_name": "Елена",
            "last_name": "Белова",
            "role": "student",
            "password": "student123",
            "group_id": group_ids[3]
        },
        {
            "username": "student5",
            "first_name": "Михаил",
            "last_name": "Волков",
            "role": "student",
            "password": "student123",
            "group_id": group_ids[4]
        }
    ]
    
    created_users = []
    for user_data in users_data:
        # Проверяем, существует ли пользователь
        existing_user = User.objects(username=user_data["username"]).first()
        if existing_user:
            print(f"  ✅ Пользователь {user_data['username']} уже существует")
            created_users.append(existing_user)
        else:
            user = User(
                username=user_data["username"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                role=user_data["role"],
                group_id=user_data.get("group_id"),
                group_ids=user_data.get("group_ids", [])
            )
            user.set_password(user_data["password"])
            user.save()
            print(f"  ✅ Создан пользователь: {user_data['username']} ({user_data['first_name']} {user_data['last_name']}, {user_data['role']})")
            created_users.append(user)
    
    return created_users, groups

def create_test_tracks_with_lessons():
    """Создание тестовых треков со всеми типами уроков"""
    print("\n📚 Создание тестовых треков с уроками...")
    
    # Сначала создаем треки
    tracks_data = [
        {
            "title": "Основы программирования на Python",
            "description": "Полный курс для начинающих программистов на Python",
            "order": 1,
        },
        {
            "title": "Алгоритмы и структуры данных",
            "description": "Изучение фундаментальных алгоритмов и структур данных",
            "order": 2,
        },
        {
            "title": "Веб-разработка на Django",
            "description": "Создание веб-приложений с использованием Django",
            "order": 3,
        },
        {
            "title": "Машинное обучение",
            "description": "Введение в машинное обучение и нейронные сети",
            "order": 4,
        },
        {
            "title": "JavaScript для начинающих",
            "description": "Основы JavaScript и клиентской разработки",
            "order": 5,
        },
        {
            "title": "Data Structures на C++",
            "description": "Контейнеры и алгоритмы на C++",
            "order": 6,
        },
        {
            "title": "Базы данных и SQL",
            "description": "Работа с реляционными базами данных и SQL",
            "order": 7,
        }
    ]
    
    created_tracks = []
    for track_data in tracks_data:
        existing_track = Track.objects(title=track_data["title"]).first()
        if existing_track:
            print(f"  ✅ Трек '{track_data['title']}' уже существует")
            created_tracks.append(existing_track)
        else:
            track = Track(
                title=track_data["title"],
                description=track_data["description"],
                order=track_data["order"],
                lessons=[],  # Будем заполнять после создания уроков
            )
            track.save()
            print(f"  ✅ Создан трек: {track_data['title']}")
            created_tracks.append(track)
    
    # Теперь создаем уроки для каждого трека
    for i, track in enumerate(created_tracks):
        track_id = str(track.id)
        lessons = []
        
        if i == 0:  # Основы Python
            # Лекции
            lecture1 = Lecture(
                title="Введение в Python",
                track_id=track_id,
                content="# Введение в Python\n\nPython - высокоуровневый язык программирования.",
                blocks=[
                    {"type": "text", "content": "<h2>Что такое Python?</h2><p>Python - интерпретируемый язык программирования.</p>"},
                    {"type": "code", "explanation": "Первая программа", "code": "print('Hello, World!')", "language": "python"}
                ]
            )
            lecture1.save()
            
            lecture2 = Lecture(
                title="Переменные и типы данных",
                track_id=track_id,
                content="# Переменные и типы данных\n\nВ Python есть различные типы данных.",
                blocks=[
                    {"type": "text", "content": "<h2>Основные типы данных</h2><p>int, float, str, bool</p>"},
                    {"type": "code", "explanation": "Пример переменных", "code": "name = 'Алекс'\nage = 25\nheight = 1.75\nis_student = True", "language": "python"}
                ]
            )
            lecture2.save()
            
            # Задачи
            task1 = Task(
                title="Hello, World!",
                description="Выведите 'Hello, World!' на экран",
                starter_code='print("Hello, World!")',
                track_id=track_id,
                test_cases=[
                    TestCaseEmbed(id="c1", input="", expected_output="Hello, World!\n", is_public=True)
                ]
            )
            task1.save()
            
            task2 = Task(
                title="Сумма двух чисел",
                description="Прочитайте два числа и выведите их сумму",
                starter_code="a = int(input())\nb = int(input())\nprint(a + b)",
                track_id=track_id,
                test_cases=[
                    TestCaseEmbed(id="c1", input="3\n5", expected_output="8\n", is_public=True),
                    TestCaseEmbed(id="c2", input="10\n20", expected_output="30\n", is_public=False)
                ]
            )
            task2.save()
            
            # Puzzle
            puzzle1 = Puzzle(
                title="Соберите приветствие",
                description="Расположите блоки в правильном порядке для вывода приветствия",
                track_id=track_id,
                language="python",
                blocks=[
                    CodeBlockEmbed(id="b1", code='name = "Мир"', order="1", indent=""),
                    CodeBlockEmbed(id="b2", code='print(f"Привет, {name}!")', order="2", indent=""),
                ],
                solution='name = "Мир"\nprint(f"Привет, {name}!")'
            )
            puzzle1.save()
            
            # Формируем уроки в треке
            lessons = [
                LessonRef(id=str(lecture1.id), type="lecture", title=lecture1.title, order=1),
                LessonRef(id=str(task1.id), type="task", title=task1.title, order=2),
                LessonRef(id=str(puzzle1.id), type="puzzle", title=puzzle1.title, order=3),
                LessonRef(id=str(lecture2.id), type="lecture", title=lecture2.title, order=4),
                LessonRef(id=str(task2.id), type="task", title=task2.title, order=5),
            ]
            
        elif i == 1:  # Алгоритмы
            # Лекции
            lecture1 = Lecture(
                title="Сортировка пузырьком",
                track_id=track_id,
                content="# Сортировка пузырьком\n\nПростой алгоритм сортировки.",
                blocks=[
                    {"type": "text", "content": "<h2>Принцип работы</h2><p>Многократное сравнение соседних элементов.</p>"},
                    {"type": "code", "explanation": "Реализация сортировки пузырьком", "code": "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr", "language": "python"}
                ]
            )
            lecture1.save()
            
            # Задачи
            task1 = Task(
                title="Сортировка массива",
                description="Отсортируйте массив чисел по возрастанию",
                starter_code="def sort_array(arr):\n    # Ваш код здесь\n    return sorted(arr)\n\n# Тест\narr = [5, 2, 8, 1, 9]\nprint(sort_array(arr))",
                track_id=track_id,
                test_cases=[
                    TestCaseEmbed(id="c1", input="", expected_output="[1, 2, 5, 8, 9]\n", is_public=True)
                ]
            )
            task1.save()
            
            # Puzzle
            puzzle1 = Puzzle(
                title="Соберите цикл for",
                description="Расположите блоки для создания цикла от 1 до 5",
                track_id=track_id,
                language="python",
                blocks=[
                    CodeBlockEmbed(id="b1", code="for i in range(1, 6):", order="1", indent=""),
                    CodeBlockEmbed(id="b2", code="print(i)", order="2", indent="    "),
                ],
                solution="for i in range(1, 6):\n    print(i)"
            )
            puzzle1.save()
            
            lessons = [
                LessonRef(id=str(lecture1.id), type="lecture", title=lecture1.title, order=1),
                LessonRef(id=str(task1.id), type="task", title=task1.title, order=2),
                LessonRef(id=str(puzzle1.id), type="puzzle", title=puzzle1.title, order=3),
            ]
            
        elif i == 2:  # Django
            # Лекции
            lecture1 = Lecture(
                title="Введение в Django",
                track_id=track_id,
                content="# Введение в Django\n\nDjango - фреймворк для веб-разработки.",
                blocks=[
                    {"type": "text", "content": "<h2>Что такое Django?</h2><p>Высокоуровневый Python фреймворк.</p>"},
                    {"type": "code", "explanation": "Создание проекта Django", "code": "django-admin startproject myproject\ncd myproject\npython manage.py runserver", "language": "bash"}
                ]
            )
            lecture1.save()
            
            # Задачи
            task1 = Task(
                title="Создание простого view",
                description="Создайте простое Django view",
                starter_code="from django.http import HttpResponse\n\ndef hello_view(request):\n    return HttpResponse('Hello, Django!')",
                track_id=track_id,
                test_cases=[
                    TestCaseEmbed(id="c1", input="", expected_output="View создано успешно\n", is_public=True)
                ]
            )
            task1.save()
            
            lessons = [
                LessonRef(id=str(lecture1.id), type="lecture", title=lecture1.title, order=1),
                LessonRef(id=str(task1.id), type="task", title=task1.title, order=2),
            ]
            
        elif i == 3:  # Машинное обучение
            # Лекции
            lecture1 = Lecture(
                title="Введение в машинное обучение",
                track_id=track_id,
                content="# Введение в машинное обучение\n\nОсновные концепции ML.",
                blocks=[
                    {"type": "text", "content": "<h2>Что такое ML?</h2><p>Машинное обучение - подраздел ИИ.</p>"},
                    {"type": "code", "explanation": "Пример с scikit-learn", "code": "from sklearn.linear_model import LinearRegression\nimport numpy as np\n\n# Данные\nX = np.array([[1], [2], [3], [4]])\ny = np.array([2, 4, 6, 8])\n\n# Модель\nmodel = LinearRegression()\nmodel.fit(X, y)\n\n# Предсказание\nprint(model.predict([[5]]))", "language": "python"}
                ]
            )
            lecture1.save()
            
            # Puzzle
            puzzle1 = Puzzle(
                title="Соберите функцию",
                description="Расположите блоки для создания функции сложения",
                track_id=track_id,
                language="python",
                blocks=[
                    CodeBlockEmbed(id="b1", code="def add_numbers(a, b):", order="1", indent=""),
                    CodeBlockEmbed(id="b2", code="return a + b", order="2", indent="    "),
                    CodeBlockEmbed(id="b3", code="result = add_numbers(10, 20)", order="3", indent=""),
                    CodeBlockEmbed(id="b4", code="print(result)", order="4", indent=""),
                ],
                solution="def add_numbers(a, b):\n    return a + b\nresult = add_numbers(10, 20)\nprint(result)"
            )
            puzzle1.save()
            
            lessons = [
                LessonRef(id=str(lecture1.id), type="lecture", title=lecture1.title, order=1),
                LessonRef(id=str(puzzle1.id), type="puzzle", title=puzzle1.title, order=2),
            ]

        elif i == 4:  # JavaScript
            lecture1 = Lecture(
                title="Введение в JavaScript",
                track_id=track_id,
                content="# Введение в JavaScript\n\nJavaScript - язык для веба.",
                blocks=[
                    {"type": "text", "content": "<h2>Что такое JS?</h2><p>Язык сценариев для браузера и сервера.</p>"},
                    {"type": "code", "explanation": "Консольная запись", "code": "console.log('Hello, JS!');", "language": "javascript"}
                ]
            )
            lecture1.save()

            task1 = Task(
                title="Hello JavaScript",
                description="Выведите 'Hello, JS!' в консоль",
                starter_code="console.log('Hello, JS!')",
                track_id=track_id,
                test_cases=[
                    TestCaseEmbed(id="c1", input="", expected_output="Hello, JS!\n", is_public=True)
                ]
            )
            task1.save()

            lessons = [
                LessonRef(id=str(lecture1.id), type="lecture", title=lecture1.title, order=1),
                LessonRef(id=str(task1.id), type="task", title=task1.title, order=2),
            ]

        elif i == 5:  # C++ DS
            lecture1 = Lecture(
                title="Контейнеры в C++",
                track_id=track_id,
                content="# Контейнеры в C++\n\nstd::vector, std::list, std::map и т.д.",
                blocks=[
                    {"type": "text", "content": "<h2>std::vector</h2><p>Динамический массив.</p>"},
                    {"type": "code", "explanation": "Пример vector", "code": "#include <vector>\n#include <iostream>\nint main(){ std::vector<int> v = {1,2,3}; for(auto x: v) std::cout<<x<<\" \\n\"; }", "language": "cpp"}
                ]
            )
            lecture1.save()

            task1 = Task(
                title="Сумма элементов вектора",
                description="Считайте n и элементы, выведите их сумму (C++ задача)",
                starter_code="// Напишите решение на C++",
                track_id=track_id,
                test_cases=[TestCaseEmbed(id="c1", input="3\n1 2 3", expected_output="6\n", is_public=True)]
            )
            task1.save()

            lessons = [
                LessonRef(id=str(lecture1.id), type="lecture", title=lecture1.title, order=1),
                LessonRef(id=str(task1.id), type="task", title=task1.title, order=2),
            ]

        elif i == 6:  # Databases
            lecture1 = Lecture(
                title="Основы SQL",
                track_id=track_id,
                content="# Основы SQL\n\nSELECT, INSERT, UPDATE, DELETE",
                blocks=[
                    {"type": "text", "content": "<h2>SELECT</h2><p>Выборка данных из таблицы.</p>"},
                    {"type": "code", "explanation": "Пример SELECT", "code": "SELECT id, name FROM users WHERE active = 1;", "language": "sql"}
                ]
            )
            lecture1.save()

            task1 = Task(
                title="Простая выборка",
                description="Напишите SQL-запрос для выбора всех активных пользователей",
                starter_code="-- Напишите SQL здесь",
                track_id=track_id,
                test_cases=[TestCaseEmbed(id="c1", input="", expected_output="-- expected query output", is_public=True)]
            )
            task1.save()

            lessons = [
                LessonRef(id=str(lecture1.id), type="lecture", title=lecture1.title, order=1),
                LessonRef(id=str(task1.id), type="task", title=task1.title, order=2),
            ]

        else:
            lessons = []
        
        # Обновляем трек с уроками
        track.lessons = lessons
        # Assign visible groups round-robin: first track public, others restricted per group
        if len(GLOBAL_CREATED_GROUPS) > 0:
            if i == 0:
                track.visible_group_ids = []
            else:
                gid = str(GLOBAL_CREATED_GROUPS[(i - 1) % len(GLOBAL_CREATED_GROUPS)].id)
                track.visible_group_ids = [gid]
        else:
            track.visible_group_ids = []

        # Ensure public_id exists (use simple slug-like id)
        if not getattr(track, "public_id", None):
            import uuid
            track.public_id = uuid.uuid4().hex[:12]

        track.save()
        
        print(f"  ✅ Для трека '{track.title}' создано {len(lessons)} уроков")
    
    return created_tracks

def main():
    """Главная функция"""
    print("🚀 Начинаем создание тестовых данных (универсальный мокап)...\n")
    
    try:
        # Подключение к MongoDB
        print("📦 Подключение к MongoDB...")
        connect(db="kavnt", host="mongodb://127.0.0.1:27017")
        print("  ✅ Подключено успешно\n")
        
        # Создание тестовых данных
        users, groups = create_test_users()
        # expose groups to track creation logic
        global GLOBAL_CREATED_GROUPS
        GLOBAL_CREATED_GROUPS = groups
        tracks = create_test_tracks_with_lessons()
        
        # Собираем статистику
        total_lectures = Lecture.objects.count()
        total_tasks = Task.objects.count()
        total_puzzles = Puzzle.objects.count()
        
        print(f"\n🎉 Тестовые данные успешно созданы!")
        print(f"   👥 Пользователей: {len(users)}")
        print(f"   🏫 Групп: {len(groups)}")
        print(f"   📚 Треков: {len(tracks)}")
        print(f"   📖 Лекций: {total_lectures}")
        print(f"   💻 Задач: {total_tasks}")
        print(f"   🧩 Puzzle: {total_puzzles}")
        
        print("\n📋 Данные для входа:")
        print("   Администратор: admin / admin123")
        print("   Учитель 1: teacher1 / teacher123 (ведет группы ИТ-101, ИТ-102)")
        print("   Учитель 2: teacher2 / teacher123 (ведет группы ИТ-201, ИТ-202)")
        print("   Студенты: student1-student5 / student123")
        
        print("\n📚 Треки:")
        for track in tracks:
            lesson_counts = {"lecture": 0, "task": 0, "puzzle": 0}
            for lesson in track.lessons:
                lesson_counts[lesson.type] += 1
            print(f"   {track.title}: {lesson_counts['lecture']} лекций, {lesson_counts['task']} задач, {lesson_counts['puzzle']} puzzle")
        
    except Exception as e:
        print(f"\n❌ Ошибка при создании данных: {e}")
        return 1
    finally:
        # Отключение от MongoDB
        disconnect()
        print("\n📦 Отключено от MongoDB")
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
