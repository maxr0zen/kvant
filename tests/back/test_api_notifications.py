"""API tests: notifications (visibility by groups, ACL, expiry)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from rest_framework import status


@pytest.mark.django_db
def test_notifications_get_unauth_only_global_and_not_expired(api_client):
    from apps.notifications.documents import Notification

    now = datetime.now(timezone.utc)
    Notification(message="global-ok", group_ids=[], available_until=now + timedelta(minutes=10)).save()
    Notification(message="global-expired", group_ids=[], available_until=now - timedelta(minutes=10)).save()
    Notification(message="group-hidden", group_ids=["g1"]).save()

    r = api_client.get("/api/notifications/")
    assert r.status_code == status.HTTP_200_OK
    messages = [n["message"] for n in r.json()]
    assert "global-ok" in messages
    assert "global-expired" not in messages
    assert "group-hidden" not in messages


@pytest.mark.django_db
def test_notifications_get_student_sees_global_and_own_group(api_client, test_user, test_group):
    from rest_framework_simplejwt.tokens import AccessToken
    from apps.notifications.documents import Notification

    # student in test_group
    test_user.group_id = str(test_group.id)
    test_user.save()

    class _W:  # minimal wrapper for AccessToken.for_user
        id = str(test_user.id)

    token = AccessToken.for_user(_W())
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")

    Notification(message="global", group_ids=[]).save()
    Notification(message="my-group", group_ids=[str(test_group.id)]).save()
    Notification(message="other-group", group_ids=["000000000000000000000000"]).save()

    r = api_client.get("/api/notifications/")
    assert r.status_code == status.HTTP_200_OK
    messages = [n["message"] for n in r.json()]
    assert "global" in messages
    assert "my-group" in messages
    assert "other-group" not in messages


@pytest.mark.django_db
def test_notifications_create_teacher_group_acl(teacher_client, test_teacher, test_group):
    # teacher allowed groups must include test_group
    test_teacher.group_ids = [str(test_group.id)]
    test_teacher.save()

    ok = teacher_client.post(
        "/api/notifications/",
        {"message": "hello", "group_ids": [str(test_group.id)], "level": "info"},
        format="json",
    )
    assert ok.status_code == status.HTTP_201_CREATED, ok.json()
    assert ok.json()["message"] == "hello"

    forbidden = teacher_client.post(
        "/api/notifications/",
        {"message": "nope", "group_ids": ["000000000000000000000000"], "level": "info"},
        format="json",
    )
    assert forbidden.status_code == status.HTTP_403_FORBIDDEN
    assert "Нет доступа" in forbidden.json().get("detail", "")


@pytest.mark.django_db
def test_notifications_patch_and_delete_teacher_acl(teacher_client, test_teacher, test_group):
    from apps.notifications.documents import Notification

    test_teacher.group_ids = [str(test_group.id)]
    test_teacher.save()

    n = Notification(message="m", group_ids=[str(test_group.id)]).save()

    # patch to disallowed group => 403
    r_forbidden = teacher_client.patch(
        f"/api/notifications/{n.id}/",
        {"group_ids": ["000000000000000000000000"]},
        format="json",
    )
    assert r_forbidden.status_code == status.HTTP_403_FORBIDDEN

    # patch allowed fields stays OK
    r_ok = teacher_client.patch(
        f"/api/notifications/{n.id}/",
        {"message": "m2", "level": "warning"},
        format="json",
    )
    assert r_ok.status_code == status.HTTP_200_OK, r_ok.json()
    assert r_ok.json()["message"] == "m2"
    assert r_ok.json()["level"] == "warning"

    # delete OK (same group)
    r_del = teacher_client.delete(f"/api/notifications/{n.id}/")
    assert r_del.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
def test_notifications_superuser_can_manage_any_group(superuser_client):
    from apps.notifications.documents import Notification

    n = Notification(message="m", group_ids=["000000000000000000000000"]).save()

    r_patch = superuser_client.patch(
        f"/api/notifications/{n.id}/",
        {"group_ids": ["111111111111111111111111"], "message": "changed"},
        format="json",
    )
    assert r_patch.status_code == status.HTTP_200_OK, r_patch.json()
    assert r_patch.json()["message"] == "changed"

    r_del = superuser_client.delete(f"/api/notifications/{n.id}/")
    assert r_del.status_code == status.HTTP_204_NO_CONTENT

