# Implementation Plan: High-Accuracy Visual Search

## Objective
To make the "Index for Search" feature fast, robust, and capable of finding specific visual moments (actions, colors, objects) with high precision.

## Core Strategy: "Batch, Normalize & Clean"
We will switch from sequential frame processing to batched processing for speed, normalize all system paths, and enforce a "Clean Start" policy where any existing data for a video is purged before new AI tasks begin.

## Phase 1: Robust Path Handling & Clean Start
- Implement `normalize_path` utility to force forward-slashes.
- Implement "Purge-Before-Task" logic for Indexing, Scenes, and Transcription.
- Update LanceDB schema to store normalized paths.
- Ensure search queries use the same normalization.

## Phase 2: High-Density Batched Indexing
- **Step 1:** Extract frames every 0.75 seconds (Optimal for i5 performance vs data density).
- **Step 2:** Buffer 16 frames.
- **Step 3:** Perform a single `model.encode(batch)` to maximize CPU throughput.
- **Step 4:** Clear frame buffer to maintain <2GB RAM usage.

## Phase 3: Search Logic Enhancement
- Implement a similarity threshold to ensure quality.
- Increase result limit to 40 items.
- Sort results by relevance score (descending) before sorting by time.

## Verification & Testing
1.  **Terminal Check:** Verify `[INDEX-BATCH]` logs show 16 frames per log.
2.  **Query Test:** Search "blue", "sword", "face" and verify Jump-to-time accuracy.
3.  **Path Test:** Ensure it works even if the video is in a nested folder with spaces.
