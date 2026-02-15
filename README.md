# kavnt_project

Фронтенд приложения находится в папке **front/**.

## Запуск

```bash
cd front
npm install
npm run dev
```

Сборка:

```bash
cd front
npm run build
npm start
```

## Тесты

Перед первым запуском тестов бэкенда установите зависимости (из корня, с активированным venv проекта):

```bash
pip install -r back/requirements.txt
```

Если в выводе pip путь к пакетам ведёт в папку **другого** проекта (например `kavnt_project\.venv`), в этом терминале активен чужой venv — проверьте `where python`, путь должен быть внутри текущего проекта. Если видите «No module named pytest», хотя venv вроде свой, — в том же терминале выполните `pip install -r back/requirements.txt` (должно ставить в активный venv).

**В проекте два venv?** Оставьте один (удобнее всего `.venv` в корне репозитория), второй папку удалите. Дальше везде активируйте только этот один venv и ставьте в него зависимости (`pip install -r back/requirements.txt`).

**Все тесты (бэкенд + фронтенд):**

```bash
python tests/run_all.py
```

**Только бэкенд (pytest):**

```bash
pytest
```

(из корня проекта; используется `pytest.ini` и `config.settings.test`)

**Только фронтенд (Vitest):**

```bash
cd front
npm run test
```

В режиме наблюдения: `npm run test:watch`.

## Структура

- **front/** — Next.js приложение (App Router, TypeScript, Tailwind, shadcn/ui)
- **back/** — Django DRF бэкенд (MongoDB, Celery, Redis)
- **nginx/** — конфигурация Nginx для деплоя
- **video_resolver/** — модуль разрешения видео-ссылок (Rutube, VK и др.)
- Остальные части проекта — в корне репозитория

---

## Деплой на сервер

Развёртывание выполняется через **Docker** и **Docker Compose**. На сервере поднимаются: Nginx (обратный прокси), бэкенд (Django + Gunicorn), фронтенд (Next.js), воркер Celery, MongoDB и Redis.

### Требования на сервере

- Docker и Docker Compose
- Доступ по SSH (или консоль VPS)

### Шаг 1. Клонирование и переход в проект

```bash
git clone <url-репозитория> kavnt_project_test
cd kavnt_project_test
```

### Шаг 2. Файл окружения

Создайте файл `.env` в корне проекта (на основе примера для продакшена):

```bash
cp .env.prod.example .env
```

Откройте `.env` и задайте:

| Переменная | Описание | Пример |
|------------|----------|--------|
| `SECRET_KEY` | Секретный ключ Django (длинная случайная строка) | Сгенерируйте: `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `ALLOWED_HOSTS` | Домены сервера через запятую | `yourdomain.com,www.yourdomain.com` |
| `CORS_ALLOWED_ORIGINS` | URL фронтенда (через запятую) | `https://yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | Публичный URL сайта (без слэша в конце) | `https://yourdomain.com` |

Остальные переменные в `.env.prod.example` уже настроены для работы внутри Docker (MongoDB и Redis по именам сервисов). При необходимости измените `MONGODB_NAME`.

### Шаг 3. Сборка и запуск

```bash
docker compose up -d --build
```

Первый запуск может занять несколько минут (сборка образов, загрузка MongoDB/Redis). Проверка статуса:

```bash
docker compose ps
```

Все сервисы должны быть в состоянии `running`.

### Шаг 4. Проверка

- Сайт: **http://IP-сервера** или **https://ваш-домен** (если настроен SSL).
- API: **http://IP-сервера/api/** и документация **http://IP-сервера/api/docs/**.

### Шаг 5. Наполнение данными (опционально)

Если нужны тестовые пользователи и данные, выполните мокап внутри контейнера бэкенда (скрипт уже есть в образе в `back/`):

```bash
docker compose exec backend python mock_data.py
```

### Дополнительно

- **Логи:** `docker compose logs -f backend` (или `frontend`, `nginx`, `celery`, `mongodb`, `redis`).
- **Остановка:** `docker compose down`.
- **Обновление после изменений в коде:** `docker compose up -d --build`.
- **SSL (HTTPS):** настройте сертификаты (например, Let's Encrypt) и проксируйте Nginx через Traefik/Certbot или добавьте в `nginx/nginx.conf` блок с `listen 443 ssl` и путями к сертификатам.
