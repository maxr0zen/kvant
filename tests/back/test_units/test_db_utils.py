"""Unit tests: common.db_utils get_doc_by_pk (ObjectId and public_id)."""
import pytest
import sys
import os
from datetime import datetime, timezone, timedelta

BACK = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "back"))
if BACK not in sys.path:
    sys.path.insert(0, BACK)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")


@pytest.mark.django_db
def test_get_doc_by_pk_by_objectid(test_track):
    from common.db_utils import get_doc_by_pk
    from apps.tracks.documents import Track
    doc = get_doc_by_pk(Track, str(test_track.id))
    assert doc.id == test_track.id
    assert doc.title == test_track.title


@pytest.mark.django_db
def test_get_doc_by_pk_by_public_id(test_track):
    from common.db_utils import get_doc_by_pk
    from apps.tracks.documents import Track
    if not getattr(test_track, "public_id", None):
        test_track.public_id = "trk_abc12"
        test_track.save()
    doc = get_doc_by_pk(Track, test_track.public_id)
    assert doc.id == test_track.id


@pytest.mark.django_db
def test_get_doc_by_pk_does_not_exist():
    from common.db_utils import get_doc_by_pk
    from apps.tracks.documents import Track
    with pytest.raises(Track.DoesNotExist):
        get_doc_by_pk(Track, "000000000000000000000000")
    with pytest.raises(Track.DoesNotExist):
        get_doc_by_pk(Track, "nonexistent_public_id_xyz")


def test_parse_utc_datetime_accepts_z_offset_and_date_only():
    from common.db_utils import parse_utc_datetime

    dt_z = parse_utc_datetime("2026-03-18T10:11:12Z")
    assert dt_z is not None
    assert dt_z.tzinfo == timezone.utc
    assert (dt_z.year, dt_z.month, dt_z.day, dt_z.hour) == (2026, 3, 18, 10)

    dt_off = parse_utc_datetime("2026-03-18T10:11:12+03:00")
    assert dt_off is not None
    assert dt_off.tzinfo == timezone.utc
    assert dt_off.hour == 7

    dt_date = parse_utc_datetime("2026-03-18")
    assert dt_date is not None
    assert dt_date.tzinfo == timezone.utc
    assert (dt_date.hour, dt_date.minute, dt_date.second) == (0, 0, 0)


def test_datetime_to_iso_utc_normalizes_naive_and_aware():
    from common.db_utils import datetime_to_iso_utc

    naive = datetime(2026, 3, 18, 10, 0, 0)  # treated as UTC
    assert datetime_to_iso_utc(naive).endswith("Z")

    aware = datetime(2026, 3, 18, 13, 0, 0, tzinfo=timezone(timedelta(hours=3)))
    s = datetime_to_iso_utc(aware)
    assert s.startswith("2026-03-18T10:00:00")
    assert s.endswith("Z")
