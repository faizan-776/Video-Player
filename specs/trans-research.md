# Research: Whisper Transcription Performance Bottlenecks

## 1. Problem Identification
The AI transcription (Whisper) feature is experiencing a critical stall at "Initializing... 5%". 
- **Symptoms:** Low CPU usage, extremely slow RAM increase (3-4MB/s), and indefinite hang.
- **Environment:** Intel i5-6th Gen (4 Cores, 4 Threads), 8GB RAM.
- **Current Config:** `model="medium"`, `compute_type="float32"`, `cpu_threads=6`, `num_workers=2`.

## 2. Root Cause Analysis
### A. Thread Contention & Over-subscription
The i5-6th Gen has **4 physical cores and 4 threads**.
- The current setting of `cpu_threads=6` and `num_workers=2` attempts to spawn **12 threads** for math operations.
- This leads to "Context Switching Thrashing," where the CPU spends more time switching between threads than actually performing calculations.
- Math libraries like Intel MKL and OpenMP (used by `faster-whisper`) are extremely sensitive to thread counts exceeding physical cores.

### B. Memory Overhead (float32 vs int8)
- `float32` uses **32 bits** per weight, requiring ~3.5GB RAM for the "medium" model.
- Loading this into an 8GB system with other apps running can trigger **Paging/Swapping** to the disk.
- RAM increases slowly because the CPU is struggling to initialize the large 32-bit matrices while competing for cycles with over-subscribed threads.

### C. Initialization Deadlock
- Spawning multiple workers (`num_workers=2`) on a 4-core CPU during the heavy initialization phase can cause a race condition in the Intel MKL/OpenMP buffer allocation, leading to the observed "hang".

## 3. Recommended Technical Solutions
### A. Resource Optimization
- **Quantization:** Switch to `int8` (8-bit integers). This reduces RAM usage to ~1.2GB and accelerates CPU math with minimal accuracy loss.
- **Thread Alignment:** Set `cpu_threads=4` (match physical cores) and `num_workers=1` (avoid contention).
- **Environment Pins:** Hard-set `OMP_NUM_THREADS=4` and `MKL_NUM_THREADS=4` to prevent math libraries from auto-detecting incorrect logical core counts.

### B. Architectural Stability
- **Eager Loading:** Load the model once at startup or on demand with a dedicated "Ready" state.
- **Resource Limiting:** Implement a global lock to ensure only one heavy AI job runs at a time on low-end systems.
- **Non-blocking I/O:** Ensure the initialization phase yields back to the OS periodically to prevent "Freezing".

## 4. Benchmark Expectation
| Metric | Current (Failed) | Target (Optimized) |
| :--- | :--- | :--- |
| **RAM Usage** | ~3.5GB (Slow Load) | ~1.2GB (Fast Load) |
| **CPU Saturation** | Erratic / Contention | Steady 100% across 4 cores |
| **Initialization Time** | Infinite / Stalled | 10 - 20 seconds |
| **Accuracy** | Medium (32-bit) | Medium (8-bit) - ~98% parity |
