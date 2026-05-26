# Atomic Implementation Tasks: Multi-Modal AI

## Phase 1: Data Unification & Hybrid Search
- [x] **Task 1.1: Database Schema Expansion**
    - [x] Update `video_frames_v5` in `search_service.py` to include a `transcript` (string) column.
    - [x] Add a migration utility to wipe old tables (v1, v2, v3, v4) to save disk space.
- [x] **Task 1.2: Cross-Service Injection**
    - [x] Modify `whisper_service.py` to call `search_service.inject_transcript(timestamp, text)` during transcription.
    - [x] Implement `inject_transcript` in `SearchService` to find the closest frame vector and append the text.
- [x] **Task 1.3: Hybrid Query Logic**
    - [x] Update `search_service.search()` to use a weighted score: `0.7 * visual_score + 0.3 * text_match`.
    - [x] Implement simple keyword matching for the text column.

## Phase 2: Semantic Scene Intelligence
- [x] **Task 2.1: Visual Drift Detection**
    - [x] In `scene_service.py`, compare vectors of frame `N` and frame `N+10`.
    - [x] If cosine similarity < 0.7, flag as a "Semantic Scene Change."
- [x] **Task 2.2: Search Result Grouping**
    - [x] Refactor search results to return "Moments" (Start Time -> End Time) instead of single timestamps.
    - [x] Merge results that are within 2 seconds of each other.

## Phase 3: Hardware Acceleration & Nuance
- [ ] **Task 3.1: OpenVINO Whisper Integration**
    - [ ] Research and implement `faster-whisper` with OpenVINO backend if available in the 2026 stack. (Note: faster-whisper 1.1.1 uses CTranslate2, which has OpenVINO support in some distributions).
- [x] **Task 3.2: Translation Post-Processor**
    - [x] Create a `utils.py` with an `anime_translation_fixer` map (common mistranslations in Argos).
    - [x] Run this fixer on every Whisper segment before saving.

## Phase 4: Final Validation
- [ ] **Task 4.1: End-to-End Stress Test**
    - [ ] Run Indexing + Transcription simultaneously and monitor RAM stays < 8GB.
- [ ] **Task 4.2: Accuracy Benchmark**
    - [ ] Verify search for "Red character speaking" returns results where the character is both visible AND talking.
