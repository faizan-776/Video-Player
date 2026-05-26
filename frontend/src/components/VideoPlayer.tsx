import React, { useRef, useState, useEffect, useCallback } from 'react';
import { bridge } from '@/bridge';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  FastForward,
  Rewind,
  Languages,
  Film,
  Database,
  Search,
  Settings2,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIJob } from './AISidebar';

interface VideoPlayerProps {
  src: string;
  isLocal?: boolean;
  onRegisterJob?: (job: AIJob) => void;
  toggleSidebar?: () => void;
  externalSeekTime?: number | null;
  onExternalSeekComplete?: () => void;
}

type AspectRatioMode = 'original' | 'fit' | 'stretch';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  isLocal = true,
  onRegisterJob,
  toggleSidebar,
  externalSeekTime,
  onExternalSeekComplete
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [preMuteVolume, setPreMuteVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // New Control Logic States
  const [controlsVisible, setControlsVisible] = useState(true);
  const [manuallyToggled, setManuallyToggled] = useState(false);
  
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [aspectMode, setAspectRatioMode] = useState<AspectRatioMode>('original');
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  
  // AI Feature States (Local UI feedback)
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDetectingScenes, setIsDetectingScenes] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);

  // Handle automatic control visibility
  useEffect(() => {
    if (isPlaying) {
      // Automatic hide on play after 0.5s
      const timer = setTimeout(() => {
        setControlsVisible(false);
        setManuallyToggled(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Automatic show on pause
      setControlsVisible(true);
      setManuallyToggled(false);
    }
  }, [isPlaying]);

  // Handle external seek requests from AI Sidebar
  useEffect(() => {
    if (externalSeekTime !== null && externalSeekTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = externalSeekTime;
      setCurrentTime(externalSeekTime);
      onExternalSeekComplete?.();
    }
  }, [externalSeekTime, onExternalSeekComplete]);

  useEffect(() => {
    if (isLocal) {
      bridge.getVideoUrl(src).then(setVideoSrc);
    } else {
      setVideoSrc(src);
    }
  }, [src, isLocal]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime);
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [videoSrc, isScrubbing]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const skip = useCallback((amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0] / 100;
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      if (newVolume > 0) {
        setPreMuteVolume(newVolume);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.muted) {
        videoRef.current.muted = false;
        videoRef.current.volume = preMuteVolume;
      } else {
        setPreMuteVolume(videoRef.current.volume);
        videoRef.current.muted = true;
      }
    }
  }, [preMuteVolume]);

  const handleProgressChange = useCallback((value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [duration]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setAspectRatioMode('original');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skip(5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skip(-5);
      } else if (e.code === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, isFullscreen, toggleFullscreen]);

  // AI Feature Handlers
  const handleTranscribe = async (targetLanguage: string = 'en') => {
    if (isTranscribing) return;
    setIsTranscribing(true);
    setShowTranslateMenu(false);
    try {
      const resp = await bridge.transcribe(src, targetLanguage);
      onRegisterJob?.({
        id: resp.job_id,
        type: 'transcribe',
        status: 'processing',
        progress: 0,
        label: `Transcription (${targetLanguage.toUpperCase()})`
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDetectScenes = async () => {
    if (isDetectingScenes) return;
    setIsDetectingScenes(true);
    try {
      const resp = await bridge.detectScenes(src);
      onRegisterJob?.({
        id: resp.job_id,
        type: 'scenes',
        status: 'processing',
        progress: 0,
        label: 'Scene Detection'
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDetectingScenes(false);
    }
  };

  const handleIndexVideo = async () => {
    if (isIndexing) return;
    setIsIndexing(true);
    try {
      const resp = await bridge.indexVideo(src);
      onRegisterJob?.({
        id: resp.job_id,
        type: 'index',
        status: 'processing',
        progress: 0,
        label: 'Video Indexing'
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsIndexing(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const getVideoClass = () => {
    if (!isFullscreen) return "w-full h-full object-contain";
    
    switch (aspectMode) {
      case 'stretch': return "w-full h-full object-fill";
      case 'fit': return "w-full h-full object-contain";
      default: return "w-auto h-auto object-contain max-w-full max-h-full";
    }
  };

  const isVisible = controlsVisible || manuallyToggled;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center bg-black group overflow-hidden",
        isFullscreen && "fixed inset-0 z-[50]"
      )}
    >
      {videoSrc && (
        <video 
          ref={videoRef} 
          src={videoSrc} 
          className={getVideoClass()}
          onDoubleClick={toggleFullscreen}
          onClick={togglePlay}
        />
      )}

      {/* Manual Toggle Button (Down Arrow) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[70] transition-opacity duration-300">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setManuallyToggled(!manuallyToggled)}
          className="bg-black/20 backdrop-blur-sm text-white/50 hover:text-white hover:bg-black/40 rounded-full !transition-all"
        >
          {isVisible ? <ChevronDown className="size-6" /> : <ChevronUp className="size-6" />}
        </Button>
      </div>

      {/* Controls Container */}
      <div className={cn(
        "absolute inset-0 z-[60] flex flex-col justify-end p-6 gap-3 transition-transform duration-500 pointer-events-none",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent -z-10" />

        {/* Progress Bar */}
        <div className="bg-[#1a1a1a]/80 backdrop-blur-sm px-4 py-1 w-full rounded-2xl border border-white/5 pointer-events-auto">
          <Slider 
            value={[duration && !isNaN(duration) ? (currentTime / duration) * 100 : 0]} 
            max={100} 
            step={0.01}
            onValueChange={handleProgressChange}
            onPointerDown={() => setIsScrubbing(true)}
            onPointerUp={() => setIsScrubbing(false)}
            className="w-full"
          />
        </div>

        {/* Control Buttons Bar */}
        <div className="bg-[#1a1a1a]/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between w-full rounded-2xl border border-white/10 pointer-events-auto shadow-2xl relative text-white">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0">
              {isPlaying ? <Pause className="fill-white" /> : <Play className="fill-white" />}
            </Button>
            
            <Button variant="ghost" size="icon" onClick={() => skip(-10)} className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0">
              <Rewind />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={() => skip(10)} className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0">
              <FastForward />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-1 ml-1">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0">
                {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
              </Button>
              <div className="w-24 overflow-hidden">
                <Slider 
                  value={[isMuted ? 0 : volume * 100]} 
                  max={100} 
                  onValueChange={handleVolumeChange}
                  className="w-20 ml-2"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Features */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowTranslateMenu(!showTranslateMenu)}
                  className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0"
                  title="Translate Subtitles"
                  disabled={isTranscribing}
                >
                  {isTranscribing ? <Loader2 className="size-5 animate-spin" /> : <Languages className="size-5" />}
                </Button>

                {showTranslateMenu && (
                  <div className="absolute bottom-full left-0 mb-4 w-40 bg-[#1a1a1a] border border-white/10 rounded-2xl p-1 shadow-2xl z-[100]">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 font-bold">Translate to</div>
                    {[
                      { id: 'en', label: 'English' },
                      { id: 'ja', label: 'Japanese' },
                      { id: 'fr', label: 'French' },
                      { id: 'es', label: 'Spanish' },
                      { id: 'de', label: 'German' },
                      { id: 'zh', label: 'Chinese' },
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] text-white/60 hover:bg-white/5 hover:text-white !transition-none !active:scale-100"
                        onClick={() => handleTranscribe(lang.id)}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDetectScenes}
                className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0"
                title="Detect Scenes"
                disabled={isDetectingScenes}
              >
                {isDetectingScenes ? <Loader2 className="size-5 animate-spin" /> : <Film className="size-5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleIndexVideo}
                className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0"
                title="Index for Search"
                disabled={isIndexing}
              >
                {isIndexing ? <Loader2 className="size-5 animate-spin" /> : <Database className="size-5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0"
                title="AI Command Center"
              >
                <Search className="size-5" />
              </Button>
            </div>

            {/* Aspect Ratio Menu */}
            {isFullscreen && (
              <div className="relative pointer-events-auto">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0", aspectMode !== 'original' && "text-primary")}
                  title="Screen Format"
                  onClick={() => setShowAspectMenu(!showAspectMenu)}
                >
                  <Settings2 className="size-5" />
                </Button>

                {showAspectMenu && (
                  <div className="absolute bottom-full right-0 mb-4 w-36 bg-[#1a1a1a] border border-white/10 rounded-2xl p-1 shadow-2xl">
                    {[
                      { id: 'original', label: 'Default', tooltip: 'Keep Original Ratio' },
                      { id: 'fit', label: 'Fit-Window', tooltip: 'Fit to Window' },
                      { id: 'stretch', label: 'Stretch', tooltip: 'Stretch to Fill' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] !transition-none !active:scale-100 group relative",
                          aspectMode === mode.id ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                        onClick={() => {
                          setAspectRatioMode(mode.id as AspectRatioMode);
                          setShowAspectMenu(false);
                        }}
                      >
                        <span>{mode.label}</span>
                        {aspectMode === mode.id && <Check className="size-3.5 text-primary" />}
                        
                        {/* Compact Tooltip */}
                        <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-[10px] py-1 px-2 rounded-md whitespace-nowrap border border-white/10 pointer-events-none z-[100]">
                          {mode.tooltip}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span className="text-xs text-white/90 font-medium tabular-nums select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen} 
              className="text-white hover:bg-transparent !transition-none !active:scale-100 !active:translate-y-0 focus:ring-0 focus:outline-none"
            >
              {isFullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>
      </div>

      {/* Central Play/Pause Indicator (Overlay) */}
      <div className={cn(
        "absolute inset-0 z-[70] flex items-center justify-center pointer-events-none transition-opacity duration-300",
        !isPlaying ? "opacity-100" : "opacity-0"
      )}>
        <div className="bg-black/50 backdrop-blur-sm rounded-full p-6 border border-white/10 shadow-2xl">
           <Play className="size-8 fill-white text-white ml-1" />
        </div>
      </div>
    </div>
  );
};
