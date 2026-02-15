"""
CLI для тестирования: python -m video_resolver "https://rutube.ru/video/xxx/"
"""

import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Получить прямую ссылку на видео (VK Video, Rutube) без скачивания."
    )
    parser.add_argument(
        "url",
        nargs="+",
        help="URL видео (Rutube, VK Video и др.)",
    )
    parser.add_argument(
        "-j", "--json",
        action="store_true",
        help="Вывести результат в JSON",
    )
    args = parser.parse_args()

    from video_resolver import resolve_video_url

    for url in args.url:
        result = resolve_video_url(url)
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            if result.get("error"):
                print(f"Ошибка: {result['error']}", file=sys.stderr)
            else:
                print(f"Title: {result.get('title', '')}")
                print(f"Format: {result.get('format', '')}")
                print(f"Duration: {result.get('duration')} sec")
                print(f"URL: {result.get('direct_url', '')}")
        if len(args.url) > 1:
            print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
