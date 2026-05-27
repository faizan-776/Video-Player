import lancedb
import os

db = lancedb.connect("vector_db")
table_name = "video_frames_v5"

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
    print(f"Table {table_name} not found!")
