from scenedetect import detect, ContentDetector, SceneManager, open_video
import threading
import uuid
import os
import lancedb

class SceneService:
    def __init__(self, db_path="vector_db"):
        self.db_path = db_path
        self.jobs = {}
        self.db = lancedb.connect(self.db_path)
        self.table_name = "scenes"

    def _escape_path(self, path: str) -> str:
        """Escape backslashes and single quotes for LanceDB SQL-like filters."""
        return path.replace("\\", "\\\\").replace("'", "''")

    def start_scene_detection(self, file_path: str):
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {"status": "processing", "progress": 0, "result": None}
        
        thread = threading.Thread(target=self._run_detection, args=(job_id, file_path))
        thread.start()
        
        return job_id

    def _run_detection(self, job_id, file_path):
        try:
            video = open_video(file_path)
            scene_manager = SceneManager()
            scene_manager.add_detector(ContentDetector())
            
            # This can be slow for long videos
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
                    "video_path": file_path,
                    "start_time": start,
                    "end_time": end,
                    "scene_number": i + 1
                })
            
            # Store in LanceDB
            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                escaped_path = self._escape_path(file_path)
                table.delete(f"video_path = '{escaped_path}'")
                if data:
                    table.add(data)
            else:
                if data:
                    self.db.create_table(self.table_name, data=data)

            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            self.jobs[job_id]["result"] = results
        except Exception as e:
            print(f"Scene detection error: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)

    def get_job_status(self, job_id):
        return self.jobs.get(job_id, {"status": "not_found"})

    def get_scenes(self, file_path: str):
        try:
            if self.table_name not in self.db.table_names():
                return []
            
            table = self.db.open_table(self.table_name)
            escaped_path = self._escape_path(file_path)
            rows = table.search().where(f"video_path = '{escaped_path}'").to_list()
            
            # Sort by scene number
            rows.sort(key=lambda x: x["scene_number"])
            
            return [{"number": r["scene_number"], "start": r["start_time"], "end": r["end_time"]} for r in rows]
        except Exception as e:
            print(f"Get scenes error: {e}")
            return []

scene_service = SceneService()
