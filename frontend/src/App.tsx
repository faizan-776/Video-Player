import { useState, useEffect } from "react"
import { VideoPlayer } from "./components/VideoPlayer"
import { AISidebar, AIJob } from "./components/AISidebar"
import { bridge } from "./bridge"

function App() {
  const [videoPath, setVideoPath] = useState<string | null>(localStorage.getItem('video-path'))
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeJobs, setActiveJobs] = useState<AIJob[]>([])
  const [seekTime, setSeekTime] = useState<number | null>(null)
  
  useEffect(() => {
    if (videoPath) {
      localStorage.setItem('video-path', videoPath)
    } else {
      localStorage.removeItem('video-path')
    }
  }, [videoPath])

  useEffect(() => {
    // Initial theme and palette application
    const savedTheme = localStorage.getItem('theme') || 'light'
    const savedPalette = localStorage.getItem('palette') || ''
    
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    if (savedPalette) {
      document.documentElement.classList.add(`theme-${savedPalette}`)
    }

    if (bridge.isElectron && window.ipcRenderer) {
      window.ipcRenderer.on('trigger-import', async () => {
        const path = await bridge.openFile()
        if (path) setVideoPath(path)
      })

      window.ipcRenderer.on('go-home', () => {
        setVideoPath(null);
        setIsSidebarOpen(false);
        setActiveJobs([]);
      })
      
      window.ipcRenderer.on('set-theme', (_event, theme) => {
        localStorage.setItem('theme', theme)
        document.documentElement.classList.toggle('dark', theme === 'dark')
      })

      window.ipcRenderer.on('set-palette', (_event, palette) => {
        // Remove existing theme classes
        document.documentElement.classList.forEach(cls => {
          if (cls.startsWith('theme-')) {
            document.documentElement.classList.remove(cls)
          }
        })
        
        if (palette) {
          localStorage.setItem('palette', palette)
          document.documentElement.classList.add(`theme-${palette}`)
        } else {
          localStorage.removeItem('palette')
        }
      })
    }
  }, [])

  const handleRegisterJob = (job: AIJob) => {
    setActiveJobs(prev => {
      if (prev.some(p => p.type === job.type && p.status === 'processing')) return prev;
      return [...prev, job];
    });
    setIsSidebarOpen(true);
  };

  const handleJobUpdate = (updatedJob: AIJob) => {
    setActiveJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col items-center justify-center relative">
      {!videoPath ? (
        <div className="w-full max-w-2xl bg-card border border-border p-12 rounded-[2.5rem] shadow-2xl text-center animate-in fade-in zoom-in duration-500">
          <h1 className="text-5xl font-extrabold mb-4 text-primary tracking-tight">Video Zone</h1>
          <p className="text-muted-foreground mb-10 text-lg">Your minimal, powerful video companion</p>
          
          <button 
            onClick={async () => {
              console.log('[App] Open Video File button clicked');
              const path = await bridge.openFile()
              console.log('[App] bridge.openFile path:', path);
              if (path) {
                setVideoPath(path)
              } else {
                // TEMPORARY: Browser support allows this to be reached without alert
                // REVERT: Consider restoring the Electron-only alert if strict environment enforcement is desired
                console.log('[App] No path returned (cancelled or error)');
              }
            }}
            className="px-10 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-xl shadow-primary/20"
          >
            Open Video File
          </button>
        </div>
      ) : (
        <div className="flex w-full h-full relative overflow-hidden bg-black/95">
          <div className="flex-1 relative flex items-center justify-center p-4 min-w-0 transition-all duration-300">
            {/* Close button at top left - Reduced by 40% */}
            <button 
              onClick={() => {
                setVideoPath(null);
                setIsSidebarOpen(false);
                setActiveJobs([]);
              }}
              className="absolute top-6 left-6 z-[100] flex items-center gap-1.5 px-4 py-2 bg-card/90 hover:bg-destructive hover:text-destructive-foreground border border-border backdrop-blur-xl rounded-xl transition-all cursor-pointer shadow-xl group font-bold text-sm"
              title="Close Video"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              <span>Close</span>
            </button>
            
            {/* Video Container - Reduced by 30%, Fixed size, Slightly rounded */}
            <div className="w-[840px] h-[472px] rounded-2xl shadow-2xl border border-white/10 bg-black overflow-hidden relative">
              <VideoPlayer 
                src={videoPath} 
                onRegisterJob={handleRegisterJob}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                externalSeekTime={seekTime}
                onExternalSeekComplete={() => setSeekTime(null)}
              />
            </div>
          </div>

          <AISidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            videoPath={videoPath}
            activeJobs={activeJobs}
            onJobUpdate={handleJobUpdate}
            onSeek={(time) => setSeekTime(time)}
          />
        </div>
      )}
    </div>
  )
}

export default App
