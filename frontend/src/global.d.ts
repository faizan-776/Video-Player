export interface IpcRendererEvent extends Event {
  sender: unknown; 
}

export interface IpcRenderer {
  on(channel: string, listener: (event: IpcRendererEvent, ...args: unknown[]) => void): void;
  off(channel: string, listener: (event: IpcRendererEvent, ...args: unknown[]) => void): void;
  send(channel: string, ...args: unknown[]): void;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>; // invoke return is usually cast by the caller
}

declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
  }
}
