"""
Утилиты для работы с MongoDB/MongoEngine.
Единый стандарт поиска документов по pk: ObjectId или public_id.
Даты availability: хранение и сериализация в UTC (ISO с суффиксом Z).
"""
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId


def datetime_to_iso_utc(val):
    """
    Преобразует datetime в ISO-строку UTC с суффиксом Z для API.
    naive datetime трактуется как UTC; aware конвертируется в UTC.
    Возвращает None для None или не-datetime.
    """
    if val is None:
        return None
    if not isinstance(val, datetime):
        return None
    try:
        if val.tzinfo is None:
            # naive — считаем UTC
            utc = val.replace(tzinfo=timezone.utc)
        else:
            utc = val.astimezone(timezone.utc)
        s = utc.isoformat()
        if s.endswith("+00:00"):
            s = s[:-6] + "Z"
        elif not s.endswith("Z"):
            s = s + "Z"
        return s
    except Exception:
        return None


def parse_utc_datetime(s):
    """
    Парсит строку ISO datetime в timezone-aware UTC datetime.
    Если в строке нет offset, трактуется как UTC.
    Возвращает None при ошибке или пустой строке.
    """
    if s is None or (isinstance(s, str) and not s.strip()):
        return None
    raw = s.strip() if isinstance(s, str) else str(s)
    if not raw:
        return None
    # Нормализация: Z -> +00:00; без offset — добавить +00:00 (UTC)
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    elif len(raw) == 10:  # только дата
        raw = raw + "T00:00:00+00:00"
    elif raw[-1].isdigit() or raw[-1] == ":" or (len(raw) >= 5 and raw[-1] == "0" and raw[-2] == ":"):
        # Нет суффикса таймзоны (заканчивается на цифры или :) — считаем UTC
        raw = raw + "+00:00"
    try:
        dt = datetime.fromisoformat(raw)
    except Exception:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def to_utc_datetime(val):
    """
    Приводит значение (строка ISO или datetime) к timezone-aware UTC datetime для сохранения в БД.
    Возвращает None для None или невалидного значения.
    """
    if val is None:
        return None
    if isinstance(val, str):
        return parse_utc_datetime(val)
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val.astimezone(timezone.utc)
    return None


def get_doc_by_pk(model_class, pk: str):
    """
    Найти документ по pk (ObjectId или public_id).
    Сначала пробует ObjectId, затем public_id.
    """
    if not pk:
        raise model_class.DoesNotExist
    try:
        if ObjectId.is_valid(pk):
            return model_class.objects.get(id=ObjectId(pk))
    except (InvalidId, model_class.DoesNotExist):
        pass
    doc = model_class.objects(public_id=pk).first()
    if doc:
        return doc
    raise model_class.DoesNotExist
