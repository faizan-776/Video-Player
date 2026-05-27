import lancedb
import os

db_path = "frontend/vector_db"
table_name = "video_frames_v5"

if os.path.exists(db_path):
    db = lancedb.connect(db_path)
    if table_name in db.table_names():
        table = db.open_table(table_name)
        print(f"Total records in {table_name}: {len(table)}")
        
        # Sample some records
        df = table.to_pandas()
        print("\nSample records (first 5):")
        print(df[['video_path', 'timestamp', 'transcript']].head())
        
        unique_videos = df['video_path'].unique()
        print(f"\nUnique videos indexed: {unique_videos}")
    else:
        print(f"Table {table_name} not found in {db_path}!")
        print(f"Available tables: {db.table_names()}")
else:
    print(f"Path {db_path} does not exist!")
