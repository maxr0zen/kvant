# video_resolver

Модуль для получения **прямых ссылок на видео** (mp4 или m3u8) с **VK Video** и **Rutube** для воспроизведения в браузере. Файл не скачивается — возвращается только URL. По умолчанию приоритет у mp4; при `prefer_mp4=False` при отсутствии mp4 возвращается m3u8 (удобно для лекций с паузами и вопросами).

## Установка

Из корня проекта или из папки `video_resolver`:

```bash
pip install -r video_resolver/requirements.txt
```

Зависимости: `yt-dlp`, `requests`.

## Использование в коде

```python
from video_resolver import resolve_video_url

# Только mp4 (по умолчанию); при отсутствии mp4 — error
result = resolve_video_url("https://rutube.ru/video/xxxxxxxxxxxxxxxxxx/")

# Допускать m3u8 для лекций (паузы, вопросы): при отсутствии mp4 вернётся m3u8
result = resolve_video_url("https://rutube.ru/video/xxx/", prefer_mp4=False)

if result.get("error"):
    print("Ошибка:", result["error"])
else:
    print("Прямая ссылка:", result["direct_url"])
    print("Формат:", result["format"])   # "mp4" или "m3u8"
    print("Название:", result["title"])
```

### Формат ответа

| Ключ         | Тип    | Описание |
|-------------|--------|----------|
| `direct_url`| str    | Прямая ссылка на стрим (mp4 или m3u8) |
| `format`    | str    | `"mp4"` или `"m3u8"` |
| `title`     | str    | Название видео |
| `duration`  | int?   | Длительность в секундах |
| `error`     | str?   | Сообщение об ошибке при неудаче |

## CLI

Проверка работы модуля из командной строки:

```bash
# из корня проекта (путь к модулю в PYTHONPATH)
python -m video_resolver "https://rutube.ru/video/xxxxxxxxxxxxxxxxxx/"

# вывод в JSON
python -m video_resolver -j "https://rutube.ru/video/xxxxxxxxxxxxxxxxxx/"

# несколько URL
python -m video_resolver "https://rutube.ru/video/xxx/" "https://vk.com/video-1_2"
```

## Поддерживаемые ссылки

- **Rutube**: `https://rutube.ru/video/ID/`, `https://rutube.ru/shorts/ID/`, `https://rutube.ru/play/embed/ID`
- **VK Video**: `https://vk.com/video-OWNER_ID`, `https://vk.com/videoOWNER_ID`, ссылки vkvideo.ru

**Форматы (mp4 / m3u8):**
- По умолчанию приоритет у **HLS (m3u8)** — такие ссылки воспроизводятся в браузере (через hls.js), а не вызывают скачивание файла (в отличие от части CDN, которые отдают mp4 с заголовком на скачивание).
- Если m3u8 нет, возвращается mp4. С `prefer_mp4=False` при отсутствии mp4 дополнительно пробуем m3u8 через Rutube API или yt-dlp.

## Ограничения

1. **Временные URL** — прямые ссылки (особенно VK) часто имеют ограниченный срок жизни. Использовать сразу, не кэшировать надолго.
2. **Без скачивания** — модуль только получает URL; файл на диск не загружается.
3. **m3u8 в браузере** — во фронте для m3u8 используется hls.js (Safari может воспроизводить HLS нативно).

## Интеграция с backend

Модуль расположен вне папки `back/`. В Django (или другом backend) можно вызывать так:

```python
from video_resolver import resolve_video_url

# в представлении или сервисе
result = resolve_video_url(user_provided_url)
if not result.get("error"):
    # отдать frontend direct_url для <video> или hls.js
    pass
```

Убедитесь, что корень проекта в `PYTHONPATH` при запуске приложения (или установите пакет в режиме разработки: `pip install -e .` при наличии `setup.py`/`pyproject.toml` в корне).
