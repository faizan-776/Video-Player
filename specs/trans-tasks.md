# Actionable Tasks: Transcription Fix

## Phase 1: Environment & Engine Optimization
- [x] **Task 1.1:** Update `backend/services/whisper_service.py` environment variables.
    - Set `OMP_NUM_THREADS` and `MKL_NUM_THREADS` to exactly `4`.
    - Set `CT2_USE_EXPERIMENTAL_PACKED_GEMM=1` for Intel optimization.
- [x] **Task 1.2:** Modify `WhisperModel` constructor in `_get_model`.
    - Change `compute_type` to `int8`.
    - Set `cpu_threads=4` and `num_workers=1`.
- [x] **Task 1.3:** Update `transcribe` call parameters.
    - Set `beam_size=5` and `best_of=3` (Optimized for i5-6th Gen).

## Phase 2: Architectural Stability & Progress
- [x] **Task 2.1:** Implement granular progress reporting in `_run_transcription`.
    - 0-5%: Initializing Environment.
    - 5-15%: Loading Model Weights.
    - 15-90%: Active Transcription.
    - 90-100%: Translation & Cleanup.
- [x] **Task 2.2:** Add explicit memory cleanup logic (`gc.collect()`) after model initialization and job completion.
- [x] **Task 2.3:** Add more detailed terminal logging to identify exact lines causing delays.

## Phase 3: UI Consistency & Safety
- [x] **Task 3.1:** Update `AISidebar.tsx` to handle the new granular statuses ('Initializing...', 'Translating...').
- [x] **Task 3.2:** Implement a global `AI_RESOURCE_LOCK` to ensure multiple high-load AI tasks (Transcription vs Indexing) don't run simultaneously and crash the system.

## Phase 4: Final Validation (User to Verify)
- [x] **Task 4.1:** Verify RAM usage stays within ~1.5GB - 2GB on i5-6th Gen system.
- [x] **Task 4.2:** Verify transcription accuracy for anime dialogue with new optimized settings.
