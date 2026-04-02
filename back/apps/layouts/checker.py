"""Проверка верстки: синтаксис + подзадачи + анти-абьюз."""
import re

from bs4 import BeautifulSoup

from .documents import LayoutLesson, LayoutSubtaskEmbed, VALID_EDITABLE

MAX_FILE_SIZE = 120_000
MAX_TOTAL_SIZE = 250_000
MAX_SELECTOR_LENGTH = 300
MAX_CHECK_VALUE_LENGTH = 4_000

VOID_HTML_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}

TAG_RE = re.compile(r"<\s*(/)?\s*([a-zA-Z][\w:-]*)\b[^>]*?>", re.IGNORECASE)
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
SCRIPT_BLOCK_RE = re.compile(r"<script\b[^>]*>.*?</script\s*>", re.IGNORECASE | re.DOTALL)
STYLE_BLOCK_RE = re.compile(r"<style\b[^>]*>.*?</style\s*>", re.IGNORECASE | re.DOTALL)
TAG_NAME_RE = re.compile(r"^[a-zA-Z][\w:-]*$")


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    seen = set()
    out = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def _get_sources(layout: LayoutLesson, user_html: str, user_css: str, user_js: str) -> tuple[str, str, str]:
    editable = set(getattr(layout, "editable_files", None) or ["html", "css", "js"])
    editable = {f.lower() for f in editable if f.lower() in VALID_EDITABLE}
    html = user_html if "html" in editable else (layout.template_html or "")
    css = user_css if "css" in editable else (layout.template_css or "")
    js = user_js if "js" in editable else (layout.template_js or "")
    return html or "", css or "", js or ""


def _build_full_html(html: str, css: str, js: str) -> str:
    if not html.strip():
        html = "<html><head></head><body></body></html>"
    soup = BeautifulSoup(html, "html.parser")

    if css:
        style = soup.new_tag("style")
        style.string = css
        if soup.head:
            soup.head.append(style)
        else:
            soup.insert(0, style)

    if js:
        script = soup.new_tag("script")
        script.string = js
        if soup.body:
            soup.body.append(script)
        else:
            soup.append(script)

    return str(soup)


def _clean_html_for_contains(html: str) -> str:
    out = HTML_COMMENT_RE.sub("", html or "")
    out = SCRIPT_BLOCK_RE.sub("", out)
    out = STYLE_BLOCK_RE.sub("", out)
    return out


