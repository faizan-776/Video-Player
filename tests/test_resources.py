import psutil
import os
import sys

def check_resources():
    print("Checking system resources...")
    
    # Check RAM
    ram = psutil.virtual_memory()
    total_gb = ram.total / (1024**3)
    available_gb = ram.available / (1024**3)
    print(f"RAM: {available_gb:.2f} GB available / {total_gb:.2f} GB total")
    
    if available_gb < 2:
        print("[WARNING] Low available RAM. Loading AI models might crash the system.")
    
    # Check Disk
    disk = psutil.disk_usage('.')
    free_gb = disk.free / (1024**3)
    print(f"Disk Space: {free_gb:.2f} GB free")
    
    if free_gb < 1:
        print("[WARNING] Low disk space. Vector DB and model downloads might fail.")

    # Check for GPU (simplistic)
    try:
        import torch
        if torch.cuda.is_available():
            print(f"GPU: {torch.cuda.get_device_name(0)} (CUDA available)")
            vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            print(f"VRAM: {vram:.2f} GB")
        else:
            print("GPU: CUDA not available. Running on CPU.")
    except ImportError:
        print("GPU: torch not installed, skipping CUDA check.")

    return True

if __name__ == "__main__":
    check_resources()
