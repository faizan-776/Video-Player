import { useState, useEffect } from "react"
import { VideoPlayer } from "./components/VideoPlayer"
import { UploadZone } from "./components/UploadZone"
import { bridge } from "./bridge"
import { Button } from "@/components/ui/button"
import { Film, CheckCircle2, Loader2, Moon, Sun, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

function App() {
  const [backendStatus, setBackendStatus] = useState<"connecting" | "connected" | "failed">("connecting")
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [showModeMenu, setShowModeMenu] = useState(false)
  
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await bridge.ping()
        if (response.status === "ok") {
          setBackendStatus("connected")
        }
      } catch (error) {
        console.error("Backend ping failed:", error)
        setBackendStatus("failed")
      }
    }
    checkBackend()
    
    // Default to user preference or dark
    const savedTheme = localStorage.getItem("theme") as "light" | "dark"
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    } else {
      document.documentElement.classList.add('dark')
    }

    // Listen for menu import trigger
    const importListener = () => {
      handleOpenFile()
    }

    if (window.ipcRenderer) {
      // @ts-ignore
      window.ipcRenderer.on('trigger-import', importListener)
    }
    
    return () => {
      if (window.ipcRenderer) {
        // @ts-ignore
        window.ipcRenderer.off('trigger-import', importListener)
      }
    }
  }, [])

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    setShowModeMenu(false)
  }

  const handleOpenFile = async () => {
    if (!window.ipcRenderer) {
      console.warn("IPC renderer not available")
      return
    }
    // @ts-ignore
    const path = await window.ipcRenderer.invoke('open-file')
    if (path) {
      setVideoPath(path)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex flex-col font-sans overflow-x-hidden transition-colors duration-300">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/[0.05] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/[0.05] blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-50 px-8 py-4 flex items-center justify-between border-b border-border bg-background/20 backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Film className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-lg">Video-Zone</span>
          </div>

          {/* Top Menu Simulation */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <button className="text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1">
                File <ChevronDown size={12} />
              </button>
              <div className="absolute top-full left-0 mt-2 w-40 bg-popover border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 z-50">
                <button 
                  onClick={handleOpenFile}
                  className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-accent transition-colors"
                >
                  Import
                </button>
              </div>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
              >
                Mode <ChevronDown size={12} />
              </button>
              <AnimatePresence>
                {showModeMenu && (
                  <>
                    <div className="fixed inset-0" onClick={() => setShowModeMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-40 bg-popover border border-border rounded-lg shadow-xl py-2 z-50"
                    >
                      <button 
                        onClick={() => toggleTheme("light")}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-accent transition-colors flex items-center justify-between"
                      >
                        Light Mode
                        <Sun size={12} className={cn(theme === "light" && "text-primary")} />
                      </button>
                      <button 
                        onClick={() => toggleTheme("dark")}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-accent transition-colors flex items-center justify-between"
                      >
                        Dark Mode
                        <Moon size={12} className={cn(theme === "dark" && "text-primary")} />
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {backendStatus === "connecting" && (
              <motion.div 
                key="connecting"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border"
              >
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Connecting</span>
              </motion.div>
            )}
            {backendStatus === "connected" && (
              <motion.div 
                key="connected"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20"
              >
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">System Ready</span>
              </motion.div>
            )}
            {/* Removed OFFLINE status UI as requested */}
          </AnimatePresence>
          
          {videoPath && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setVideoPath(null)}
              className="text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              Close File
            </Button>
          )}
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!videoPath ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-5xl"
            >
              <UploadZone 
                onFilesSelected={(files) => {
                  const file = files[0];
                  if (file && (file as any).path) {
                    setVideoPath((file as any).path);
                  }
                }} 
              />
            </motion.div>
          ) : (
            <motion.div 
              key="player"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full max-w-7xl flex items-center justify-center max-h-[calc(100vh-200px)]"
            >
              <VideoPlayer src={videoPath} isLocal={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 px-8 py-6 flex items-center justify-between border-t border-border text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <div>&copy; 2026 Video-Zone</div>
        <div className="flex gap-6">
          <span className="hover:text-foreground cursor-pointer transition-colors">Documentation</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
        </div>
      </footer>
    </div>
  )
}

export default App
