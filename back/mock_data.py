#!/usr/bin/env python3
"""
Скрипт для создания тестовых данных в MongoDB
Запуск: python mock_data.py
"""

import os
import sys

# Добавляем корень проекта в путь
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Импортируем и запускаем универсальный мокап
from mock import main

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
