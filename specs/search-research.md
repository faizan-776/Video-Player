# Research: Visual Search Accuracy & Performance

## 1. Problem Identification
The "Index for Search" feature is failing to return relevant results for simple queries like "blue" or "fight".
- **Symptoms:** Zero results returned, or irrelevant results. 
- **Indexing Speed:** Frames are processed one-by-one, which is inefficient.
- **Sparse Data:** 2-second gaps miss critical action frames in anime.

## 2. Root Cause Analysis
### A. Path Mismatch (Windows vs LanceDB)
LanceDB uses SQL-like filters. Windows backslashes (`\`) in file paths are often misinterpreted or dropped in the `WHERE` clause, leading to zero results when filtering by `video_path`.

### B. Indexing Density
Action scenes in anime (like "fight") happen in milliseconds. A 2-second interval (1 frame every 48-60 frames) is highly likely to skip the actual action, capturing only the "before" or "after" moments.

### C. CLIP Encoding Latency
Encoding individual images is CPU-intensive. The CLIP model is designed to process **batches** of images (e.g., 8 or 16 at a time) using vectorization. Current code does 1-by-1, wasting CPU cycles.

### D. Data Persistence & Corruption
When re-indexing a video, if old records are not perfectly cleared, the search results become "polluted" with old timestamps or duplicate frames. This lead to a messy UI and incorrect "Jump to time" actions.

## 3. Recommended Technical Solutions
### A. High-Density Indexing
- **Interval:** Reduce from 2.0s to **0.5s or 1.0s**. 0.5s is ideal for action content.
- **Batching:** Collect 16 frames in memory and encode them in a single CLIP pass. This will increase CPU utilization and reduce total indexing time.

### B. Robust Path Normalization
- Always convert paths to **POSIX style** (forward slashes `/`) before storing in LanceDB and before querying. This eliminates SQL escaping issues.

### C. Search Optimization
- **Expand Limit:** Increase from 10 to **50** results.
- **Temporal Grouping:** If multiple frames in the same 5-second window match, group them into one "Moment" to avoid cluttering the UI with identical results.
- **Similarity Scoring:** Implement a strict similarity threshold (e.g., > 0.25) to filter out "hallucinated" matches.

## 4. Benchmark Expectation
| Metric | Current | Target |
| :--- | :--- | :--- |
| **Accuracy** | Low (Sparse) | High (0.5s density) |
| **Indexing Speed** | 1x (Sequential) | 3x - 4x (Batched) |
| **Search Reliability** | Fails on Paths | 100% Path Match |
