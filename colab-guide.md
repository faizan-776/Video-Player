# Video Player 2.0: Colab Backend Workflow

This guide details how to host your AI backend on Google Colab and connect it to your local Electron frontend.

---

## 🏗️ Phase 1: First-Time Developer (Initial Setup)
*Only do these steps the very first time you set up the environment.*

1.  **Open the Notebook**: Open `google-colab.ipynb` in VS Code or [Google Colab](https://colab.research.google.com).
2.  **Install Dependencies**: Run **Cell 1** (`!pip install ...`). This prepares the Colab environment.
3.  **Authentication**:
    *   In **Cell 2**, enter your [Ngrok Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) when prompted:
        `3CrkpoSMpH9ZweNd8wJlCrxftWz_2kXHmr5N1sYwBxyFEXTBx`
4.  **Browser Trust**:
    *   Once the tunnel starts, open the generated URL in your browser (Chrome/Edge).
    *   Click the blue **"Visit Site"** button to accept the ngrok cookie.
5.  **App Configuration**:
    *   Open the Electron App.
    *   Press **Ctrl + Shift + I** to open the Console.
    *   Run: `localStorage.setItem('BACKEND_URL', 'https://your-url.ngrok-free.app')`
    *   Restart the app (**Ctrl + R**).

---

## 🚀 Phase 2: Returning Developer (Daily Workflow)
*Follow these steps every time you start a new session.*

### 1. Start the Backend
*   Open the `google-colab.ipynb` file.
*   **Run Cell 2 (Tunnel)**: It will generate a new URL. **Copy it.**
*   **Run Cell 3 (Backend)**: This starts the AI services.

### 2. Bypass Ngrok Interstitial
*   Paste your **new URL** into your web browser.
*   Click **"Visit Site"**. (You must do this once per session/URL).

### 3. Update the App Bridge
*   Open your **Electron App**.
*   Press **Ctrl + Shift + I** to open the Console.
*   Run the command with your new URL:
    ```javascript
    localStorage.setItem('BACKEND_URL', 'PASTE_NEW_URL_HERE')
    ```
*   Press **Ctrl + R** to refresh. 

---

## 📝 Important Reminders
*   **Colab Paths**: When opening a video for AI processing, remember to upload it to Colab and use the `/content/filename.mp4` path.
*   **Sessions**: If Colab disconnects, you will get a new URL and must repeat **Phase 2**.
