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
from datetime import datetime, timedelta, timezone

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
from apps.surveys.documents import Survey
from apps.layouts.documents import LayoutLesson, LayoutSubtaskEmbed
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
    """Удаляет из БД все уроки (лекции, задачи, пазлы, вопросы, верстка), входящие в трек."""
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
            elif t == "layout":
                LayoutLesson.objects(id=oid).delete()
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
            elif t == "layout":
                LayoutLesson.objects(public_id=str(lid)).delete()


def create_test_tracks_with_lessons():
    """Создание тестовых треков: 3 Python-трека (лекция, задача, пазл, вопрос, верстка) + отдельный трек по вёрстке."""
    print("\n[*] Создание тестовых треков с уроками...")

    new_titles = {
        "Первые шаги в Python",
        "Условия и циклы",
        "Функции и данные",
        "Верстка: HTML, CSS и JS",
    }
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
        {
            "title": "Верстка: HTML, CSS и JS",
            "description": "Практика: карточки, адаптивная сетка, формы и клиентский JS. Сначала — вводная лекция, затем задания.",
            "order": 4,
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

        def add_layout(
            title,
            description,
            template_html,
            template_css,
            template_js,
            subtasks,
            hints=None,
            editable_files=None,
            attached_lecture_id="",
            check_mode="subtasks",
            reference_html=None,
            reference_css=None,
            reference_js=None,
        ):
            nonlocal order
            seed = f"layout:{track.title}:{title}"
            pid = _stable_public_id(seed)
            LayoutLesson.objects(public_id=pid).delete()
            ef = editable_files if editable_files else ["html", "css", "js"]
            layout = LayoutLesson(
                title=title,
                description=description,
                track_id=track_id,
                template_html=template_html,
                template_css=template_css,
                template_js=template_js,
                reference_html=reference_html if reference_html is not None else template_html,
                reference_css=reference_css if reference_css is not None else template_css,
                reference_js=reference_js if reference_js is not None else template_js,
                check_mode=check_mode,
                editable_files=ef,
                subtasks=[LayoutSubtaskEmbed(**st) for st in subtasks],
                hints=hints or [],
                attached_lecture_id=attached_lecture_id or "",
            )
            layout.public_id = pid
            layout.save()
            ref = LessonRef(id=str(layout.id), type="layout", title=title, order=order)
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
            lessons.append(add_layout(
                "Профиль пользователя: HTML + CSS",
                "Сверстайте карточку профиля с аватаром, именем и кнопкой действия.",
                (
                    "<article class='profile-card'>\n"
                    "  <img class='avatar' src='https://i.pravatar.cc/120?img=8' alt='avatar'>\n"
                    "  <h2 class='name'>Анна Смирнова</h2>\n"
                    "  <p class='role'>Frontend Developer</p>\n"
                    "  <button class='action-btn'>Написать</button>\n"
                    "</article>"
                ),
                (
                    ".profile-card {\n"
                    "  max-width: 320px;\n"
                    "  margin: 24px auto;\n"
                    "  padding: 20px;\n"
                    "  border-radius: 16px;\n"
                    "  background: #fff;\n"
                    "  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);\n"
                    "  text-align: center;\n"
                    "}\n"
                    "\n"
                    ".avatar {\n"
                    "  width: 88px;\n"
                    "  height: 88px;\n"
                    "  border-radius: 50%;\n"
                    "}\n"
                    "\n"
                    ".action-btn {\n"
                    "  border: 0;\n"
                    "  border-radius: 10px;\n"
                    "  padding: 10px 14px;\n"
                    "  background: #2563eb;\n"
                    "  color: #fff;\n"
                    "}"
                ),
                "",
                [
                    {"id": "l1s1", "title": "Есть контейнер карточки", "check_type": "selector_exists", "check_value": ".profile-card"},
                    {"id": "l1s2", "title": "Кнопка имеет скругления", "check_type": "css_contains", "check_value": "border-radius"},
                    {"id": "l1s3", "title": "Есть подпись роли", "check_type": "html_contains", "check_value": "Frontend Developer"},
                ],
                hints=["Начните с семантичного контейнера article.", "Сделайте акцент кнопкой через контрастный цвет."],
            ))

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
            lessons.append(add_layout(
                "Адаптивная сетка товаров",
                "Сделайте grid-сетку карточек: 3 колонки на десктопе, 2 на планшете, 1 на телефоне.",
                (
                    "<section class='products'>\n"
                    "  <article class='product-card'>Товар 1</article>\n"
                    "  <article class='product-card'>Товар 2</article>\n"
                    "  <article class='product-card'>Товар 3</article>\n"
                    "  <article class='product-card'>Товар 4</article>\n"
                    "</section>"
                ),
                (
                    ".products {\n"
                    "  display: grid;\n"
                    "  gap: 16px;\n"
                    "  grid-template-columns: repeat(3, minmax(0, 1fr));\n"
                    "}\n"
                    "\n"
                    ".product-card {\n"
                    "  border: 1px solid #e2e8f0;\n"
                    "  border-radius: 12px;\n"
                    "  padding: 16px;\n"
                    "  background: #fff;\n"
                    "}\n"
                    "\n"
                    "@media (max-width: 900px) {\n"
                    "  .products {\n"
                    "    grid-template-columns: repeat(2, minmax(0, 1fr));\n"
                    "  }\n"
                    "}\n"
                    "\n"
                    "@media (max-width: 600px) {\n"
                    "  .products {\n"
                    "    grid-template-columns: 1fr;\n"
                    "  }\n"
                    "}"
                ),
                "",
                [
                    {"id": "l2s1", "title": "Используется grid", "check_type": "css_contains", "check_value": "display:grid"},
                    {"id": "l2s2", "title": "Есть media query", "check_type": "css_contains", "check_value": "@media"},
                    {"id": "l2s3", "title": "Есть карточка товара", "check_type": "selector_exists", "check_value": ".product-card"},
                ],
                hints=["Используйте repeat(..., minmax(0,1fr)) для стабильной сетки."],
            ))

        elif track.title == "Функции и данные":
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
            lessons.append(add_layout(
                "Форма входа с валидацией",
                "Оформите форму входа и добавьте JS-проверку, что оба поля заполнены.",
                (
                    "<form class='login-form' id='login-form'>\n"
                    "  <h2>Вход</h2>\n"
                    "  <label for='email'>Email</label>\n"
                    "  <input id='email' type='email' placeholder='you@example.com'>\n"
                    "  <label for='password'>Пароль</label>\n"
                    "  <input id='password' type='password' placeholder='••••••••'>\n"
                    "  <button type='submit' class='submit-btn'>Войти</button>\n"
                    "  <p class='form-message' id='form-message'></p>\n"
                    "</form>"
                ),
                (
                    ".login-form {\n"
                    "  width: min(100%, 360px);\n"
                    "  margin: 24px auto;\n"
                    "  padding: 20px;\n"
                    "  border: 1px solid #e2e8f0;\n"
                    "  border-radius: 14px;\n"
                    "  display: grid;\n"
                    "  gap: 10px;\n"
                    "  background: #fff;\n"
                    "}\n"
                    "\n"
                    ".submit-btn {\n"
                    "  border: 0;\n"
                    "  border-radius: 10px;\n"
                    "  padding: 10px 14px;\n"
                    "  background: #0f172a;\n"
                    "  color: #fff;\n"
                    "}\n"
                    "\n"
                    ".form-message {\n"
                    "  min-height: 20px;\n"
                    "  color: #dc2626;\n"
                    "}"
                ),
                (
                    "const form = document.getElementById('login-form');\n"
                    "const email = document.getElementById('email');\n"
                    "const password = document.getElementById('password');\n"
                    "const message = document.getElementById('form-message');\n"
                    "\n"
                    "form?.addEventListener('submit', (e) => {\n"
                    "  e.preventDefault();\n"
                    "  if (!email?.value || !password?.value) {\n"
                    "    if (message) message.textContent = 'Заполните все поля.';\n"
                    "    return;\n"
                    "  }\n"
                    "  if (message) message.textContent = 'Отлично! Можно отправлять на сервер.';\n"
                    "});"
                ),
                [
                    {"id": "l3s1", "title": "Есть форма входа", "check_type": "selector_exists", "check_value": ".login-form"},
                    {"id": "l3s2", "title": "Есть JS-валидация", "check_type": "js_contains", "check_value": "Заполните все поля"},
                    {"id": "l3s3", "title": "Оформлена кнопка submit", "check_type": "selector_exists", "check_value": ".submit-btn"},
                ],
                hints=["Не удаляйте id у полей, иначе JS не найдет элементы."],
            ))

        elif track.title == "Верстка: HTML, CSS и JS":
            from common.db_utils import get_doc_by_pk

            intro_ref = add_lecture("Как проходить задания по верстке", [
                {"type": "text", "content": (
                    "<h2>Формат трека</h2>"
                    "<p>Каждое задание максимально простое и состоит из маленьких шагов. "
                    "Перед заданием идёт отдельная лекция: сначала теория, потом пошаговый план выполнения.</p>"
                    "<h3>Как работать</h3>"
                    "<ol>"
                    "<li>Откройте связанную лекцию и прочитайте шаги.</li>"
                    "<li>Сделайте шаг 1, затем шаг 2 и так далее.</li>"
                    "<li>Проверяйте результат в превью после каждого шага.</li>"
                    "<li>Если чекер не проходит — смотрите подсказки в задании.</li>"
                    "</ol>"
                )},
            ])
            lessons.append(intro_ref)

            card_theory_ref = add_lecture("Лекция к заданию 1: карточка профиля (пошагово)", [
                {"type": "text", "content": (
                    "<h2>Что нужно сделать</h2>"
                    "<p>Собрать простую карточку: имя, роль и кнопку.</p>"
                    "<h3>Шаг 1 — HTML</h3>"
                    "<p>Создайте контейнер <code>.profile-card</code>. Внутри добавьте:"
                    " <code>h2.name</code>, <code>p.role</code> и <code>button.action-btn</code>.</p>"
                    "<h3>Шаг 2 — CSS</h3>"
                    "<p>Добавьте отступы, скругление и светлый фон для карточки. "
                    "Для кнопки обязательно добавьте <code>border-radius</code>.</p>"
                    "<h3>Шаг 3 — Проверка</h3>"
                    "<p>Убедитесь, что в тексте роли есть слова <b>Frontend Junior</b>. "
                    "Чекер ищет этот текст и классы элементов.</p>"
                    "<h3>Типичные ошибки</h3>"
                    "<ul>"
                    "<li>Опечатка в названии класса (<code>profile-card</code>).</li>"
                    "<li>Нет <code>border-radius</code> у кнопки.</li>"
                    "<li>Неправильный текст роли.</li>"
                    "</ul>"
                )},
            ])
            card_theory = get_doc_by_pk(Lecture, str(card_theory_ref.id))
            card_theory_id = str(getattr(card_theory, "public_id", None) or str(card_theory.id))
            lessons.append(card_theory_ref)
            lessons.append(add_layout(
                "Карточка профиля: базовый вариант",
                "Простая карточка: имя, роль и кнопка. Следуйте шагам из связанной лекции.",
                (
                    "<article class='profile-card'>\n"
                    "  <h2 class='name'>Анна Смирнова</h2>\n"
                    "  <p class='role'>Frontend Junior</p>\n"
                    "  <button class='action-btn'>Связаться</button>\n"
                    "</article>"
                ),
                (
                    ".profile-card {\n"
                    "  max-width: 320px;\n"
                    "  margin: 24px auto;\n"
                    "  padding: 16px;\n"
                    "  border-radius: 12px;\n"
                    "  background: #ffffff;\n"
                    "  border: 1px solid #e2e8f0;\n"
                    "}\n"
                    "\n"
                    ".name {\n"
                    "  margin: 0 0 8px;\n"
                    "}\n"
                    "\n"
                    ".role {\n"
                    "  margin: 0 0 12px;\n"
                    "  color: #475569;\n"
                    "}\n"
                    "\n"
                    ".action-btn {\n"
                    "  border: 0;\n"
                    "  border-radius: 8px;\n"
                    "  padding: 8px 12px;\n"
                    "  background: #2563eb;\n"
                    "  color: #fff;\n"
                    "}"
                ),
                "",
                [
                    {"id": "w1s1", "title": "Есть контейнер карточки", "check_type": "selector_exists", "check_value": ".profile-card"},
                    {"id": "w1s2", "title": "Кнопка со скруглением", "check_type": "css_contains", "check_value": "border-radius"},
                    {"id": "w1s3", "title": "Есть текст роли", "check_type": "html_contains", "check_value": "Frontend Junior"},
                ],
                hints=[
                    "Классы должны совпадать с лекцией: .profile-card, .role, .action-btn.",
                    "Проверьте, что текст роли написан без опечаток.",
                ],
                editable_files=["html", "css"],
                attached_lecture_id=card_theory_id,
            ))

            grid_theory_ref = add_lecture("Лекция к заданию 2: простая адаптивная сетка", [
                {"type": "text", "content": (
                    "<h2>Цель</h2>"
                    "<p>Сделать сетку карточек, которая меняет число колонок на разных экранах.</p>"
                    "<h3>Шаг 1 — включите Grid</h3>"
                    "<p>У контейнера <code>.products</code> задайте <code>display: grid;</code>.</p>"
                    "<h3>Шаг 2 — базовая сетка</h3>"
                    "<p>Добавьте <code>grid-template-columns: repeat(3, 1fr)</code> и <code>gap</code>.</p>"
                    "<h3>Шаг 3 — адаптив</h3>"
                    "<p>Через <code>@media</code> сделайте 2 колонки до 900px и 1 колонку до 600px.</p>"
                    "<h3>Проверка</h3>"
                    "<p>Чекер проверяет наличие <code>display: grid</code>, <code>@media</code> и класса <code>.product-card</code>.</p>"
                )},
            ])
            grid_theory = get_doc_by_pk(Lecture, str(grid_theory_ref.id))
            grid_theory_id = str(getattr(grid_theory, "public_id", None) or str(grid_theory.id))
            lessons.append(grid_theory_ref)
            lessons.append(add_layout(
                "Адаптивная сетка: 3-2-1",
                "Сделайте сетку карточек 3-2-1 (десктоп-планшет-мобайл).",
                (
                    "<section class='products'>\n"
                    "  <article class='product-card'>Карточка 1</article>\n"
                    "  <article class='product-card'>Карточка 2</article>\n"
                    "  <article class='product-card'>Карточка 3</article>\n"
                    "  <article class='product-card'>Карточка 4</article>\n"
                    "</section>"
                ),
                (
                    ".products {\n"
                    "  display: grid;\n"
                    "  gap: 12px;\n"
                    "  grid-template-columns: repeat(3, 1fr);\n"
                    "}\n"
                    "\n"
                    ".product-card {\n"
                    "  border: 1px solid #e2e8f0;\n"
                    "  border-radius: 10px;\n"
                    "  padding: 12px;\n"
                    "}\n"
                    "\n"
                    "@media (max-width: 900px) {\n"
                    "  .products {\n"
                    "    grid-template-columns: repeat(2, 1fr);\n"
                    "  }\n"
                    "}\n"
                    "\n"
                    "@media (max-width: 600px) {\n"
                    "  .products {\n"
                    "    grid-template-columns: 1fr;\n"
                    "  }\n"
                    "}"
                ),
                "",
                [
                    {"id": "w2s1", "title": "Используется CSS Grid", "check_type": "css_contains", "check_value": "display: grid"},
                    {"id": "w2s2", "title": "Есть media query", "check_type": "css_contains", "check_value": "@media"},
                    {"id": "w2s3", "title": "Есть карточки", "check_type": "selector_exists", "check_value": ".product-card"},
                ],
                hints=["Начните с display: grid, потом добавьте @media шаг за шагом."],
                editable_files=["css"],
                attached_lecture_id=grid_theory_id,
            ))

            form_theory_ref = add_lecture("Лекция к заданию 3: форма и простая JS-валидация", [
                {"type": "text", "content": (
                    "<h2>Задача</h2>"
                    "<p>Собрать форму и показать сообщение, если поле пустое.</p>"
                    "<h3>Шаг 1 — структура формы</h3>"
                    "<p>Нужны: форма <code>#login-form</code>, поле <code>#email</code>, кнопка и блок сообщения <code>#form-message</code>.</p>"
                    "<h3>Шаг 2 — обработчик submit</h3>"
                    "<p>Через <code>addEventListener('submit')</code> отмените отправку: <code>event.preventDefault()</code>.</p>"
                    "<h3>Шаг 3 — проверка</h3>"
                    "<p>Если email пустой, покажите текст <b>Заполните email.</b>. "
                    "Если заполнен — текст <b>Форма готова к отправке.</b>.</p>"
                    "<h3>Проверка себя</h3>"
                    "<ul>"
                    "<li>Нажмите кнопку с пустым полем — должно появиться сообщение об ошибке.</li>"
                    "<li>Введите email и нажмите снова — сообщение должно измениться.</li>"
                    "</ul>"
                )},
            ])
            form_theory = get_doc_by_pk(Lecture, str(form_theory_ref.id))
            form_theory_id = str(getattr(form_theory, "public_id", None) or str(form_theory.id))
            lessons.append(form_theory_ref)
            lessons.append(add_layout(
                "Форма: валидация одного поля",
                "Простая форма с проверкой email. Пошаговое решение в связанной лекции.",
                (
                    "<form class='login-form' id='login-form'>\n"
                    "  <h2>Вход</h2>\n"
                    "  <label for='email'>Email</label>\n"
                    "  <input id='email' type='email' placeholder='you@example.com'>\n"
                    "  <button type='submit' class='submit-btn'>Проверить</button>\n"
                    "  <p class='form-message' id='form-message'></p>\n"
                    "</form>"
                ),
                (
                    ".login-form {\n"
                    "  width: min(100%, 360px);\n"
                    "  margin: 24px auto;\n"
                    "  padding: 16px;\n"
                    "  border: 1px solid #e2e8f0;\n"
                    "  border-radius: 12px;\n"
                    "  display: grid;\n"
                    "  gap: 10px;\n"
                    "  background: #fff;\n"
                    "}\n"
                    "\n"
                    ".submit-btn {\n"
                    "  border: 0;\n"
                    "  border-radius: 8px;\n"
                    "  padding: 8px 12px;\n"
                    "  background: #0f172a;\n"
                    "  color: #fff;\n"
                    "}\n"
                    "\n"
                    ".form-message {\n"
                    "  min-height: 20px;\n"
                    "  color: #dc2626;\n"
                    "}"
                ),
                (
                    "const form = document.getElementById('login-form');\n"
                    "const email = document.getElementById('email');\n"
                    "const message = document.getElementById('form-message');\n"
                    "\n"
                    "form?.addEventListener('submit', (event) => {\n"
                    "  event.preventDefault();\n"
                    "  if (!email?.value) {\n"
                    "    if (message) message.textContent = 'Заполните email.';\n"
                    "    return;\n"
                    "  }\n"
                    "  if (message) message.textContent = 'Форма готова к отправке.';\n"
                    "});"
                ),
                [
                    {"id": "w3s1", "title": "Есть форма", "check_type": "selector_exists", "check_value": ".login-form"},
                    {"id": "w3s2", "title": "Есть JS-проверка", "check_type": "js_contains", "check_value": "Заполните email"},
                    {"id": "w3s3", "title": "Есть кнопка submit", "check_type": "selector_exists", "check_value": ".submit-btn"},
                ],
                hints=["Проверьте id элементов: login-form, email, form-message."],
                editable_files=["html", "css", "js"],
                attached_lecture_id=form_theory_id,
            ))
            lessons.append(add_layout(
                "Тестовое задание: полное совпадение с эталоном",
                "Доведите верстку до точного совпадения с эталонным макетом преподавателя.",
                (
                    "<section class='dashboard-card'>\n"
                    "  <h2 class='title'>Профиль студента</h2>\n"
                    "  <button class='save-btn' type='button'>Сохранить</button>\n"
                    "</section>"
                ),
                (
                    ".dashboard-card {\n"
                    "  max-width: 420px;\n"
                    "  margin: 24px auto;\n"
                    "  padding: 20px;\n"
                    "  border: 1px solid #d1d5db;\n"
                    "  border-radius: 12px;\n"
                    "  display: grid;\n"
                    "  gap: 12px;\n"
                    "}\n"
                    "\n"
                    ".save-btn {\n"
                    "  border: 0;\n"
                    "  border-radius: 8px;\n"
                    "  padding: 10px 14px;\n"
                    "  background: #1f2937;\n"
                    "  color: #fff;\n"
                    "}"
                ),
                (
                    "const saveBtn = document.querySelector('.save-btn');\n"
                    "const status = document.querySelector('.status');\n"
                    "\n"
                    "saveBtn?.addEventListener('click', () => {\n"
                    "  if (status) status.textContent = 'Сохранено';\n"
                    "});"
                ),
                [],
                hints=[
                    "Проверка идет в режиме полного совпадения с эталоном.",
                    "Добавьте недостающие элементы и стили так, чтобы макет полностью совпал.",
                ],
                editable_files=["html", "css", "js"],
                attached_lecture_id=form_theory_id,
                check_mode="full_match",
                reference_html=(
                    "<section class='dashboard-card'>\n"
                    "  <h2 class='title'>Профиль студента</h2>\n"
                    "  <p class='status' aria-live='polite'>Готово к отправке</p>\n"
                    "  <button class='save-btn' type='button'>Сохранить</button>\n"
                    "</section>"
                ),
                reference_css=(
                    ".dashboard-card {\n"
                    "  max-width: 420px;\n"
                    "  margin: 24px auto;\n"
                    "  padding: 20px;\n"
                    "  border: 1px solid #d1d5db;\n"
                    "  border-radius: 12px;\n"
                    "  background: #ffffff;\n"
                    "  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);\n"
                    "  display: grid;\n"
                    "  gap: 12px;\n"
                    "}\n"
                    "\n"
                    ".title {\n"
                    "  margin: 0 0 8px;\n"
                    "}\n"
                    "\n"
                    ".status {\n"
                    "  margin: 0 0 14px;\n"
                    "  color: #4b5563;\n"
                    "}\n"
                    "\n"
                    ".save-btn {\n"
                    "  border: 0;\n"
                    "  border-radius: 8px;\n"
                    "  padding: 10px 14px;\n"
                    "  background: #1f2937;\n"
                    "  color: #fff;\n"
                    "}"
                ),
                reference_js=(
                    "const saveBtn = document.querySelector('.save-btn');\n"
                    "const status = document.querySelector('.status');\n"
                    "\n"
                    "saveBtn?.addEventListener('click', () => {\n"
                    "  if (status) status.textContent = 'Сохранено';\n"
                    "});"
                ),
            ))

        track.lessons = lessons
        track.visible_group_ids = []
        _ensure_public_id(track)
        track.save()
        print(f"  [OK] Трек '{track.title}': {len(lessons)} уроков")

    return created_tracks


def create_orphan_assignments():
    """Одиночные задания (не в треке): ровно по одному каждого вида — задача, пазл, вопрос, верстка."""
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
    # Одно одиночное задание по верстке
    pid_layout = _stable_public_id("orphan:layout:карточка новости")
    LayoutLesson.objects(public_id=pid_layout).delete()
    ol = LayoutLesson(
        title="Одиночная верстка: карточка новости",
        description="Сверстайте карточку новости с заголовком, датой и кнопкой «Читать».",
        track_id="",
        template_html=(
            "<article class='news-card'>\n"
            "  <p class='date'>19 марта 2026</p>\n"
            "  <h3 class='title'>Запуск нового курса</h3>\n"
            "  <button class='read-more'>Читать</button>\n"
            "</article>"
        ),
        template_css=(
            ".news-card {\n"
            "  max-width: 380px;\n"
            "  margin: 24px auto;\n"
            "  padding: 16px;\n"
            "  border: 1px solid #e2e8f0;\n"
            "  border-radius: 12px;\n"
            "  background: #fff;\n"
            "}\n"
            "\n"
            ".date {\n"
            "  font-size: 12px;\n"
            "  color: #64748b;\n"
            "}\n"
            "\n"
            ".title {\n"
            "  margin: 8px 0 12px;\n"
            "}\n"
            "\n"
            ".read-more {\n"
            "  border: 0;\n"
            "  border-radius: 8px;\n"
            "  padding: 8px 12px;\n"
            "  background: #2563eb;\n"
            "  color: #fff;\n"
            "}"
        ),
        template_js="",
        editable_files=["html", "css"],
        subtasks=[
            LayoutSubtaskEmbed(id="o1", title="Есть карточка", check_type="selector_exists", check_value=".news-card"),
            LayoutSubtaskEmbed(id="o2", title="Есть кнопка", check_type="selector_exists", check_value=".read-more"),
        ],
        hints=["Добавьте визуальное разделение карточки через границу и скругление."],
    )
    ol.public_id = pid_layout
    ol.save()
    print("  [OK] Создана одиночная верстка (1 шт.)")
    print("  [OK] Одиночные задания: 1 задача, 1 пазл, 1 вопрос, 1 верстка")


def _cleanup_stale_orphans():
    """Удаляет лекции/задачи/пазлы/вопросы, не входящие ни в один трек и не входящие в список одиночных мокапа.
    В итоге в «Отдельных заданиях» только 1 задача, 1 пазл, 1 вопрос; лишних сирот нет."""
    from bson import ObjectId
    allowed_orphan_public_ids = {
        _stable_public_id("orphan:task:Квадрат числа"),
        _stable_public_id("orphan:puzzle:вывод строки"),
        _stable_public_id("orphan:question:тип range"),
        _stable_public_id("orphan:layout:карточка новости"),
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
    for layout in list(LayoutLesson.objects.all()):
        oid, pid = str(layout.id), str(getattr(layout, "public_id", None) or "")
        if oid not in in_track_ids and pid not in in_track_ids and pid not in allowed_orphan_public_ids:
            layout.delete()
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


def clear_mock_learning_content():
    """Удаляет все треки и все типы учебных заданий/уроков."""
    print("\n[*] Очистка мок-контента (треки и задания)...")
    tracks_deleted = Track.objects.delete()
    lectures_deleted = Lecture.objects.delete()
    tasks_deleted = Task.objects.delete()
    puzzles_deleted = Puzzle.objects.delete()
    questions_deleted = Question.objects.delete()
    layouts_deleted = LayoutLesson.objects.delete()
    print(
        "  [OK] Удалено:"
        f" треков={tracks_deleted},"
        f" лекций={lectures_deleted},"
        f" задач={tasks_deleted},"
        f" пазлов={puzzles_deleted},"
        f" вопросов={questions_deleted},"
        f" верстки={layouts_deleted}"
    )


def create_python_kids_track(users, groups):
    """Создает один полноценный трек по Python (14+) от существующего учителя."""
    print("\n[*] Создание одного Python-трека (14+)...")

    teacher = next((u for u in users if getattr(u, "username", "") == "teacher1"), None)
    if not teacher:
        print("  [WARN] Учитель teacher1 не найден, трек будет создан без автора.")
        teacher_id = ""
        teacher_group_ids = []
    else:
        teacher_id = str(teacher.id)
        teacher_group_ids = [str(g) for g in (getattr(teacher, "group_ids", None) or [])]

    track_title = "Python Start 14+: от переменных до списков"
    Track.objects(title=track_title).delete()
    track = Track(
        title=track_title,
        description=(
            "Погружение в Python для подростков 14+: переменные, типы, условия, циклы, "
            "списки и их методы на практике."
        ),
        order=1,
        lessons=[],
        visible_group_ids=teacher_group_ids,
        created_by_id=teacher_id,
    )
    track.public_id = _stable_public_id("track:" + track_title)
    track.save()

    track_id = str(track.id)
    lessons = []
    order = 1

    def add_lecture(title, blocks):
        nonlocal order
        pid = _stable_public_id(f"lecture:{track_title}:{title}")
        Lecture.objects(public_id=pid).delete()
        lec = Lecture(
            title=title,
            track_id=track_id,
            content="",
            blocks=blocks,
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        lec.public_id = pid
        lec.save()
        lessons.append(LessonRef(id=str(lec.id), type="lecture", title=title, order=order))
        order += 1

    def add_task(title, description, starter, test_cases, hints=None):
        nonlocal order
        pid = _stable_public_id(f"task:{track_title}:{title}")
        Task.objects(public_id=pid).delete()
        task = Task(
            title=title,
            description=description,
            starter_code=starter,
            track_id=track_id,
            test_cases=test_cases,
            hints=hints or [],
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        task.public_id = pid
        task.save()
        lessons.append(LessonRef(id=str(task.id), type="task", title=title, order=order))
        order += 1

    def add_puzzle(title, description, blocks, solution, hints=None):
        nonlocal order
        pid = _stable_public_id(f"puzzle:{track_title}:{title}")
        Puzzle.objects(public_id=pid).delete()
        puzzle = Puzzle(
            title=title,
            description=description,
            track_id=track_id,
            language="python",
            blocks=blocks,
            solution=solution,
            hints=hints or [],
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        puzzle.public_id = pid
        puzzle.save()
        lessons.append(LessonRef(id=str(puzzle.id), type="puzzle", title=title, order=order))
        order += 1

    def add_question(title, prompt, choices, multiple=False, hints=None):
        nonlocal order
        pid = _stable_public_id(f"question:{track_title}:{title}")
        Question.objects(public_id=pid).delete()
        question = Question(
            title=title,
            prompt=prompt,
            track_id=track_id,
            choices=choices,
            multiple=multiple,
            hints=hints or [],
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        question.public_id = pid
        question.save()
        lessons.append(LessonRef(id=str(question.id), type="question", title=title, order=order))
        order += 1

    add_lecture(
        "Урок 1: Переменные и типы данных",
        [
            {
                "type": "text",
                "content": (
                    "## Что такое переменная\n"
                    "Переменная — это имя, под которым хранится значение.\n\n"
                    "## Базовые типы\n"
                    "- `int` — целые числа\n"
                    "- `float` — дробные числа\n"
                    "- `str` — строки\n"
                    "- `bool` — логические значения\n\n"
                    "## Пример\n"
                    "```python\nname = 'Аня'\nage = 14\nis_student = True\n```"
                ),
            }
        ],
    )
    add_task(
        "Практика: знакомство с переменными",
        "Создайте переменные `name` и `age` и выведите строку в формате: Меня зовут <name>, мне <age>.",
        "name = 'Маша'\nage = 14\n# ваш код ниже\n",
        [
            TaskCaseEmbed(id="c1", input="", expected_output="Меня зовут Маша, мне 14\n", is_public=True),
        ],
        hints=["Используйте f-строку: f'Меня зовут {name}, мне {age}'"],
    )

    add_lecture(
        "Урок 2: Условия и циклы",
        [
            {
                "type": "text",
                "content": (
                    "## Условия\n"
                    "`if`, `elif`, `else` помогают принимать решения в коде.\n\n"
                    "## Циклы\n"
                    "- `for` — когда знаем, сколько повторов\n"
                    "- `while` — когда повторяем, пока условие истинно\n\n"
                    "```python\nfor i in range(3):\n    print(i)\n```"
                ),
            }
        ],
    )
    add_task(
        "Практика: сумма чисел от 1 до N",
        "Прочитайте число N и выведите сумму чисел от 1 до N включительно.",
        "n = int(input())\n# ваш код\n",
        [
            TaskCaseEmbed(id="c1", input="5\n", expected_output="15\n", is_public=True),
            TaskCaseEmbed(id="c2", input="1\n", expected_output="1\n", is_public=True),
        ],
        hints=["Используйте цикл `for` и переменную-накопитель."],
    )

    add_lecture(
        "Урок 3: Списки (массивы) и методы",
        [
            {
                "type": "text",
                "content": (
                    "## Списки в Python\n"
                    "Список (`list`) — это упорядоченная коллекция элементов.\n\n"
                    "```python\nnumbers = [3, 7, 2]\n```\n\n"
                    "## Полезные методы списка\n"
                    "- `append(x)` — добавить в конец\n"
                    "- `insert(i, x)` — вставить по индексу\n"
                    "- `pop()` — удалить последний элемент\n"
                    "- `remove(x)` — удалить по значению\n"
                    "- `sort()` — сортировка\n"
                    "- `reverse()` — разворот\n"
                    "- `count(x)` — посчитать количество\n"
                    "- `index(x)` — найти индекс"
                ),
            }
        ],
    )
    add_task(
        "Практика: методы списка",
        "Дан список numbers = [1, 2, 3]. Добавьте 4, удалите 2, отсортируйте по убыванию и выведите список.",
        "numbers = [1, 2, 3]\n# ваш код\nprint(numbers)\n",
        [
            TaskCaseEmbed(id="c1", input="", expected_output="[4, 3, 1]\n", is_public=True),
        ],
        hints=["Подсказка: `append`, `remove`, затем `sort(reverse=True)`."],
    )
    add_puzzle(
        "Пазл: собери работу со списком",
        "Расположи строки так, чтобы программа выводила `[10, 20, 30]`.",
        [
            CodeBlockEmbed(id="b1", code="nums = [10, 20]", order="1"),
            CodeBlockEmbed(id="b2", code="nums.append(30)", order="2"),
            CodeBlockEmbed(id="b3", code="print(nums)", order="3"),
        ],
        "nums = [10, 20]\nnums.append(30)\nprint(nums)\n",
        hints=["Сначала создаем список, потом меняем его методом, затем печатаем."],
    )
    add_question(
        "Проверка: методы списка",
        "Какой метод добавляет элемент в конец списка?",
        [
            QuestionChoiceEmbed(id="a", text="append()", is_correct=True),
            QuestionChoiceEmbed(id="b", text="pop()", is_correct=False),
            QuestionChoiceEmbed(id="c", text="remove()", is_correct=False),
            QuestionChoiceEmbed(id="d", text="clear()", is_correct=False),
        ],
        multiple=False,
        hints=["Вспомните самый базовый способ добавить элемент в list."],
    )

    track.lessons = lessons
    track.save()
    print(f"  [OK] Создан трек: {track.title} (уроков: {len(lessons)})")
    return [track]


def create_showcase_track(users, groups):
    """Создает демонстрационный трек со всеми типами уроков и ключевыми возможностями."""
    print("\n[*] Создание демо-трека со всем функционалом...")

    teacher = next((u for u in users if getattr(u, "username", "") == "teacher2"), None)
    if not teacher:
        print("  [WARN] Учитель teacher2 не найден, демо-трек будет создан без автора.")
        teacher_id = ""
        teacher_group_ids = []
    else:
        teacher_id = str(teacher.id)
        teacher_group_ids = [str(g) for g in (getattr(teacher, "group_ids", None) or [])]

    track_title = "Демо: все возможности уроков и заданий"
    Track.objects(title=track_title).delete()
    track = Track(
        title=track_title,
        description=(
            "Демонстрационный трек: показывает лекции с разными блоками, задачи, пазлы, вопросы, "
            "опросы и задания по верстке с подзадачами."
        ),
        order=2,
        lessons=[],
        visible_group_ids=teacher_group_ids,
        created_by_id=teacher_id,
    )
    track.public_id = _stable_public_id("track:" + track_title)
    track.save()

    now = datetime.now(timezone.utc)
    track_id = str(track.id)
    lessons = []
    order = 1

    def add_lecture(title, blocks, hints=None, max_attempts=None):
        nonlocal order
        pid = _stable_public_id(f"lecture:{track_title}:{title}")
        Lecture.objects(public_id=pid).delete()
        lec = Lecture(
            title=title,
            track_id=track_id,
            content="",
            blocks=blocks,
            hints=hints or [],
            max_attempts=max_attempts,
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        lec.public_id = pid
        lec.save()
        lessons.append(LessonRef(id=str(lec.id), type="lecture", title=title, order=order))
        order += 1
        return lec

    def add_task(title, description, starter, test_cases, hints=None, hard=False, max_attempts=None):
        nonlocal order
        pid = _stable_public_id(f"task:{track_title}:{title}")
        Task.objects(public_id=pid).delete()
        task = Task(
            title=title,
            description=description,
            starter_code=starter,
            track_id=track_id,
            test_cases=test_cases,
            hints=hints or [],
            hard=hard,
            max_attempts=max_attempts,
            available_from=now - timedelta(days=1),
            available_until=now + timedelta(days=14),
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        task.public_id = pid
        task.save()
        lessons.append(LessonRef(id=str(task.id), type="task", title=title, order=order))
        order += 1
        return task

    def add_puzzle(title, description, blocks, solution, hints=None, max_attempts=None):
        nonlocal order
        pid = _stable_public_id(f"puzzle:{track_title}:{title}")
        Puzzle.objects(public_id=pid).delete()
        puzzle = Puzzle(
            title=title,
            description=description,
            track_id=track_id,
            language="python",
            blocks=blocks,
            solution=solution,
            hints=hints or [],
            max_attempts=max_attempts,
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        puzzle.public_id = pid
        puzzle.save()
        lessons.append(LessonRef(id=str(puzzle.id), type="puzzle", title=title, order=order))
        order += 1
        return puzzle

    def add_question(title, prompt, choices, multiple=False, hints=None, max_attempts=None):
        nonlocal order
        pid = _stable_public_id(f"question:{track_title}:{title}")
        Question.objects(public_id=pid).delete()
        question = Question(
            title=title,
            prompt=prompt,
            track_id=track_id,
            choices=choices,
            multiple=multiple,
            hints=hints or [],
            max_attempts=max_attempts,
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        question.public_id = pid
        question.save()
        lessons.append(LessonRef(id=str(question.id), type="question", title=title, order=order))
        order += 1
        return question

    def add_survey(title, prompt):
        nonlocal order
        pid = _stable_public_id(f"survey:{track_title}:{title}")
        Survey.objects(public_id=pid).delete()
        survey = Survey(
            title=title,
            prompt=prompt,
            track_id=track_id,
            available_from=now - timedelta(days=1),
            available_until=now + timedelta(days=30),
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        survey.public_id = pid
        survey.save()
        lessons.append(LessonRef(id=str(survey.id), type="survey", title=title, order=order))
        order += 1
        return survey

    def add_layout(title, description, template_html, template_css, template_js, subtasks, hints=None, editable_files=None, attached_lecture_id=""):
        nonlocal order
        pid = _stable_public_id(f"layout:{track_title}:{title}")
        LayoutLesson.objects(public_id=pid).delete()
        layout = LayoutLesson(
            title=title,
            description=description,
            track_id=track_id,
            template_html=template_html,
            template_css=template_css,
            template_js=template_js,
            editable_files=editable_files or ["html", "css", "js"],
            subtasks=[LayoutSubtaskEmbed(**st) for st in subtasks],
            hints=hints or [],
            max_attempts=3,
            available_from=now - timedelta(days=1),
            available_until=now + timedelta(days=21),
            attached_lecture_id=attached_lecture_id or "",
            visible_group_ids=teacher_group_ids,
            created_by_id=teacher_id,
        )
        layout.public_id = pid
        layout.save()
        lessons.append(LessonRef(id=str(layout.id), type="layout", title=title, order=order))
        order += 1
        return layout

    lecture_with_all_blocks = add_lecture(
        "Лекция-демо: все блоки контента",
        [
            {
                "type": "text",
                "content": (
                    "## Демо-лекция\n"
                    "Здесь показаны все основные типы блоков.\n\n"
                    "- текст и списки\n"
                    "- изображения\n"
                    "- код\n"
                    "- видео с вопросом на паузе\n"
                ),
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200",
                "alt": "Рабочее место программиста",
            },
            {
                "type": "code",
                "language": "python",
                "explanation": "Короткий пример кода в блоке лекции.",
                "code": "items = [1, 2, 3]\nprint(sum(items))",
            },
            {
                "type": "video",
                "id": "showcase-video-1",
                "url": "https://www.w3schools.com/html/mov_bbb.mp4",
                "pause_points": [
                    {
                        "id": "sp1",
                        "timestamp": 2,
                        "question": {
                            "id": "sq1",
                            "title": "Вопрос по видео",
                            "prompt": "Какой метод добавляет элемент в конец списка?",
                            "choices": [
                                {"id": "c1", "text": "append()", "is_correct": True},
                                {"id": "c2", "text": "remove()", "is_correct": False},
                                {"id": "c3", "text": "pop()", "is_correct": False},
                            ],
                            "multiple": False,
                        },
                    }
                ],
            },
        ],
        hints=["Откройте каждый тип блока и проверьте, как он отображается."],
        max_attempts=3,
    )

    add_task(
        "Задача-демо: тесты, подсказки и лимит попыток",
        "Реализуйте функцию, которая читает два числа и выводит их произведение.",
        "a = int(input())\nb = int(input())\n# ваш код\n",
        [
            TaskCaseEmbed(id="c1", input="2\n5\n", expected_output="10\n", is_public=True),
            TaskCaseEmbed(id="c2", input="-3\n4\n", expected_output="-12\n", is_public=False),
        ],
        hints=["Проверьте порядок чтения input().", "Вывод должен быть только числом."],
        hard=True,
        max_attempts=4,
    )

    add_puzzle(
        "Puzzle-демо: сборка алгоритма",
        "Соберите блоки, чтобы программа вычисляла среднее двух чисел.",
        [
            CodeBlockEmbed(id="p1", code="a = int(input())", order="1"),
            CodeBlockEmbed(id="p2", code="b = int(input())", order="2"),
            CodeBlockEmbed(id="p3", code="print((a + b) / 2)", order="3"),
        ],
        "a = int(input())\nb = int(input())\nprint((a + b) / 2)\n",
        hints=["Сначала читаем значения, потом считаем среднее."],
        max_attempts=2,
    )

    add_question(
        "Вопрос-демо: множественный выбор",
        "Какие из этих методов изменяют список на месте?",
        [
            QuestionChoiceEmbed(id="q1", text="append()", is_correct=True),
            QuestionChoiceEmbed(id="q2", text="sort()", is_correct=True),
            QuestionChoiceEmbed(id="q3", text="count()", is_correct=False),
            QuestionChoiceEmbed(id="q4", text="reverse()", is_correct=True),
        ],
        multiple=True,
        hints=["Подумайте, возвращает ли метод новый объект или меняет текущий list."],
        max_attempts=3,
    )

    add_survey(
        "Опрос-демо: свободный ответ",
        "Какая тема в Python была самой понятной, а какая вызвала вопросы? Напишите коротко.",
    )

    add_layout(
        "Верстка-демо: карточка профиля",
        "Соберите карточку профиля. Для теории используйте прикрепленную лекцию.",
        (
            "<article class='profile-card'>\n"
            "  <h2 class='name'>Имя Фамилия</h2>\n"
            "  <p class='role'>Junior Python Developer</p>\n"
            "  <button class='action-btn'>Написать</button>\n"
            "</article>\n"
        ),
        (
            ".profile-card { max-width: 320px; margin: 24px auto; padding: 16px; border-radius: 12px; "
            "border: 1px solid #d4d4d8; }\n"
            ".name { margin: 0 0 8px; font-size: 22px; }\n"
            ".action-btn { padding: 8px 12px; border-radius: 8px; }\n"
        ),
        "console.log('layout demo ready');",
        [
            {"id": "l1", "title": "Есть контейнер .profile-card", "check_type": "selector_exists", "check_value": ".profile-card"},
            {"id": "l2", "title": "Есть кнопка .action-btn", "check_type": "selector_exists", "check_value": ".action-btn"},
            {"id": "l3", "title": "В CSS задан border-radius", "check_type": "css_contains", "check_value": "border-radius"},
        ],
        hints=["Начните с HTML-структуры, затем подключите стили."],
        editable_files=["html", "css", "js"],
        attached_lecture_id=str(getattr(lecture_with_all_blocks, "public_id", "") or lecture_with_all_blocks.id),
    )

    track.lessons = lessons
    track.save()
    print(f"  [OK] Создан трек: {track.title} (уроков: {len(lessons)})")
    return [track]


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
        clear_mock_learning_content()
        tracks = []
        tracks.extend(create_python_kids_track(users, groups))
        tracks.extend(create_showcase_track(users, groups))
        create_test_achievements(users, groups)
        
        # Собираем статистику
        total_lectures = Lecture.objects.count()
        total_tasks = Task.objects.count()
        total_puzzles = Puzzle.objects.count()
        total_questions = Question.objects.count()
        total_layouts = LayoutLesson.objects.count()
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
        print(f"   Верстка: {total_layouts}")
        
        print("\n[*] Данные для входа:")
        print("   Администратор: admin / admin123")
        print("   Учитель 1: teacher1 / teacher123 (ведет группы ИТ-101, ИТ-102)")
        print("   Учитель 2: teacher2 / teacher123 (ведет группы ИТ-201, ИТ-202)")
        print("   Студенты: student1-student5 / student123")
        
        print("\n[*] Треки:")
        for track in tracks:
            lesson_counts = {"lecture": 0, "task": 0, "puzzle": 0, "question": 0, "layout": 0}
            for lesson in track.lessons:
                lesson_counts[lesson.type] = lesson_counts.get(lesson.type, 0) + 1
            parts = [f"{lesson_counts['lecture']} лекций", f"{lesson_counts['task']} задач",
                     f"{lesson_counts['puzzle']} puzzle", f"{lesson_counts['question']} вопросов", f"{lesson_counts['layout']} верстка"]
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
