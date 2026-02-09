#!/usr/bin/env python3
"""
Скрипт для создания тестовых данных в MongoDB.
Запуск: python mock.py (из корня back/ или python back/mock.py)
Использует настройки Django (MONGODB_* из config.settings).
"""

import os
import sys
import uuid
from datetime import datetime

# Добавляем корень проекта в путь и инициализируем Django
BACK_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACK_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

import django
django.setup()

from django.conf import settings
from mongoengine import connect, disconnect
from apps.users.documents import User
from apps.groups.documents import Group
from apps.tracks.documents import Track, LessonRef
from apps.lectures.documents import Lecture
from apps.tasks.documents import Task, TestCaseEmbed
from apps.puzzles.documents import Puzzle, CodeBlockEmbed
from apps.questions.documents import Question, QuestionChoiceEmbed
from apps.achievements.documents import UserAchievement

GLOBAL_CREATED_GROUPS = []


def _public_id():
    """Генерирует 12-символьный hex id для public_id (единый стандарт)."""
    return uuid.uuid4().hex[:12]


def _ensure_public_id(doc, field="public_id"):
    """Устанавливает public_id, если ещё не задан (без сохранения)."""
    if not getattr(doc, field, None):
        setattr(doc, field, _public_id())

def create_test_groups():
    """Создание тестовых групп"""
    print("[*] Создание тестовых групп...")
    
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
            print(f"  [OK] Группа '{group_data['title']}' уже существует")
            created_groups.append(existing_group)
        else:
            group = Group(
                title=group_data["title"],
                order=group_data["order"]
            )
            group.save()
            print(f"  [OK] Создана группа: {group_data['title']}")
            created_groups.append(group)
    
    return created_groups

def create_test_users():
    """Создание тестовых пользователей с разделенными именами и группами"""
    print("\n[*] Создание тестовых пользователей...")
    
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
            print(f"  [OK] Пользователь {user_data['username']} уже существует")
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
            print(f"  [OK] Создан пользователь: {user_data['username']} ({user_data['first_name']} {user_data['last_name']}, {user_data['role']})")
            created_users.append(user)
    
    return created_users, groups

