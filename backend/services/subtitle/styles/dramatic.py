from .base import SubtitleStyle
from ..llm_refiner import llm_refiner
import re
from typing import Any

class DramaticStyle(SubtitleStyle):
    def process(self, text: str, context: Any = "general") -> str:
        if not text: return ""
        
        # Ensure context is a dict for the LLM
        if isinstance(context, str):
            context = {"label": context, "visual_keywords": "general", "original_text": text}

        # Phase 1: AI-Enhanced Refinement
        # We pass the full context dict to the LLM
        refined = llm_refiner.refine(text, context, style="dramatic")
        
        # Phase 2: Post-LLM Cleanup (Genre tropes)
        label = context.get("label", "general")
        if label == "combat" or label == "shouting":
            if len(refined.split()) <= 3 and not refined.endswith('!'):
                refined = refined.upper() + "!"

        if label == "serious" and not refined.endswith('...'):
            if "wait" in refined.lower() or "what" in refined.lower():
                refined = refined.replace(".", "...")
                
        return refined

    def get_name(self) -> str:
        return "dramatic"
