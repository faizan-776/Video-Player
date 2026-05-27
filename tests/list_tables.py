import lancedb
db = lancedb.connect("vector_db")
print(f"Available tables: {db.table_names()}")
