from celery import shared_task


@shared_task(bind=True)
def run_code_check(self, task_id: str, user_id: str, code: str):
    """
    Run user code against task test cases (stub).
    Later: run in sandbox (Docker/Firejail), save Submission, notify.
    """
    # Stub: no real execution
    return {"task_id": task_id, "user_id": user_id, "passed": True, "results": []}
