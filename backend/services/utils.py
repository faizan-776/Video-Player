import threading

# A global lock to ensure only one heavy AI task runs at a time
# This prevents system crashes on mid-range hardware (like i5-6th Gen / 8GB RAM)
AI_RESOURCE_LOCK = threading.Lock()