def create_test_tracks_with_lessons():
    """Создание тестовых треков: 1 трек «Основы Python» с богатым наполнением."""
    print("\n[*] Создание тестовых треков с уроками...")

    new_titles = {"Основы Python"}
    # Удаляем старые треки, которых нет в новом списке
    for old_track in Track.objects(title__nin=list(new_titles)):
        old_track.delete()
        print(f"  [OK] Удалён старый трек: {old_track.title}")

    tracks_data = [
        {
            "title": "Основы Python",
            "description": "Базовые знания о Python: переменные, типы, условия, циклы, функции, списки и словари",
            "order": 1,
        },
    ]

    created_tracks = []
    for track_data in tracks_data:
        existing_track = Track.objects(title=track_data["title"]).first()
        if existing_track:
            track = existing_track
            print(f"  [OK] Трек '{track.title}' уже существует")
        else:
            track = Track(
                title=track_data["title"],
                description=track_data["description"],
                order=track_data["order"],
                lessons=[],
            )
            track.save()
            print(f"  [OK] Создан трек: {track.title}")
        created_tracks.append(track)

    track = created_tracks[0]
    track_id = str(track.id)
    # Всегда пересоздаём уроки для актуального контента
    if track.lessons:
        print(f"  [OK] Обновление уроков для трека '{track.title}'...")
    order = 1

    def add_lecture(title, content_blocks):
        nonlocal order
        lec = Lecture(
            title=title,
            track_id=track_id,
            content="",
            blocks=content_blocks,
        )
        lec.public_id = _public_id()
        lec.save()
        ref = LessonRef(id=str(lec.id), type="lecture", title=title, order=order)
        order += 1
        return ref

    def add_task(title, desc, starter, test_cases, hard=False):
        nonlocal order
        t = Task(
            title=title,
            description=desc,
            starter_code=starter,
            track_id=track_id,
            test_cases=test_cases,
            hard=hard,
        )
        t.public_id = _public_id()
        t.save()
        ref = LessonRef(id=str(t.id), type="task", title=title, order=order)
        order += 1
        return ref

    def add_puzzle(title, desc, blocks, solution):
        nonlocal order
        p = Puzzle(
            title=title,
            description=desc,
            track_id=track_id,
            language="python",
            blocks=blocks,
            solution=solution,
        )
        p.public_id = _public_id()
        p.save()
        ref = LessonRef(id=str(p.id), type="puzzle", title=title, order=order)
        order += 1
        return ref

    def _qblock(qid, title, prompt, choices, multiple=False):
        """Вопрос как блок внутри лекции."""
        return {
            "type": "question",
            "id": qid,
            "title": title,
            "prompt": prompt,
            "choices": [{"id": c.id, "text": c.text, "is_correct": c.is_correct} for c in choices],
            "multiple": multiple,
        }

    lessons = []

    # --- Лекции (вопросы — блоки внутри контента) ---
    lessons.append(add_lecture("Введение в Python", [
        {"type": "text", "content": "<h2>Что такое Python?</h2><p>Python — интерпретируемый язык программирования с простым синтаксисом.</p>"},
        {"type": "code", "explanation": "Первая программа", "code": "print('Hello, World!')", "language": "python"},
        _qblock("q1", "Какие из этих типов есть в Python?", "Выберите все верные варианты:",
                [QuestionChoiceEmbed(id="c1", text="int", is_correct=True), QuestionChoiceEmbed(id="c2", text="float", is_correct=True),
                 QuestionChoiceEmbed(id="c3", text="char", is_correct=False), QuestionChoiceEmbed(id="c4", text="str", is_correct=True)],
                multiple=True),
    ]))
    lessons.append(add_lecture("Переменные и типы данных", [
        {"type": "text", "content": "<h2>Основные типы</h2><p>int, float, str, bool — базовые типы данных в Python.</p>"},
        {"type": "code", "explanation": "Пример переменных", "code": "name = 'Алекс'\nage = 25\nheight = 1.75\nis_student = True", "language": "python"},
        _qblock("q2", "Какой тип у результата 5 / 2 в Python 3?", "Выберите правильный ответ:",
                [QuestionChoiceEmbed(id="c1", text="int (целое число)", is_correct=False),
                 QuestionChoiceEmbed(id="c2", text="float (дробное число)", is_correct=True),
                 QuestionChoiceEmbed(id="c3", text="str (строка)", is_correct=False)],
                multiple=False),
    ]))
    lessons.append(add_lecture("Функция print и ввод данных", [
        {"type": "text", "content": "<h2>print и input</h2><p>print() выводит данные, input() читает строку с клавиатуры.</p>"},
        {"type": "code", "explanation": "Пример", "code": "name = input('Ваше имя: ')\nprint('Привет,', name)", "language": "python", "stdin": "Иван"},
        _qblock("q3", "Что выведет print(2 ** 3)?", "Выберите правильный ответ:",
                [QuestionChoiceEmbed(id="c1", text="6", is_correct=False), QuestionChoiceEmbed(id="c2", text="8", is_correct=True),
                 QuestionChoiceEmbed(id="c3", text="9", is_correct=False)],
                multiple=False),
    ]))
    lessons.append(add_lecture("Условия if / else", [
        {"type": "text", "content": "<h2>Ветвление</h2><p>if, elif, else — условные операторы.</p>"},
        {"type": "code", "explanation": "Пример условия", "code": "x = int(input())\nif x > 0:\n    print('Положительное')\nelif x < 0:\n    print('Отрицательное')\nelse:\n    print('Ноль')", "language": "python", "stdin": "5"},
    ]))
    lessons.append(add_lecture("Цикл for", [
        {"type": "text", "content": "<h2>Цикл for</h2><p>for перебирает элементы последовательности. range() создаёт диапазон чисел.</p>"},
        {"type": "code", "explanation": "Пример цикла for", "code": "for i in range(5):\n    print(i * 2)", "language": "python"},
    ]))
    lessons.append(add_lecture("Цикл while", [
        {"type": "text", "content": "<h2>Цикл while</h2><p>while повторяет блок, пока условие истинно.</p>"},
        {"type": "code", "explanation": "Пример while", "code": "n = 0\nwhile n < 5:\n    print(n)\n    n += 1", "language": "python"},
    ]))
    lessons.append(add_lecture("Функции", [
        {"type": "text", "content": "<h2>Определение функций</h2><p>def — ключевое слово для создания функции. return возвращает результат.</p>"},
        {"type": "code", "explanation": "Пример функции", "code": "def greet(name):\n    return 'Привет, ' + name\n\nprint(greet('Мир'))", "language": "python"},
    ]))
    lessons.append(add_lecture("Списки", [
        {"type": "text", "content": "<h2>Списки (list)</h2><p>Список — упорядоченная коллекция. Индексация с 0.</p>"},
        {"type": "code", "explanation": "Пример списка", "code": "nums = [1, 2, 3, 4, 5]\nprint(nums[0])\nprint(len(nums))\nfor x in nums:\n    print(x)", "language": "python"},
        _qblock("q4", "Как получить длину списка?", "Выберите правильный способ:",
                [QuestionChoiceEmbed(id="c1", text="list.size()", is_correct=False), QuestionChoiceEmbed(id="c2", text="len(list)", is_correct=True),
                 QuestionChoiceEmbed(id="c3", text="list.length", is_correct=False)],
                multiple=False),
    ]))
    lessons.append(add_lecture("Словари", [
        {"type": "text", "content": "<h2>Словари (dict)</h2><p>Словарь — пара ключ: значение.</p>"},
        {"type": "code", "explanation": "Пример словаря", "code": "user = {'name': 'Алекс', 'age': 25}\nprint(user['name'])\nuser['city'] = 'Москва'", "language": "python"},
        _qblock("q5", "Как создать пустой словарь?", "Выберите правильные способы:",
                [QuestionChoiceEmbed(id="c1", text="{}", is_correct=True), QuestionChoiceEmbed(id="c2", text="dict()", is_correct=True),
                 QuestionChoiceEmbed(id="c3", text="[]", is_correct=False)],
                multiple=True),
    ]))

    def _videoblock(vid, url, pause_points):
        return {"type": "video", "id": vid, "url": url, "pause_points": pause_points}

    lessons.append(add_lecture("Видео: основы Python", [
        {"type": "text", "content": "<h2>Обучающее видео</h2><p>Посмотрите видео о основах Python. В определённые моменты видео остановится — ответьте на вопрос, чтобы продолжить.</p>"},
        _videoblock("v1", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", [
            {
                "id": "pp1",
                "timestamp": 15,
                "question": {
                    "id": "qv1",
                    "title": "Что вы узнали в начале видео?",
                    "prompt": "Выберите правильный ответ:",
                    "choices": [
                        {"id": "c1", "text": "Python — простой язык", "is_correct": True},
                        {"id": "c2", "text": "Python — сложный язык", "is_correct": False},
                        {"id": "c3", "text": "Нужно установить Java", "is_correct": False},
                    ],
                    "multiple": False,
                },
            },
            {
                "id": "pp2",
                "timestamp": 45,
                "question": {
                    "id": "qv2",
                    "title": "Продолжаем изучение?",
                    "prompt": "Готовы двигаться дальше?",
                    "choices": [
                        {"id": "c1", "text": "Да", "is_correct": True},
                        {"id": "c2", "text": "Нет", "is_correct": False},
                    ],
                    "multiple": False,
                },
            },
        ]),
    ]))

    # --- Задачи ---
    lessons.append(add_task(
        "Hello, World!",
        "Выведите строку 'Hello, World!' на экран",
        'print("Hello, World!")',
        [TestCaseEmbed(id="c1", input="", expected_output="Hello, World!\n", is_public=True)],
    ))
    lessons.append(add_task(
        "Сумма двух чисел",
        "Прочитайте два целых числа и выведите их сумму",
        "a = int(input())\nb = int(input())\nprint(a + b)",
        [
            TestCaseEmbed(id="c1", input="3\n5", expected_output="8\n", is_public=True),
            TestCaseEmbed(id="c2", input="10\n20", expected_output="30\n", is_public=False),
        ],
    ))
    lessons.append(add_task(
        "Чётное или нечётное",
        "Прочитайте число и выведите 'чётное' или 'нечётное'",
        "n = int(input())\nif n % 2 == 0:\n    print('чётное')\nelse:\n    print('нечётное')",
        [
            TestCaseEmbed(id="c1", input="4", expected_output="чётное\n", is_public=True),
            TestCaseEmbed(id="c2", input="7", expected_output="нечётное\n", is_public=False),
        ],
    ))
    lessons.append(add_task(
        "Таблица умножения",
        "Выведите таблицу умножения на 5 (от 1 до 10)",
        "for i in range(1, 11):\n    print(i, '*', 5, '=', i * 5)",
        [TestCaseEmbed(id="c1", input="", expected_output="1 * 5 = 5\n2 * 5 = 10\n3 * 5 = 15\n4 * 5 = 20\n5 * 5 = 25\n6 * 5 = 30\n7 * 5 = 35\n8 * 5 = 40\n9 * 5 = 45\n10 * 5 = 50\n", is_public=True)],
        hard=True,
    ))
    lessons.append(add_task(
        "Факториал",
        "Вычислите факториал числа n (n! = 1*2*...*n). Число n вводится с клавиатуры.",
        "n = int(input())\nresult = 1\nfor i in range(1, n + 1):\n    result *= i\nprint(result)",
        [
            TestCaseEmbed(id="c1", input="5", expected_output="120\n", is_public=True),
            TestCaseEmbed(id="c2", input="0", expected_output="1\n", is_public=False),
        ],
        hard=True,
    ))
    lessons.append(add_task(
        "Сумма элементов списка",
        "Дан список чисел. Выведите их сумму. Список задан в коде.",
        "nums = [1, 2, 3, 4, 5]\ntotal = 0\nfor x in nums:\n    total += x\nprint(total)",
        [TestCaseEmbed(id="c1", input="", expected_output="15\n", is_public=True)],
        hard=True,
    ))

    # --- Паззлы (4+ блоков) ---
    lessons.append(add_puzzle(
        "Соберите приветствие",
        "Расположите блоки в правильном порядке для вывода приветствия",
        [
            CodeBlockEmbed(id="b1", code='name = input("Ваше имя: ")', order="1", indent=""),
            CodeBlockEmbed(id="b2", code='greeting = "Привет, " + name', order="2", indent=""),
            CodeBlockEmbed(id="b3", code="print(greeting)", order="3", indent=""),
        ],
        'name = input("Ваше имя: ")\ngreeting = "Привет, " + name\nprint(greeting)',
    ))
    lessons.append(add_puzzle(
        "Соберите цикл for",
        "Расположите блоки для вывода чисел от 1 до 5 и их квадратов",
        [
            CodeBlockEmbed(id="b1", code="for i in range(1, 6):", order="1", indent=""),
            CodeBlockEmbed(id="b2", code="square = i * i", order="2", indent="    "),
            CodeBlockEmbed(id="b3", code="print(i, square)", order="3", indent="    "),
        ],
        "for i in range(1, 6):\n    square = i * i\n    print(i, square)",
    ))
    lessons.append(add_puzzle(
        "Соберите функцию сложения",
        "Расположите блоки для создания функции add и её вызова",
        [
            CodeBlockEmbed(id="b1", code="def add(a, b):", order="1", indent=""),
            CodeBlockEmbed(id="b2", code="return a + b", order="2", indent="    "),
            CodeBlockEmbed(id="b3", code="result = add(10, 20)", order="3", indent=""),
            CodeBlockEmbed(id="b4", code="print(result)", order="4", indent=""),
        ],
        "def add(a, b):\n    return a + b\nresult = add(10, 20)\nprint(result)",
    ))
    lessons.append(add_puzzle(
        "Соберите проверку чётности",
        "Расположите блоки для проверки, является ли число чётным",
        [
            CodeBlockEmbed(id="b1", code="n = int(input())", order="1", indent=""),
            CodeBlockEmbed(id="b2", code="if n % 2 == 0:", order="2", indent=""),
            CodeBlockEmbed(id="b3", code='print("чётное")', order="3", indent="    "),
            CodeBlockEmbed(id="b4", code="else:", order="4", indent=""),
            CodeBlockEmbed(id="b5", code='print("нечётное")', order="5", indent="    "),
        ],
        'n = int(input())\nif n % 2 == 0:\n    print("чётное")\nelse:\n    print("нечётное")',
    ))
    lessons.append(add_puzzle(
        "Соберите цикл с накоплением суммы",
        "Расположите блоки для подсчёта суммы чисел от 1 до 10",
        [
            CodeBlockEmbed(id="b1", code="total = 0", order="1", indent=""),
            CodeBlockEmbed(id="b2", code="for i in range(1, 11):", order="2", indent=""),
            CodeBlockEmbed(id="b3", code="total = total + i", order="3", indent="    "),
            CodeBlockEmbed(id="b4", code="print(total)", order="4", indent=""),
        ],
        "total = 0\nfor i in range(1, 11):\n    total = total + i\nprint(total)",
    ))
    lessons.append(add_puzzle(
        "Соберите работу со списком",
        "Расположите блоки для создания списка и вывода его длины",
        [
            CodeBlockEmbed(id="b1", code="fruits = ['яблоко', 'банан', 'апельсин']", order="1", indent=""),
            CodeBlockEmbed(id="b2", code="count = len(fruits)", order="2", indent=""),
            CodeBlockEmbed(id="b3", code="print('Количество:', count)", order="3", indent=""),
        ],
        "fruits = ['яблоко', 'банан', 'апельсин']\ncount = len(fruits)\nprint('Количество:', count)",
    ))

    # Вопросы встроены в лекции как блоки (type: question)

    track.lessons = lessons
    track.visible_group_ids = []
    _ensure_public_id(track)
    track.save()

    print(f"  [OK] Для трека '{track.title}' создано {len(lessons)} уроков")
    return created_tracks


