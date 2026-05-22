import os
import sys
import subprocess
import time
import requests

def check_backend():
    print("Checking backend dependencies...")
    try:
        import fastapi
        import uvicorn
        import faster_whisper
        import sentence_transformers
        import cv2
        print("[OK] All backend dependencies found.")
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        return False

    print("Starting backend in test mode...")
    backend_path = os.path.join(os.getcwd(), "backend", "main.py")
    port = 8999
    
    # Start backend as a subprocess
    process = subprocess.Popen([sys.executable, backend_path, str(port)], 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE,
                               text=True)
    
    success = False
    try:
        # Wait for backend to be ready
        for _ in range(30):
            try:
                response = requests.get(f"http://127.0.0.1:{port}/ping", timeout=1)
                if response.status_code == 200:
                    print(f"[OK] Backend responded: {response.json()}")
                    success = True
                    break
            except requests.exceptions.RequestException:
                time.sleep(1)
        
        if not success:
            print("[ERROR] Backend failed to respond to ping.")
            # Check stderr
            _, stderr = process.communicate(timeout=1)
            print(f"Backend stderr: {stderr}")
            
    finally:
        process.terminate()
        process.wait()
    
    return success

if __name__ == "__main__":
    if check_backend():
        print("\n[RESULT] Backend system check passed.")
        sys.exit(0)
    else:
        print("\n[RESULT] Backend system check failed.")
        sys.exit(1)
