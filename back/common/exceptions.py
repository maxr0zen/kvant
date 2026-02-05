from rest_framework.views import exception_handler
from rest_framework.response import Response


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response
    return Response(
        {"detail": str(exc)},
        status=500,
    )
