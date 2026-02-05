from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .documents import Puzzle
from .serializers import PuzzleSerializer


@api_view(['GET'])
def puzzle_list(request):
    """Список всех puzzle-задач"""
    puzzles = Puzzle.objects.all()
    serializer = PuzzleSerializer(puzzles, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def puzzle_detail(request, puzzle_id):
    """Получить puzzle-задачу по ID"""
    try:
        puzzle = Puzzle.objects.get(id=puzzle_id)
        serializer = PuzzleSerializer(puzzle)
        return Response(serializer.data)
    except Puzzle.DoesNotExist:
        return Response({'error': 'Puzzle not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_puzzle(request):
    """Создать новую puzzle-задачу"""
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
        puzzle = Puzzle.objects.get(id=puzzle_id)
        user_blocks = request.data.get('blocks', [])
        
        if not user_blocks:
            return Response({
                'passed': False,
                'message': 'Нет блоков для проверки'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Проверяем правильность порядка блоков
        expected_order = sorted(puzzle.blocks, key=lambda x: x.order)
        user_order = sorted(user_blocks, key=lambda x: x.get('order', ''))
        
        # Проверяем количество блоков
        if len(expected_order) != len(user_order):
            return Response({
                'passed': False,
                'message': 'Неверное количество блоков'
            })
        
        # Проверяем порядок
        passed = True
        for i, (expected, user) in enumerate(zip(expected_order, user_order)):
            if expected.id != user.get('id'):
                passed = False
                break
        
        # Если есть решение, можно дополнительно проверить собранный код
        if puzzle.solution and passed:
            # Собираем код из блоков пользователя
            assembled_code = ""
            for block in user_order:
                code = block.get('code', '')
                indent = block.get('indent', '')
                assembled_code += indent + code + "\n"
            
            # Простая проверка - сравниваем с решением (нормализуем пробелы)
            if assembled_code.strip() != puzzle.solution.strip():
                passed = False
        
        return Response({
            'passed': passed,
            'message': 'Правильно!' if passed else 'Попробуйте еще раз'
        })
        
    except Puzzle.DoesNotExist:
        return Response({'error': 'Puzzle not found'}, status=status.HTTP_404_NOT_FOUND)
