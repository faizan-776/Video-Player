import os
import sys
import time
import json
import unittest
import shutil

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.search_service import search_service
from services.scene_service import scene_service
from services.whisper_service import whisper_service
from services.subtitle import subtitle_manager
from services.subtitle.engine import subtitle_engine
from services.utils import diagnostic_logger

class TestAIDemo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.video_path = os.path.abspath("tests/demo.mp4")
        cls.expected_json = "tests/expected_output.json"
        cls.actual_json = "tests/actual_output.json"
        
        if not os.path.exists(cls.video_path):
            raise FileNotFoundError(f"Demo video not found: {cls.video_path}")
        
        # AGGRESSIVE FORCE REFRESH: Delete databases and cache
        print(f"[SETUP] Force Refresh: Wiping all previous AI state...")
        db_path = "vector_db"
        if os.path.exists(db_path):
            try:
                # Use shell command for recursive delete to handle Windows file locks better
                os.system(f'rmdir /s /q "{db_path}"')
                print(f"[CLEANUP] Deleted {db_path} directory.")
            except Exception as e:
                print(f"[WARN] Failed to delete {db_path}: {e}")

        # Clear __pycache__ folders to prevent module caching issues
        for root, dirs, files in os.walk('.'):
            for d in dirs:
                if d == "__pycache__":
                    try:
                        shutil.rmtree(os.path.join(root, d))
                    except: pass
        
    def test_run_full_ai_suite(self):
        results = {
            "input": {
                "file_path": self.video_path,
                "file_size": os.path.getsize(self.video_path)
            },
            "output": {}
        }

        # 1. Indexing
        print("\n[1/4] Running Indexing...")
        job_id = search_service.start_indexing(self.video_path)
        self._wait_for_job(search_service, job_id, timeout=300)
        
        # Verify Visual Search
        search_res = search_service.search("sword action fight", self.video_path)
        results["output"]["visual_search"] = [
            {"timestamp": r["timestamp"], "score": r["score"]} for r in search_res[:5]
        ]

        # 2. Scene Detection
        print("[2/4] Running Scene Detection...")
        job_id = scene_service.start_scene_detection(self.video_path)
        self._wait_for_job(scene_service, job_id, timeout=200)
        scenes = scene_service.get_scenes(self.video_path)
        results["output"]["scenes"] = scenes

        # 3. Context Detection
        print("[3/4] Running Context Detection...")
        global_context = subtitle_engine.get_global_context(self.video_path)
        results["output"]["global_context"] = global_context

        # 4. Transcription & Adaptive Subtitles
        print("[4/4] Running Transcription...")
        job_id = whisper_service.start_transcription(self.video_path, "en")
        self._wait_for_job(whisper_service, job_id, timeout=900)
        transcription_status = whisper_service.get_job_status(job_id)
        transcript = transcription_status.get("result", [])
        
        # Sample some dramatic markers
        dramatic_segments = [t for t in transcript if '!' in t['text'] or '...' in t['text'] or t['text'].isupper()]
        results["output"]["transcription_sample"] = transcript[:10] # First 10 segments
        results["output"]["dramatic_markers_count"] = len(dramatic_segments)

        # Save actual results
        with open(self.actual_json, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\n[OK] Actual output saved to {self.actual_json}")

        # Comparison logic
        if not os.path.exists(self.expected_json):
            print(f"[WARN] {self.expected_json} not found. Creating it from this run.")
            with open(self.expected_json, "w") as f:
                json.dump(results, f, indent=2)
        else:
            with open(self.expected_json, "r") as f:
                expected = json.load(f)
            
            # Compare basic metrics
            print("\n--- Comparison Results ---")
            
            # 1. Context
            exp_ctx = expected["output"]["global_context"]
            act_ctx = results["output"]["global_context"]
            print(f"Global Context: Expected '{exp_ctx}', Got '{act_ctx}'")
            self.assertEqual(exp_ctx, act_ctx)

            # 2. Scene Count (Allow small drift if detection is non-deterministic, but usually it is)
            exp_scenes = len(expected["output"]["scenes"])
            act_scenes = len(results["output"]["scenes"])
            print(f"Scene Count: Expected {exp_scenes}, Got {act_scenes}")
            # Allow +/- 1 scene diff due to semantic drift variations
            self.assertAlmostEqual(exp_scenes, act_scenes, delta=1)

            # 3. Transcription Length
            exp_trans = len(expected["output"]["transcription_sample"])
            act_trans = len(results["output"]["transcription_sample"])
            print(f"Transcript Sample Length: Expected {exp_trans}, Got {act_trans}")
            self.assertEqual(exp_trans, act_trans)

            print("[SUCCESS] All comparisons passed within tolerances.")
        
        # Save Diagnostic Trace for user analysis
        diagnostic_logger.save("tests/diagnostic_trace.json")

    def _wait_for_job(self, service, job_id, timeout):
        start_time = time.time()
        while time.time() - start_time < timeout:
            status = service.get_job_status(job_id)
            if status["status"] == "completed":
                return status
            if status["status"] == "failed":
                self.fail(f"Job failed: {status.get('error')}")
            time.sleep(2)
        self.fail(f"Job timed out after {timeout}s")

if __name__ == "__main__":
    unittest.main()
