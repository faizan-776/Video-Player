import { app } from 'electron';
import child_process from 'node:child_process';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';

let sidecarProcess: child_process.ChildProcess | null = null;
let sidecarPort: number = 8000;

/**
 * Find a free port to run the sidecar on.
 */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Check if the sidecar is responding to pings.
 */
async function waitForSidecar(port: number, timeout = 120000): Promise<boolean> {
  const start = Date.now();
  console.log(`[WAIT] Initializing AI models (Whisper/CLIP)...`);
  
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/ping`, (res) => {
          if (res.statusCode === 200) resolve(true);
          else reject();
        });
        req.on('error', reject);
        req.setTimeout(1000, () => { req.destroy(); reject(); });
        req.end();
      });
      console.log(`[OK] Backend ready in ${((Date.now() - start) / 1000).toFixed(1)}s`);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.log(`[ERROR] Backend failed to start.`);
  return false;
}

/**
 * Start the Python sidecar process.
 */
export async function startSidecar() {
  try {
    sidecarPort = await findFreePort();
    console.log(`\n[SIDE] Starting AI services on port ${sidecarPort}`);

    const isPackaged = app.isPackaged;
    let pythonPath: string;
    let scriptPath: string;

    if (!isPackaged) {
      pythonPath = process.platform === 'win32' ? 'python' : 'python3';
      const projectRoot = path.join(process.cwd(), '..');
      scriptPath = path.join(projectRoot, 'backend', 'main.py');
      sidecarProcess = child_process.spawn(pythonPath, [scriptPath, sidecarPort.toString()]);
    } else {
      const binaryName = process.platform === 'win32' ? 'main.exe' : 'main';
      scriptPath = path.join(process.resourcesPath, 'python_bin', binaryName);
      sidecarProcess = child_process.spawn(scriptPath, [binaryName, sidecarPort.toString()]);
    }

    const logPrefix = '\x1b[34m[Python]\x1b[0m'; // Blue prefix

    sidecarProcess.stdout?.on('data', (data) => {
      data.toString().split('\n').forEach((line: string) => {
        if (line.trim()) console.log(`${logPrefix} ${line.trim()}`);
      });
    });

    sidecarProcess.stderr?.on('data', (data) => {
      data.toString().split('\n').forEach((line: string) => {
        const clean = line.trim();
        if (!clean) return;
        if (clean.includes('slow image processor')) {
          // Subtle log for the known warning
          console.log(`${logPrefix} \x1b[2m(Notice) ${clean}\x1b[0m`);
        } else {
          console.log(`${logPrefix} ${clean}`);
        }
      });
    });

    return await waitForSidecar(sidecarPort);
  } catch (error) {
    console.error('Failed to start sidecar:', error);
    return null;
  }
}

/**
 * Stop the Python sidecar process.
 */
export function stopSidecar() {
  if (sidecarProcess) {
    sidecarProcess.kill();
    sidecarProcess = null;
  }
}

export function getSidecarPort() {
  return sidecarPort;
}
