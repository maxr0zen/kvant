"""Unit tests: tasks runner (run_python_code, run_tests)."""
import pytest
import sys

# Ensure back is on path
import os
BACK = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "back"))
if BACK not in sys.path:
    sys.path.insert(0, BACK)

from apps.tasks.runner import run_python_code, run_tests, _normalize_output
from apps.tasks.documents import Task, TaskCaseEmbed


def test_normalize_output():
    from apps.tasks.runner import _normalize_output
    assert _normalize_output("a\n") == "a"
    assert _normalize_output("a\r\nb") == "a\nb"


def test_run_python_code_success():
    stdout, stderr, err = run_python_code("print(1+1)", stdin="", timeout_sec=2.0)
    assert err is None
    assert "2" in stdout


def test_run_python_code_stdin():
    code = "a = input()\nprint(a)"
    stdout, stderr, err = run_python_code(code, stdin="hello", timeout_sec=2.0)
    assert err is None
    assert _normalize_output(stdout) == "hello"


def test_run_python_code_syntax_error():
    stdout, stderr, err = run_python_code("syntax ( invalid", stdin="", timeout_sec=2.0)
    assert err is not None
    assert "Строка" in err or "line" in err.lower() or "SyntaxError" in str(err)


def test_run_python_code_timeout():
    # Infinite loop
    stdout, stderr, err = run_python_code("while True: pass", stdin="", timeout_sec=0.1)
    assert err is not None
    assert "время" in err.lower() or "timeout" in err.lower() or "Превышено" in err


def test_run_tests_success():
    task = Task(
        title="T",
        track_id="x",
        test_cases=[
            TaskCaseEmbed(id="c1", input="2\n3", expected_output="5\n", is_public=True),
        ],
    )
    code = "a = int(input())\nb = int(input())\nprint(a + b)"
    results = run_tests(task, code)
    assert len(results) == 1
    assert results[0]["passed"] is True
    assert results[0]["caseId"] == "c1"


def test_run_tests_failed():
    task = Task(
        title="T",
        track_id="x",
        test_cases=[
            TaskCaseEmbed(id="c1", input="2\n3", expected_output="5\n", is_public=True),
        ],
    )
    results = run_tests(task, "print(0)")
    assert len(results) == 1
    assert results[0]["passed"] is False
