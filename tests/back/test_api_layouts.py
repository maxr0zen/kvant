"""API tests: layouts (retrieve, check, draft, CRUD)."""
import pytest
from rest_framework import status
from uuid import uuid4


@pytest.mark.django_db
def test_layouts_retrieve(api_client, test_layout):
    """Retrieve layout by id."""
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    response = api_client.get(f"/api/layouts/{lid}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Test Layout"
    assert "template_html" in data
    assert "template_css" in data
    assert "template_js" in data
    assert "editable_files" in data
    assert "subtasks" in data
    assert len(data["subtasks"]) == 1


@pytest.mark.django_db
def test_layout_retrieve_includes_attached_lecture_body(api_client, test_layout, test_lecture):
    """GET layout отдаёт вложенную лекцию — клиенту не нужен второй запрос к /api/lectures/."""
    test_lecture.public_id = "b2c3d4e5f6a1"
    test_lecture.title = "Theory for layout"
    test_lecture.blocks = [{"type": "text", "content": "<p>Hello theory</p>"}]
    test_lecture.save()
    test_layout.attached_lecture_id = str(test_lecture.id)
    test_layout.save()
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    response = api_client.get(f"/api/layouts/{lid}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["attached_lecture_id"] == "b2c3d4e5f6a1"
    assert data.get("attached_lecture") is not None
    assert data["attached_lecture"]["title"] == "Theory for layout"
    assert data["attached_lecture"]["id"] == "b2c3d4e5f6a1"
    blocks = data["attached_lecture"].get("blocks") or []
    assert len(blocks) >= 1
    assert blocks[0].get("type") == "text"


@pytest.mark.django_db
def test_layout_attached_lecture_id_api_uses_public_id(api_client, test_layout, test_lecture):
    """В БД может лежать ObjectId лекции; в API отдаём public_id, чтобы клиент открыл /api/lectures/.../."""
    test_lecture.public_id = "a1b2c3d4e5f6"
    test_lecture.save()
    test_layout.attached_lecture_id = str(test_lecture.id)
    test_layout.save()
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    response = api_client.get(f"/api/layouts/{lid}/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["attached_lecture_id"] == "a1b2c3d4e5f6"
    lec_r = api_client.get(f"/api/lectures/{data['attached_lecture_id']}/")
    assert lec_r.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_layouts_check_passed(auth_client, test_layout):
    """Check layout: correct HTML passes."""
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    response = auth_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div class='box'>Hi</div>", "css": "", "js": ""},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["passed"] is True
    assert len(data["subtasks"]) == 1
    assert data["subtasks"][0]["passed"] is True
    assert data["errors"] == []
    assert data["abuse_flags"] == []


@pytest.mark.django_db
def test_layouts_check_failed(auth_client, test_layout):
    """Check layout: wrong HTML fails."""
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    response = auth_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div>No box</div>", "css": "", "js": ""},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["passed"] is False


@pytest.mark.django_db
def test_layouts_check_blocks_on_html_syntax_error(auth_client, test_layout):
    """Check layout: syntax errors in HTML block passing."""
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    response = auth_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div class='box'><span>Hi</div>", "css": "", "js": ""},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["passed"] is False
    assert isinstance(data.get("errors"), list)
    assert any("span" in w for w in data["errors"])
    assert data["subtasks"][0]["passed"] is False


@pytest.mark.django_db
def test_layouts_check_html_contains_ignores_script_style_content(auth_client, test_layout):
    """Anti-abuse: html_contains should not pass on script/style payload."""
    from apps.layouts.documents import LayoutSubtaskEmbed

    test_layout.subtasks = [
        LayoutSubtaskEmbed(
            id="s1",
            title="Token in html",
            check_type="html_contains",
            check_value="MAGIC_TOKEN",
        )
    ]
    test_layout.save()
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    response = auth_client.post(
        f"/api/layouts/{lid}/check/",
        {
            "html": "<div>safe</div><script>const x='MAGIC_TOKEN';</script><style>.x::before{content:'MAGIC_TOKEN'}</style>",
            "css": "",
            "js": "",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["passed"] is False
    assert data["subtasks"][0]["passed"] is False


@pytest.mark.django_db
def test_layouts_check_html_contains_tag_name_not_plain_text(auth_client, test_layout):
    """html_contains with tag-like value should validate actual tag presence."""
    from apps.layouts.documents import LayoutSubtaskEmbed

    test_layout.subtasks = [
        LayoutSubtaskEmbed(
            id="s1",
            title="Has body tag",
            check_type="html_contains",
            check_value="body",
        )
    ]
    test_layout.save()
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    response = auth_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div>body текстом</div>", "css": "", "js": ""},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["passed"] is False
    assert data["subtasks"][0]["passed"] is False
    assert "Тег <body> не найден." in data["subtasks"][0]["message"]


@pytest.mark.django_db
def test_layouts_check_css_js_contains(teacher_client, test_track):
    """Check supports css_contains and js_contains."""
    created = teacher_client.post(
        "/api/layouts/",
        {
            "title": "CSSJS",
            "description": "",
            "track_id": str(test_track.id),
            "template_html": "<div class='box'></div>",
            "template_css": "",
            "template_js": "",
            "editable_files": ["html", "css", "js"],
            "subtasks": [
                {"id": "s1", "title": "CSS class", "check_type": "css_contains", "check_value": ".box"},
                {"id": "s2", "title": "JS var", "check_type": "js_contains", "check_value": "let x"},
            ],
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED
    lid = created.json()["id"]
    response = teacher_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div class='box'></div>", "css": ".box{color:red;}", "js": "let x = 1;"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["passed"] is True
    assert all(st["passed"] for st in data["subtasks"])


@pytest.mark.django_db
def test_layouts_mark_completed_only_when_all_subtasks_passed(auth_client, test_layout, test_user):
    """Layout should be completed only after all subtasks pass."""
    from apps.layouts.documents import LayoutSubtaskEmbed
    from apps.submissions.documents import LessonProgress

    test_layout.subtasks = [
        LayoutSubtaskEmbed(id="s1", title="Has box", check_type="selector_exists", check_value=".box"),
        LayoutSubtaskEmbed(id="s2", title="Has text", check_type="html_contains", check_value="Hello text"),
    ]
    test_layout.save()
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    uid = str(test_user.id)

    # First: only one subtask passes.
    r1 = auth_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div class='box'>Nope</div>", "css": "", "js": ""},
        format="json",
    )
    assert r1.status_code == status.HTTP_200_OK
    data1 = r1.json()
    assert data1["passed"] is False
    assert sum(1 for st in data1["subtasks"] if st["passed"]) == 1
    lp1 = LessonProgress.objects(user_id=uid, lesson_id=lid).first()
    assert lp1 is not None
    assert lp1.status == "started"

    # Then: both subtasks pass.
    r2 = auth_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div class='box'>Hello text</div>", "css": "", "js": ""},
        format="json",
    )
    assert r2.status_code == status.HTTP_200_OK
    data2 = r2.json()
    assert data2["passed"] is True
    assert all(st["passed"] for st in data2["subtasks"])
    lp2 = LessonProgress.objects(user_id=uid, lesson_id=lid).first()
    assert lp2 is not None
    assert lp2.status == "completed"


@pytest.mark.django_db
def test_layouts_create_teacher(teacher_client, test_track):
    """Teacher can create layout."""
    response = teacher_client.post(
        "/api/layouts/",
        {
            "title": "New Layout",
            "description": "Task",
            "track_id": str(test_track.id),
            "template_html": "<html></html>",
            "template_css": "",
            "template_js": "",
            "editable_files": ["html"],
            "subtasks": [{"id": "s1", "title": "Has body", "check_type": "html_contains", "check_value": "body"}],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "New Layout"
    assert data["editable_files"] == ["html"]


@pytest.mark.django_db
def test_layouts_create_normalizes_attached_lecture_id(teacher_client, test_track, test_lecture):
    """При создании attached_lecture_id (ObjectId) нормализуется в public_id лекции."""
    test_lecture.public_id = "cafebabebeef"
    test_lecture.save()
    response = teacher_client.post(
        "/api/layouts/",
        {
            "title": "Layout with theory",
            "description": "Task",
            "track_id": str(test_track.id),
            "template_html": "<html></html>",
            "template_css": "",
            "template_js": "",
            "editable_files": ["html"],
            "subtasks": [{"id": "s1", "title": "Has body", "check_type": "html_contains", "check_value": "body"}],
            "attached_lecture_id": str(test_lecture.id),
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["attached_lecture_id"] == "cafebabebeef"
    from apps.layouts.documents import LayoutLesson
    from common.db_utils import get_doc_by_pk

    lay = get_doc_by_pk(LayoutLesson, data["id"])
    assert lay.attached_lecture_id == "cafebabebeef"


@pytest.mark.django_db
def test_layouts_draft_get_put(auth_client, test_layout, test_user):
    """Draft GET returns templates; PUT saves draft."""
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    r1 = auth_client.get(f"/api/layouts/{lid}/draft/")
    assert r1.status_code == status.HTTP_200_OK
    assert "html" in r1.json()
    r2 = auth_client.put(
        f"/api/layouts/{lid}/draft/",
        {"html": "<div>Custom</div>", "css": "", "js": ""},
        format="json",
    )
    assert r2.status_code == status.HTTP_200_OK
    r3 = auth_client.get(f"/api/layouts/{lid}/draft/")
    assert r3.json()["html"] == "<div>Custom</div>"


@pytest.mark.django_db
def test_orphan_layout_in_list(api_client, test_layout):
    """Orphan layout appears in orphan_layouts when not in any track."""
    # test_layout has track_id but track.lessons is empty (fixture creates layout directly)
    response = api_client.get("/api/tracks/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    orphan_layouts = data.get("orphan_layouts", [])
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    ids = [x["id"] for x in orphan_layouts]
    assert lid in ids


@pytest.mark.django_db
def test_layout_progress_started_completed(auth_client, test_layout, test_user):
    """Check: failed -> started; passed -> completed."""
    from apps.submissions.documents import LessonProgress

    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)
    uid = str(test_user.id)

    # Failed check -> started
    auth_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div>No box</div>", "css": "", "js": ""},
        format="json",
    )
    lp = LessonProgress.objects(user_id=uid, lesson_id=lid).first()
    assert lp is not None
    assert lp.status == "started"

    # Passed check -> completed
    auth_client.post(
        f"/api/layouts/{lid}/check/",
        {"html": "<div class='box'>Hi</div>", "css": "", "js": ""},
        format="json",
    )
    lp = LessonProgress.objects(user_id=uid, lesson_id=lid).first()
    assert lp is not None
    assert lp.status == "completed"


@pytest.mark.django_db
def test_teacher_can_patch_foreign_layout_only_visible_groups(teacher_client, test_teacher, test_layout):
    from apps.groups.documents import Group
    from apps.users.documents import User, UserRole

    g1 = Group(title="LayG1", order=1).save()
    g2 = Group(title="LayG2", order=2).save()
    test_teacher.group_ids = [str(g1.id)]
    test_teacher.save()

    teacher_b = User(
        username=f"layout_teacher_b_{uuid4().hex[:8]}",
        first_name="B",
        last_name="Teach",
        role=UserRole.TEACHER.value,
        group_ids=[str(g2.id)],
    )
    teacher_b.set_password("x")
    teacher_b.save()
    test_layout.created_by_id = str(teacher_b.id)
    test_layout.visible_group_ids = [str(g2.id)]
    test_layout.save()
    lid = str(getattr(test_layout, "public_id", None) or test_layout.id)

    r_forbidden = teacher_client.patch(f"/api/layouts/{lid}/", {"title": "changed"}, format="json")
    assert r_forbidden.status_code == status.HTTP_403_FORBIDDEN

    r_allowed = teacher_client.patch(f"/api/layouts/{lid}/", {"visible_group_ids": [str(g1.id)]}, format="json")
    assert r_allowed.status_code == status.HTTP_200_OK
    assert r_allowed.json()["visible_group_ids"] == [str(g1.id)]
