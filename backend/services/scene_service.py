from scenedetect import detect, ContentDetector, SceneManager, open_video
import threading
import uuid
import os
import lancedb
import gc

class SceneService:
    def __init__(self, db_path="vector_db"):
        self.db_path = db_path
        self.jobs = {}
        self.db = lancedb.connect(self.db_path)
        self.table_name = "scenes"

    def _normalize_path(self, path: str) -> str:
        return path.replace("\\", "/").lower()

    def _escape_path(self, path: str) -> str:
        return path.replace("'", "''")

    def start_scene_detection(self, file_path: str):
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {"status": "processing", "progress": 0, "result": None}
        thread = threading.Thread(target=self._run_detection, args=(job_id, file_path))
        thread.start()
        return job_id

    def _run_detection(self, job_id, file_path):
        try:
            norm_path = self._normalize_path(file_path)
            
            # CLEAN START: Purge old data
            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                escaped_path = self._escape_path(norm_path)
                table.delete(f"video_path = '{escaped_path}'")

            video = open_video(file_path)
            scene_manager = SceneManager()
            scene_manager.add_detector(ContentDetector())
            
            scene_manager.detect_scenes(video)
            scene_list = scene_manager.get_scene_list()
            
            results = []
            data = []
            
            for i, scene in enumerate(scene_list):
                start = scene[0].get_seconds()
                end = scene[1].get_seconds()
                results.append({
                    "number": i + 1,
                    "start": start,
                    "end": end
                })
                data.append({
                    "video_path": norm_path,
                    "start_time": start,
                    "end_time": end,
                    "scene_number": i + 1
                })
            
            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                if data: table.add(data)
            else:
                if data: self.db.create_table(self.table_name, data=data)

            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            self.jobs[job_id]["result"] = results
            gc.collect()
            
        except Exception as e:
            print(f"[FATAL] Scene detection error: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            gc.collect()

    def get_job_status(self, job_id):
        return self.jobs.get(job_id, {"status": "not_found"})

    def get_scenes(self, file_path: str):
        try:
            if self.table_name not in self.db.table_names():
                return []
            
            table = self.db.open_table(self.table_name)
            norm_path = self._normalize_path(file_path)
            escaped_path = self._escape_path(norm_path)
            rows = table.search().where(f"video_path = '{escaped_path}'").to_list()
            
            rows.sort(key=lambda x: x["scene_number"])
            return [{"number": r["scene_number"], "start": r["start_time"], "end": r["end_time"]} for r in rows]
        except Exception as e:
            print(f"[ERROR] Get scenes failed: {e}")
            return []

scene_service = SceneService()
