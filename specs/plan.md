# Robust Implementation Plan: AI Video Player

This plan follows a sequential, phase-based approach to ensure stability and verify each architectural decision.

## Phase 1: Project Foundation & Core Player
Goal: Establish the Electron + React foundation and a high-performance video player.
- Initialize with `electron-vite`.
- Set up **Tailwind CSS** and **Shadcn UI** for a high-end, modern aesthetic.
- Implement a custom video player component using native HTML5 `<video>` with a custom-skinned UI.
- Implement basic controls: Play, Pause, Seek, Volume, Fullscreen.

## Phase 2: Python Sidecar & Communication Bridge
Goal: Connect the frontend to a local Python server.
- Set up a `backend/` directory with FastAPI.
- Implement the "Spawn & Manage" logic in Electron's Main process.
- Create a `bridge.ts` to abstract HTTP calls to the sidecar.
- Verify basic "Ping" from React -> Electron -> Python.

## Phase 3: AI Feature - Auto-Subtitles
Goal: Implement local transcription.
- Integrate `faster-whisper` (using `base` or `small` model with `int8` quantization).
- Implement a "Generate Subtitles" job queue (background processing).
- Display progress in the UI (0% -> 100%).
- Generate and load SRT/VTT files dynamically.

## Phase 4: AI Feature - Scene Detection & Chapters
Goal: Automatically segment video content.
- Integrate `PySceneDetect`.
- Analyze video and save chapter timestamps to SQLite.
- Update the UI Seekbar to show chapter markers.
- Implement "Click to jump to chapter".

## Phase 5: AI Feature - Content Search (The "Killer" Feature)
Goal: Search for moments in a video using natural language.
- Implement frame extraction using FFmpeg.
- Integrate `CLIP` model for frame embedding generation.
- Store embeddings in `ChromaDB`.
- Implement a "Search" UI in the video player.

## Phase 6: Polish, Metadata & Persistence
Goal: Ensure a professional look and feel.
- Implement SQLite for Playlists and "Recently Played".
- Add Framer Motion animations for UI transitions.
- Implement "Global Hotkeys" (Space for pause, etc.).

## Phase 7: Packaging & Distribution
Goal: Create the final `.exe`.
- Create a `build-python.js` script to run PyInstaller.
- Configure `electron-builder` for production distribution.
- Test the installer on a clean Windows machine.
