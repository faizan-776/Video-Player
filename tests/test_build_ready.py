import os
import sys
import subprocess

def check_build_readiness():
    print("Checking build readiness...")
    
    # 1. Check backend binary
    backend_exe = os.path.join("backend", "dist", "main.exe")
    if not os.path.exists(backend_exe):
        print(f"[ERROR] Backend binary not found at {backend_exe}")
        print("Please run 'cd backend; pyinstaller main.spec' first.")
        return False
    else:
        print("[OK] Backend binary found.")

    # 2. Check for symlink privileges (Windows specific)
    if sys.platform == "win32":
        print("Checking for symbolic link privileges...")
        test_link = "test_symlink"
        test_target = "test_target"
        try:
            with open(test_target, "w") as f:
                f.write("test")
            os.symlink(test_target, test_link)
            os.remove(test_link)
            os.remove(test_target)
            print("[OK] Symbolic link privileges confirmed.")
        except OSError:
            if os.path.exists(test_target):
                os.remove(test_target)
            print("[ERROR] Symbolic link privileges NOT held.")
            print("\n>>> SOLUTION: Enable 'Developer Mode' in Windows Settings or run your terminal as Administrator.")
            print(">>> Settings -> Update & Security -> For developers -> Developer Mode")
            return False

    return True

if __name__ == "__main__":
    if check_build_readiness():
        print("\n[RESULT] Build readiness check passed.")
        sys.exit(0)
    else:
        print("\n[RESULT] Build readiness check failed.")
        sys.exit(1)
