import cv2
import os
import threading
import uuid
import lancedb
from PIL import Image
import numpy as np
import gc
from typing import Optional, Any

class SearchService:
    def __init__(self, db_path="vector_db"):
        self.db_path = db_path
        self.jobs = {}
        self.model: Any = None
        self.db = lancedb.connect(self.db_path)
        self.table_name = "video_frames"

    def _get_model(self) -> Any:
        if self.model is None:
            from sentence_transformers import SentenceTransformer
            print("[INFO] Loading CLIP model...")
            self.model = SentenceTransformer('clip-ViT-B-32', device='cpu')
        return self.model

    def _normalize_path(self, path: str) -> str:
        return path.replace("\\", "/").lower()

    def _escape_path(self, path: str) -> str:
        return path.replace("'", "''")

    def start_indexing(self, file_path: str):
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {"status": "processing", "progress": 0, "result": None}
        thread = threading.Thread(target=self._run_indexing, args=(job_id, file_path))
        thread.start()
        return job_id

    def _run_indexing(self, job_id, file_path):
        try:
            model = self._get_model()
            norm_path = self._normalize_path(file_path)
            
            # CLEAN START: Purge old data
            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                escaped_path = self._escape_path(norm_path)
                table.delete(f"video_path = '{escaped_path}'")

            cap = cv2.VideoCapture(file_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0: fps = 24.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Balanced 1.0s interval
            interval = 1.0
            frame_step = int(fps * interval)
            if frame_step <= 0: frame_step = 1
            
            data = []
            for i in range(0, total_frames, frame_step):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                if not ret: break
                
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_frame)
                # Use list to satisfy type overloads and get the first result
                embeddings = model.encode([pil_img])
                embedding = embeddings[0]
                
                data.append({
                    "vector": embedding.tolist(),
                    "video_path": norm_path,
                    "timestamp": i / fps,
                    "video_id": os.path.basename(file_path),
                    "id": f"{os.path.basename(file_path)}_{i}"
                })
                self.jobs[job_id]["progress"] = int((i / total_frames) * 100)
                if i % (frame_step * 10) == 0:
                    print(f"[INDEX-WORK] {i}/{total_frames} frames...")

            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                if data: table.add(data)
            else:
                if data: self.db.create_table(self.table_name, data=data)
            
            cap.release()
            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            print("[SUCCESS] Indexing complete.")
            gc.collect()

        except Exception as e:
            print(f"Indexing error: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            gc.collect()

    def search(self, query: str, video_path: Optional[str] = None):
        try:
            if self.table_name not in self.db.table_names():
                return []
            model = self._get_model()
            table = self.db.open_table(self.table_name)
            # Use list to satisfy type overloads and get the first result
            query_embeddings = model.encode([query])
            query_embedding = query_embeddings[0].tolist()
            query_builder = table.search(query_embedding).limit(20)
            if video_path:
                norm_path = self._normalize_path(video_path)
                escaped_path = self._escape_path(norm_path)
                query_builder = query_builder.where(f"video_path = '{escaped_path}'")
            
            results = query_builder.to_list()
            formatted_results = []
            for res in results:
                distance = res.get("_distance", 1.0)
                formatted_results.append({
                    "timestamp": res["timestamp"],
                    "score": 1 / (1 + distance)
                })
            formatted_results.sort(key=lambda x: x["score"], reverse=True)
            return formatted_results
        except Exception as e:
            print(f"Search error: {e}")
            return []

    def get_job_status(self, job_id):
        return self.jobs.get(job_id, {"status": "not_found"})

search_service = SearchService()
