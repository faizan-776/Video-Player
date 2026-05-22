from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import sys
import os
import cv2
import io
import threading
from PIL import Image
from services.whisper_service import whisper_service
from services.scene_service import scene_service
from services.search_service import search_service

app = FastAPI()

# Cache for VideoCapture objects to avoid reopening files repeatedly
cap_cache = {}
cap_lock = threading.Lock()

def get_video_cap(file_path: str):
    with cap_lock:
        if file_path in cap_cache:
            return cap_cache[file_path]
        
        cap = cv2.VideoCapture(file_path)
        if cap.isOpened():
            # Keep only the last 3 videos in cache to save file handles
            if len(cap_cache) >= 3:
                try:
                    oldest_path = next(iter(cap_cache))
                    cap_cache[oldest_path].release()
                    del cap_cache[oldest_path]
                except StopIteration:
                    pass
            cap_cache[file_path] = cap
            return cap
        return None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranscribeRequest(BaseModel):
    file_path: str

class SceneRequest(BaseModel):
    file_path: str

class IndexRequest(BaseModel):
    file_path: str

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "Backend is running!"}

@app.post("/transcribe")
async def transcribe(request: TranscribeRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    job_id = whisper_service.start_transcription(request.file_path)
    return {"job_id": job_id}

@app.get("/transcribe/{job_id}")
async def get_transcription_status(job_id: str):
    return whisper_service.get_job_status(job_id)

@app.post("/detect-scenes")
async def detect_scenes(request: SceneRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    job_id = scene_service.start_scene_detection(request.file_path)
    return {"job_id": job_id}

@app.get("/detect-scenes/{job_id}")
async def get_scene_job_status(job_id: str):
    return scene_service.get_job_status(job_id)

@app.get("/scenes")
async def get_scenes(file_path: str):
    return scene_service.get_scenes(file_path)

@app.post("/index-video")
async def index_video(request: IndexRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    job_id = search_service.start_indexing(request.file_path)
    return {"job_id": job_id}

@app.get("/index-video/{job_id}")
async def get_index_job_status(job_id: str):
    return search_service.get_job_status(job_id)

@app.get("/search")
async def search(query: str, video_path: str = Query(None)):
    return search_service.search(query, video_path)

@app.get("/thumbnail")
async def get_thumbnail(file_path: str, t: float):
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    cap = get_video_cap(file_path)
    if cap is None:
        raise HTTPException(status_code=500, detail="Could not open video")
    
    with cap_lock:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ret, frame = cap.read()
    
    if not ret:
        # Try reopening if it failed (might be closed or at end)
        with cap_lock:
            if file_path in cap_cache:
                cap_cache[file_path].release()
                del cap_cache[file_path]
        
        cap = get_video_cap(file_path)
        if cap:
            with cap_lock:
                cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
                ret, frame = cap.read()
    
    if not ret:
        raise HTTPException(status_code=500, detail="Could not extract frame")
    
    # Resize for efficiency
    frame = cv2.resize(frame, (320, 180))
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(rgb_frame)
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return Response(content=buf.getvalue(), media_type="image/jpeg")

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    uvicorn.run(app, host="127.0.0.1", port=port)
