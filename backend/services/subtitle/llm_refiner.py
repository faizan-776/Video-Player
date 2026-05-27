import os
import threading
from typing import Optional, Any
from services.utils import diagnostic_logger

class LLMRefiner:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(LLMRefiner, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized: return
        self.model = None
        self.tokenizer = None
        self._initialized = True

    def _lazy_load(self):
        if self.model is not None or hasattr(self, 'refiner'): return
        
        try:
            # UPGRADE: Using flan-t5-base (250M params) for significantly better reasoning
            # than 'small' while still fitting in 8GB RAM.
            model_id = "google/flan-t5-base"
            print(f"[INFO] Loading Stronger Subtitle Refiner ({model_id})...")
            from transformers import pipeline
            self.refiner = pipeline("text2text-generation", model=model_id, device="cpu")
            self.model = model_id
            print("[SUCCESS] Stronger Subtitle Refiner is ready.")
        except Exception as e:
            print(f"[WARN] Could not load LLM Refiner: {e}. Falling back to rule-based refinement.")
            self.refiner = None

    def refine(self, text: str, context: Any, style: str = "dramatic") -> str:
        self._lazy_load()
        
        if not self.refiner:
            return self._rule_based_fallback(text, str(context))

        try:
            # Handle structured context
            label = "general"
            visuals = "general"
            if isinstance(context, dict):
                label = context.get("label", "general")
                visuals = context.get("visual_keywords", "general")
            else:
                label = str(context)

            # --- ARBITRATION: Grounded Logic ---
            text_lower = text.lower()
            hallucination_detected = False
            
            # 1. Local Contradiction (Visuals vs Text)
            # If Whisper says 'singing' in an action scene, it's 100% wrong.
            if any(w in text_lower for w in ["sing", "song", "melody", "music"]):
                if "combat" in visuals or "shouting" in visuals or "emotional" in visuals:
                    hallucination_detected = True
            
            # 2. Global Dramatic Guardrail
            if any(w in text_lower for w in ["time to sing", "sing a song"]):
                hallucination_detected = True

            # --- PRE-LLM HARD CORRECTION ---
            # If it's a confirmed hallucination, don't even risk the LLM being creative.
            # Directly map it to the most likely intent based on visuals.
            if hallucination_detected:
                corrected = text
                if "combat" in visuals: corrected = "Let's fight!"
                elif "shouting" in visuals: corrected = "Prepare yourself!"
                elif "emotional" in visuals: corrected = "I'll never forgive you..."
                else: corrected = "Let's go!" # General action fallback
                
                diagnostic_logger.log("BrainAI (LLM)", 0, {"hallucination": text}, corrected, {"mode": "hard_correction"})
                return corrected

            # --- STYLISTIC REFINEMENT ---
            # Forced Creative Paraphrasing
            prompt = (
                f"Instructions: You are an expert Anime Localizer. "
                f"Rewrite this line to be much more poetic, intense, and dramatic. "
                f"Use high-level vocabulary (e.g., 'wonderful', 'magnificent', 'eternal').\n"
                f"Scene: {visuals}\n"
                f"Original: {text}\n"
                f"Anime Style Rewrite:"
            )
            
            result = self.refiner(prompt, max_new_tokens=40, do_sample=True, temperature=0.9)
            refined = result[0]['generated_text'].strip()
            
            # Post-processing cleanup
            if "Rewrite" in refined:
                refined = refined.split(":")[-1].strip()
            
            # Restore basic apostrophes
            if "Its " in refined and "Its " not in text: refined = refined.replace("Its ", "It's ")
            if "Im " in refined and "Im " not in text: refined = refined.replace("Im ", "I'm ")
            
            refined = refined.replace('"', '').replace("'", "")

            # QUALITY CHECK: If the model was lazy and just returned the original, 
            # we do a simple manual "Drama Boost" for common simple phrases.
            if refined.lower() == text.lower().replace("'", ""):
                if "good night" in text.lower():
                    refined = "What a wonderful night..."
                elif "begin" in text.lower():
                    refined = "Now... let us begin!"
            
            # --- VALIDATION ---
            if not refined or len(refined) < 3:
                return self._rule_based_fallback(text, label)

            from services.search_service import search_service
            similarity = search_service.calculate_similarity(text, refined)
            
            # DIAGNOSTIC: Log the Brain AI's reasoning
            diagnostic_logger.log(
                component="BrainAI (LLM)",
                timestamp=0,
                input_data={"original": text, "visuals": visuals, "prompt": prompt},
                output_data=refined,
                metadata={"similarity": float(similarity)}
            )

            # General guardrail for semantic drift
            if similarity < 0.40: # Lowered to allow more 'creative' dramatic changes
                return text
                
            return refined
        except Exception as e:
            return self._rule_based_fallback(text, str(context))

    def _rule_based_fallback(self, text: str, context: str) -> str:
        # Fallback logic if LLM fails or is not available
        refined = text.strip()
        if context == "combat" or context == "shouting":
            refined = refined.upper()
            if not refined.endswith('!'): refined += '!'
        return refined

llm_refiner = LLMRefiner()
