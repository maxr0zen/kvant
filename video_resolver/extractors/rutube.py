"""
Извлечение прямой ссылки на видео Rutube через официальный API (m3u8) без скачивания.
"""

import re
from video_resolver.extractors.base import ExtractorResult


def is_rutube_url(url: str) -> bool:
    u = (url or "").strip().lower()
    return (
        "rutube.ru/video/" in u
        or "rutube.ru/shorts/" in u
        or "rutube.ru/play/embed/" in u
    )


def _rutube_video_id(url: str) -> str | None:
    u = (url or "").strip().lower()
    # rutube.ru/video/ID, rutube.ru/shorts/ID, rutube.ru/play/embed/ID
    m = re.search(
        r"rutube\.ru/(?:video|shorts|play/embed)/([a-zA-Z0-9]+)",
        u,
    )
    return m.group(1) if m else None


def rutube_extract(url: str) -> ExtractorResult:
    """
    Получает URL мастер-плейлиста m3u8 через GET https://rutube.ru/api/play/options/{video_id}/
    Файл не скачивается.
    """
    video_id = _rutube_video_id(url)
    if not video_id:
        return {
            "direct_url": "",
            "format": "m3u8",
            "title": "",
            "duration": None,
            "error": "Неверный URL Rutube",
        }

    try:
        import requests
    except ImportError:
        return {
            "direct_url": "",
            "format": "m3u8",
            "title": "",
            "duration": None,
            "error": "Для Rutube API нужен requests: pip install requests",
        }

    api_url = f"https://rutube.ru/api/play/options/{video_id}/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        r = requests.get(api_url, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        return {
            "direct_url": "",
            "format": "m3u8",
            "title": "",
            "duration": None,
            "error": str(e),
        }

    # video_balancer.m3u8 — URL мастер-плейлиста HLS
    balancer = data.get("video_balancer") or {}
    m3u8_url = balancer.get("m3u8") or balancer.get("m3u8_url")
    if not m3u8_url:
        return {
            "direct_url": "",
            "format": "m3u8",
            "title": (data.get("title") or "").strip() or "Video",
            "duration": data.get("duration"),
            "error": "В ответе Rutube нет m3u8 URL",
        }

    return {
        "direct_url": m3u8_url,
        "format": "m3u8",
        "title": (data.get("title") or "").strip() or "Video",
        "duration": data.get("duration"),
        "error": None,
    }
