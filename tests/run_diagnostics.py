import subprocess
import sys
import os

def run_test(script_name):
    print(f"\n{'='*50}")
    print(f"RUNNING: {script_name}")
    print(f"{'='*50}")
    
    try:
        # Run the script and stream output
        process = subprocess.Popen([sys.executable, f"tests/{script_name}"], 
                                   stdout=subprocess.PIPE, 
                                   stderr=subprocess.STDOUT,
                                   text=True)
        
        for line in process.stdout:
            print(line, end='')
        
        process.wait()
        return process.returncode == 0
    except Exception as e:
        print(f"Error running {script_name}: {e}")
        return False

def main():
    print("AI VIDEO PLAYER - SYSTEM DIAGNOSTICS")
    print("This will check if your system is ready to run the application.")
    
    tests = [
        "test_resources.py",
        "test_backend.py",
        "test_models.py",
        "test_build_ready.py"
    ]
    
    results = []
    for test in tests:
        success = run_test(test)
        results.append((test, success))
    
    print(f"\n\n{'='*50}")
    print("FINAL SUMMARY")
    print(f"{'='*50}")
    all_passed = True
    for test, success in results:
        status = "[PASSED]" if success else "[FAILED]"
        print(f"{test:<20} {status}")
        if not success:
            all_passed = False
    
    if all_passed:
        print("\n[SUCCESS] Your system passed all tests. It should be safe to run the app.")
    else:
        print("\n[FAILURE] Some tests failed. Please check the logs above.")
        print("Tip: If test_models.py failed, you might be out of memory.")

if __name__ == "__main__":
    main()
