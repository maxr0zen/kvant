"""API tests: layouts (retrieve, check, draft, CRUD)."""
import pytest
from rest_framework import status


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
