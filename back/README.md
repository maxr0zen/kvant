# Backend (Django DRF + MongoDB)

API образовательной платформы: Django Rest Framework, MongoEngine, JWT, Celery.

## Требования

- Python 3.10+
- MongoDB (локально или URI в `.env`)
- Redis (для Celery, опционально на первом этапе)

## Установка и запуск

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
cp .env.example .env
# При необходимости отредактировать .env (MONGODB_HOST, SECRET_KEY и т.д.)
```

Создать пользователя:

```bash
# Суперпользователь (может добавлять учителей и учеников, видит раздел «Пользователи»)
python manage.py create_user admin@example.com yourpassword --name "Администратор" --superuser

# Учитель
python manage.py create_user user@example.com yourpassword --name "Учитель" --teacher

# Ученик
python manage.py create_user student@example.com yourpassword --name "Ученик"
```

Запуск сервера:

```bash
python manage.py runserver
```

API: `http://127.0.0.1:8000/`  
Документация (Swagger): `http://127.0.0.1:8000/api/docs/`  
Схема OpenAPI: `http://127.0.0.1:8000/api/schema/`

## Celery (опционально)

```bash
celery -A config worker -l info
```

Задача `run_code_check` в `apps.submissions.tasks` — заготовка для асинхронной проверки решений.

## Эндпоинты

- **POST /api/auth/login/** — вход (email, password) → `{ token, user }`
- **GET /api/tracks/** — список треков
- **GET /api/tracks/{id}/** — трек по id
- **POST /api/tracks/** — создать трек (teacher)
- **GET /api/lectures/{id}/** — лекция по id
- **POST /api/lectures/** — создать лекцию (teacher)
- **GET /api/tasks/{id}/** — задача по id
- **POST /api/tasks/** — создать задачу (teacher)
- **POST /api/tasks/{id}/run/** — запуск тестов (body: `{ "code": "..." }`)
- **POST /api/tasks/{id}/submit/** — отправить решение (body: `{ "code": "..." }`)

Запросы к защищённым эндпоинтам: заголовок `Authorization: Bearer <token>`.

---

## База данных (MongoDB)

Хранилище — MongoDB. Доступ через ODM MongoEngine. Имена коллекций и поля приведены ниже.

### Коллекция `users`

| Поле           | Тип     | Описание |
|----------------|---------|----------|
| `_id`          | ObjectId| Идентификатор (авто) |
| `email`        | string  | Email, уникальный |
| `name`         | string  | Имя пользователя |
| `role`         | string  | Роль: `"superuser"`, `"teacher"`, `"student"` |
| `password_hash`| string  | Хэш пароля (PBKDF2-SHA256) |
| `password_salt`| string  | Соль для пароля |
| `created_at`   | datetime| Дата создания |

Индексы: `email`.

---

### Коллекция `tracks`

| Поле         | Тип     | Описание |
|--------------|---------|----------|
| `_id`        | ObjectId| Идентификатор (авто) |
| `title`      | string  | Название трека |
| `description`| string  | Описание |
| `order`      | int     | Порядок отображения |
| `lessons`    | array   | Список вложенных уроков (см. ниже) |

Элемент `lessons[]`:

| Поле   | Тип   | Описание |
|--------|-------|----------|
| `id`   | string| ID лекции или задачи |
| `type` | string| `"lecture"` или `"task"` |
| `title`| string| Название урока |
| `order`| int   | Порядок в треке |

Индексы: `order`.

---

### Коллекция `lectures`

| Поле      | Тип     | Описание |
|-----------|---------|----------|
| `_id`     | ObjectId| Идентификатор (авто) |
| `title`   | string  | Название лекции |
| `track_id`| string  | ID трека (опционально) |
| `content` | string  | Устаревшее текстовое содержимое |
| `blocks`  | array   | Массив блоков (объекты-словари) |

Элемент `blocks[]` — объект в зависимости от типа:
- **text**: `type: "text"`, `content` (HTML-строка)
- **image**: `type: "image"`, `url`, `alt` (опционально)
- **code**: `type: "code"`, `explanation`, `code`, `language` (опционально)

Индексы: `track_id`.

---

### Коллекция `tasks`

| Поле          | Тип     | Описание |
|---------------|---------|----------|
| `_id`         | ObjectId| Идентификатор (авто) |
| `title`       | string  | Название задачи |
| `description` | string  | Условие задачи |
| `starter_code`| string  | Шаблон кода для редактора |
| `track_id`    | string  | ID трека (опционально) |
| `test_cases`  | array   | Вложенные тест-кейсы (см. ниже) |

Элемент `test_cases[]`:

| Поле            | Тип    | Описание |
|-----------------|--------|----------|
| `id`            | string | Идентификатор кейса |
| `input`         | string | Входные данные (stdin) |
| `expected_output` | string | Ожидаемый вывод |
| `is_public`     | bool   | Показывать ли ученику |

Индексы: `track_id`.

---

### Коллекция `submissions`

| Поле       | Тип     | Описание |
|------------|---------|----------|
| `_id`      | ObjectId| Идентификатор (авто) |
| `task_id`  | string  | ID задачи |
| `user_id`  | string  | ID пользователя |
| `code`     | string  | Отправленный код |
| `passed`   | bool    | Все ли тесты пройдены |
| `results`  | array   | Результаты по каждому тесту (объекты) |
| `created_at` | datetime | Время отправки |

Элемент `results[]`: объекты с полями `case_id` (или `caseId`), `passed`, `actual_output`/`actualOutput`, `error` (при ошибке).

Индексы: `task_id`, `user_id`, `created_at`.
