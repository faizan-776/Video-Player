# Actionable Tasks: Visual Search Fix

## Phase 1: Normalization & Core Utilities
- [x] **Task 1.1:** Update `backend/services/search_service.py` with `_normalize_path` helper.
- [x] **Task 1.2:** Update `_escape_path` to be more robust for LanceDB.
- [x] **Task 1.3:** Implement `purge_video_data` in all services to ensure a clean slate before processing.

## Phase 2: Batched Indexing Engine
- [x] **Task 2.1:** Modify `_run_indexing` to extract frames at 0.75s intervals.
- [x] **Task 2.2:** Implement frame buffering logic (List of PIL images).
- [x] **Task 2.3:** Implement `model.encode(batch)` and process results in loops.
- [x] **Task 2.4:** Add `gc.collect()` in indexing loop to prevent RAM spikes.

## Phase 3: Search Intelligence
- [x] **Task 3.1:** Update `search` method to use normalized paths for filtering.
- [x] **Task 3.2:** Increase result limit and implement relevance scoring.

## Phase 4: Final Validation
- [x] **Task 4.1:** Verify indexing speed on i5-6th Gen.
- [x] **Task 4.2:** Verify search accuracy for action keywords ("fight", "explosion").
