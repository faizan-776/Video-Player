from scenedetect import detect, ContentDetector, SceneManager, open_video
import threading
import uuid
import os
import lancedb
import gc
import numpy as np
from typing import List, Dict

class SceneService:
    def __init__(self, db_path="vector_db"):
        self.db_path = db_path
        self.jobs = {}
        self.db = lancedb.connect(self.db_path)
        self.table_name = "scenes"
        self.search_table = "video_frames_v5"

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
            self.jobs[job_id]["progress"] = 5
            self.jobs[job_id]["progress_label"] = "Starting..."
            
            # CLEAN START: Purge old data
            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                escaped_path = self._escape_path(norm_path)
                table.delete(f"video_path = '{escaped_path}'")

            # Phase 1: Standard Pixel Detection (Fast)
            video = open_video(file_path)
            scene_manager = SceneManager()
            scene_manager.add_detector(ContentDetector())
            
            self.jobs[job_id]["progress"] = 15
            self.jobs[job_id]["progress_label"] = "Processing..."
            
            scene_manager.detect_scenes(video)
            scene_list = scene_manager.get_scene_list()
            
            # Phase 2: Semantic Drift (Task 2.1)
            # Use visual vectors to find "Story Beats"
            semantic_scenes = self._detect_semantic_drift(norm_path)
            
            results = []
            data = []
            
            self.jobs[job_id]["progress"] = 90
            self.jobs[job_id]["progress_label"] = "Almost there..."

            # Merge standard and semantic results
            final_scenes = self._merge_scene_logic(scene_list, semantic_scenes)

            for i, scene in enumerate(final_scenes):
                results.append({
                    "number": i + 1,
                    "start": scene["start"],
                    "end": scene["end"]
                })
                data.append({
                    "video_path": norm_path,
                    "start_time": scene["start"],
                    "end_time": scene["end"],
                    "scene_number": i + 1
                })
            
            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                if data: table.add(data)
            else:
                if data: self.db.create_table(self.table_name, data=data)

            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            self.jobs[job_id]["progress_label"] = "Finished"
            self.jobs[job_id]["result"] = results
            gc.collect()
            
        except Exception as e:
            print(f"[FATAL] Scene detection error: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            gc.collect()

    def _detect_semantic_drift(self, norm_path: str) -> List[Dict]:
        """Task 2.1: Use visual vectors to detect content-aware scene changes."""
        try:
            if self.search_table not in self.db.table_names():
                return []
            
            table = self.db.open_table(self.search_table)
            escaped_path = self._escape_path(norm_path)
            rows = table.search().where(f"video_path = '{escaped_path}'").to_list()
            rows.sort(key=lambda x: x["timestamp"])
            
            if len(rows) < 2: return []
            
            semantic_cuts = []
            for i in range(1, len(rows)):
                v1 = np.array(rows[i-1]["vector"])
                v2 = np.array(rows[i]["vector"])
                
                # Cosine Similarity
                sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                
                # If "vibe" changes by > 30%, mark a potential story beat
                if sim < 0.7:
                    semantic_cuts.append(rows[i]["timestamp"])
            
            return [{"start": t} for t in semantic_cuts]
        except Exception as e:
            print(f"[DEBUG] Semantic drift failed: {e}")
            return []

    def _merge_scene_logic(self, pixel_scenes, semantic_scenes):
        """Intelligently merge pixel cuts and semantic story beats."""
        merged = []
        # Convert pixel scenes to basic format
        for s in pixel_scenes:
            merged.append({"start": s[0].get_seconds(), "end": s[1].get_seconds()})
        
        # Add semantic beats if they are not too close to existing cuts
        for ss in semantic_scenes:
            is_duplicate = any(abs(ss["start"] - m["start"]) < 5.0 for m in merged)
            if not is_duplicate:
                # Find where to insert and split existing scene
                merged.append({"start": ss["start"], "end": -1}) 
        
        merged.sort(key=lambda x: x["start"])
        
        # Repair 'end' times
        for i in range(len(merged) - 1):
            if merged[i]["end"] == -1:
                merged[i]["end"] = merged[i+1]["start"]
        
        # Ensure final scene has an end (simplified)
        if merged and merged[-1]["end"] == -1:
            merged[-1]["end"] = merged[-1]["start"] + 10.0
            
        return [m for m in merged if m["end"] != -1]

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
