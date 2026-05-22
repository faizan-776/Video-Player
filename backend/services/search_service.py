import cv2
import ffmpeg
import os
import threading
import uuid
import lancedb
from PIL import Image
import numpy as np

class SearchService:
    def __init__(self, db_path="vector_db"):
        self.db_path = db_path
        self.jobs = {}
        self.model = None
        self.db = lancedb.connect(self.db_path)
        self.table_name = "video_frames"

    def _get_model(self):
        if self.model is None:
            # Move import inside to avoid loading heavy torch stuff until needed
            from sentence_transformers import SentenceTransformer
            # Explicitly use CPU for stability on systems with integrated graphics
            print("[INFO] Loading CLIP model on CPU...")
            self.model = SentenceTransformer('clip-ViT-B-32', device='cpu')
        return self.model

    def _escape_path(self, path: str) -> str:
        """Escape backslashes and single quotes for LanceDB SQL-like filters."""
        return path.replace("\\", "\\\\").replace("'", "''")

    def start_indexing(self, file_path: str):
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {"status": "processing", "progress": 0, "result": None}
        
        thread = threading.Thread(target=self._run_indexing, args=(job_id, file_path))
        thread.start()
        
        return job_id

    def _run_indexing(self, job_id, file_path):
        try:
            model = self._get_model()
            video_id = os.path.basename(file_path)
            
            # Extract frames every 2 seconds
            cap = cv2.VideoCapture(file_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0: fps = 24.0 # Fallback
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            interval = 2 # seconds
            frame_step = int(fps * interval)
            if frame_step <= 0: frame_step = 1
            
            data = []
            
            for i in range(0, total_frames, frame_step):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_frame)
                
                # Generate embedding
                embedding = model.encode(pil_img)
                
                timestamp = i / fps
                data.append({
                    "vector": embedding.tolist(),
                    "video_path": file_path,
                    "timestamp": timestamp,
                    "video_id": video_id,
                    "id": f"{video_id}_{i}"
                })
                
                self.jobs[job_id]["progress"] = int((i / total_frames) * 100)

            # Store in LanceDB
            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                # Delete existing entries for this video to avoid duplicates
                escaped_path = self._escape_path(file_path)
                table.delete(f"video_path = '{escaped_path}'")
                table.add(data)
            else:
                self.db.create_table(self.table_name, data=data)
            
            cap.release()
            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
        except Exception as e:
            print(f"Indexing error: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)

    def search(self, query: str, video_path: str = None):
        try:
            if self.table_name not in self.db.table_names():
                return []
                
            model = self._get_model()
            table = self.db.open_table(self.table_name)
            
            # Generate query embedding
            query_embedding = model.encode(query).tolist()
            
            query_builder = table.search(query_embedding).limit(10)
            
            if video_path:
                escaped_path = self._escape_path(video_path)
                query_builder = query_builder.where(f"video_path = '{escaped_path}'")
                
            results = query_builder.to_list()
            
            formatted_results = []
            for res in results:
                distance = res.get("_distance", 0)
                formatted_results.append({
                    "timestamp": res["timestamp"],
                    "score": 1 / (1 + distance)
                })
                
            # Sort by timestamp
            formatted_results.sort(key=lambda x: x["timestamp"])
            return formatted_results
        except Exception as e:
            print(f"Search error: {e}")
            return []

    def get_job_status(self, job_id):
        return self.jobs.get(job_id, {"status": "not_found"})

search_service = SearchService()
