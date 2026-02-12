"""
Выполнение Python-кода на сервере для проверки решений задач.
"""
import os
import re
import subprocess
import sys
import tempfile


def _sanitize_error_message(text: str) -> str:
    """Убирает путь к временному файлу из сообщения об ошибке."""
    # File "C:\...\tmp123.py", line 1  ->  Строка 1
    return re.sub(
        r'\s*File "[^"]+", line (\d+)(?:, in \S+)?',
        r' Строка \1',
        text,
        flags=re.IGNORECASE,
    )


def _normalize_output(s: str) -> str:
    """Нормализация вывода для сравнения (как на фронте)."""
    return s.replace("\r\n", "\n").rstrip()


def run_python_code(code: str, stdin: str = "", timeout_sec: float = 5.0) -> tuple[str, str, str | None]:
    """
    Выполняет Python-код с заданным stdin.
    Возвращает (stdout, stderr, error).
    error — сообщение об ошибке (SyntaxError, timeout и т.д.), иначе None.
    """
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as f:
        f.write("# -*- coding: utf-8 -*-\n")
        f.write(code)
        tmp_path = f.name
    try:
        proc = subprocess.run(
            [sys.executable, tmp_path],
            input=stdin,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=timeout_sec,
            env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        )
        stdout = proc.stdout or ""
        stderr = proc.stderr or ""
        if proc.returncode != 0 and stderr:
            err_msg = _sanitize_error_message(stderr.strip()) or f"Exit code {proc.returncode}"
            return stdout, stderr, err_msg
        return stdout, stderr, None
    except subprocess.TimeoutExpired:
        return "", "", "Превышено время выполнения"
    except Exception as e:
        return "", "", str(e)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def run_tests(task, code: str) -> list[dict]:
    """
    Запускает код против всех тест-кейсов задачи.
    Возвращает список [{caseId, passed, actualOutput, error?}].
    """
    results = []
    for tc in task.test_cases:
        stdout, stderr, error = run_python_code(code, stdin=tc.input or "")
        actual = _normalize_output(stdout)
        expected = _normalize_output(tc.expected_output or "")
        if error:
            passed = False
            actual_output = _sanitize_error_message(stderr or error)
        else:
            passed = actual == expected
            actual_output = stdout
        results.append({
            "caseId": tc.id,
            "passed": passed,
            "actualOutput": actual_output,
        })
        if error and not passed:
            results[-1]["error"] = error
    return results
