"""Unit tests: achievements registry check_and_award_achievements."""
import pytest
import sys
import os

BACK = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "back"))
if BACK not in sys.path:
    sys.path.insert(0, BACK)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")


@pytest.mark.django_db
def test_first_lecture_award(test_user):
    """Completing first lecture awards first_lecture."""
    from apps.achievements.registry import check_and_award_achievements
    from apps.submissions.documents import LessonProgress
    from apps.achievements.documents import UserAchievement
    user_id = str(test_user.id)
    assert UserAchievement.objects(user_id=user_id, achievement_id="first_lecture").first() is None
    LessonProgress(
        user_id=user_id,
        lesson_id="lec1",
        lesson_type="lecture",
        status="completed",
        lesson_title="L1",
        track_id="",
        track_title="",
    ).save()
    unlocked = check_and_award_achievements(user_id, "lecture", True)
    assert "first_lecture" in unlocked
    assert UserAchievement.objects(user_id=user_id, achievement_id="first_lecture").first() is not None


@pytest.mark.django_db
def test_lectures_5_award(test_user):
    """Five completed lectures award lectures_5."""
    from apps.achievements.registry import check_and_award_achievements
    from apps.submissions.documents import LessonProgress
    from apps.achievements.documents import UserAchievement
    user_id = str(test_user.id)
    for i in range(5):
        LessonProgress(
            user_id=user_id,
            lesson_id=f"lec_{i}",
            lesson_type="lecture",
            status="completed",
            lesson_title=f"L{i}",
            track_id="",
            track_title="",
        ).save()
    unlocked = check_and_award_achievements(user_id, "lecture", True)
    assert "lectures_5" in unlocked
