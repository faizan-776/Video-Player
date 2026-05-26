import React, { useState, useEffect } from 'react';
import { bridge } from '@/bridge';
import { 
  X, 
  Activity, 
  FileText, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';

export interface AIJob {
  id: string;
  type: 'transcribe' | 'scenes' | 'index';
  status: 'processing' | 'completed' | 'failed' | 'initializing_ai' | 'translating';
  progress: number;
  label: string;
  progress_label?: string; // New semantic status text
}

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  videoPath: string | null;
  activeJobs: AIJob[];
  onJobUpdate: (job: AIJob) => void;
  onSeek: (time: number) => void;
}

type Tab = 'progress' | 'transcript' | 'scenes' | 'search';

export const AISidebar: React.FC<AISidebarProps> = ({ 
  isOpen, 
  onClose, 
  videoPath, 
  activeJobs,
  onJobUpdate,
  onSeek
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('progress');
  const [transcript, setTranscript] = useState<{ start: number; end: number; text: string }[]>([]);
  const [scenes, setScenes] = useState<{ number: number; start: number; end: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ timestamp: number; score: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !videoPath) return;

    setIsSearching(true);
    try {
      const results = await bridge.search(searchQuery, videoPath);
      setSearchResults(results);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Poll for job updates
  useEffect(() => {
    if (activeJobs.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const job of activeJobs) {
        if (job.status === 'completed' || job.status === 'failed') continue;

        try {
          let status;
          if (job.type === 'transcribe') {
            status = await bridge.getTranscriptionStatus(job.id);
            if (status.status === 'completed' && status.result) {
              setTranscript(status.result);
            }
          } else if (job.type === 'scenes') {
            status = await bridge.getSceneJobStatus(job.id);
            if (status.status === 'completed' && status.result) {
              setScenes(status.result);
            }
          } else if (job.type === 'index') {
            status = await bridge.getIndexJobStatus(job.id);
          }

          if (status) {
            // Auto-switch to search tab when indexing completes
            if (job.type === 'index' && (status.status === 'completed' || status.progress === 100)) {
              // We only switch once
              if (activeTab === 'progress') {
                setActiveTab('search');
              }
            }

            onJobUpdate({
              ...job,
              status: (status.status === 'not_found' ? 'failed' : status.status) as AIJob['status'],
              progress: status.progress || (status.status === 'completed' ? 100 : job.progress),
              progress_label: status.progress_label // Pass through the semantic label
            });
          }
        } catch (e) {
          console.error(`Error polling job ${job.id}:`, e);
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [activeJobs, onJobUpdate, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full bg-[#121212] border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-[200]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
        <div className="flex items-center gap-2 text-white">
          <Activity className="size-4 text-primary" />
          <h2 className="font-bold text-sm tracking-tight">AI COMMAND CENTER</h2>
        </div>
        <button 
          onClick={onClose}
          title="Close"
          className="p-1 hover:bg-white/5 rounded-md transition-colors text-white/40 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-black/20 gap-1 overflow-x-auto no-scrollbar">
        {(['progress', 'transcript', 'scenes', 'search'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 px-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap",
              activeTab === tab 
                ? "bg-[#1a1a1a] text-primary shadow-sm" 
                : "text-white/40 hover:text-white/60"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area with Custom Scrollbar */}
      <div className="flex-1 overflow-y-scroll custom-sidebar-scrollbar overflow-x-hidden">
        <div className="p-4 space-y-4">
          
          {activeTab === 'progress' && (
            <div className="space-y-4">
              {activeJobs.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Activity className="size-8 text-white/5 mx-auto" />
                  <p className="text-xs text-white/20">No active AI tasks</p>
                </div>
              ) : (
                activeJobs.map((job) => (
                  <div key={job.id} className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-white/60 uppercase">{job.label}</span>
                      {(job.status === 'processing' || job.status === 'initializing_ai' || job.status === 'translating') && (
                        <Loader2 className="size-3 text-primary animate-spin" />
                      )}
                      {job.status === 'completed' && <CheckCircle2 className="size-3 text-green-500" />}
                      {job.status === 'failed' && <AlertCircle className="size-3 text-red-500" />}
                    </div>
                    <Progress value={job.progress} className="h-1" />
                    <div className="flex justify-between text-[11px] font-mono text-white/30">
                      <span className="capitalize">
                        {job.progress_label || (
                          job.status === 'initializing_ai' ? 'Initializing...' : 
                          job.status === 'translating' ? 'Translating...' : 
                          job.status
                        )}
                      </span>
                      <span>{Math.round(job.progress)}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="space-y-3">
              {transcript.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <FileText className="size-8 text-white/5 mx-auto" />
                  <p className="text-xs text-white/20">Run Transcription to see text</p>
                </div>
              ) : (
                transcript.map((item, i) => {
                  const formatTime = (time: number) => {
                    const m = Math.floor(time / 60);
                    const s = (time % 60).toFixed(2).padStart(5, '0');
                    return `${m}:${s}`;
                  };

                  return (
                    <button 
                      key={i} 
                      onClick={() => onSeek(item.start)}
                      className="w-full text-left group hover:bg-white/5 p-2 rounded-lg transition-colors border border-transparent hover:border-white/5"
                    >
                      <span className="text-[11px] font-mono text-primary/60 block mb-1">
                        {formatTime(item.start)} — {formatTime(item.end)}
                      </span>
                      <p className="text-[14px] leading-relaxed text-white/70 group-hover:text-white transition-colors">
                        {item.text}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'scenes' && (
            <div className="space-y-2">
              {scenes.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Film className="size-8 text-white/5 mx-auto" />
                  <p className="text-xs text-white/20">Detect Scenes to see chapters</p>
                </div>
              ) : (
                scenes.map((scene) => {
                  const formatTime = (seconds: number) => {
                    const m = Math.floor(seconds / 60);
                    const s = Math.floor(seconds % 60);
                    return `${m}:${s.toString().padStart(2, '0')}`;
                  };

                  return (
                    <button 
                      key={scene.number}
                      onClick={() => onSeek(scene.start)}
                      className="w-full text-left bg-[#1a1a1a] p-3 rounded-xl border border-white/5 hover:border-primary/30 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-sm font-bold text-white/90">Scene {scene.number}</p>
                        <p className="text-[12px] text-white/40 font-mono">
                          {formatTime(scene.start)} — {formatTime(scene.end)}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-white/10 group-hover:text-primary transition-colors" />
                    </button>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search visual moments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-primary transition-colors"
                >
                  {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </button>
              </form>

              <div className="space-y-2">
                {searchResults.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="size-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <Search className="size-6 text-white/10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white/40">Visual Search Ready</p>
                      <p className="text-[10px] text-white/20 px-10">Describe a scene (e.g. "a fight" or "sunset") to find it.</p>
                    </div>
                  </div>
                ) : (
                  searchResults.map((result, i) => {
                    const formatTime = (seconds: number) => {
                      const m = Math.floor(seconds / 60);
                      const s = Math.floor(seconds % 60);
                      return `${m}:${s.toString().padStart(2, '0')}`;
                    };

                    return (
                      <button 
                        key={i}
                        onClick={() => onSeek(result.timestamp)}
                        className="w-full text-left bg-[#1a1a1a] p-3 rounded-xl border border-white/5 hover:border-primary/30 transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="size-1.5 rounded-full bg-primary/60" />
                            <p className="text-xs font-bold text-white/90">Matched Moment</p>
                          </div>
                          <p className="text-[11px] text-white/40 font-mono ml-3.5">
                            Jump to {formatTime(result.timestamp)}
                          </p>
                        </div>
                        <div className="text-[10px] font-bold text-primary/60 bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                          {Math.round(result.score * 100)}%
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-sidebar-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-sidebar-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.2);
        }
        .custom-sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-primary, #10b981);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* Footer Info */}
      <div className="p-3 bg-black/40 border-t border-white/5 text-[9px] text-white/20 text-center">
        POWERED BY GEMINI VISION & WHISPER AI
      </div>
    </div>
  );
};
