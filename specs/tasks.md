# Atomic-Level Actionable Tasks

Each task must be completed and checked before moving to the next.

## Phase 1: Foundation
### Task 1.1: Project Scaffolding
- [x] Run `npm create electron-vite@latest . -- --template react-ts`.
- [x] Install Tailwind CSS: `npm install -D tailwindcss postcss autoprefixer`.
- [x] Initialize Tailwind: `npx tailwindcss init -p`.
- [x] Install Shadcn UI: `npx shadcn-ui@latest init`.
- [x] Configure `tailwind.config.js` and `src/index.css`.
- [x] Verify "Hello World" Electron window with Shadcn UI component.

### Task 1.2: Core Video Player UI
- [x] Create `components/VideoPlayer.tsx`.
- [x] Implement `<video>` tag with basic HTML5 controls disabled.
- [x] Build custom Control Bar using Shadcn UI components (Slider, Button).
- [x] Add `lucide-react` icons for controls.
- [x] Verify video playback of a local `.mp4` file. (Verified with sample URL)

## Phase 2: Sidecar Integration
### Task 2.1: Python Environment Setup
- [x] Create `backend/` directory.
- [x] Initialize Python venv: `python -m venv venv`.
- [x] Install FastAPI and Uvicorn: `pip install fastapi uvicorn`.
- [x] Create `backend/main.py` with a `/ping` endpoint.
- [x] Verify FastAPI server runs locally (`localhost:8000/ping`).

### Task 2.2: Electron Sidecar Manager
- [x] Implement `main/sidecar.ts` to spawn the Python process.
- [x] Add logic to find a free port and pass it to Python.
- [x] Ensure Python process is killed when Electron exits.
- [x] Implement IPC bridge to allow React to "Ping" the backend.
- [x] Verify UI displays "Backend Connected" message.

## Phase 3: Auto-Subtitles
### Task 3.1: Whisper Integration
- [x] Install `faster-whisper` in Python environment.
- [x] Create `backend/services/whisper_service.py`.
- [x] Implement `/transcribe` endpoint (using `base` model, `int8` quantization).
- [x] Implement "Job Status" tracking (since transcription is slow).
- [x] Verify transcription of a short audio clip.

### Task 3.2: Subtitle UI
- [x] Add "Generate Subtitles" button to the player.
- [x] Implement progress overlay (Spinner + Percentage).
- [x] Parse Whisper output into `.vtt` format. (Handled as JSON objects in our impl)
- [x] Dynamically attach `<track>` to the video element. (Handled via overlay for more control)
- [x] Verify subtitles appear on screen correctly synchronized.

## Phase 4: Scene Detection
### Task 4.1: PySceneDetect Integration
- [x] Install `scenedetect` in Python environment.
- [x] Create `backend/services/scene_service.py`.
- [x] Implement `/detect-scenes` endpoint.
- [x] Save detected timestamps to a local SQLite database.
- [x] Verify scene list matches actual video transitions.

### Task 4.2: Chapter Navigation UI
- [x] Build a "Chapters" sidebar or overlay.
- [x] Add visual markers on the seekbar for each scene cut.
- [x] Implement "Hover to see thumbnail" (using frame extraction).
- [x] Verify clicking a chapter seeks the video correctly.

## Phase 5: Content Search
### Task 5.1: Embedding Pipeline
- [x] Install `sentence-transformers` and `chromadb`.
- [x] Implement frame extraction logic in Python (FFmpeg wrapper).
- [x] Create `backend/services/search_service.py` to index a video.
- [x] Implement `/search` endpoint using CLIP embeddings.
- [x] Verify search for "dog" returns timestamps where dogs are visible.

### Task 5.2: Search UI
- [x] Add a search bar to the video player.
- [x] Display search results as clickable timestamps with thumbnails.
- [x] Implement "Instant Jump" to search result.
- [x] Verify end-to-word search flow.

## Phase 6: Final Polish
### Task 6.1: Styling & Animations
- [x] Add `framer-motion` to all UI transitions (Sidebars, Overlays).
- [x] Implement "Glassmorphism" effect for the control bar.
- [x] Add keyboard shortcuts (Space, Arrows, F for Fullscreen).
- [x] Verify "Smooth" feel of the entire app.

## Phase 7: Packaging
### Task 7.1: Python Freezing
- [x] Install `pyinstaller`.
- [x] Create `pyinstaller.spec` to bundle models and FastAPI.
- [x] Build the `.exe` for the sidecar.
- [x] Verify the sidecar runs as a standalone binary.

### Task 7.2: Final Installer
- [x] Configure `electron-builder.yml`.
- [x] Run `npm run build`.
- [x] Install the generated `.exe` on a test machine.
- [x] Verify all AI features work without a Python installation.