def _validate_payload_sizes(html: str, css: str, js: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    abuse_flags: list[str] = []
    if len(html) > MAX_FILE_SIZE:
        errors.append("HTML файл слишком большой для проверки.")
        abuse_flags.append("html_file_too_large")
    if len(css) > MAX_FILE_SIZE:
        errors.append("CSS файл слишком большой для проверки.")
        abuse_flags.append("css_file_too_large")
    if len(js) > MAX_FILE_SIZE:
        errors.append("JS файл слишком большой для проверки.")
        abuse_flags.append("js_file_too_large")
    if len(html) + len(css) + len(js) > MAX_TOTAL_SIZE:
        errors.append("Суммарный размер HTML/CSS/JS превышает допустимый лимит.")
        abuse_flags.append("total_payload_too_large")
    for source_name, value in (("html", html), ("css", css), ("js", js)):
        if "\x00" in value:
            errors.append(f"В {source_name.upper()} найден недопустимый нулевой символ.")
            abuse_flags.append(f"{source_name}_contains_null_byte")
    return _dedupe_preserve_order(errors), _dedupe_preserve_order(abuse_flags)


def _validate_html_syntax(raw_html: str) -> list[str]:
    errors: list[str] = []
    if not raw_html.strip():
        errors.append("HTML пустой.")
        return errors
    sanitized = HTML_COMMENT_RE.sub("", raw_html)
    stack: list[str] = []
    for match in TAG_RE.finditer(sanitized):
        full_tag = match.group(0) or ""
        tag_name = (match.group(2) or "").lower()
        is_closing = bool(match.group(1))
        if not tag_name:
            continue
        if tag_name in VOID_HTML_TAGS or full_tag.rstrip().endswith("/>"):
            continue
        if is_closing:
            if not stack:
                errors.append(f"Лишний закрывающий тег </{tag_name}>.")
                continue
            if stack[-1] == tag_name:
                stack.pop()
                continue
            if tag_name in stack:
                while stack and stack[-1] != tag_name:
                    errors.append(f"Тег <{stack.pop()}> не закрыт.")
                if stack and stack[-1] == tag_name:
                    stack.pop()
                continue
            errors.append(f"Лишний закрывающий тег </{tag_name}>.")
            continue
        stack.append(tag_name)
    while stack:
        errors.append(f"Тег <{stack.pop()}> не закрыт.")
    return _dedupe_preserve_order(errors)


def _validate_balanced_code(source: str, source_name: str) -> list[str]:
    """
    Базовая статическая проверка синтаксиса для CSS/JS.
    Проверяет баланс скобок, строк и комментариев.
    """
    errors: list[str] = []
    stack: list[tuple[str, int]] = []
    in_single = False
    in_double = False
    in_template = False
    in_line_comment = False
    in_block_comment = False
    escaped = False
    line = 1
    i = 0
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if ch == "\n":
            line += 1
            if in_line_comment:
                in_line_comment = False
            i += 1
            escaped = False
            continue
        if in_line_comment:
            i += 1
            continue
        if in_block_comment:
            if ch == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_single:
            if ch == "'" and not escaped:
                in_single = False
            escaped = ch == "\\" and not escaped
            i += 1
            continue
        if in_double:
            if ch == '"' and not escaped:
                in_double = False
            escaped = ch == "\\" and not escaped
            i += 1
            continue
        if in_template:
            if ch == "`" and not escaped:
                in_template = False
            escaped = ch == "\\" and not escaped
            i += 1
            continue
        if ch == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if ch == "'":
            in_single = True
            escaped = False
            i += 1
            continue
        if ch == '"':
            in_double = True
            escaped = False
            i += 1
            continue
        if ch == "`":
            in_template = True
            escaped = False
            i += 1
            continue
        if ch in "([{":
            stack.append((ch, line))
        elif ch in ")]}":
            if not stack:
                errors.append(f"{source_name}: лишняя закрывающая скобка '{ch}' на строке {line}.")
            else:
                open_char, open_line = stack.pop()
                pair = {"(": ")", "[": "]", "{": "}"}
                if pair.get(open_char) != ch:
                    errors.append(
                        f"{source_name}: скобки не согласованы (открыта '{open_char}' на строке {open_line}, закрыта '{ch}' на строке {line})."
                    )
        i += 1
    if in_single or in_double or in_template:
        errors.append(f"{source_name}: незакрытая строка.")
    if in_block_comment:
        errors.append(f"{source_name}: незакрытый комментарий /* */.")
    while stack:
        open_char, open_line = stack.pop()
        errors.append(f"{source_name}: незакрытая скобка '{open_char}' (строка {open_line}).")
    return _dedupe_preserve_order(errors)


def _check_subtask(
    full_html: str,
    clean_html: str,
    css: str,
    js: str,
    subtask: LayoutSubtaskEmbed,
) -> tuple[bool, str, list[str]]:
    """Проверяет одну подзадачу. Возвращает (passed, message, abuse_flags)."""
    abuse_flags: list[str] = []
    try:
        check_value = subtask.check_value or ""
        if len(check_value) > MAX_CHECK_VALUE_LENGTH:
            abuse_flags.append("subtask_check_value_too_large")
            return False, "Слишком длинное значение проверки.", abuse_flags

        if subtask.check_type == "selector_exists":
            selector = check_value.strip()
            if not selector:
                return False, "Пустой CSS-селектор.", abuse_flags
            if len(selector) > MAX_SELECTOR_LENGTH:
                abuse_flags.append("selector_too_large")
                return False, "Селектор слишком длинный.", abuse_flags
            soup = BeautifulSoup(full_html, "html.parser")
            matches = soup.select(selector)
            if matches:
                return True, "OK", abuse_flags
            return False, f"Элемент по селектору '{selector}' не найден", abuse_flags

        if subtask.check_type == "html_contains":
            normalized = check_value.strip()
            # Защита от обхода: если проверочное значение похоже на имя тега,
            # проверяем именно существование тега, а не текстовой подстроки.
            if TAG_NAME_RE.fullmatch(normalized):
                soup = BeautifulSoup(clean_html, "html.parser")
                if soup.find(normalized.lower()) is not None:
                    return True, "OK", abuse_flags
                return False, f"Тег <{normalized.lower()}> не найден.", abuse_flags
            if check_value in clean_html:
                return True, "OK", abuse_flags
            return False, f"В HTML не найдено: {check_value[:50]}...", abuse_flags

        if subtask.check_type == "css_contains":
            if check_value in css:
                return True, "OK", abuse_flags
            return False, f"В CSS не найдено: {check_value[:50]}...", abuse_flags

        if subtask.check_type == "js_contains":
            if check_value in js:
                return True, "OK", abuse_flags
            return False, f"В JS не найдено: {check_value[:50]}...", abuse_flags

        return False, f"Неизвестный тип проверки: {subtask.check_type}", abuse_flags
    except Exception as e:
        return False, str(e), abuse_flags


def check_layout(layout: LayoutLesson, user_html: str, user_css: str, user_js: str) -> dict:
    """
    Проверяет верстку пользователя.
    Возвращает:
    {
      subtasks: [{id, title, passed, message}],
      passed: bool,
      errors: string[],
      warnings: string[],
      abuse_flags: string[]
    }
    """
    html, css, js = _get_sources(layout, user_html or "", user_css or "", user_js or "")
    full_html = _build_full_html(html, css, js)
    clean_html = _clean_html_for_contains(html)

    blocking_errors: list[str] = []
    warnings: list[str] = []
    abuse_flags: list[str] = []

    size_errors, size_abuse = _validate_payload_sizes(html, css, js)
    blocking_errors.extend(size_errors)
    abuse_flags.extend(size_abuse)

    blocking_errors.extend(_validate_html_syntax(html))
    blocking_errors.extend(_validate_balanced_code(css, "CSS"))
    blocking_errors.extend(_validate_balanced_code(js, "JS"))

    results = []
    if blocking_errors:
        for st in layout.subtasks:
            results.append({
                "id": st.id,
                "title": st.title,
                "passed": False,
                "message": "Проверка подзадачи недоступна до исправления синтаксических ошибок.",
            })
        return {
            "subtasks": results,
            "passed": False,
            "errors": _dedupe_preserve_order(blocking_errors),
            "warnings": _dedupe_preserve_order(warnings),
            "abuse_flags": _dedupe_preserve_order(abuse_flags),
        }

    for st in layout.subtasks:
        passed, msg, subtask_abuse = _check_subtask(full_html, clean_html, css, js, st)
        abuse_flags.extend(subtask_abuse)
        results.append({
            "id": st.id,
            "title": st.title,
            "passed": passed,
            "message": msg,
        })
    all_passed = all(r["passed"] for r in results) if results else False
    return {
        "subtasks": results,
        "passed": all_passed,
        "errors": _dedupe_preserve_order(blocking_errors),
        "warnings": _dedupe_preserve_order(warnings),
        "abuse_flags": _dedupe_preserve_order(abuse_flags),
    }
