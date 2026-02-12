#!/usr/bin/env python3
"""
Скрипт для создания тестовых данных в MongoDB.
Запуск: python mock.py (из корня back/ или python back/mock.py)
Использует настройки Django (MONGODB_* из config.settings).
"""

import hashlib
import os
import sys
import uuid
from datetime import datetime, timedelta

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
from apps.tasks.documents import Task, TaskCaseEmbed
from apps.puzzles.documents import Puzzle, CodeBlockEmbed
from apps.questions.documents import Question, QuestionChoiceEmbed
from apps.achievements.documents import UserAchievement

GLOBAL_CREATED_GROUPS = []


def _public_id():
    """Генерирует 12-символьный hex id для public_id (единый стандарт)."""
    return uuid.uuid4().hex[:12]


def _stable_public_id(seed: str) -> str:
    """Детерминированный 12-символьный hex по строке-семени (для мока: одни и те же id после перезапуска)."""
    return hashlib.sha256(seed.encode()).hexdigest()[:12]


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

def _delete_lessons_of_track(track):
    """Удаляет из БД все уроки (лекции, задачи, пазлы, вопросы), входящие в трек. Чтобы они не попадали в одиночные."""
    from bson import ObjectId
    for lesson in getattr(track, "lessons", []) or []:
        lid = getattr(lesson, "id", None)
        if not lid:
            continue
        t = getattr(lesson, "type", None)
        # id в LessonRef может приходить как str (24-симв. ObjectId) или как ObjectId из Mongo
        oid = None
        try:
            if isinstance(lid, ObjectId):
                oid = lid
            else:
                s = str(lid)
                if len(s) == 24 and ObjectId.is_valid(s):
                    oid = ObjectId(s)
        except Exception:
            pass
        if oid:
            if t == "lecture":
                Lecture.objects(id=oid).delete()
            elif t == "task":
                Task.objects(id=oid).delete()
            elif t == "puzzle":
                Puzzle.objects(id=oid).delete()
            elif t == "question":
                Question.objects(id=oid).delete()
        elif t and len(str(lid)) == 12:
            # Fallback: удаление по public_id (12 символов), если в ref попал public_id
            if t == "lecture":
                Lecture.objects(public_id=str(lid)).delete()
            elif t == "task":
                Task.objects(public_id=str(lid)).delete()
            elif t == "puzzle":
                Puzzle.objects(public_id=str(lid)).delete()
            elif t == "question":
                Question.objects(public_id=str(lid)).delete()


