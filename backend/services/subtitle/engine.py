import numpy as np
from services.search_service import search_service

class ContextEngine:
    def __init__(self):
        self.action_keywords = ["fight", "battle", "shout", "explosion", "combat", "running", "action"]
        self.edu_keywords = ["lecture", "tutorial", "lesson", "explaining", "presentation", "news", "educational"]
        
    def get_global_context(self, video_path: str) -> str:
        """Determines if the video is 'dramatic/action' or 'standard/educational'."""
        try:
            # Query the CLIP search engine for genre markers
            # We check for action-like moments
            action_hits = search_service.search("action anime fight battle", video_path)
            edu_hits = search_service.search("educational lecture tutorial presentation", video_path)
            
            # Simple scoring based on hit counts and scores
            action_score = sum(h["score"] for h in action_hits)
            edu_score = sum(h["score"] for h in edu_hits)
            
            if action_score > edu_score:
                return "dramatic"
            return "standard"
        except Exception as e:
            print(f"[DEBUG] ContextEngine failed: {e}")
            return "standard" # Default safe choice

    def get_local_context(self, text: str, timestamp: float, video_path: str) -> dict:
        """Determines the specific sub-context of a segment with visual grounding."""
        text_lower = text.lower()
        
        # 1. Visual Grounding (The "Eyes")
        visual_desc = search_service.get_visual_context(video_path, timestamp)
        
        # 2. Audio/Text Cues
        audio_tone = "general"
        if len(text.split()) < 4 and ("!" in text or text.isupper()):
            audio_tone = "shouting"
        
        combat_triggers = ["die", "kill", "stop", "never", "take this", "bastard", "fight"]
        if any(trigger in text_lower for trigger in combat_triggers):
            audio_tone = "combat"
            
        # 3. Final Decision Logic
        context_label = "general"
        if "combat" in visual_desc or audio_tone == "combat":
            context_label = "combat"
        elif "shouting" in visual_desc or audio_tone == "shouting":
            context_label = "shouting"
        elif "emotional" in visual_desc:
            context_label = "serious"
        elif "talking" in visual_desc:
            context_label = "serious"

        return {
            "label": context_label,
            "visual_keywords": visual_desc,
            "original_text": text
        }

subtitle_engine = ContextEngine()
