"""
Run all tests: backend (pytest) then frontend (Vitest).
Prints section headers and full output; exits 0 only if both pass.
Cross-platform (Windows and Linux).
"""
import os
import subprocess
import sys
from pathlib import Path

# Project root: parent of the directory containing this script
TESTS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = TESTS_DIR.parent
BACK_DIR = PROJECT_ROOT / "back"
FRONT_DIR = PROJECT_ROOT / "front"


def run_backend() -> int:
    """Run pytest on tests/back. Return exit code."""
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACK_DIR)
    env["DJANGO_SETTINGS_MODULE"] = "config.settings.test"
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        str(TESTS_DIR / "back"),
        "-v",
        "--tb=short",
    ]
    result = subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        env=env,
        capture_output=False,
        text=True,
    )
    return result.returncode


def run_frontend() -> int:
    """Run npm run test in front/. Return exit code."""
    result = subprocess.run(
        ["npm", "run", "test"],
        cwd=str(FRONT_DIR),
        capture_output=False,
        text=True,
        shell=os.name == "nt",
    )
    return result.returncode


def main() -> None:
    print("=" * 50 + " Backend (pytest) " + "=" * 50, flush=True)
    backend_code = run_backend()
    print(flush=True)
    print("=" * 50 + " Frontend (Vitest) " + "=" * 50, flush=True)
    frontend_code = run_frontend()
    print(flush=True)
    print("=" * 50 + " Summary " + "=" * 50, flush=True)
    backend_status = "PASSED" if backend_code == 0 else "FAILED"
    frontend_status = "PASSED" if frontend_code == 0 else "FAILED"
    print(f"Backend:  {backend_status} (exit {backend_code})")
    print(f"Frontend: {frontend_status} (exit {frontend_code})")
    if backend_code != 0 or frontend_code != 0:
        sys.exit(1)
    print("All tests passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
