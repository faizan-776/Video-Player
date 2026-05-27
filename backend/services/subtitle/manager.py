from .engine import subtitle_engine
from .styles.standard import StandardStyle
from .styles.dramatic import DramaticStyle
from typing import Dict, Any

class SubtitleManager:
    def __init__(self):
        self.styles = {
            "standard": StandardStyle(),
            "dramatic": DramaticStyle()
        }
        self._video_contexts: Dict[str, str] = {}

    def get_style(self, video_path: str):
        if video_path not in self._video_contexts:
            # Determine global genre once per video
            genre = subtitle_engine.get_global_context(video_path)
            self._video_contexts[video_path] = genre
        
        genre = self._video_contexts[video_path]
        return self.styles.get(genre, self.styles["standard"])

    def process_segment(self, text: str, timestamp: float, video_path: str) -> str:
        """Process a single transcription segment with context-aware styling."""
        style = self.get_style(video_path)
        
        # Determine local tone (combat, serious, etc) - Now returns a dict
        context_data = subtitle_engine.get_local_context(text, timestamp, video_path)
        
        # Apply the style
        return style.process(text, context=context_data)

subtitle_manager = SubtitleManager()
