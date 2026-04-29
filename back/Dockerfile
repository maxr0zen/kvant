# Build context: project root (docker-compose uses context: . and dockerfile: back/Dockerfile)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Backend dependencies
COPY back/requirements.txt ./back/requirements.txt
RUN pip install --no-cache-dir --default-timeout=300 -r back/requirements.txt

# video_resolver dependencies
COPY video_resolver/requirements.txt ./video_resolver/requirements.txt
RUN pip install --no-cache-dir --default-timeout=300 -r video_resolver/requirements.txt

# Application code (backend + video_resolver for imports)
COPY back/ ./back/
COPY video_resolver/ ./video_resolver/

WORKDIR /app/back
ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=config.settings.prod

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
