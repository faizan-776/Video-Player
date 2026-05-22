from faster_whisper import WhisperModel
import os
import threading
import uuid

class WhisperService:
    def __init__(self):
        self.model_size = "base"
        self.model = None
        self.jobs = {}

    def _get_model(self):
        if self.model is None:
            print("[INFO] Loading Whisper model on CPU (int8)...")
            # Run on CPU with INT8 quantization for efficiency
            self.model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
        return self.model

    def start_transcription(self, file_path: str):
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {"status": "processing", "progress": 0, "result": None}
        
        thread = threading.Thread(target=self._run_transcription, args=(job_id, file_path))
        thread.start()
        
        return job_id

    def _run_transcription(self, job_id, file_path):
        try:
            model = self._get_model()
            segments, info = model.transcribe(file_path, beam_size=5)
            
            results = []
            # segments is an iterable, we need to convert to list to get the content
            # and potentially track progress if we knew the total duration
            for segment in segments:
                results.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip()
                })
                # Update progress roughly (optional, but good for UI)
                if info.duration > 0:
                    self.jobs[job_id]["progress"] = min(99, int((segment.end / info.duration) * 100))

            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            self.jobs[job_id]["result"] = results
        except Exception as e:
            print(f"Transcription error: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)

    def get_job_status(self, job_id):
        return self.jobs.get(job_id, {"status": "not_found"})

whisper_service = WhisperService()
