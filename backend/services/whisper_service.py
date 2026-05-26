import os
import threading
import uuid
import time
import gc
import argostranslate.package
import argostranslate.translate
from faster_whisper import WhisperModel

class WhisperService:
    def __init__(self):
        # PERMANENT OPTIMIZED CONFIG: The sweet spot for i5/8GB hardware
        self.model_size = "medium"
        self.model = None
        self.jobs = {}
        self._loaded_size = ""

    def _get_model(self):
        if self.model is None or self._loaded_size != self.model_size:
            print(f"[INFO] Loading Whisper model ({self.model_size})...")
            # Explicitly set cpu_threads to 4 to utilize all cores on i5-6th Gen
            self.model = WhisperModel(
                self.model_size, 
                device="cpu", 
                compute_type="int8", 
                cpu_threads=4,
                num_workers=1 # Keep at 1 to avoid thread contention on 4-thread CPU
            )
            self._loaded_size = self.model_size
        return self.model

    def _init_translation(self, from_code: str, to_code: str):
        try:
            argostranslate.package.update_package_index()
            available_packages = argostranslate.package.get_available_packages()
            package_to_install = next(filter(lambda x: x.from_code == from_code and x.to_code == to_code, available_packages), None)
            if package_to_install:
                installed_packages = argostranslate.package.get_installed_packages()
                if not any(x.from_code == from_code and x.to_code == to_code for x in installed_packages):
                    print(f"[INFO] Downloading translation pack: {from_code} -> {to_code}")
                    argostranslate.package.install_from_path(package_to_install.download())
            return True
        except Exception as e:
            print(f"[ERROR] Translation init failed: {e}")
            return False

    def start_transcription(self, file_path: str, target_language: str = "en"):
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {"status": "processing", "progress": 0, "result": None, "target_language": target_language}
        thread = threading.Thread(target=self._run_transcription, args=(job_id, file_path, target_language))
        thread.start()
        return job_id

    def _run_transcription(self, job_id, file_path, target_language):
        try:
            # Phase 1: Model Loading (0-15%)
            self.jobs[job_id]["status"] = "initializing_ai"
            self.jobs[job_id]["progress"] = 5
            
            model = self._get_model()
            self.jobs[job_id]["progress"] = 15
            
            task = "translate" if target_language == "en" else "transcribe"
            print(f"[PROCESS] Starting task: {task} (Model: {self.model_size})")
            
            self.jobs[job_id]["status"] = "processing"
            
            # Transcription with anime context prompt
            # Set patience higher for accuracy
            segments, info = model.transcribe(
                file_path, 
                beam_size=5, 
                task=task,
                initial_prompt="Japanese anime dialogue, action scenes.",
                vad_filter=True,
                no_speech_threshold=0.6
            )

            results = []
            for segment in segments:
                results.append({
                    "start": round(segment.start, 3),
                    "end": round(segment.end, 3),
                    "text": segment.text.strip()
                })
                if info.duration > 0:
                    # Update progress dynamically between 15% and 90%
                    actual_progress = 15 + int((segment.end / info.duration) * 75)
                    self.jobs[job_id]["progress"] = min(90, actual_progress)
                print(f"[AI-WORK] {round(segment.start, 1)}s: {segment.text[:30]}...")

            # Phase 2: Translation (90-100%)
            if target_language != "en" and info.language != target_language:
                self.jobs[job_id]["status"] = "translating"
                if self._init_translation(info.language, target_language):
                    total_res = len(results)
                    for i, res in enumerate(results):
                        results[i]["text"] = argostranslate.translate.translate(res["text"], info.language, target_language)
                        self.jobs[job_id]["progress"] = 90 + int(((i + 1) / total_res) * 10)

            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            self.jobs[job_id]["result"] = results
            print(f"[SUCCESS] Job {job_id} completed.")
            gc.collect()

        except Exception as e:
            print(f"Transcription error: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            gc.collect()

    def get_job_status(self, job_id):
        return self.jobs.get(job_id, {"status": "not_found"})

whisper_service = WhisperService()
