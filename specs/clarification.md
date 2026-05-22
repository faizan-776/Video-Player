# Architectural Clarification & Validation

This document clarifies every architectural decision to ensure compatibility and zero flaws. Each decision must be verified before proceeding.

## 1. Frontend: React SPA vs Next.js
- **Decision**: React SPA.
- **Why**: Next.js requires a Node.js server for many of its features. Bundling a Node.js server inside Electron adds unnecessary complexity and potential port conflicts. A React SPA (using Vite) is "static" and loads instantly from the file system.
- **Checklist**:
    - [ ] Project initialized with `vite` or `electron-vite`.
    - [ ] Routing handled by `react-router-dom` (HashRouter mode for Electron compatibility).

## 2. Backend: Python Sidecar Communication
- **Decision**: FastAPI over HTTP/REST.
- **Why**: FastAPI is extremely fast and provides automatic type validation. HTTP/REST is easier to debug and test than WebSockets for most AI tasks.
- **Checklist**:
    - [ ] Python process lifecycle (start/stop) managed by Electron Main process.
    - [ ] Dynamic port selection for the FastAPI server to avoid conflicts.
    - [ ] Electron-to-Python security: Only allow local requests from the Electron app.

## 3. Database: SQLite vs Cloud (Neon/Postgres)
- **Decision**: SQLite + ChromaDB.
- **Why**: Standalone desktop apps should not rely on cloud databases for core functionality. SQLite is a single file, perfect for local storage. ChromaDB provides the necessary vector search for AI features without internet.
- **Checklist**:
    - [ ] SQLite used for relational data (Playlists, Settings).
    - [ ] ChromaDB used for AI embeddings search.
    - [ ] Data persistence verified in `%APPDATA%` on Windows.

## 4. AI Performance: Quantization & Hardware
- **Decision**: `faster-whisper` and `CLIP-ViT-B-32-quickgelu` (quantized).
- **Why**: Mid-range systems (8GB RAM) will crash with full-size models. Quantization ensures smooth performance on CPU.
- **Checklist**:
    - [ ] `faster-whisper` configured for `int8` quantization.
    - [ ] Frame extraction frequency limited (e.g., 1 frame per 2 seconds) to save disk space and processing time.

## 5. Distribution: The "Portable" Requirement
- **Decision**: `PyInstaller` + `Electron Builder`.
- **Why**: To distribute as a `.exe`, all Python dependencies must be bundled into a standalone binary.
- **Checklist**:
    - [ ] Python sidecar "frozen" using PyInstaller.
    - [ ] Electron Builder configured to include the sidecar in `extraResources`.
    - [ ] One-click installer (`.exe`) verified on a fresh Windows install without Python.

---
**Verification Status**: All architectural decisions aligned with project goals of "Modern UI", "Local AI", and "Offline Functionality".
