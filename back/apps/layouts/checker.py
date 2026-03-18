"""
Проверка верстки: сборка полного HTML из html+css+js и проверка подзадач.
"""
from bs4 import BeautifulSoup

from .documents import LayoutLesson, LayoutSubtaskEmbed, VALID_EDITABLE


def _build_full_html(layout: LayoutLesson, user_html: str, user_css: str, user_js: str) -> str:
    """Собирает полный HTML-документ из шаблонов и пользовательского кода."""
    editable = set(getattr(layout, "editable_files", None) or ["html", "css", "js"])
    editable = {f.lower() for f in editable if f.lower() in VALID_EDITABLE}

    html = user_html if "html" in editable else (layout.template_html or "")
    css = user_css if "css" in editable else (layout.template_css or "")
    js = user_js if "js" in editable else (layout.template_js or "")

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


def _check_subtask(full_html: str, subtask: LayoutSubtaskEmbed) -> tuple[bool, str]:
    """Проверяет одну подзадачу. Возвращает (passed, message)."""
    try:
        if subtask.check_type == "selector_exists":
            soup = BeautifulSoup(full_html, "html.parser")
            matches = soup.select(subtask.check_value)
            if matches:
                return True, "OK"
            return False, f"Элемент по селектору '{subtask.check_value}' не найден"

        if subtask.check_type == "html_contains":
            if subtask.check_value in full_html:
                return True, "OK"
            return False, f"В HTML не найдено: {subtask.check_value[:50]}..."

        return False, f"Неизвестный тип проверки: {subtask.check_type}"
    except Exception as e:
        return False, str(e)


def check_layout(layout: LayoutLesson, user_html: str, user_css: str, user_js: str) -> dict:
    """
    Проверяет верстку пользователя.
    Возвращает: {subtasks: [{id, title, passed, message}], passed: bool}
    """
    full_html = _build_full_html(layout, user_html or "", user_css or "", user_js or "")
    results = []
    for st in layout.subtasks:
        passed, msg = _check_subtask(full_html, st)
        results.append({
            "id": st.id,
            "title": st.title,
            "passed": passed,
            "message": msg,
        })
    all_passed = all(r["passed"] for r in results) if results else False
    return {"subtasks": results, "passed": all_passed}
