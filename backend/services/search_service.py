import cv2
import os
# Suppress OpenCV/FFMPEG warnings
os.environ["OPENCV_VIDEOIO_LOG_LEVEL"] = "0"
os.environ["FFMPEG_LOG_LEVEL"] = "quiet"
import threading
from services.utils import diagnostic_logger
import uuid
import lancedb
from PIL import Image
import numpy as np
import gc
from typing import Optional, Any

class SearchService:
    def __init__(self, db_path="vector_db"):
        self.db_path = db_path
        self.jobs = {}
        self.model: Any = None
        self.db = lancedb.connect(self.db_path)
        # v5: Integrated Schema (Vector + Transcript + Metadata)
        self.table_name = "video_frames_v5"
        self._cleanup_old_tables()

    def _cleanup_old_tables(self):
        """Task 1.1: Wipe old incompatible tables to save disk space."""
        try:
            for table in self.db.table_names():
                if table.startswith("video_frames") and table != self.table_name:
                    print(f"[CLEANUP] Removing old table: {table}")
                    self.db.drop_table(table)
        except Exception as e:
            print(f"[DEBUG] Cleanup failed (normal if tables don't exist): {e}")

    def inject_transcript(self, video_path: str, timestamp: float, text: str):
        """Task 1.2: Inject Whisper transcript into the search index."""
        try:
            if self.table_name not in self.db.table_names():
                return
            
            table = self.db.open_table(self.table_name)
            norm_path = self._normalize_path(video_path)
            escaped_path = self._escape_path(norm_path)
            
            # Find the closest frame vector (within 1 second)
            # and update its transcript field
            where_clause = f"video_path = '{escaped_path}' AND timestamp >= {timestamp - 0.5} AND timestamp <= {timestamp + 0.5}"
            table.update(where=where_clause, values={"transcript": text})
        except Exception as e:
            print(f"[ERROR] Transcript injection failed: {e}")

    def clear_transcripts(self, video_path: str):
        """Task 1.3: Clear all transcripts for a specific video to ensure fresh re-transcription."""
        try:
            if self.table_name not in self.db.table_names():
                return
            
            table = self.db.open_table(self.table_name)
            norm_path = self._normalize_path(video_path)
            escaped_path = self._escape_path(norm_path)
            
            # Update all rows for this video to have an empty transcript
            table.update(where=f"video_path = '{escaped_path}'", values={"transcript": ""})
            print(f"[CLEANUP] Cleared old transcripts for: {os.path.basename(video_path)}")
        except Exception as e:
            print(f"[ERROR] Failed to clear transcripts: {e}")

    def _get_model(self) -> Any:
        if self.model is None:
            import torch
            from sentence_transformers import SentenceTransformer
            import os
            
            # Check for Intel GPU via OpenVINO
            use_openvino = False
            try:
                import openvino as ov
                core = ov.Core()
                devices = core.available_devices
                if any("GPU" in d for d in devices):
                    use_openvino = True
                    print(f"[INFO] Intel iGPU detected ({devices}). Enabling OpenVINO acceleration...")
            except Exception as e:
                print(f"[DEBUG] OpenVINO detection skipped: {e}")

            # USE ViT-B-16: The stable "Medium" model
            model_id = 'clip-ViT-B-16' 
            
            if use_openvino:
                try:
                    print(f"[INFO] Initializing CLIP-Medium model ({model_id})...")
                    # For now, OpenVINO is best used via the CPU/GPU plugins in later steps
                    # Standard SentenceTransformer doesn't support .to("openvino")
                    self.model = SentenceTransformer(model_id, device="cpu")
                    print("[SUCCESS] AI Search Engine ready (OpenVINO detected, using CPU for compatibility).")
                except Exception as e:
                    print(f"[WARN] OpenVINO init failed: {e}")
                    use_openvino = False

            if not use_openvino:
                device = "cuda" if torch.cuda.is_available() else "cpu"
                if device == "cpu":
                    cpu_count = os.cpu_count() or 4
                    torch.set_num_threads(max(1, cpu_count - 1))
                self.model = SentenceTransformer(model_id, device=device)
            
            # Cache Concept Anchors for Visual-Semantic Mapping
            self._init_concept_anchors()
            print("[SUCCESS] AI Search Engine is ready.")
            
        return self.model

    def _init_concept_anchors(self):
        """Pre-calculate embeddings for visual concepts to use as anchors."""
        concepts = {
            "combat": "sword fight, clashing blades, aggressive action, fire, explosions, intense battle",
            "emotional": "crying, sad face, emotional close-up, touching moment, tears",
            "peaceful": "nature, landscape, peaceful sky, blue clouds, quiet scenery",
            "talking": "character talking, dialogue, face close-up, conversation",
            "shouting": "screaming, wide mouth, aggressive shouting, angry expression"
        }
        self.concept_embeddings = {}
        for name, desc in concepts.items():
            emb = self.model.encode([desc], normalize_embeddings=True)[0]
            self.concept_embeddings[name] = emb

    def get_visual_context(self, video_path: str, timestamp: float) -> str:
        """Task 4.1: Identify visual keywords for a window around the timestamp."""
        try:
            if self.table_name not in self.db.table_names():
                return "general"
            
            model = self._get_model()
            table = self.db.open_table(self.table_name)
            norm_path = self._normalize_path(video_path)
            escaped_path = self._escape_path(norm_path)
            
            # WINDOW EXPANSION: Look at 2 seconds around the timestamp
            # This handles rapid cuts or slightly misaligned transcriptions
            where_clause = f"video_path = '{escaped_path}' AND timestamp >= {timestamp - 1.0} AND timestamp <= {timestamp + 1.0}"
            results = table.search().where(where_clause).limit(5).to_list()
            
            if not results: return "general"
            
            # Aggregate scores across all frames in the window
            # We take the MAXIMUM score for each concept in the window
            max_scores = {name: 0.0 for name in self.concept_embeddings.keys()}
            
            for res in results:
                frame_vec = np.array(res["vector"])
                for name, anchor_vec in self.concept_embeddings.items():
                    similarity = np.dot(frame_vec, anchor_vec)
                    if similarity > max_scores[name]:
                        max_scores[name] = similarity
            
            # Sort concepts by their max similarity in the window
            sorted_concepts = sorted(max_scores.items(), key=lambda x: x[1], reverse=True)
            
            # Precision Threshold: 0.22 (Optimized for anime CLIP embeddings)
            top_concepts = [c[0] for c in sorted_concepts if c[1] > 0.22]
            
            result = ", ".join(top_concepts[:3]) if top_concepts else "general"
            
            # DIAGNOSTIC: Log visual AI input/output
            diagnostic_logger.log(
                component="VisualAI (CLIP)",
                timestamp=timestamp,
                input_data={"video_path": video_path, "window": "±1s"},
                output_data=result,
                metadata={"max_scores": {k: float(v) for k, v in max_scores.items()}}
            )
            
            return result
        except Exception as e:
            print(f"[DEBUG] Visual context lookup failed: {e}")
            return "general"

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Task 4.2: Compare two strings semantically using CLIP/SBERT."""
        try:
            model = self._get_model()
            embs = model.encode([text1, text2], normalize_embeddings=True)
            return float(np.dot(embs[0], embs[1]))
        except Exception as e:
            print(f"[DEBUG] Similarity calculation failed: {e}")
            return 0.0

    def _normalize_path(self, path: str) -> str:
        return path.replace("\\", "/").lower()

    def _escape_path(self, path: str) -> str:
        return path.replace("'", "''")

    def start_indexing(self, file_path: str):
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {"status": "processing", "progress": 0, "result": None}
        thread = threading.Thread(target=self._run_indexing, args=(job_id, file_path))
        thread.start()
        return job_id

    def _run_indexing(self, job_id, file_path):
        try:
            model = self._get_model()
            norm_path = self._normalize_path(file_path)
            
            if self.table_name in self.db.table_names():
                table = self.db.open_table(self.table_name)
                escaped_path = self._escape_path(norm_path)
                table.delete(f"video_path = '{escaped_path}'")

            cap = cv2.VideoCapture(file_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0: fps = 24.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            interval = 0.75
            frame_step = int(fps * interval)
            if frame_step <= 0: frame_step = 1
            
            batch_size = 16
            frames_to_encode = []
            metadata_buffer = []
            MAX_RECORDS_IN_MEMORY = 500 
            accumulated_data = []

            for i in range(0, total_frames, frame_step):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                if not ret: break
                
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_frame)
                
                frames_to_encode.append(pil_img)
                metadata_buffer.append({
                    "vector": [], # Placeholder
                    "video_path": norm_path,
                    "timestamp": i / fps,
                    "video_id": os.path.basename(file_path),
                    "id": f"{os.path.basename(file_path)}_{i}",
                    "transcript": "" # New Task 1.1 field
                })

                if len(frames_to_encode) >= batch_size:
                    embeddings = model.encode(frames_to_encode, batch_size=batch_size, show_progress_bar=False, normalize_embeddings=True)
                    for idx, emb in enumerate(embeddings):
                        item = metadata_buffer[idx]
                        item["vector"] = emb.tolist()
                        accumulated_data.append(item)
                    
                    frames_to_encode = []
                    metadata_buffer = []
                    percent = int((i / total_frames) * 100)
                    self.jobs[job_id]["progress"] = percent
                    
                    if percent < 5: self.jobs[job_id]["progress_label"] = "Starting..."
                    elif percent < 90: self.jobs[job_id]["progress_label"] = "Processing..."
                    else: self.jobs[job_id]["progress_label"] = "Almost there..."
                    
                    if len(accumulated_data) >= MAX_RECORDS_IN_MEMORY:
                        if self.table_name in self.db.table_names():
                            self.db.open_table(self.table_name).add(accumulated_data)
                        else:
                            self.db.create_table(self.table_name, data=accumulated_data)
                        accumulated_data = []
                        gc.collect()

            if frames_to_encode:
                embeddings = model.encode(frames_to_encode, show_progress_bar=False, normalize_embeddings=True)
                for idx, emb in enumerate(embeddings):
                    item = metadata_buffer[idx]
                    item["vector"] = emb.tolist()
                    accumulated_data.append(item)

            if accumulated_data:
                if self.table_name in self.db.table_names():
                    self.db.open_table(self.table_name).add(accumulated_data)
                else:
                    self.db.create_table(self.table_name, data=accumulated_data)
            
            cap.release()
            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            self.jobs[job_id]["progress_label"] = "Finished"
            gc.collect()

        except Exception as e:
            print(f"Indexing error: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            gc.collect()

    def search(self, query: str, video_path: Optional[str] = None):
        try:
            if self.table_name not in self.db.table_names():
                print(f"[SEARCH] Table {self.table_name} not found.")
                return []
            model = self._get_model()
            table = self.db.open_table(self.table_name)
            
            # Use normalized embeddings for cosine similarity
            query_embeddings = model.encode([query], normalize_embeddings=True)
            query_embedding = query_embeddings[0].tolist()
            
            # 1. Visual Search (Vector) - Use cosine metric
            query_builder = table.search(query_embedding).metric("cosine").limit(80)
            if video_path:
                norm_path = self._normalize_path(video_path)
                escaped_path = self._escape_path(norm_path)
                query_builder = query_builder.where(f"video_path = '{escaped_path}'")
            
            results = query_builder.to_list()
            
            # 2. Text Search (Hybrid Scoring)
            formatted_results = []
            query_terms = query.lower().split()

            for res in results:
                # With cosine metric, distance is 1 - cosine_similarity
                visual_distance = res.get("_distance", 1.0)
                visual_score = max(0, 1 - visual_distance)
                
                # Semantic boost if keywords appear in transcript
                transcript = res.get("transcript", "").lower()
                text_boost = 0.0
                if transcript:
                    matches = sum(1 for term in query_terms if term in transcript)
                    text_boost = (matches / len(query_terms)) * 0.4 # Max 40% boost

                # Total hybrid score
                # Threshold 0.15 (Validated: CLIP scores for anime often fall between 0.15-0.25)
                combined_score = (visual_score * 0.7) + text_boost
                
                if combined_score > 0.15:
                    formatted_results.append({
                        "timestamp": res["timestamp"],
                        "score": float(min(1.0, combined_score)),
                        "type": "hybrid" if text_boost > 0 else "visual"
                    })
            
            # Task 2.2: Basic Grouping (Merge results within 2 seconds)
            formatted_results.sort(key=lambda x: x["timestamp"])
            merged = []
            if formatted_results:
                current = formatted_results[0]
                for i in range(1, len(formatted_results)):
                    nxt = formatted_results[i]
                    if nxt["timestamp"] - current["timestamp"] <= 2.0:
                        # Keep the one with the higher score
                        if nxt["score"] > current["score"]:
                            current = nxt
                    else:
                        merged.append(current)
                        current = nxt
                merged.append(current)

            merged.sort(key=lambda x: x["score"], reverse=True)
            return merged[:40] # Return top 40 unique moments
        except Exception as e:
            print(f"Search error: {e}")
            return []

    def get_job_status(self, job_id):
        return self.jobs.get(job_id, {"status": "not_found"})

search_service = SearchService()
