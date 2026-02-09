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


@api_view(['GET'])
@permission_classes([AllowAny])
def puzzle_list(request):
    """Список всех puzzle-задач"""
    puzzles = Puzzle.objects.all()
    serializer = PuzzleSerializer(puzzles, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def puzzle_detail(request, puzzle_id):
    """Получить puzzle-задачу по ID (ObjectId или public_id)"""
    try:
        puzzle = get_doc_by_pk(Puzzle, puzzle_id)
        serializer = PuzzleSerializer(puzzle)
        return Response(serializer.data)
    except Puzzle.DoesNotExist:
        return Response({'error': 'Puzzle not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def create_puzzle(request):
    """Создать новую puzzle-задачу"""
    visible_group_ids = request.data.get("visible_group_ids") or []
    ok, err = validate_visible_group_ids_for_teacher(request.user, visible_group_ids)
    if not ok:
        return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
    serializer = PuzzleSerializer(data=request.data)
    if serializer.is_valid():
        puzzle = serializer.save()
        return Response(PuzzleSerializer(puzzle).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_puzzle_solution(request, puzzle_id):
    """Проверить решение puzzle-задачи"""
    try:
        puzzle = get_doc_by_pk(Puzzle, puzzle_id)
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
            
            # Простая проверка - сравниваем с решением (нормализуем пробелы)
            if assembled_code.strip() != puzzle.solution.strip():
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
            )

        return Response({
            'passed': passed,
            'message': 'Правильно!' if passed else 'Попробуйте еще раз'
        })

    except Puzzle.DoesNotExist:
        return Response({'error': 'Puzzle not found'}, status=status.HTTP_404_NOT_FOUND)
