"""
Pytest fixtures for backend tests: Django DB, API client, test data (users, tracks, tasks).
"""
import os
import sys

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

# Ensure back is on path when running from project root
BACK_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "back"))
if BACK_DIR not in sys.path:
    sys.path.insert(0, BACK_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")


@pytest.fixture(scope="session")
def django_db_setup():
    """Use test database (test_kavnt) for all tests."""
    pass


@pytest.fixture
def api_client():
    """DRF API client (unauthenticated)."""
    return APIClient()


def _user_wrapper(user):
    """Minimal wrapper so AccessToken.for_user() can read user id."""
    class W:
        id = str(user.id)
    return W()


@pytest.fixture
def test_user():
    """Create a student user for API tests."""
    from apps.users.documents import User, UserRole
    user = User(
        username="teststudent",
        first_name="Test",
        last_name="Student",
        role=UserRole.STUDENT.value,
        group_id=None,
    )
    user.set_password("testpass123")
    user.save()
    yield user
    try:
        user.delete()
    except Exception:
        pass


@pytest.fixture
def test_teacher():
    """Create a teacher user for API tests."""
    from apps.users.documents import User, UserRole
    user = User(
        username="testteacher",
        first_name="Test",
        last_name="Teacher",
        role=UserRole.TEACHER.value,
        group_ids=[],
    )
    user.set_password("testpass123")
    user.save()
    yield user
    try:
        user.delete()
    except Exception:
        pass


@pytest.fixture
def test_superuser():
    """Create a superuser for API tests."""
    from apps.users.documents import User, UserRole
    user = User(
        username="testsuper",
        first_name="Test",
        last_name="Super",
        role=UserRole.SUPERUSER.value,
    )
    user.set_password("testpass123")
    user.save()
    yield user
    try:
        user.delete()
    except Exception:
        pass


@pytest.fixture
def auth_client(api_client, test_user):
    """API client authenticated as test_user (student)."""
    token = AccessToken.for_user(_user_wrapper(test_user))
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")
    return api_client


@pytest.fixture
def teacher_client(api_client, test_teacher):
    """API client authenticated as test_teacher."""
    token = AccessToken.for_user(_user_wrapper(test_teacher))
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")
    return api_client


@pytest.fixture
def superuser_client(api_client, test_superuser):
    """API client authenticated as test_superuser."""
    token = AccessToken.for_user(_user_wrapper(test_superuser))
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")
    return api_client


@pytest.fixture
def test_track():
    """Create a track (for API tests)."""
    from apps.tracks.documents import Track, LessonRef
    track = Track(
        title="Test Track",
        description="For tests",
        order=0,
        lessons=[],
        visible_group_ids=[],
    )
    track.save()
    yield track
    try:
        track.delete()
    except Exception:
        pass


@pytest.fixture
def test_task(test_track):
    """Create a task linked to test_track (for API tests)."""
    from apps.tasks.documents import Task, TaskCaseEmbed
    task = Task(
        title="Test Task",
        description="Sum a+b",
        starter_code="a = int(input())\nb = int(input())\nprint(a + b)",
        track_id=str(test_track.id),
        test_cases=[
            TaskCaseEmbed(id="c1", input="2\n3", expected_output="5\n", is_public=True),
        ],
    )
    task.save()
    yield task
    try:
        task.delete()
    except Exception:
        pass


@pytest.fixture
def test_puzzle(test_track):
    """Create a puzzle (for API tests)."""
    from apps.puzzles.documents import Puzzle, CodeBlockEmbed
    puzzle = Puzzle(
        title="Test Puzzle",
        description="Order the blocks",
        track_id=str(test_track.id),
        blocks=[
            CodeBlockEmbed(id="b1", code="print(1)", order="1", indent=""),
            CodeBlockEmbed(id="b2", code="print(2)", order="2", indent=""),
        ],
    )
    puzzle.save()
    yield puzzle
    try:
        puzzle.delete()
    except Exception:
        pass


@pytest.fixture
def test_question(test_track):
    """Create a question (for API tests)."""
    from apps.questions.documents import Question, QuestionChoiceEmbed
    q = Question(
        title="Test Question",
        prompt="Pick one",
        track_id=str(test_track.id),
        choices=[
            QuestionChoiceEmbed(id="c1", text="A", is_correct=True),
            QuestionChoiceEmbed(id="c2", text="B", is_correct=False),
        ],
    )
    q.save()
    yield q
    try:
        q.delete()
    except Exception:
        pass


@pytest.fixture
def test_lecture(test_track):
    """Create a lecture (for API tests)."""
    from apps.lectures.documents import Lecture
    lecture = Lecture(
        title="Test Lecture",
        track_id=str(test_track.id),
        blocks=[],
        visible_group_ids=[],
    )
    lecture.save()
    yield lecture
    try:
        lecture.delete()
    except Exception:
        pass


@pytest.fixture
def test_group():
    """Create a group (for API tests)."""
    from apps.groups.documents import Group
    group = Group(title="Test Group", order=0)
    group.save()
    yield group
    try:
        group.delete()
    except Exception:
        pass
