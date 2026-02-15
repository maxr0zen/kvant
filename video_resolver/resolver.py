"""
Основная логика разрешения URL видео в прямую ссылку (mp4 или m3u8) для воспроизведения в браузере.
Файл не загружается — возвращается только URL. Приоритет: mp4, при отсутствии — m3u8.
"""

from video_resolver.extractors.ytdlp import ytdlp_extract
from video_resolver.extractors.rutube import rutube_extract, is_rutube_url


def resolve_video_url(url: str, prefer_mp4: bool = True) -> dict:
    """
    Преобразует ссылку на видео (VK Video, Rutube) в прямую ссылку на стрим (mp4 или m3u8).

    Ссылка для воспроизведения в браузере (<video> + для m3u8 нужен hls.js).
    Файл не скачивается — только получается URL.

    Args:
        url: Ссылка на страницу видео (rutube.ru/video/..., vk.com/video...).
        prefer_mp4: Если True — возвращать только mp4 (при отсутствии — error).
                    Если False — при отсутствии mp4 возвращать m3u8 (для лекций с паузами).

    Returns:
        dict: direct_url, format ("mp4" | "m3u8"), title, duration, error
    """
    url = (url or "").strip()
    if not url:
        return {
            "direct_url": "",
            "format": "mp4",
            "title": "",
            "duration": None,
            "error": "Пустой URL",
        }

    # Сначала пробуем mp4 через yt-dlp
    result = ytdlp_extract(url, mp4_only=True)
    if not result.get("error"):
        return result

    if prefer_mp4:
        return result

    # Разрешаем m3u8: для Rutube — API (быстро даёт m3u8), иначе yt-dlp
    if is_rutube_url(url):
        rutube_result = rutube_extract(url)
        if not rutube_result.get("error"):
            return rutube_result

    return ytdlp_extract(url, mp4_only=False)
