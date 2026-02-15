"""
Извлечение прямой ссылки на видео через yt-dlp (VK Video, Rutube и др.) без скачивания.
"""

from video_resolver.extractors.base import ExtractorResult


def ytdlp_extract(url: str, mp4_only: bool = True, prefer_hls_streaming: bool = True) -> ExtractorResult:
    """
    Использует yt-dlp для получения direct URL без загрузки файла.
    При mp4_only=True возвращает только ссылку на mp4 или m3u8.
    prefer_hls_streaming: при True сначала выбираем HLS (m3u8) — такие ссылки воспроизводятся
    в браузере, а не вызывают скачивание (в отличие от некоторых CDN mp4).
    """
    try:
        import yt_dlp
    except ImportError:
        return {
            "direct_url": "",
            "format": "mp4",
            "title": "",
            "duration": None,
            "error": "yt-dlp не установлен. Установите: pip install yt-dlp",
        }

    # Приоритет: HLS (m3u8) для стриминга в браузере, затем mp4
    if prefer_hls_streaming:
        format_selector = (
            "best[protocol^=m3u8]/best[ext=mp4]/best"
            if mp4_only
            else "best[protocol^=m3u8]/best[ext=mp4]/best"
        )
    else:
        format_selector = (
            "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/best[ext=mp4]"
            if mp4_only
            else "best[ext=mp4]/best"
        )
    opts = {
        "quiet": True,
        "no_warnings": True,
        "simulate": True,
        "format": format_selector,
        "noplaylist": True,
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        return {
            "direct_url": "",
            "format": "mp4",
            "title": "",
            "duration": None,
            "error": str(e),
        }

    if not info:
        return {
            "direct_url": "",
            "format": "mp4",
            "title": "",
            "duration": None,
            "error": "Не удалось получить информацию о видео",
        }

    # Выбор формата: при mp4_only — только mp4; иначе mp4 или m3u8
    direct_url = info.get("url") or ""
    ext = (info.get("ext") or "").lower()
    if info.get("formats"):
        formats = [f for f in info["formats"] if f.get("vcodec") != "none" and f.get("url")]
        mp4_f = next((f for f in formats if (f.get("ext") or "").lower() == "mp4"), None)
        if mp4_f:
            direct_url = mp4_f.get("url", "")
            ext = "mp4"
        elif not mp4_only and formats:
            chosen = formats[0]
            direct_url = chosen.get("url", "")
            ext = (chosen.get("ext") or "mp4").lower()
            if "m3u8" in (chosen.get("protocol") or "").lower() or "m3u8" in (direct_url or "").lower():
                ext = "m3u8"

    # Один формат (info["url"])
    if not direct_url and info.get("url"):
        direct_url = info["url"]
        ext = (info.get("ext") or "mp4").lower()
        if "m3u8" in (direct_url or "").lower():
            ext = "m3u8"

    if ext not in ("mp4", "m3u8"):
        ext = "mp4"

    # При prefer_hls_streaming разрешаем m3u8 (стрим в браузере), иначе только mp4
    if mp4_only and ext != "mp4" and not (prefer_hls_streaming and ext == "m3u8"):
        return {
            "direct_url": "",
            "format": "mp4",
            "title": (info.get("title") or "").strip() or "Video",
            "duration": info.get("duration"),
            "error": "Для этого видео нет прямой ссылки на mp4 (доступен только стрим в другом формате).",
        }

    return {
        "direct_url": direct_url,
        "format": ext if ext in ("mp4", "m3u8") else "mp4",
        "title": (info.get("title") or "").strip() or "Video",
        "duration": info.get("duration"),
        "error": None,
    }
