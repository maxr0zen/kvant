#!/usr/bin/env python3
"""Drop conflicting public_id index and create sparse unique index."""
import os
from pymongo import MongoClient

mongo_uri = os.environ.get('MONGODB_HOST', 'mongodb://127.0.0.1:27017')
db_name = os.environ.get('MONGODB_NAME', 'kavnt')

client = MongoClient(mongo_uri)
db = client[db_name]
coll = db['tracks']

print('Existing indexes:')
for idx in coll.index_information().values():
    print(idx)

# If public_id_1 exists, drop it
if 'public_id_1' in coll.index_information():
    print('Dropping existing index public_id_1')
    coll.drop_index('public_id_1')

# Create sparse unique index
print('Creating sparse unique index on public_id')
coll.create_index([('public_id', 1)], unique=True, sparse=True)
print('Done')
client.close()
