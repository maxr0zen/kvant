import uuid
from mongoengine import (
    Document,
    StringField,
    ListField,
    EmbeddedDocumentField,
    EmbeddedDocument,
    DateTimeField,
    IntField,
)

VALID_EDITABLE = ("html", "css", "js")
VALID_CHECK_MODES = ("subtasks", "full_match")


def _generate_public_id():
    return uuid.uuid4().hex[:12]


class LayoutSubtaskEmbed(EmbeddedDocument):
    """Подзадача-чекер для задания верстки."""
    id = StringField(required=True)
    title = StringField(required=True)
    check_type = StringField(required=True, choices=["selector_exists", "html_contains", "css_contains", "js_contains"])
    check_value = StringField(required=True)


class LayoutLesson(Document):
    meta = {
        "collection": "layouts",
        "indexes": ["track_id", {"fields": ["public_id"], "unique": True, "sparse": True}],
    }
    title = StringField(required=True, max_length=500)
    description = StringField(default="")  # теория к заданию
    attached_lecture_id = StringField(default="")  # optional: lecture linked specifically to this layout
    track_id = StringField(default="")
    # Шаблоны по умолчанию для html, css, js
    template_html = StringField(required=True, default="")
    template_css = StringField(required=True, default="")
    template_js = StringField(required=True, default="")
    # Эталонный финальный результат для проверки совпадения
    reference_html = StringField(required=True, default="")
    reference_css = StringField(required=True, default="")
    reference_js = StringField(required=True, default="")
    # Режим проверки: legacy по подзадачам или полное совпадение результата
    check_mode = StringField(required=True, choices=list(VALID_CHECK_MODES), default="subtasks")
    # Какие файлы пользователь может редактировать (остальные read-only)
    editable_files = ListField(StringField(), default=lambda: ["html", "css", "js"])
    # Подзадачи для проверки
    subtasks = ListField(EmbeddedDocumentField(LayoutSubtaskEmbed), default=list)
    public_id = StringField()
    visible_group_ids = ListField(StringField(), default=list)
    hints = ListField(StringField(), default=list)
    # Достижения, которые выдаются за успешную проверку верстки.
    reward_achievement_ids = ListField(StringField(), default=list)
    available_from = DateTimeField(default=None)
    available_until = DateTimeField(default=None)
    max_attempts = IntField(default=None)
    created_by_id = StringField(default="")
