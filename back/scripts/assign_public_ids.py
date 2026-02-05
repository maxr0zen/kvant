#!/usr/bin/env python3
"""Script to assign public_id to Track documents that lack it, and ensure visible_group_ids exists."""
import os
import sys
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pymongo import MongoClient


def main():
    mongo_uri = os.environ.get('MONGODB_HOST', 'mongodb://127.0.0.1:27017')
    db_name = os.environ.get('MONGODB_NAME', 'kavnt')
    client = MongoClient(mongo_uri)
    db = client[db_name]
    coll = db['tracks']
    updated = 0
    for doc in coll.find({}):
        changes = {}
        if not doc.get('public_id'):
            changes['public_id'] = uuid.uuid4().hex[:12]
        if 'visible_group_ids' not in doc:
            changes['visible_group_ids'] = []
        if changes:
            coll.update_one({'_id': doc['_id']}, {'$set': changes})
            updated += 1
            print(f"Updated track {doc.get('title')} -> {changes}")
    client.close()
    print(f"Done. Updated: {updated}")

if __name__ == '__main__':
    main()
