export type MediaCategory = "image" | "video" | "audio" | "document";

export type ProcessMode = "convert" | "compress" | "resize" | "trim" | "extract";

export interface FileData {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "idle" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
}

export interface ProcessingOptions {
  [key: string]: any;
}

export const SUPPORTED_FORMATS = {
  image: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"],
  video: [".mp4", ".webm", ".mkv", ".mov", ".avi"],
  audio: [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"],
  document: [".pdf", ".docx", ".md", ".txt", ".html"],
};
