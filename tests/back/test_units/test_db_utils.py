"""Unit tests: common.db_utils get_doc_by_pk (ObjectId and public_id)."""
import pytest
import sys
import os

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
