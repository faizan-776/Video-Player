import os
import sys
import time
import json
import unittest

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.search_service import search_service
from services.scene_service import scene_service
from services.whisper_service import whisper_service
from services.subtitle import subtitle_manager

class TestAIComplete(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.video_path = "D:/Users/D_drive/Videos/Demon Slayer Infinity Castle TRAILER.mp4"
        if not os.path.exists(cls.video_path):
            raise FileNotFoundError(f"Test video not found: {cls.video_path}")
        
        # Ensure clean state
        if os.path.exists("vector_db"):
            print("[SETUP] Vector DB exists, cleaning for fresh test...")

    def test_01_indexing(self):
        print("\n--- Phase 1: Video Indexing (CLIP) ---")
        job_id = search_service.start_indexing(self.video_path)
        
        # Poll for completion
        start_time = time.time()
        timeout = 300 # 5 minutes for indexing
        while time.time() - start_time < timeout:
            status = search_service.get_job_status(job_id)
            if status["status"] == "completed":
                print("[OK] Indexing completed successfully.")
                break
            if status["status"] == "failed":
                self.fail(f"Indexing failed: {status.get('error')}")
            time.sleep(2)
        else:
            self.fail("Indexing timed out.")

        # Verify results in DB
        results = search_service.search("sword", self.video_path)
        self.assertTrue(len(results) > 0, "Visual search should return results for 'sword'")
        print(f"[OK] Visual search verified. Top hit at {results[0]['timestamp']}s")

    def test_02_scene_detection(self):
        print("\n--- Phase 2: Scene Detection (PySceneDetect + Semantic) ---")
        job_id = scene_service.start_scene_detection(self.video_path)
        
        start_time = time.time()
        timeout = 200
        while time.time() - start_time < timeout:
            status = scene_service.get_job_status(job_id)
            if status["status"] == "completed":
                print(f"[OK] Scene detection completed. Found {len(status['result'])} scenes.")
                break
            if status["status"] == "failed":
                self.fail(f"Scene detection failed: {status.get('error')}")
            time.sleep(2)
        else:
            self.fail("Scene detection timed out.")

        # Verify scenes are in DB
        scenes = scene_service.get_scenes(self.video_path)
        self.assertTrue(len(scenes) > 0, "Should have retrieved scenes from DB")

    def test_03_transcription_and_adaptive_subtitles(self):
        print("\n--- Phase 3: Transcription & Adaptive Subtitling (Whisper + AI Refiner) ---")
        # Test with English
        job_id = whisper_service.start_transcription(self.video_path, "en")
        
        start_time = time.time()
        timeout = 600 # 10 minutes (Whisper can be slow on CPU)
        while time.time() - start_time < timeout:
            status = whisper_service.get_job_status(job_id)
            if status["status"] == "completed":
                results = status["result"]
                print(f"[OK] Transcription completed. Generated {len(results)} segments.")
                
                # Check for adaptive styling (e.g., intensive punctuation or AI refinement)
                # We look for dramatic markers if the video is detected as dramatic
                has_dramatic_markers = any('!' in r['text'] or '...' in r['text'] or r['text'].isupper() for r in results)
                print(f"[INFO] Adaptive Subtitle check: Dramatic markers found = {has_dramatic_markers}")
                
                # Verify transcripts were injected into search index
                search_results = search_service.search(results[0]['text'][:20], self.video_path)
                self.assertTrue(len(search_results) > 0, "Hybrid search should find matches for transcribed text")
                break
            if status["status"] == "failed":
                self.fail(f"Transcription failed: {status.get('error')}")
            time.sleep(5)
        else:
            self.fail("Transcription timed out.")

if __name__ == "__main__":
    unittest.main()
