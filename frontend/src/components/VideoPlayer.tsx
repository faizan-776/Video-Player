import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Subtitles, Loader2, List, Search as SearchIcon, X, 
  ChevronRight, Zap, Scan
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { bridge, Scene, SearchResult } from '@/bridge';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  src: string;
  isLocal?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, isLocal }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [subtitles, setSubtitles] = useState<{ start: number; end: number; text: string }[]>([]);
  const [detectingScenes, setDetectingScenes] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [showChapters, setShowChapters] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [hoverThumbnail, setHoverThumbnail] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastThumbnailFetch = useRef<number>(0);
  const thumbnailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoSrc = isLocal ? `file:///${src.replace(/\\/g, '/')}` : src;

  // Handle auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showChapters && !showSearch) setShowControls(false);
    }, 3000);
  };

  const handleSeekbarMouseMove = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    setHoverTime(time);
    setHoverX(x);
    
    if (isLocal) {
      const fetchThumbnail = async () => {
        const url = await bridge.getThumbnailUrl(src, time);
        setHoverThumbnail(url);
        lastThumbnailFetch.current = Date.now();
      };

      const now = Date.now();
      const throttleMs = 150;

      if (thumbnailTimeoutRef.current) clearTimeout(thumbnailTimeoutRef.current);

      if (now - lastThumbnailFetch.current > throttleMs) {
        fetchThumbnail();
      } else {
        thumbnailTimeoutRef.current = setTimeout(fetchThumbnail, throttleMs);
      }
    }
  };

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = Math.min(1, Math.max(0, value[0]));
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => { setIsPlaying(true); handleMouseMove(); }
    const handlePause = () => { setIsPlaying(false); setShowControls(true); }

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    if (isLocal) {
      bridge.getScenes(src).then(setScenes).catch(console.error);
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoSrc]);

  const handleGenerateSubtitles = async () => {
    if (!isLocal) return;
    setTranscribing(true);
    try {
      const { job_id } = await bridge.transcribe(src);
      const poll = async () => {
        const status = await bridge.getTranscriptionStatus(job_id);
        if (status.status === 'completed') { setSubtitles(status.result!); setTranscribing(false); }
        else if (status.status === 'failed') { setTranscribing(false); }
        else { setTranscriptionProgress(status.progress); setTimeout(poll, 1000); }
      };
      poll();
    } catch (e) { setTranscribing(false); }
  };

  const handleDetectScenes = async () => {
    if (!isLocal) return;
    setDetectingScenes(true);
    try {
      const { job_id } = await bridge.detectScenes(src);
      const poll = async () => {
        const status = await bridge.getSceneJobStatus(job_id);
        if (status.status === 'completed') { setScenes(status.result!); setDetectingScenes(false); }
        else if (status.status === 'failed') { setDetectingScenes(false); }
        else setTimeout(poll, 1000);
      };
      poll();
    } catch (e) { setDetectingScenes(false); }
  };

  const handleIndexVideo = async () => {
    if (!isLocal) return;
    setIndexing(true);
    try {
      const { job_id } = await bridge.indexVideo(src);
      const poll = async () => {
        const status = await bridge.getIndexJobStatus(job_id);
        if (status.status === 'completed') { setIndexing(false); }
        else if (status.status === 'failed') { setIndexing(false); }
        else { setIndexingProgress(status.progress); setTimeout(poll, 1000); }
      };
      poll();
    } catch (e) { setIndexing(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await bridge.search(searchQuery, src);
      setSearchResults(results);
    } catch (e) { console.error(e); }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentSubtitle = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);

  return (
    <div 
      ref={containerRef}
      className="relative group bg-black rounded-3xl overflow-hidden w-full max-w-7xl aspect-video flex shadow-[0_0_80px_-15px_rgba(0,0,0,0.8)] border border-white/5"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Surface */}
      <div className="relative flex-1 min-w-0 flex items-center justify-center">
        <video ref={videoRef} src={videoSrc} className="w-full h-full object-contain" onClick={togglePlay} />

        {/* Dynamic Subtitles */}
        <AnimatePresence>
          {currentSubtitle && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl text-white text-center text-xl font-medium max-w-[80%] pointer-events-none z-50 border border-white/10 shadow-2xl"
            >
              {currentSubtitle.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Loading Indicator */}
        {(transcribing || detectingScenes || indexing) && (
          <div className="absolute top-8 right-8 flex flex-col gap-3 z-50">
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-black/40 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 shadow-2xl w-56 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  {transcribing ? "Transcribing" : detectingScenes ? "Analyzing Scenes" : "Indexing Visuals"}
                </span>
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              </div>
              {(transcribing || indexing) && (
                <div className="space-y-1">
                  <Progress value={transcribing ? transcriptionProgress : indexingProgress} className="h-1 bg-white/10" />
                  <div className="flex justify-between text-[8px] font-bold font-mono opacity-40">
                    <span>PROGRESS</span>
                    <span>{transcribing ? transcriptionProgress : indexingProgress}%</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Modern Controls */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-all duration-700 pointer-events-none z-40",
          showControls ? "opacity-100" : "opacity-0"
        )} />

        <div className={cn(
          "absolute inset-x-8 bottom-8 flex flex-col gap-6 transition-all duration-500 z-40",
          showControls ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          {/* Seekbar */}
          <div className="relative group/seekbar" onMouseMove={handleSeekbarMouseMove} onMouseLeave={() => setHoverTime(null)}>
            <AnimatePresence>
              {hoverTime !== null && hoverThumbnail && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.9 }} animate={{ opacity: 1, y: -130, scale: 1 }} exit={{ opacity: 0 }}
                  className="absolute z-50 pointer-events-none"
                  style={{ left: hoverX, transform: 'translateX(-50%)' }}
                >
                  <div className="bg-zinc-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl w-48 aspect-video flex flex-col p-1">
                    <img src={hoverThumbnail} className="w-full h-full object-cover rounded-xl" />
                    <div className="pt-1 text-[10px] font-black font-mono text-center text-white/40">
                      {formatTime(hoverTime)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <Slider value={[currentTime]} max={duration} step={0.1} onValueChange={handleSeek} className="cursor-pointer" />

            {/* Visual Markers */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 pointer-events-none px-1">
              {scenes.map((scene, i) => (
                <div key={i} className="absolute w-px h-full bg-white/30" style={{ left: `${(scene.start / duration) * 100}%` }} />
              ))}
              {searchResults.map((res, i) => (
                <div key={i} className="absolute w-1 h-3 -translate-y-1 bg-white shadow-[0_0_15px_white] rounded-full transition-all" style={{ left: `${(res.timestamp / duration) * 100}%` }} />
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10">
              <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform active:scale-95">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              
              <div className="w-px h-4 bg-white/10 mx-1" />
              
              <div className="flex items-center gap-3 group/volume">
                <button onClick={() => setIsMuted(!isMuted)} className="text-white opacity-60 hover:opacity-100 transition-opacity">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-20" />
              </div>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <span className="text-[10px] font-black font-mono tracking-widest text-white/40">
                {formatTime(currentTime)} <span className="text-white/10">/</span> {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white/5 backdrop-blur-2xl p-1 rounded-2xl border border-white/10">
                <Button 
                  variant="ghost" size="icon" 
                  onClick={handleIndexVideo} 
                  className={cn("w-9 h-9 rounded-xl transition-all", indexing && "animate-pulse text-emerald-400")}
                  title="AI Visual Indexing"
                >
                  <Zap className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" size="icon" 
                  onClick={handleDetectScenes} 
                  className={cn("w-9 h-9 rounded-xl transition-all", detectingScenes && "animate-pulse text-blue-400")}
                  title="Detect Scenes"
                >
                  <Scan className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" size="icon" 
                  onClick={handleGenerateSubtitles} 
                  className={cn("w-9 h-9 rounded-xl transition-all", transcribing && "animate-pulse text-purple-400")}
                  title="Generate AI Subtitles"
                >
                  <Subtitles className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center bg-white/5 backdrop-blur-2xl p-1 rounded-2xl border border-white/10">
                <Button 
                  variant="ghost" size="icon" 
                  onClick={() => { setShowSearch(!showSearch); setShowChapters(false); }} 
                  className={cn("w-9 h-9 rounded-xl transition-all", showSearch && "bg-white/10 text-white")}
                >
                  <SearchIcon className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" size="icon" 
                  onClick={() => { setShowChapters(!showChapters); setShowSearch(false); }} 
                  className={cn("w-9 h-9 rounded-xl transition-all", showChapters && "bg-white/10 text-white")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" size="icon" 
                  onClick={toggleFullscreen} 
                  className="w-9 h-9 rounded-xl text-white/60 hover:text-white"
                >
                  {document.fullscreenElement ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Side Panels */}
      <AnimatePresence>
        {(showChapters || showSearch) && (
          <motion.div 
            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-[380px] bg-zinc-950/80 backdrop-blur-3xl border-l border-white/5 flex flex-col h-full z-50 relative"
          >
            <div className="p-8 flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">
                  {showChapters ? "Navigation" : "Visual Search"}
                </h3>
                <h2 className="text-xl font-medium tracking-tight">
                  {showChapters ? "Chapters" : "AI Search"}
                </h2>
              </div>
              <Button 
                variant="ghost" size="icon" 
                onClick={() => { setShowChapters(false); setShowSearch(false); }} 
                className="w-10 h-10 rounded-full border border-white/5 bg-white/5 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-8 pb-8">
              {showChapters ? (
                <div className="space-y-4">
                  {scenes.length > 0 ? (
                    scenes.map((scene, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSeek([scene.start])} 
                        className={cn(
                          "w-full text-left p-6 rounded-2xl transition-all border group/item flex flex-col gap-2", 
                          currentTime >= scene.start && currentTime < (scenes[i+1]?.start || duration) 
                            ? "bg-white text-black border-white shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]" 
                            : "bg-white/5 text-white/50 border-white/5 hover:border-white/10 hover:bg-white/[0.08]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Scene {scene.number}</span>
                          <ChevronRight className="w-3 h-3 opacity-20 group-hover/item:translate-x-1 transition-transform" />
                        </div>
                        <span className="text-lg font-mono font-medium tracking-tighter">{formatTime(scene.start)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="py-20 text-center space-y-6">
                      <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto opacity-20">
                        <Scan className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">No scenes detected</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">Let AI analyze the video to generate chapters automatically.</p>
                      </div>
                      <Button variant="outline" onClick={handleDetectScenes} className="rounded-xl border-white/10 hover:bg-white hover:text-black transition-all">Analyze Video</Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative group/search">
                    <Input 
                      placeholder="Search visual objects, places..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                      className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 text-sm focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-600" 
                    />
                    <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/search:text-white transition-colors" />
                  </div>

                  <div className="space-y-3">
                    {searchResults.length > 0 ? (
                      searchResults.map((res, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleSeek([res.timestamp])} 
                          className="w-full text-left p-6 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 hover:border-white/10 flex items-center justify-between group/res"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 opacity-60">Visual Match</span>
                            <span className="text-xl font-mono font-medium tracking-tighter">{formatTime(res.timestamp)}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-black opacity-20 mb-1">CONFIDENCE</div>
                            <Badge variant="secondary" className="bg-white/10 text-white font-mono border-none px-2 py-0.5">{Math.round(res.score * 100)}%</Badge>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="py-20 text-center space-y-6">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto opacity-20">
                          <Zap className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Semantic Search</p>
                          <p className="text-xs text-zinc-500 leading-relaxed">Search for things like "a car", "mountains", or "person".</p>
                        </div>
                        {indexing ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Indexing... {indexingProgress}%</span>
                          </div>
                        ) : (
                          <Button variant="outline" onClick={handleIndexVideo} className="rounded-xl border-white/10 hover:bg-white hover:text-black transition-all">Index for Search</Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
