# Research: Modern AI-Powered Video Player

## 1. Core Architecture: Electron + React + Python Sidecar
- **Electron**: Host process using `electron-vite` for optimized builds and developer experience.
- **React (SPA)**: Using **Tailwind CSS** and **Shadcn UI** for a high-end, modern aesthetic.
- **Python Sidecar**: FastAPI server bundled as a single-file executable using **PyInstaller**.
- **Communication**: 
    - **IPC (Inter-Process Communication)**: Used for Electron Main <-> React Frontend (file dialogs, window controls).
    - **Local HTTP (FastAPI)**: Used for React Frontend <-> Python AI Engine (heavy data processing, inference). This bypasses the IPC bottleneck for large data transfers (like image frames).

## 2. AI Feature Implementation
### A. Auto-Subtitles
- **Library**: `faster-whisper`.
- **Strategy**: Use the `base` or `small` model with `int8` quantization for the best speed/accuracy balance on mid-range hardware.

### B. Scene Detection & Chapters
- **Library**: `PySceneDetect` (Content-Aware Detector).
- **Optimization**: Analyze at a reduced resolution (e.g., 360p) to significantly speed up detection without losing accuracy.

### C. Content Search
- **Embedding Model**: `CLIP-ViT-B-32` (Fast and lightweight).
- **Video Processing**: FFmpeg extracts keyframes every 2 seconds. Frames are resized to 224x224 before embedding generation.
- **Vector Search**: **ChromaDB** running in persistent mode, stored in the user's local AppData folder.

## 3. Video Playback & Decoding
- **Engine**: Native HTML5 `<video>` for simplicity, or **Video.js** for a customizable UI and plugin support (e.g., easy subtitle switching).
- **Format Support**: Since Electron uses Chromium, it natively supports MP4 (H.264), WebM, and OGG. For broader support (MKV/H.265), we will rely on FFmpeg to pre-process or "remux" if necessary, though native support covers 90% of modern web-friendly videos.

## 3. Storage & Data Management
- **Metadata**: **SQLite**. Industry standard for local relational data (playlists, settings, video paths).
- **Vector Data**: **ChromaDB**. Built on top of DuckDB and ClickHouse, optimized for similarity search.

## 4. Packaging & Distribution
- **Python Bundling**: **PyInstaller**. We will "freeze" the Python environment into a single executable that includes all libraries (Whisper, CLIP, etc.).
- **App Bundling**: **Electron Builder**. Used to package the React frontend and the Python sidecar into a standard Windows `.exe` installer.
- **FFmpeg**: We will bundle a static build of FFmpeg to handle all video decoding and frame extraction tasks.

## 5. Performance Factors for Mid-Range Systems
- **Quantization**: All AI models will be converted to `int8` or `fp16` formats to reduce memory footprint.
- **Lazy Loading**: AI models will only be loaded into memory when a feature is requested and unloaded when finished (or kept in a small cache).
- **Hardware Acceleration**: The app will automatically detect and use NVIDIA GPUs (CUDA) if available, but will default to highly optimized CPU paths (AVX2/AVX512) for systems without dedicated GPUs.
