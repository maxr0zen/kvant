from .base import *  # noqa: F401, F403

DEBUG = True
MONGODB_NAME = "test_kavnt"

REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
    "rest_framework.permissions.AllowAny",
]
