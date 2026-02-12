from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from common.db_utils import get_doc_by_pk
from .documents import Puzzle
from .serializers import PuzzleSerializer
from apps.users.permissions import IsTeacher
from apps.users.teacher_utils import validate_visible_group_ids_for_teacher
from apps.submissions.progress import save_lesson_progress
from apps.submissions.documents import AssignmentAttempt


def _can_edit_puzzle(request, puzzle):
    if not request.user or not getattr(request.user, "id", None):
        return False
    if getattr(request.user, "role", None) == "superuser":
        return True
    creator = getattr(puzzle, "created_by_id", None) or ""
    return creator and str(creator) == str(request.user.id)


@api_view(['GET'])
@permission_classes([AllowAny])
def puzzle_list(request):
    """Список всех puzzle-задач"""
    puzzles = Puzzle.objects.all()
    serializer = PuzzleSerializer(puzzles, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def puzzle_detail(request, puzzle_id):
    """GET: получить puzzle. PUT/PATCH: редактировать (владелец/superuser). DELETE: удалить (владелец/superuser)."""
    try:
        puzzle = get_doc_by_pk(Puzzle, puzzle_id)
    except Puzzle.DoesNotExist:
        return Response({'error': 'Puzzle not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = PuzzleSerializer(puzzle, context={"request": request})
        return Response(serializer.data)

    if request.method in ('PUT', 'PATCH'):
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        if not _can_edit_puzzle(request, puzzle):
            return Response(
                {"detail": "Нет прав на редактирование этого задания."},
                status=status.HTTP_403_FORBIDDEN,
            )
        visible_group_ids = request.data.get("visible_group_ids")
        if visible_group_ids is not None:
            ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
            if not ok:
                return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
        partial = request.method == "PATCH"
        serializer = PuzzleSerializer(puzzle, data=request.data, partial=partial, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(PuzzleSerializer(puzzle, context={"request": request}).data)

    if request.method == 'DELETE':
        if not request.user or not getattr(request.user, "id", None):
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        if not _can_edit_puzzle(request, puzzle):
            return Response(
                {"detail": "Нет прав на удаление этого задания."},
                status=status.HTTP_403_FORBIDDEN,
            )
        puzzle.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response({"detail": "Method not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def create_puzzle(request):
    """Создать новую puzzle-задачу"""
    visible_group_ids = request.data.get("visible_group_ids") or []
    ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
    if not ok:
        return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
    serializer = PuzzleSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        puzzle = serializer.save()
        return Response(PuzzleSerializer(puzzle, context={"request": request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_puzzle_solution(request, puzzle_id):
    """Проверить решение puzzle-задачи"""
    try:
        puzzle = get_doc_by_pk(Puzzle, puzzle_id)
        user_id = str(request.user.id) if request.user and getattr(request.user, "id", None) else None
        max_attempts = getattr(puzzle, "max_attempts", None)
        if max_attempts is not None and user_id:
            attempt_count = AssignmentAttempt.objects(
                user_id=user_id, target_type="puzzle", target_id=str(puzzle.id)
            ).count()
            if attempt_count >= max_attempts:
                return Response(
                    {"detail": "Превышено максимальное число попыток для этого задания."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        if user_id:
            AssignmentAttempt(user_id=user_id, target_type="puzzle", target_id=str(puzzle.id)).save()
        user_blocks = request.data.get('blocks', [])
        if not user_blocks:
            return Response({
                'passed': False,
                'message': 'Нет блоков для проверки'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Правильный порядок блоков (по полю order)
        expected_order = sorted(puzzle.blocks, key=lambda x: x.order)
        # Порядок пользователя — как он расставил блоки (НЕ сортировать!)
        user_order = user_blocks

        # Проверяем количество блоков
        if len(expected_order) != len(user_order):
            return Response({
                'passed': False,
                'message': 'Неверное количество блоков'
            })

        # Проверяем порядок: на каждой позиции должен быть нужный блок
        passed = True
        for i, (expected, user) in enumerate(zip(expected_order, user_order)):
            if expected.id != user.get('id'):
                passed = False
                break

        # Дополнительно проверяем собранный код (если задано решение)
        if puzzle.solution and passed:
            assembled_code = ""
            for block in user_order:
                code = block.get('code', '')
                indent = block.get('indent', '')
                assembled_code += indent + code + "\n"

            def _normalize_code(s):
                """Единая нормализация: табуляция = 4 пробела (Python), затем strip."""
                if not s:
                    return ""
                return s.expandtabs(4).strip()

            if _normalize_code(assembled_code) != _normalize_code(puzzle.solution):
                passed = False
        
        if request.user and getattr(request.user, "id", None):
            lesson_id = str(getattr(puzzle, "public_id", None) or puzzle.id)
            track_title = ""
            if puzzle.track_id:
                try:
                    from bson import ObjectId
                    from apps.tracks.documents import Track
                    t = Track.objects(id=ObjectId(puzzle.track_id)).first()
                    if t:
                        track_title = t.title
                except Exception:
                    pass
            save_lesson_progress(
                str(request.user.id), lesson_id, "puzzle", passed,
                lesson_title=puzzle.title, track_id=puzzle.track_id or "", track_title=track_title,
                available_until=getattr(puzzle, "available_until", None),
            )

        return Response({
            'passed': passed,
            'message': 'Правильно!' if passed else 'Попробуйте еще раз'
        })

    except Puzzle.DoesNotExist:
        return Response({'error': 'Puzzle not found'}, status=status.HTTP_404_NOT_FOUND)
