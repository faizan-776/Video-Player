from .base import SubtitleStyle
import re

class StandardStyle(SubtitleStyle):
    def process(self, text: str, context: str = "general") -> str:
        if not text: return ""
        
        # Formal grammar cleanup
        cleaned = text.strip()
        
        # Ensure first letter is capitalized
        if cleaned:
            cleaned = cleaned[0].upper() + cleaned[1:]
            
        # Ensure it ends with proper punctuation if missing
        if cleaned and cleaned[-1] not in ['.', '?', '!', '...']:
            cleaned += '.'
            
        return cleaned

    def get_name(self) -> str:
        return "standard"