def create_test_tracks_with_lessons():
    """Создание тестовых треков: 3 компактных трека, в каждом — лекция (продакшн-уровень), задача, пазл и вопрос."""
    print("\n[*] Создание тестовых треков с уроками...")

    new_titles = {"Первые шаги в Python", "Условия и циклы", "Функции и данные"}
    for old_track in Track.objects(title__nin=list(new_titles)):
        _delete_lessons_of_track(old_track)
        old_track.delete()
        print(f"  [OK] Удалён старый трек: {old_track.title}")

    tracks_data = [
        {
            "title": "Первые шаги в Python",
            "description": "Синтаксис, переменные, вывод и ввод данных. Мини-курс для старта.",
            "order": 1,
        },
        {
            "title": "Условия и циклы",
            "description": "Ветвление if/else, циклы for и while. Управление потоком выполнения.",
            "order": 2,
        },
        {
            "title": "Функции и данные",
            "description": "Определение функций, списки и словари. Структуры данных Python.",
            "order": 3,
        },
    ]

    created_tracks = []
    for track_data in tracks_data:
        existing_track = Track.objects(title=track_data["title"]).first()
        if existing_track:
            track = existing_track
            track.public_id = _stable_public_id("track:" + track_data["title"])
            print(f"  [OK] Трек '{track.title}' уже существует")
        else:
            track = Track(
                title=track_data["title"],
                description=track_data["description"],
                order=track_data["order"],
                lessons=[],
            )
            track.public_id = _stable_public_id("track:" + track_data["title"])
            track.save()
            print(f"  [OK] Создан трек: {track.title}")
        created_tracks.append(track)

    def _qblock(qid, title, prompt, choices, multiple=False, hints=None):
        return {
            "type": "question",
            "id": qid,
            "title": title,
            "prompt": prompt,
            "choices": [{"id": c.id, "text": c.text, "is_correct": getattr(c, "is_correct", False)} for c in choices],
            "multiple": multiple,
            "hints": hints or [],
        }

    for track in created_tracks:
        track_id = str(track.id)
        order = 1
        lessons = []
        # Сначала удаляем старые уроки трека, чтобы не было дубликатов public_id при создании новых
        _delete_lessons_of_track(track)

        def add_lecture(title, content_blocks):
            nonlocal order
            seed = f"lecture:{track.title}:{title}"
            pid = _stable_public_id(seed)
            Lecture.objects(public_id=pid).delete()  # освобождаем public_id перед созданием
            lec = Lecture(title=title, track_id=track_id, content="", blocks=content_blocks)
            lec.public_id = pid
            lec.save()
            ref = LessonRef(id=str(lec.id), type="lecture", title=title, order=order)
            order += 1
            return ref

        def add_task(title, desc, starter, test_cases, hard=False, hints=None):
            nonlocal order
            seed = f"task:{track.title}:{title}"
            pid = _stable_public_id(seed)
            Task.objects(public_id=pid).delete()
            t = Task(
                title=title,
                description=desc,
                starter_code=starter,
                track_id=track_id,
                test_cases=test_cases,
                hard=hard,
                hints=hints or [],
            )
            t.public_id = pid
            t.save()
            ref = LessonRef(id=str(t.id), type="task", title=title, order=order)
            order += 1
            return ref

        def add_puzzle(title, desc, blocks, solution, hints=None):
            nonlocal order
            seed = f"puzzle:{track.title}:{title}"
            pid = _stable_public_id(seed)
            Puzzle.objects(public_id=pid).delete()
            p = Puzzle(
                title=title,
                description=desc,
                track_id=track_id,
                language="python",
                blocks=blocks,
                solution=solution,
                hints=hints or [],
            )
            p.public_id = pid
            p.save()
            ref = LessonRef(id=str(p.id), type="puzzle", title=title, order=order)
            order += 1
            return ref

        def add_question(title, prompt, choices_embed, multiple=False, hints=None):
            nonlocal order
            seed = f"question:{track.title}:{title}"
            pid = _stable_public_id(seed)
            Question.objects(public_id=pid).delete()  # гарантированно освобождаем public_id
            q = Question(
                title=title,
                prompt=prompt,
                track_id=track_id,
                choices=choices_embed,
                multiple=multiple,
                hints=hints or [],
            )
            q.public_id = pid
            q.save()
            ref = LessonRef(id=str(q.id), type="question", title=title, order=order)
            order += 1
            return ref

        if track.title == "Первые шаги в Python":
            # Лекция: текст, изображение, код, видео с вопросами, обычный вопрос
            lessons.append(add_lecture("Введение в Python: синтаксис и первая программа", [
                {"type": "text", "content": (
                    "<h2>Почему Python?</h2>"
                    "<p>Python — один из самых популярных языков программирования: простой синтаксис, "
                    "читаемый код и огромное сообщество. Его используют в веб-разработке, данных, автоматизации и обучении.</p>"
                    "<h3>Что мы изучим в этом уроке</h3>"
                    "<ul><li>Запуск кода и функция <strong>print()</strong></li>"
                    "<li>Переменные и базовые типы данных</li>"
                    "<li>Ввод данных с клавиатуры</li></ul>"
                    "<blockquote><strong>Совет.</strong> Запускайте примеры кода в редакторе — так материал запоминается лучше.</blockquote>"
                )},
                {"type": "image", "url": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800", "alt": "Код на Python в редакторе"},
                {"type": "code", "explanation": "Классическая первая программа. В Python 3 вызов print() с одним аргументом выводит строку в консоль.", "code": "print('Hello, World!')", "language": "python"},
                {"type": "text", "content": (
                    "<h3>Вывод нескольких значений</h3>"
                    "<p>В <code>print()</code> можно передать несколько аргументов через запятую — они выводятся через пробел. "
                    "Перевод строки добавляется в конце автоматически.</p>"
                )},
                {"type": "code", "explanation": "Несколько аргументов выводятся через пробел.", "code": "print('Имя:', 'Алекс', 'Возраст:', 25)", "language": "python"},
                {"type": "video", "id": "vid-intro-python", "url": "https://www.w3schools.com/html/mov_bbb.mp4", "pause_points": [
                    {"id": "pp1", "timestamp": 2, "question": {"id": "vq1", "title": "Проверка внимания", "prompt": "Функция print() в Python выводит данные в:", "choices": [
                        {"id": "vc1", "text": "консоль (терминал)", "is_correct": True},
                        {"id": "vc2", "text": "файл", "is_correct": False},
                        {"id": "vc3", "text": "браузер", "is_correct": False},
                    ], "multiple": False}},
                ]},
                _qblock("q1", "Что выведет print(2 + 3)?", "Выберите правильный ответ:",
                    [QuestionChoiceEmbed(id="c1", text="2 + 3", is_correct=False),
                     QuestionChoiceEmbed(id="c2", text="5", is_correct=True),
                     QuestionChoiceEmbed(id="c3", text="23", is_correct=False)],
                    multiple=False, hints=["Сначала вычисляется выражение 2 + 3, затем результат передаётся в print."]),
            ]))
            lessons.append(add_task("Приветствие", "Считайте имя пользователя из одной строки и выведите: Привет, <имя>.", "name = input()\nprint('Привет,', name)", [TaskCaseEmbed(id="c1", input="Мир", expected_output="Привет, Мир\n", is_public=True)]))
            lessons.append(add_puzzle("Соберите вывод", "Расположите блоки так, чтобы программа вывела строку Привет, Python.",
                [CodeBlockEmbed(id="b1", code='print("Привет, Python")', order="1", indent="")],
                'print("Привет, Python")', hints=["Достаточно одного вызова print с нужной строкой."]))
            lessons.append(add_question("Тип результата", "Какой тип имеет результат операции 5 / 2 в Python 3?",
                [QuestionChoiceEmbed(id="c1", text="int", is_correct=False), QuestionChoiceEmbed(id="c2", text="float", is_correct=True), QuestionChoiceEmbed(id="c3", text="str", is_correct=False)], multiple=False, hints=["В Python 3 обычное деление / всегда возвращает float."]))

        elif track.title == "Условия и циклы":
            lessons.append(add_lecture("Ветвление и циклы в Python", [
                {"type": "text", "content": (
                    "<h2>Управление потоком выполнения</h2>"
                    "<p>Программы редко выполняются строго по порядку. Условный оператор <strong>if</strong> и циклы "
                    "<strong>for</strong> и <strong>while</strong> позволяют менять порядок и повторять действия.</p>"
                    "<h3>Условие if / else</h3>"
                    "<p>Блок <code>if</code> выполняется, если условие истинно. Опционально можно добавить <code>elif</code> и <code>else</code>. "
                    "Важно: отступы в Python задают вложенность блоков.</p>"
                )},
                {"type": "image", "url": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800", "alt": "Код: условия и ветвление"},
                {"type": "code", "explanation": "Проверка знака числа. int(input()) читает целое число с клавиатуры.", "code": "x = int(input())\nif x > 0:\n    print('Положительное')\nelif x < 0:\n    print('Отрицательное')\nelse:\n    print('Ноль')", "language": "python", "stdin": "5"},
                {"type": "video", "id": "vid-if-for", "url": "https://www.w3schools.com/html/mov_bbb.mp4", "pause_points": [
                    {"id": "pp1", "timestamp": 1, "question": {"id": "vq2a", "title": "Синтаксис if", "prompt": "Как обозначается блок условия в Python?", "choices": [
                        {"id": "vc2a1", "text": "Фигурными скобками {}", "is_correct": False},
                        {"id": "vc2a2", "text": "Отступами (пробелами)", "is_correct": True},
                        {"id": "vc2a3", "text": "Ключевым словом begin/end", "is_correct": False},
                    ], "multiple": False}},
                    {"id": "pp2", "timestamp": 4, "question": {"id": "vq2b", "title": "Цикл for", "prompt": "Что перебирает цикл for i in range(3)?", "choices": [
                        {"id": "vc2b1", "text": "Числа 0, 1, 2", "is_correct": True},
                        {"id": "vc2b2", "text": "Числа 1, 2, 3", "is_correct": False},
                        {"id": "vc2b3", "text": "Строку '012'", "is_correct": False},
                    ], "multiple": False}},
                ]},
                {"type": "text", "content": (
                    "<h3>Цикл for</h3>"
                    "<p><code>for</code> перебирает элементы последовательности. Функция <code>range(n)</code> даёт числа от 0 до n-1 включительно.</p>"
                )},
                {"type": "code", "explanation": "Вывод чётных чисел от 0 до 8. range(0, 10, 2) — старт, конец, шаг.", "code": "for i in range(0, 10, 2):\n    print(i)", "language": "python"},
                _qblock("q2", "Сколько итераций выполнит цикл for i in range(5)?", "Выберите один ответ:",
                    [QuestionChoiceEmbed(id="c1", text="4", is_correct=False), QuestionChoiceEmbed(id="c2", text="5", is_correct=True), QuestionChoiceEmbed(id="c3", text="6", is_correct=False)],
                    multiple=False, hints=["range(5) порождает числа 0, 1, 2, 3, 4 — всего пять значений."]),
            ]))
            lessons.append(add_task("Чётное или нечётное", "Прочитайте целое число и выведите строку чётное или нечётное.", "n = int(input())\nif n % 2 == 0:\n    print('чётное')\nelse:\n    print('нечётное')",
                [TaskCaseEmbed(id="c1", input="4", expected_output="чётное\n", is_public=True), TaskCaseEmbed(id="c2", input="7", expected_output="нечётное\n", is_public=False)],
                hints=["Остаток от деления на 2: n % 2. Ноль — чётное."]))
            lessons.append(add_puzzle("Соберите условие", "Расположите блоки для вывода большего из двух чисел.",
                [CodeBlockEmbed(id="b1", code="a = int(input())\nb = int(input())", order="1", indent=""),
                 CodeBlockEmbed(id="b2", code="if a > b:", order="2", indent=""), CodeBlockEmbed(id="b3", code="print(a)", order="3", indent="    "),
                 CodeBlockEmbed(id="b4", code="else:", order="4", indent=""), CodeBlockEmbed(id="b5", code="print(b)", order="5", indent="    ")],
                "a = int(input())\nb = int(input())\nif a > b:\n    print(a)\nelse:\n    print(b)",
                hints=["Сначала ввод двух чисел, затем if/else с выводом соответствующего значения."]))
            lessons.append(add_question("Цикл while", "Когда цикл while прекратит выполнение? Условие: while x > 0: x -= 1",
                [QuestionChoiceEmbed(id="c1", text="Когда x станет 0", is_correct=True), QuestionChoiceEmbed(id="c2", text="Когда x станет отрицательным", is_correct=False), QuestionChoiceEmbed(id="c3", text="Никогда", is_correct=False)],
                multiple=False, hints=["Условие x > 0 ложно при x == 0."]))

        else:  # Функции и данные
            lessons.append(add_lecture("Функции, списки и словари", [
                {"type": "text", "content": (
                    "<h2>Функции</h2>"
                    "<p>Функция — именованный блок кода, который можно вызывать с аргументами. Ключевое слово <strong>def</strong>, "
                    "затем имя функции, в скобках параметры. Тело функции пишется с отступом. <code>return</code> возвращает результат.</p>"
                )},
                {"type": "image", "url": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", "alt": "Разработка: функции и структуры данных"},
                {"type": "code", "explanation": "Функция с одним параметром и возвратом значения.", "code": "def double(n):\n    return n * 2\n\nprint(double(5))   # 10", "language": "python"},
                {"type": "video", "id": "vid-func-data", "url": "https://www.w3schools.com/html/mov_bbb.mp4", "pause_points": [
                    {"id": "pp1", "timestamp": 2, "question": {"id": "vq3", "title": "Определение функции", "prompt": "Как в Python объявляется функция?", "choices": [
                        {"id": "vc31", "text": "function name():", "is_correct": False},
                        {"id": "vc32", "text": "def name():", "is_correct": True},
                        {"id": "vc33", "text": "func name():", "is_correct": False},
                    ], "multiple": False}},
                ]},
                {"type": "text", "content": (
                    "<h3>Списки</h3>"
                    "<p>Список <code>list</code> — упорядоченная изменяемая коллекция. Индексация с нуля. Функция <code>len()</code> возвращает длину. "
                    "Срезы <code>list[start:end]</code> позволяют получать подпоследовательности.</p>"
                )},
                {"type": "code", "explanation": "Создание списка, обращение по индексу и срез.", "code": "nums = [10, 20, 30, 40, 50]\nprint(nums[0], nums[-1])\nprint(nums[1:4])   # [20, 30, 40]", "language": "python"},
                {"type": "text", "content": "<h3>Словари</h3><p>Словарь <code>dict</code> хранит пары <em>ключ : значение</em>. Ключи уникальны. Доступ по ключу: <code>d[key]</code> или <code>d.get(key)</code>.</p>"},
                {"type": "code", "explanation": "Словарь и добавление элемента.", "code": "user = {'name': 'Алекс', 'age': 25}\nuser['city'] = 'Москва'\nprint(user['name'], user['city'])", "language": "python"},
                _qblock("q3", "Как получить длину списка nums?", "Выберите правильный вариант:",
                    [QuestionChoiceEmbed(id="c1", text="nums.size()", is_correct=False), QuestionChoiceEmbed(id="c2", text="len(nums)", is_correct=True), QuestionChoiceEmbed(id="c3", text="nums.length", is_correct=False)],
                    multiple=False, hints=["В Python встроенная функция len() работает со списками, строками и другими коллекциями."]),
            ]))
            lessons.append(add_task("Сумма списка", "В коде задан список чисел. Выведите их сумму.", "nums = [1, 2, 3, 4, 5]\ntotal = sum(nums)\nprint(total)", [TaskCaseEmbed(id="c1", input="", expected_output="15\n", is_public=True)], hints=["Функция sum() возвращает сумму элементов."]))
            lessons.append(add_puzzle("Соберите функцию", "Расположите блоки так, чтобы функция greet возвращала приветствие.",
                [CodeBlockEmbed(id="b1", code='def greet(name):', order="1", indent=""),
                 CodeBlockEmbed(id="b2", code='return "Привет, " + name', order="2", indent="    "),
                 CodeBlockEmbed(id="b3", code='print(greet("Мир"))', order="3", indent="")],
                'def greet(name):\n    return "Привет, " + name\nprint(greet("Мир"))',
                hints=["Сначала def с телом return, затем вызов и вывод."]))
            lessons.append(add_question("Пустой словарь", "Как правильно создать пустой словарь? Выберите все верные варианты.",
                [QuestionChoiceEmbed(id="c1", text="{}", is_correct=True), QuestionChoiceEmbed(id="c2", text="dict()", is_correct=True), QuestionChoiceEmbed(id="c3", text="[]", is_correct=False)],
                multiple=True, hints=["[] — это пустой список. Для словаря используются фигурные скобки или dict()."]))

        track.lessons = lessons
        track.visible_group_ids = []
        _ensure_public_id(track)
        track.save()
        print(f"  [OK] Трек '{track.title}': {len(lessons)} уроков (лекция, задача, пазл, вопрос)")

    return created_tracks


def create_orphan_assignments():
    """Одиночные задания (не в треке): ровно по одному заданию каждого вида — задача, пазл, вопрос."""
    print("\n[*] Создание одиночных заданий (по одному каждого вида)...")
    # Одна одиночная задача: освобождаем public_id и создаём заново
    pid_task = _stable_public_id("orphan:task:Квадрат числа")
    Task.objects(public_id=pid_task).delete()
    ot = Task(
        title="Одиночная задача: Квадрат числа",
        description="Прочитайте число и выведите его квадрат.",
        starter_code="n = int(input())\nprint(n * n)",
        track_id="",
        test_cases=[TaskCaseEmbed(id="c1", input="5", expected_output="25\n", is_public=True)],
        hints=["Используйте input() и int().", "Квадрат числа n — это n * n."],
        max_attempts=3,
    )
    ot.public_id = pid_task
    ot.save()
    print("  [OK] Создана одиночная задача (1 шт.)")
    # Один одиночный пазл
    pid_puzzle = _stable_public_id("orphan:puzzle:вывод строки")
    Puzzle.objects(public_id=pid_puzzle).delete()
    op = Puzzle(
        title="Одиночный пазл: вывод строки",
        description="Соберите блоки так, чтобы программа вывела строку Привет.",
        track_id="",
        language="python",
        blocks=[
            CodeBlockEmbed(id="b1", code='print("Привет")', order="1", indent=""),
        ],
        solution='print("Привет")',
        hints=["Достаточно одного блока с print."],
    )
    op.public_id = pid_puzzle
    op.save()
    print("  [OK] Создан одиночный пазл (1 шт.)")
    # Один одиночный вопрос
    pid_question = _stable_public_id("orphan:question:тип range")
    Question.objects(public_id=pid_question).delete()
    oq = Question(
        title="Одиночный вопрос: тип range",
        prompt="Какой тип у значения range(5) в Python 3?",
        track_id="",
        choices=[
            QuestionChoiceEmbed(id="c1", text="list", is_correct=False),
            QuestionChoiceEmbed(id="c2", text="range", is_correct=True),
            QuestionChoiceEmbed(id="c3", text="tuple", is_correct=False),
        ],
        multiple=False,
        hints=["В Python 3 range — это отдельный тип, не список."],
        max_attempts=2,
    )
    oq.public_id = pid_question
    oq.save()
    print("  [OK] Создан одиночный вопрос (1 шт.)")
    print("  [OK] Одиночные задания: 1 задача, 1 пазл, 1 вопрос")


def _cleanup_stale_orphans():
    """Удаляет лекции/задачи/пазлы/вопросы, не входящие ни в один трек и не входящие в список одиночных мокапа.
    В итоге в «Отдельных заданиях» только 1 задача, 1 пазл, 1 вопрос; лишних сирот нет."""
    from bson import ObjectId
    allowed_orphan_public_ids = {
        _stable_public_id("orphan:task:Квадрат числа"),
        _stable_public_id("orphan:puzzle:вывод строки"),
        _stable_public_id("orphan:question:тип range"),
    }
    in_track_ids = set()
    for track in Track.objects.all():
        for lesson in getattr(track, "lessons", []) or []:
            lid = getattr(lesson, "id", None)
            if lid:
                in_track_ids.add(str(lid))
    # Добавляем public_id уроков из треков (как на бэкенде)
    for track in Track.objects.all():
        for lesson in getattr(track, "lessons", []) or []:
            lid = getattr(lesson, "id", None)
            if not lid:
                continue
            sid = str(lid)
            if len(sid) == 24 and ObjectId.is_valid(sid):
                try:
                    oid = ObjectId(sid)
                    t = getattr(lesson, "type", None)
                    if t == "lecture":
                        doc = Lecture.objects(id=oid).only("public_id").first()
                    elif t == "task":
                        doc = Task.objects(id=oid).only("public_id").first()
                    elif t == "puzzle":
                        doc = Puzzle.objects(id=oid).only("public_id").first()
                    elif t == "question":
                        doc = Question.objects(id=oid).only("public_id").first()
                    else:
                        doc = None
                    if doc and getattr(doc, "public_id", None):
                        in_track_ids.add(str(doc.public_id))
                except Exception:
                    pass
    # Удаляем лишнее: не в треке и не разрешённый одиночный
    for lec in list(Lecture.objects.all()):
        oid, pid = str(lec.id), str(getattr(lec, "public_id", None) or "")
        if oid not in in_track_ids and pid not in in_track_ids:
            lec.delete()
    for task in list(Task.objects.all()):
        oid, pid = str(task.id), str(getattr(task, "public_id", None) or "")
        if oid not in in_track_ids and pid not in in_track_ids and pid not in allowed_orphan_public_ids:
            task.delete()
    for puzzle in list(Puzzle.objects.all()):
        oid, pid = str(puzzle.id), str(getattr(puzzle, "public_id", None) or "")
        if oid not in in_track_ids and pid not in in_track_ids and pid not in allowed_orphan_public_ids:
            puzzle.delete()
    for question in list(Question.objects.all()):
        oid, pid = str(question.id), str(getattr(question, "public_id", None) or "")
        if oid not in in_track_ids and pid not in in_track_ids and pid not in allowed_orphan_public_ids:
            question.delete()
    print("  [OK] Очистка лишних одиночных заданий выполнена")


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
        create_orphan_assignments()
        _cleanup_stale_orphans()
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