def create_test_achievements(users, groups):
    """Создание тестовых достижений для учеников."""
    print("\n[*] Создание тестовых достижений...")

    students = [u for u in users if getattr(u, "role", None) == "student"]
    if not students:
        print("  [SKIP] Нет учеников для достижений")
        return

    # Достижения для student1 (несколько)
    s1_id = str(students[0].id)
    for aid in ["first_lecture", "first_task", "lectures_5"]:
        if not UserAchievement.objects(user_id=s1_id, achievement_id=aid).first():
            UserAchievement(user_id=s1_id, achievement_id=aid).save()
            print(f"  [OK] Достижение {aid} для student1")

    # Достижение для student2
    if len(students) > 1:
        s2_id = str(students[1].id)
        for aid in ["first_lecture", "first_puzzle"]:
            if not UserAchievement.objects(user_id=s2_id, achievement_id=aid).first():
                UserAchievement(user_id=s2_id, achievement_id=aid).save()
                print(f"  [OK] Достижение {aid} для student2")

    # Достижение для student3
    if len(students) > 2:
        s3_id = str(students[2].id)
        if not UserAchievement.objects(user_id=s3_id, achievement_id="first_lecture").first():
            UserAchievement(user_id=s3_id, achievement_id="first_lecture").save()
            print(f"  [OK] Достижение first_lecture для student3")

    print("  [OK] Тестовые достижения созданы")


