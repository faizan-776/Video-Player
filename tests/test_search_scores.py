import lancedb
import os
from sentence_transformers import SentenceTransformer
import numpy as np

db_path = "frontend/vector_db"
table_name = "video_frames_v5"
query = "blue"
video_path = "d:/users/d_drive/videos/demon slayer infinity castle trailer.mp4"

model = SentenceTransformer('clip-ViT-B-16')
db = lancedb.connect(db_path)
table = db.open_table(table_name)

query_embedding = model.encode([query])[0].tolist()

query_builder = table.search(query_embedding).limit(10)
query_builder = query_builder.where(f"video_path = '{video_path}'")

results = query_builder.to_list()

print(f"Results for '{query}':")
for res in results:
    dist = res.get("_distance", 1.0)
    score = 1 / (1 + dist)
    combined = score * 0.7
    print(f"TS: {res['timestamp']:.2f} | Dist: {dist:.4f} | Score: {score:.4f} | Combined: {combined:.4f} | {'PASS' if combined > 0.35 else 'FAIL'}")
