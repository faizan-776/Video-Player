# Implementation Plan: Robust Transcription Fix

## Objective
To resolve the "Initializing... 5%" stall and optimize the `WhisperService` for Intel i5-6th Gen (4C/4T) systems with 8GB RAM, ensuring 100% resource utilization without system instability.

## Core Strategy: "Efficiency Over Raw Force"
Instead of forcing the CPU with high thread counts, we will align the AI engine to the exact physical architecture of the system and use `int8` quantization to keep the model entirely within physical RAM.

## Phase 1: Engine Re-Configuration
- **Quantization:** Revert `compute_type` from `float32` to `int8`.
- **Parallelism:** Set `num_workers=1` and `cpu_threads=4`.
- **Environment:** Inject `OMP_NUM_THREADS=4` and `MKL_NUM_THREADS=4` at the very start of the application.

## Phase 2: Architectural Improvements
- **Model Registry:** Implement a state-aware model loader that prevents redundant reloads.
- **Progress granularity:** Split the "Initializing" phase into distinct sub-steps (Loading Weights, Warming Engine, Analyzing Audio) to provide immediate feedback.
- **Memory Management:** Explicitly trigger Garbage Collection after model swaps or job completions.

## Phase 3: Accuracy & Stability Tuning
- **Contextual Prompts:** Keep the "Anime Mode" prompt but optimize the `beam_size` to 5 (optimal for i5) to ensure speed doesn't compromise accuracy.
- **VAD Optimization:** Increase `min_silence_duration_ms` to 2000ms to reduce unnecessary processing of silent/noisy gaps.

## Verification & Testing
1.  **RAM Monitor:** Confirm usage stays between 1.2GB and 1.8GB.
2.  **CPU Monitor:** Verify 100% usage across all 4 physical cores during the "AI-WORK" phase.
3.  **UI Feedback:** Ensure the progress bar moves from 0% to 10% within 15 seconds.