def main():
    """Главная функция"""
    print("[*] Создание тестовых данных...\n")
    
    try:
        db_name = getattr(settings, "MONGODB_NAME", "kavnt")
        db_host = getattr(settings, "MONGODB_HOST", "mongodb://127.0.0.1:27017")
        print(f"[*] Подключение к MongoDB ({db_host}, db={db_name})...")
        connect(db=db_name, host=db_host)
        print("  [OK] Подключено успешно\n")
        
        # Создание тестовых данных
        users, groups = create_test_users()
        # expose groups to track creation logic
        global GLOBAL_CREATED_GROUPS
        GLOBAL_CREATED_GROUPS = groups
        tracks = create_test_tracks_with_lessons()
        create_test_achievements(users, groups)
        
        # Делаем все треки публичными (видимыми без авторизации)
        updated = Track.objects(visible_group_ids__ne=[]).update(set__visible_group_ids=[])
        if updated:
            print(f"\n[OK] Обновлена видимость {updated} треков (теперь публичные)")
        
        # Собираем статистику
        total_lectures = Lecture.objects.count()
        total_tasks = Task.objects.count()
        total_puzzles = Puzzle.objects.count()
        total_questions = Question.objects.count()
        total_achievements = UserAchievement.objects.count()

        print(f"\n[OK] Тестовые данные успешно созданы!")
        print(f"   Пользователей: {len(users)}")
        print(f"   Групп: {len(groups)}")
        print(f"   Треков: {len(tracks)}")
        print(f"   Достижений пользователей: {total_achievements}")
        print(f"   Лекций: {total_lectures}")
        print(f"   Задач: {total_tasks}")
        print(f"   Puzzle: {total_puzzles}")
        print(f"   Вопросов: {total_questions}")
        
        print("\n[*] Данные для входа:")
        print("   Администратор: admin / admin123")
        print("   Учитель 1: teacher1 / teacher123 (ведет группы ИТ-101, ИТ-102)")
        print("   Учитель 2: teacher2 / teacher123 (ведет группы ИТ-201, ИТ-202)")
        print("   Студенты: student1-student5 / student123")
        
        print("\n[*] Треки:")
        for track in tracks:
            lesson_counts = {"lecture": 0, "task": 0, "puzzle": 0, "question": 0}
            for lesson in track.lessons:
                lesson_counts[lesson.type] = lesson_counts.get(lesson.type, 0) + 1
            parts = [f"{lesson_counts['lecture']} лекций", f"{lesson_counts['task']} задач",
                     f"{lesson_counts['puzzle']} puzzle", f"{lesson_counts['question']} вопросов"]
            print(f"   {track.title}: {', '.join(parts)}")
        
    except Exception as e:
        print(f"\n[ERROR] Ошибка при создании данных: {e}")
        return 1
    finally:
        # Отключение от MongoDB
        disconnect()
        print("\n[*] Отключено от MongoDB")
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
