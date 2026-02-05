#!/usr/bin/env python3
"""Remove explicit null public_id fields from tracks to allow sparse unique index creation."""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pymongo import MongoClient
import apps.tracks.documents as documents


def main():
    mongo_uri = os.environ.get('MONGODB_HOST', 'mongodb://127.0.0.1:27017')
    db_name = os.environ.get('MONGODB_NAME', 'kavnt')
    client = MongoClient(mongo_uri)
    db = client[db_name]
    coll = db['tracks']
    # Use raw pymongo collection to unset null fields
    res = coll.update_many({'public_id': None}, {'$unset': {'public_id': ""}})
    print('Matched:', res.matched_count, 'Modified:', res.modified_count)
    client.close()

if __name__ == '__main__':
    main()
