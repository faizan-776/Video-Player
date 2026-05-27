import re
import json
import threading
from typing import Dict, Any, List

class DiagnosticLogger:
    """Trace AI component inputs/outputs for debugging 'White Box' failures."""
    def __init__(self):
        self.trace: List[Dict[str, Any]] = []
        self._lock = threading.Lock()

    def log(self, component: str, timestamp: float, input_data: Any, output_data: Any, metadata: Dict = None):
        with self._lock:
            self.trace.append({
                "component": component,
                "timestamp": timestamp,
                "input": input_data,
                "output": output_data,
                "metadata": metadata or {}
            })

    def save(self, file_path: str):
        with self._lock:
            with open(file_path, "w") as f:
                json.dump(self.trace, f, indent=2)
            print(f"[DIAGNOSTIC] Trace saved to {file_path}")

    def clear(self):
        with self._lock:
            self.trace = []

diagnostic_logger = DiagnosticLogger()

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
