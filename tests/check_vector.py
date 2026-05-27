import lancedb
import numpy as np

db_path = "frontend/vector_db"
table_name = "video_frames_v5"

db = lancedb.connect(db_path)
table = db.open_table(table_name)

res = table.to_pandas().iloc[0]
vec = np.array(res['vector'])
print(f"Vector shape: {vec.shape}")
print(f"Vector norm: {np.linalg.norm(vec)}")
print(f"Vector sample (first 5): {vec[:5]}")
