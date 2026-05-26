import re

def anime_translation_fixer(text: str) -> str:
    """Task 3.2: Clean up common Argos Translate quirks and anime-specific terminology."""
    if not text: return ""
    
    cleaned = text
    # Fix honorifics separately to handle callable properly
    cleaned = re.sub(r"\b(san|kun|chan|sama)\b", lambda m: m.group(0).capitalize(), cleaned, flags=re.IGNORECASE)
    
    # Fix standard words
    fixes = {
        r"\b(nani)\b": "What",
        r"\b(itai)\b": "Ouch",
        r"\b(yamete)\b": "Stop",
        r"\b(gomen)\b": "Sorry",
        r"\b(arigato)\b": "Thanks",
        r"\b(matte)\b": "Wait",
        r"  +": " ", # Double spaces
    }
    
    for pattern, replacement in fixes.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
            
    return cleaned.strip().capitalize()
