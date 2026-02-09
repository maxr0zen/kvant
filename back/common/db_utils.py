"""
Утилиты для работы с MongoDB/MongoEngine.
Единый стандарт поиска документов по pk: ObjectId или public_id.
"""
from bson import ObjectId
from bson.errors import InvalidId


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
