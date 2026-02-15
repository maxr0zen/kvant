# Build context: project root (docker-compose uses context: . and dockerfile: back/Dockerfile)
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend dependencies
COPY back/requirements.txt ./back/requirements.txt
RUN pip install --no-cache-dir -r back/requirements.txt

# video_resolver dependencies
COPY video_resolver/requirements.txt ./video_resolver/requirements.txt
RUN pip install --no-cache-dir -r video_resolver/requirements.txt

# Application code (backend + video_resolver for imports)
COPY back/ ./back/
COPY video_resolver/ ./video_resolver/

WORKDIR /app/back
ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=config.settings.prod

RUN python manage.py collectstatic --noinput --settings=config.settings.prod

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
