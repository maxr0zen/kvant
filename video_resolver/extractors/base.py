"""
Базовый интерфейс для extractors — получение прямой ссылки на видео без скачивания.
"""

from typing import TypedDict


class ExtractorResult(TypedDict, total=False):
    """Результат извлечения: прямая ссылка и метаданные."""

    direct_url: str
    format: str  # "mp4" | "m3u8"
    title: str
    duration: int | None
    error: str | None
