# Индекс кодовой базы — Kavnt

> Образовательная платформа для обучения программированию.  
> Полный стек: Django DRF + MongoDB (backend), Next.js 14 + TypeScript (frontend), Docker Compose (prod).

---

## 1. Общая архитектура

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────────────────┐
│   Nginx     │─────▶│  Frontend   │─────▶│         Backend             │
│  (reverse   │      │  Next.js 14 │      │  Django + DRF + MongoEngine │
│   proxy)    │◀─────│   :3000     │◀─────│         :8000               │
└─────────────┘      └─────────────┘      └─────────────────────────────┘
                                                    │
                       ┌──────────────┬─────────────┴──────────────┐
                       ▼              ▼                            ▼
                   MongoDB 7      Redis 7                     Celery Worker
                  (основная БД)  (брокер/кэш)              (фоновые задачи)
```

- **Протокол авторизации:** JWT (Simple JWT + кастомный MongoJWTAuthentication).  
- **Доменные данные:** MongoDB через MongoEngine (нет Django ORM для доменных моделей).  
- **Сессии/админка:** SQLite (Django ORM только для этого).  
- **API-документация:** drf-spectacular (`/api/docs/`).  

---

## 2. Backend (`back/`)

### 2.1. Технологии
- Django 4.2 LTS + Django REST Framework
- MongoEngine (документы в `documents.py` в каждом приложении)
- Celery + Redis (фоновые задачи, прогресс)
- drf-spectacular (OpenAPI/Swagger)
- pytest + pytest-django (тесты)

### 2.2. Конфигурация

| Файл | Назначение |
|------|-----------|
| `config/settings/base.py` | Базовые настройки Django: INSTALLED_APPS, DRF, JWT, CORS, Celery, MongoDB |
| `config/settings/dev.py` | Переопределения для локальной разработки |
| `config/settings/prod.py` | Переопределения для продакшена (Docker) |
| `config/settings/test.py` | Переопределения для тестов (pytest) |
| `config/urls.py` | Корневой роутер API: `/api/auth/`, `/api/tracks/`, `/api/tasks/` и др. |
| `config/celery.py` | Конфигурация Celery приложения |
| `manage.py` | Стандартный Django management |

### 2.3. Приложения (`apps/`)

Каждое приложение обычно содержит: `documents.py` (модели MongoEngine), `serializers.py`, `views.py`, `urls.py`, `apps.py`. Некоторые имеют `models.py` (Django ORM, используется редко).

#### `users` — Авторизация и пользователи
- **Файлы:** `documents.py`, `authentication.py`, `serializers.py`, `views.py`, `permissions.py`, `teacher_utils.py`, `system_stats.py`
- **Модель:** `User` (MongoEngine) — `username`, `first_name`, `last_name`, `role` (superuser/teacher/student), `group_id` / `group_ids`, хеш пароля PBKDF2.
- **Auth:** Кастомный `MongoJWTAuthentication` (DRF). Выдача токенов через `/api/auth/token/` и `/api/auth/token/refresh/`.
- **Утилиты:**
  - `teacher_utils.py` — проверка, является ли пользователь преподавателем группы.
  - `system_stats.py` — агрегированная статистика по платформе.
- **Management commands:**
  - `create_user.py` — создание пользователя из CLI.
  - `migrate_email_to_username.py` — миграция полей.

#### `groups` — Учебные группы
- **Модель:** `Group` (MongoEngine) — название, описание, список студентов.
- **Эндпоинты:** CRUD групп, назначение студентов.

#### `tracks` — Треки (курсы)
- **Модель:** `Track` (MongoEngine) — `title`, `description`, `order`, `lessons` (список `LessonRef`), `public_id`, `visible_group_ids`, `created_by_id`.
- **LessonRef:** вложенный документ с полями `id`, `type` (`lecture`/`task`/`puzzle`/`question`/`survey`/`layout`), `title`, `order`.
- **Эндпоинты:** CRUD треков, прогресс по треку.

#### `lectures` — Лекции
- **Модель:** `Lecture` (MongoEngine) — `title`, `blocks` (новый формат), legacy `content`, `track_id`, `visible_group_ids`, `hints`, `max_attempts`, `available_from/until`.
- **Блоки лекции (`blocks`):** массив объектов типа `text`, `image`, `code`, `question`, `video`, `web_file`.
- **Video:** хранит исходный URL (VK/Rutube), бэкенд подставляет `direct_url` через `video_resolver`.
- **Web-file:** блок с `url` (путь к HTML-файлу, например `/web-lection-files/lesson.html`) и опциональным `title`. Отображается в `<iframe sandbox="allow-scripts allow-same-origin">`. Файлы размещаются в `web-lection-files/` (корень проекта) и раздаются через nginx (prod) или `public/` (dev).
- **Эндпоинты:** CRUD лекций, просмотр.

#### `tasks` — Задачи с автопроверкой кода
- **Модель:** `Task` (MongoEngine) — `title`, `description`, `starter_code`, `language` (python/javascript/cpp), `test_cases`, `hints`, `max_attempts`, `reward_achievement_ids`.
- **Запуск кода:** `runner.py` — изолированный запуск Python/JS/C++ через подпроцессы с таймаутом и лимитами ресурсов (psutil).
- **Эндпоинты:** CRUD задач, отправка решения (`/api/tasks/<id>/submit/`).

#### `submissions` — Решения и прогресс
- **Модель:** `Submission` (MongoEngine) — ссылка на пользователя, задачу, результат, код, временная метка.
- **Прогресс:** `progress.py` — вычисление прогресса по треку/задачам.
- **Фоновые задачи:** `tasks.py` (Celery) — обработка прогресса, уведомлений.

#### `puzzles` — Головоломки (сборка кода из блоков)
- **Модель:** `Puzzle` (MongoEngine) — `blocks` (фрагменты кода с `order` и `indent`), `solution` (правильная последовательность), `language`.
- **Эндпоинты:** CRUD, проверка сборки (`/api/puzzles/<id>/check/`).

#### `questions` — Тестовые вопросы
- **Модель:** `Question` (MongoEngine) — `title`, `prompt`, `choices` (список с `is_correct`), `multiple` (множественный выбор).
- **Эндпоинты:** CRUD, проверка ответа.

#### `surveys` — Опросы (свободный ответ)
- **Модель:** `Survey` (MongoEngine) — `title`, `prompt`, ответы хранятся внутри документа.
- **Эндпоинты:** CRUD, отправка ответа, просмотр ответов (для teacher/admin).

#### `layouts` — Задания верстки (HTML/CSS/JS)
- **Модель:** `Layout` (MongoEngine) — `template_html/css/js`, `reference_html/css/js`, `editable_files`, `subtasks` (чек-лист проверок: `selector_exists`, `html_contains`, `css_contains`, `js_contains`), `attached_lecture_id`.
- **Проверка:** `checker.py` — парсинг DOM (BeautifulSoup), проверка CSS/JS подстрок, abuse-флаги.
- **Эндпоинты:** CRUD, проверка верстки.

#### `achievements` — Достижения
- **Модель:** `Achievement` (MongoEngine) — `title`, `description`, `icon`, условия выдачи.
- **Реестр:** `registry.py` — логика проверки условий и выдачи достижений.
- **Связь:** Задачи/головоломки/вопросы/верстки/опросы имеют `reward_achievement_ids`.

#### `notifications` — Уведомления
- **Модель:** `Notification` (MongoEngine) — `recipient_id`, `title`, `message`, `read`, `created_at`.
- **Эндпоинты:** список уведомлений, отметить прочитанным, детальный просмотр (`detail_views.py`).

### 2.4. Общие модули (`common/`)
- `exceptions.py` — кастомный `api_exception_handler` для DRF.
- `db_utils.py` — утилиты работы с MongoDB (индексы, миграции данных).

### 2.5. Скрипты (`scripts/`)
- `assign_public_ids.py` — назначение `public_id` существующим документам.
- `cleanup_public_nulls.py` — очистка `null` значений `public_id`.
- `fix_public_id_index.py` — исправление индексов.
- `mock_data.py` — генерация тестовых данных.
- `clear_db.py` — очистка базы.

---

## 3. Frontend (`front/`)

### 3.1. Технологии
- Next.js 14 (App Router)
- TypeScript 5
- Tailwind CSS 3 + tailwindcss-animate
- shadcn/ui (Radix UI + class-variance-authority)
- Recharts (графики)
- CodeMirror 6 (редактор кода: Python, JS, C++, HTML, CSS)
- hls.js (воспроизведение HLS видео)
- react-syntax-highlighter
- QRCode.react
- Vitest + Testing Library (тесты)

### 3.2. Маршрутизация (`app/`)

| Маршрут | Описание |
|---------|----------|
| `/login` | Страница входа (в `(auth)` layout) |
| `/` | Главная (список треков) |
| `/main` | Альтернативная главная |
| `/main/[id]` | Страница трека со списком уроков |
| `/main/[id]/lesson/[lessonId]` | Просмотр урока внутри трека |
| `/tracks` | Список треков |
| `/tracks/[id]` | Детали трека |
| `/tracks/[id]/lesson/[lessonId]` | Урок в треке (дублирующий роут) |
| `/lectures/[id]` | Просмотр лекции |
| `/lectures/[id]/edit` | Редактор лекции |
| `/tasks/[id]` | Просмотр задачи (код + тесты) |
| `/tasks/[id]/edit` | Редактор задачи |
| `/puzzles/[id]` | Просмотр головоломки |
| `/puzzles/[id]/edit` | Редактор головоломки |
| `/questions/[id]` | Просмотр вопроса |
| `/questions/[id]/edit` | Редактор вопроса |
| `/surveys/[id]` | Просмотр/прохождение опроса |
| `/layouts/[id]` | Просмотр задания верстки |
| `/layouts/[id]/edit` | Редактор задания верстки |
| `/completed` | Список выполненных заданий |
| `/overdue` | Список просроченных заданий |
| `/profile` | Профиль пользователя |
| `/platform` | Страница платформы |
| `/teacher/students` | Страница преподавателя со списком студентов |
| `/admin/*` | Административные страницы (dashboard, users, groups, создание сущностей) |

### 3.3. API-клиент (`lib/api/`)

| Файл | Назначение |
|------|-----------|
| `client.ts` | Базовый `apiFetch` — обертка над `fetch`: base URL, JWT Authorization, обработка 401 (очистка сессии + редирект). |
| `auth.ts` | Работа с токеном/ролью в `localStorage`, login/logout. |
| `tracks.ts` | Запросы к `/api/tracks/` |
| `lectures.ts` | Запросы к `/api/lectures/` |
| `tasks.ts` | Запросы к `/api/tasks/` (включая submit) |
| `puzzles.ts` | Запросы к `/api/puzzles/` |
| `questions.ts` | Запросы к `/api/questions/` |
| `surveys.ts` | Запросы к `/api/surveys/` |
| `layouts.ts` | Запросы к `/api/layouts/` |
| `users.ts` | Запросы к `/api/auth/` (пользователи) |
| `groups.ts` | Запросы к `/api/groups/` |
| `notifications.ts` | Запросы к `/api/notifications/` |
| `achievements.ts` | Запросы к API достижений |
| `analytics.ts` | Аналитика/статистика |
| `teacher.ts` | API для преподавателя |
| `profile.ts` | Профиль пользователя |

### 3.4. Компоненты (`components/`)

#### UI-библиотека (`components/ui/`)
shadcn/ui компоненты: `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `loading-skeleton`, `page-header`, `progress`, `select`, `separator`, `table`, `tabs`, `textarea`, `toast`/`toaster`/`use-toast`, `empty-state`.

#### Оболочка (`components/shell/`)
- `shell.tsx` — корневая обертка страницы (header + sidebar + content).
- `header.tsx` — верхняя панель с логотипом, навигацией, уведомлениями, переключателем темы.
- `sidebar.tsx` / `mobile-nav.tsx` — боковое меню (десктоп + мобильное).
- `sidebar-context.tsx` / `sidebar-toggle.tsx` — управление состоянием sidebar.

#### Редакторы и просмотрщики контента
- `lecture-blocks/*` — блоки лекции:
  - `block-editor-*.tsx` / `block-view-*.tsx` — редакторы и viewers для text, image, code, question, video.
  - `rich-text-editor.tsx` — WYSIWYG/форматированный текст.
- `lecture-editor-form.tsx` — форма редактирования лекции.
- `lecture-header.tsx` — заголовок лекции.
- `lecture-view-tracker.tsx` — отслеживание просмотра лекции.
- `code-highlight.tsx` — подсветка синтаксиса.
- `editor/code-editor.tsx` — CodeMirror обертка.

#### Задачи и проверки
- `testcases/testcases-panel.tsx` — панель тест-кейсов для задач.
- `hints-block.tsx` — блок подсказок с раскрытием по порядку.
- `availability-notice.tsx` / `availability-countdown.tsx` — уведомления о временных ограничениях заданий.

#### Треки
- `track-lesson-list.tsx` — список уроков трека.
- `track-lesson-nav.tsx` — навигация между уроками.
- `track-edit-lessons.tsx` — редактор списка уроков (drag/drop порядка).
- `track-visibility-editor.tsx` — редактор видимости по группам.
- `track-owner-actions.tsx` — действия владельца трека.

#### Прочие
- `achievement-selector.tsx` — выбор достижений-наград.
- `achievement-unlock-celebration.tsx` — анимация получения достижения.
- `api-auth-handler.tsx` — обработчик 401 (редирект на логин).
- `group-selector.tsx` — выбор группы.
- `language-selector.tsx` — выбор языка программирования.
- `owner-actions.tsx` — универсальные действия владельца (редактировать/удалить).
- `qr-code-card.tsx` — отображение QR-кода.
- `temporary-assignments-indicator.tsx` — индикатор временных заданий.
- `theme-provider.tsx` / `theme-toggle.tsx` — управление темой (dark/light/system).

#### Графики (`components/charts/`)
- `area-chart-card.tsx`, `bar-chart-card.tsx`, `gauge-card.tsx`, `progress-donut.tsx`, `stat-card.tsx`.

### 3.5. Утилиты (`lib/`)

| Файл | Назначение |
|------|-----------|
| `types/index.ts` | TypeScript интерфейсы всех сущностей (User, Track, Lecture, Task, Puzzle, Question, Survey, Layout, Achievement и т.д.) |
| `utils/datetime.ts` | Работа с датами/временем (форматирование, таймзоны). |
| `utils/track-nav.ts` | Навигация по урокам внутри трека (следующий/предыдущий). |
| `utils/attempt-limiter.ts` | Логика ограничения попыток (maxAttempts). |
| `sanitize-html.ts` | Санитизация HTML (безопасный рендеринг). |
| `runner/browser-python.ts` | Клиентский запуск Python (Pyodide/WebAssembly) — для preview. |
| `hooks/use-now.ts` | Хук текущего времени (для таймеров/обратного отсчета). |

---

## 4. Video Resolver (`video_resolver/`)

Отдельный Python-модуль для получения прямых ссылок на видео.

| Файл | Назначение |
|------|-----------|
| `resolver.py` | Основная функция `resolve_video_url(url, prefer_mp4)` — приоритет mp4, fallback на m3u8. |
| `extractors/ytdlp.py` | Экстрактор через yt-dlp (VK, Rutube, YouTube и др.) |
| `extractors/rutube.py` | Быстрый экстрактор m3u8 для Rutube через API. |
| `extractors/base.py` | Базовый класс/интерфейс экстракторов. |

Используется бэкендом при отдаче лекций с видео-блоками.

---

## 5. Тесты (`tests/`)

### Backend (`tests/back/`)
- `conftest.py` — фикстуры pytest (клиент DRF, тестовые пользователи, БД).
- `test_api_*.py` — интеграционные API-тесты для каждого приложения (auth, groups, tracks, lectures, tasks, puzzles, questions, surveys, layouts, notifications, users).
- `test_units/` — юнит-тесты:
  - `test_achievements.py` — логика достижений
  - `test_db_utils.py` — утилиты БД
  - `test_progress.py` — расчет прогресса
  - `test_runner.py` — запускчик кода
  - `test_serializers.py` — сериализаторы

### Frontend (`tests/front/`)
- Vitest + jsdom + Testing Library.
- `app/*/*.test.tsx` — тесты страниц (layout-view, puzzle-view, question-view, task-view).
- `components/*.test.tsx` — тесты компонентов.
- `lib/*.test.ts` — тесты утилит и API-клиента.

### Запуск
```bash
python tests/run_all.py   # все тесты
pytest                    # только бэкенд
cd front && npm run test  # только фронтенд
```

---

## 6. Инфраструктура

### Docker Compose (`docker-compose.yml`)
| Сервис | Образ/Билд | Порт | Зависимости |
|--------|-----------|------|-------------|
| `mongodb` | `mongo:7` | — | — |
| `redis` | `redis:7-alpine` | — | — |
| `backend` | `back/Dockerfile` | 8000 | mongodb, redis |
| `celery` | `back/Dockerfile` | — | backend, redis |
| `frontend` | `front/Dockerfile` | — | backend |
| `nginx` | `nginx:alpine` | 80 | backend, frontend |

### Nginx (`nginx/nginx.conf`)
- Проксирование `/api/` и `/static/` на backend (8000).
- Проксирование всего остального на frontend (3000).

### Dockerfile
- `back/Dockerfile` — Python 3.11, установка зависимостей, collectstatic, gunicorn.
- `front/Dockerfile` — Node 18, npm ci, next build, next start.

---

## 7. Быстрый поиск по файлам

### Ключевые файлы по функциональности

| Функциональность | Backend | Frontend |
|-----------------|---------|----------|
| Авторизация (JWT) | `apps/users/authentication.py`, `apps/users/views.py` | `lib/api/auth.ts`, `components/api-auth-handler.tsx` |
| Пользователи | `apps/users/documents.py` | `lib/types/index.ts` (User) |
| Треки / курсы | `apps/tracks/documents.py`, `views.py` | `app/(main)/tracks/`, `lib/api/tracks.ts` |
| Лекции (блоки) | `apps/lectures/documents.py`, `views.py`, `serializers.py` | `app/(main)/lectures/`, `components/lecture-blocks/` |
| Задачи (код) | `apps/tasks/documents.py`, `runner.py` | `app/(main)/tasks/`, `components/testcases/` |
| Головоломки | `apps/puzzles/documents.py`, `views.py` | `app/(main)/puzzles/` |
| Вопросы | `apps/questions/documents.py`, `views.py` | `app/(main)/questions/` |
| Опросы | `apps/surveys/documents.py`, `views.py` | `app/(main)/surveys/` |
| Верстка | `apps/layouts/documents.py`, `checker.py` | `app/(main)/layouts/` |
| Достижения | `apps/achievements/registry.py` | `components/achievement-*.tsx` |
| Уведомления | `apps/notifications/documents.py` | `lib/api/notifications.ts` |
| Видео | `video_resolver/resolver.py` | `components/lecture-blocks/block-view-video.tsx` |
| Веб-файлы | `apps/lectures/serializers.py` (validate_blocks) | `components/lecture-blocks/block-view-web-file.tsx`, `block-editor-web-file.tsx` |
| Прогресс | `apps/submissions/progress.py` | `lib/utils/track-nav.ts` |
| Группы | `apps/groups/documents.py` | `components/group-selector.tsx` |

---

## 8. Соглашения и стили

- **Backend:** PEP 8, docstrings на русском, типизация (Python 3.11+ `str | None`).
- **Frontend:** ESLint (Next.js конфиг), TypeScript strict, Tailwind классы, kebab-case для файлов компонентов.
- **MongoDB:** Коллекции именуются во множественном числе (`tracks`, `users`). Индексы объявляются в `meta` документа. `public_id` используется как human-friendly URL-slug (unique + sparse).
- **API:** RESTful, JSON, префикс `/api/`, документация в `/api/docs/`.
- **Веб-лекции:** HTML/CSS/JS файлы складываются в `web-lection-files/`. В dev-режиме Next.js раздаёт их из `front/public/web-lection-files/`. В production nginx раздаёт их из примонтированной `web-lection-files/`.

---

*Индекс создан: 2026-04-29. При добавлении новых приложений или значительных архитектурных изменений обновляйте этот файл.*
