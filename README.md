# kavnt_project

Фронтенд приложения находится в папке **front/**.

## Запуск

```bash
cd front
npm install
npm run dev
```

Сборка:

```bash
cd front
npm run build
npm start
```

## Тесты

Перед первым запуском тестов бэкенда установите зависимости (из корня, с активированным venv проекта):

```bash
pip install -r back/requirements.txt
```

Если в выводе pip путь к пакетам ведёт в папку **другого** проекта (например `kavnt_project\.venv`), в этом терминале активен чужой venv — проверьте `where python`, путь должен быть внутри текущего проекта. Если видите «No module named pytest», хотя venv вроде свой, — в том же терминале выполните `pip install -r back/requirements.txt` (должно ставить в активный venv).

**В проекте два venv?** Оставьте один (удобнее всего `.venv` в корне репозитория), второй папку удалите. Дальше везде активируйте только этот один venv и ставьте в него зависимости (`pip install -r back/requirements.txt`).

**Все тесты (бэкенд + фронтенд):**

```bash
python tests/run_all.py
```

**Только бэкенд (pytest):**

```bash
pytest
```

(из корня проекта; используется `pytest.ini` и `config.settings.test`)

**Только фронтенд (Vitest):**

```bash
cd front
npm run test
```

В режиме наблюдения: `npm run test:watch`.

## Структура

- **front/** — Next.js приложение (App Router, TypeScript, Tailwind, shadcn/ui)
- Остальные части проекта (бэкенд и т.д.) — в корне репозитория по мере добавления
