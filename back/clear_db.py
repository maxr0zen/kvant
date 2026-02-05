#!/usr/bin/env python3
"""
Скрипт для полной очистки всех данных из MongoDB
Запуск: python clear_db.py
⚠️ ВНИМАНИЕ: Это удалит ВСЕ данные из базы!
"""

import os
import sys

# Добавляем корень проекта в путь
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongoengine import connect, disconnect
from apps.users.documents import User
from apps.groups.documents import Group
from apps.tracks.documents import Track
from apps.lectures.documents import Lecture
from apps.tasks.documents import Task
from apps.puzzles.documents import Puzzle
from apps.submissions.documents import Submission

def clear_all_collections():
    """Очистка всех коллекций базы данных"""
    print("🗑️ Начинаем очистку базы данных...")
    print("⚠️ ВНИМАНИЕ: ВСЕ ДАННЫЕ БУДУТ УДАЛЕНЫ!\n")
    
    try:
        # Подключение к MongoDB
        print("📦 Подключение к MongoDB...")
        connect(db="kavnt", host="mongodb://127.0.0.1:27017")
        print("  ✅ Подключено успешно\n")
        
        # Список всех моделей для очистки
        collections = [
            ("Пользователи", User),
            ("Группы", Group),
            ("Треки", Track),
            ("Лекции", Lecture),
            ("Задачи", Task),
            ("Puzzle-задания", Puzzle),
            ("Отправки решений", Submission),
        ]
        
        deleted_counts = {}
        
        for collection_name, model in collections:
            try:
                count_before = model.objects.count()
                if count_before > 0:
                    model.objects.delete()
                    print(f"  ✅ {collection_name}: удалено {count_before} записей")
                    deleted_counts[collection_name] = count_before
                else:
                    print(f"  ℹ️ {collection_name}: уже пусто")
                    deleted_counts[collection_name] = 0
            except Exception as e:
                print(f"  ❌ Ошибка при очистке {collection_name}: {e}")
                deleted_counts[collection_name] = 0
        
        # Итоговая статистика
        total_deleted = sum(deleted_counts.values())
        print(f"\n🎉 Очистка завершена!")
        print(f"   📊 Всего удалено записей: {total_deleted}")
        
        if total_deleted > 0:
            print("\n📋 Детальная статистика:")
            for collection_name, count in deleted_counts.items():
                if count > 0:
                    print(f"   - {collection_name}: {count}")
        
        print("\n✅ База данных полностью очищена!")
        print("💡 Теперь можно запустить python mock_data_new.py для создания новых данных")
        
    except Exception as e:
        print(f"\n❌ Ошибка при очистке базы данных: {e}")
        return 1
    finally:
        # Отключение от MongoDB
        disconnect()
        print("\n📦 Отключено от MongoDB")
    
    return 0

def confirm_clear():
    """Запрос подтверждения перед очисткой"""
    print("🚨 ПОДТВЕРЖДЕНИЕ ОЧИСТКИ БАЗЫ ДАННЫХ 🚨")
    print("Это действие удалит ВСЕ данные из MongoDB:")
    print("  • Всех пользователей")
    print("  • Все группы") 
    print("  • Все треки и уроки")
    print("  • Все лекции")
    print("  • Все задачи и puzzle")
    print("  • Все отправки решений")
    print()
    
    # Запрос подтверждения
    confirmation = input("Введите 'DELETE ALL' для подтверждения очистки: ").strip()
    
    if confirmation == "DELETE ALL":
        return True
    else:
        print("❌ Очистка отменена. Неправильное подтверждение.")
        return False

def main():
    """Главная функция"""
    print("🗑️ Скрипт очистки базы данных Kavnt")
    print("=" * 50)
    
    # Запрос подтверждения
    if not confirm_clear():
        return 0
    
    print()
    return clear_all_collections()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
