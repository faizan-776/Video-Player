export interface PingResponse {
  status: string;
  message: string;
}

export interface TranscribeResponse {
  job_id: string;
}

export interface TranscriptionJobStatus {
  status: 'processing' | 'completed' | 'failed' | 'not_found';
  progress: number;
  result?: { start: number; end: number; text: string }[];
  error?: string;
}

export interface Scene {
  number: number;
  start: number;
  end: number;
}

export interface SceneJobStatus {
  status: 'processing' | 'completed' | 'failed' | 'not_found';
  progress: number;
  result?: Scene[];
  error?: string;
}

export interface SearchResult {
  timestamp: number;
  score: number;
}

class SidecarBridge {
  private port: number | null = null;

  async getPort(): Promise<number> {
    if (this.port !== null) return this.port;
    try {
      // @ts-ignore
      if (window.ipcRenderer) {
        // @ts-ignore
        this.port = await window.ipcRenderer.invoke('get-sidecar-port');
      } else {
        console.warn('ipcRenderer not found, falling back to default port 8000');
        this.port = 8000;
      }
    } catch (e) {
      console.error('Failed to get port from Electron, falling back to 8000:', e);
      this.port = 8000;
    }
    return this.port!;
  }

  async getBaseUrl(): Promise<string> {
    const port = await this.getPort();
    return `http://127.0.0.1:${port}`;
  }

  async ping(): Promise<PingResponse> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/ping`);
    return await response.json();
  }

  async transcribe(filePath: string): Promise<TranscribeResponse> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath }),
    });
    return await response.json();
  }

  async getTranscriptionStatus(jobId: string): Promise<TranscriptionJobStatus> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/transcribe/${jobId}`);
    return await response.json();
  }

  async detectScenes(filePath: string): Promise<{ job_id: string }> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/detect-scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath }),
    });
    return await response.json();
  }

  async getSceneJobStatus(jobId: string): Promise<SceneJobStatus> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/detect-scenes/${jobId}`);
    return await response.json();
  }

  async getScenes(filePath: string): Promise<Scene[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/scenes?file_path=${encodeURIComponent(filePath)}`);
    return await response.json();
  }

  async indexVideo(filePath: string): Promise<{ job_id: string }> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/index-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath }),
    });
    return await response.json();
  }

  async getIndexJobStatus(jobId: string): Promise<{ status: string; progress: number }> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/index-video/${jobId}`);
    return await response.json();
  }

  async search(query: string, videoPath?: string): Promise<SearchResult[]> {
    const baseUrl = await this.getBaseUrl();
    let url = `${baseUrl}/search?query=${encodeURIComponent(query)}`;
    if (videoPath) url += `&video_path=${encodeURIComponent(videoPath)}`;
    const response = await fetch(url);
    return await response.json();
  }

  async getThumbnailUrl(filePath: string, timestamp: number): Promise<string> {
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/thumbnail?file_path=${encodeURIComponent(filePath)}&t=${timestamp}`;
  }

  async getVideoUrl(filePath: string): Promise<string> {
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/video?path=${encodeURIComponent(filePath)}`;
  }
}

export const bridge = new SidecarBridge();
