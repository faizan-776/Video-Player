# AI Video Player

A modern, high-performance desktop video player powered by Electron, React, and a FastAPI-based AI sidecar. This player features automatic subtitle generation, intelligent scene detection, and semantic visual search.

## Features

- **AI Subtitles:** Automatic transcription using OpenAI's Whisper (via `faster-whisper`).
- **Scene Detection:** Intelligent chapter generation using `PySceneDetect`.
- **Semantic Visual Search:** Search through video content using natural language (e.g., "a car", "mountains") powered by CLIP embeddings and ChromaDB.
- **Hover Thumbnails:** Visual seekbar previews for precise navigation.
- **Modern UI:** Glassmorphism aesthetic with smooth animations using `Framer Motion` and `Shadcn UI`.
- **Keyboard Shortcuts:**
  - `Space`: Play/Pause
  - `Arrow Right/Left`: Seek 5s
  - `Arrow Up/Down`: Volume control
  - `F`: Toggle Fullscreen
  - `M`: Toggle Mute

## Prerequisites

- **Node.js:** v18 or later
- **Python:** v3.11 or v3.12
- **FFmpeg:** Must be installed and available in your system PATH for frame extraction and AI processing.

## Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd video-player
```

### 2. Setup the Frontend
```bash
cd frontend
npm install
```

### 3. Setup the Backend (Python Sidecar)
```bash
cd backend
pip install -r requirements.txt
```

## Development

### Running the Backend
In the `backend` directory:
```bash
python main.py
```

### Running the Frontend
In the `frontend` directory:
```bash
npm run dev
```


## Testing

### Manual Verification
1.  **Backend Connectivity:** Ensure the UI displays "Backend Connected" (pinging `/ping`).
2.  **Playback:** Load a local `.mp4` and verify controls.
3.  **AI Services:**
    *   Click "Subtitles" and wait for the transcription job to complete.
    *   Click "Detect Scenes" to generate chapter markers on the seekbar.
    *   Click "Index Video" then use the Search bar to find visual content.

### Backend Unit Tests
You can add Python tests in `backend/tests/` and run them using `pytest`:
```bash
cd backend
.\venv\Scripts\pytest
```

## Deployment & Packaging

The project uses a **Sidecar Pattern**. The Python backend is "frozen" into an executable so the end-user doesn't need Python installed.

### 1. Freeze the Python Sidecar
In the `backend` directory:
```bash
python -m PyInstaller main.spec
```
This generates `backend/dist/main.exe`.

### 2. Build the Electron Installer
In the `frontend` directory:
```bash
npm run build
```
This will:
1.  Compile TypeScript.
2.  Build the Vite production bundle.
3.  Use `electron-builder` to package the app, including the frozen `main.exe` in the `extraResources`.

The final installer will be located in the `frontend/release/` directory.

## License
MIT
