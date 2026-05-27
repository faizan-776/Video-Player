import uvicorn
import sys
import os
import cv2
import io
import threading
import logging
import urllib.parse
import time
from typing import Optional
from PIL import Image
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.whisper_service import whisper_service
from services.scene_service import scene_service
from services.search_service import search_service

# --- Setup Clean Logging ---
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("uvicorn.access")
logger.disabled = True  # Disable standard noisy access logs

app = FastAPI()

# Simple cache to prevent spamming 206 Partial Content logs for the same file
last_logged_request = {}

@app.middleware("http")
async def custom_logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000
    
    # Decode and format the path/query for readability
    url_path = request.url.path
    query_params = urllib.parse.unquote(str(request.query_params))
    
    # Identify the "proper location" or action
    log_type = "API"
    details = query_params
    
    if url_path == "/video":
        log_type = "VIDEO"
        path_param = request.query_params.get("path", "")
        details = f"Streaming: {urllib.parse.unquote(path_param)}"
    elif url_path == "/thumbnail":
        log_type = "THUMB"
        path_param = request.query_params.get("file_path", "")
        details = f"Frame at {request.query_params.get('t', '0')}s from {urllib.parse.unquote(path_param)}"
    elif url_path in ["/transcribe", "/detect-scenes", "/index-video"]:
        log_type = "AI"
        details = f"Starting {url_path[1:]} task"
    elif url_path == "/search":
        log_type = "SEARCH"
        details = f"Query: '{request.query_params.get('query', '')}'"
    
    # Formatting
    status_code = response.status_code
    status_text = "OK" if status_code == 200 else "PARTIAL" if status_code == 206 else f"ERR:{status_code}"
    
    # Suppression logic for 206 logs (only log every 5s for the same file)
    cache_key = f"{url_path}:{details}"
    now = time.time()
    if status_code == 206:
        if cache_key in last_logged_request and now - last_logged_request[cache_key] < 5:
            return response
    
    last_logged_request[cache_key] = now
    
    # Final log output
    print(f"[{log_type}] {status_text} | {details} ({duration:.1f}ms)")
    
    return response

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
    target_language: str = "en"

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
    job_id = whisper_service.start_transcription(request.file_path, request.target_language)
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
async def search(query: str, video_path: Optional[str] = Query(None)):
    return search_service.search(query, video_path)

@app.get("/video")
async def get_video(path: str):
    # SILENT SEARCH: Avoid printing logs for every 206 Partial Content request
    if os.path.exists(path):
        return FileResponse(path)
    
    # Only log if we need to fall back to smart search
    filename = os.path.basename(path)
    print(f"[INFO] Video not found at direct path, performing smart search for: {filename}")
    
    # Check project root and parent
    search_dirs = [os.getcwd(), os.path.dirname(os.getcwd())]
    search_dirs += [
        os.path.expanduser("~/Desktop"),
        os.path.expanduser("~/Downloads"),
        os.path.expanduser("~/Videos"),
    ]
    
    for sd in search_dirs:
        if not os.path.exists(sd): continue
        potential = os.path.join(sd, filename)
        if os.path.exists(potential):
            return FileResponse(potential)

    raise HTTPException(status_code=404, detail="File not found")

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
    uvicorn.run(app, host="127.0.0.1", port=port, access_log=False)
