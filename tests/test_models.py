import time
import sys
import psutil

def test_model_loading():
    print("Testing heavy model loading...")
    
    try:
        print("1. Loading Whisper (base)...")
        from faster_whisper import WhisperModel
        start = time.time()
        # Loading with cpu and int8 as in the app
        whisper = WhisperModel("base", device="cpu", compute_type="int8")
        print(f"[OK] Whisper loaded in {time.time() - start:.2f}s")
        
        mem = psutil.virtual_memory()
        print(f"Memory used: {mem.percent}% ({mem.available / (1024**3):.2f} GB available)")
        
        print("\n2. Loading CLIP (ViT-B-32)...")
        from sentence_transformers import SentenceTransformer
        start = time.time()
        # Loading with cpu as in the app
        clip = SentenceTransformer('clip-ViT-B-32', device='cpu')
        print(f"[OK] CLIP loaded in {time.time() - start:.2f}s")
        
        mem = psutil.virtual_memory()
        print(f"Memory used: {mem.percent}% ({mem.available / (1024**3):.2f} GB available)")
        
        print("\n[RESULT] Models loaded successfully without crashing.")
        return True
    except Exception as e:
        print(f"\n[ERROR] Model loading failed: {e}")
        return False

if __name__ == "__main__":
    if test_model_loading():
        sys.exit(0)
    else:
        sys.exit(1)
