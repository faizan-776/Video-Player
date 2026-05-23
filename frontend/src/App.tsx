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
  const [colorPalette, setColorPalette] = useState<string | null>(null)
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showViewMenu, setShowViewMenu] = useState(false)
  const [showHelpMenu, setShowHelpMenu] = useState(false)
  const [showSupportedFormats, setShowSupportedFormats] = useState(false)
  const [displayMode, setDisplayMode] = useState<"fit" | "full" | "popup">("full")
  
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
    const savedPalette = localStorage.getItem("palette")
    
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    } else {
      document.documentElement.classList.add('dark')
    }

    if (savedPalette) {
      setColorPalette(savedPalette)
      document.documentElement.classList.add(`theme-${savedPalette}`)
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
    
    // Light/Dark mode overrides color palette
    if (colorPalette) {
      document.documentElement.classList.remove(`theme-${colorPalette}`)
      setColorPalette(null)
      localStorage.removeItem("palette")
    }
    setShowModeMenu(false)
  }

  const setPalette = (palette: string) => {
    if (colorPalette) {
      document.documentElement.classList.remove(`theme-${colorPalette}`)
    }
    setColorPalette(palette)
    localStorage.setItem("palette", palette)
    document.documentElement.classList.add(`theme-${palette}`)
    setShowThemeMenu(false)
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

  const menus = [
    {
      name: "File",
      isOpen: false, // Not using local state for all for brevity, using group-hover for most
      options: [
        { label: "Import", action: handleOpenFile }
      ]
    },
    {
      name: "View",
      isOpen: showViewMenu,
      setOpen: setShowViewMenu,
      options: [
        { label: "Pop-up", action: () => setDisplayMode("popup") },
        { label: "Full-screen", action: () => setDisplayMode("full") },
        { label: "Fit Display", action: () => setDisplayMode("fit") },
      ]
    },
    {
      name: "Themes",
      isOpen: showThemeMenu,
      setOpen: setShowThemeMenu,
      options: [
        { label: "Sunset (Orange/Red/Dark)", action: () => setPalette("sunset") },
        { label: "Forest (Green/Emerald/Dark)", action: () => setPalette("forest") },
        { label: "Ocean (Blue/Cyan/Dark)", action: () => setPalette("ocean") },
        { label: "Nebula (Purple/Pink/Dark)", action: () => setPalette("nebula") },
      ]
    },
    {
      name: "Mode",
      isOpen: showModeMenu,
      setOpen: setShowModeMenu,
      options: [
        { label: "Light Mode", action: () => toggleTheme("light"), icon: <Sun size={12} className={cn(theme === "light" && "text-primary")} /> },
        { label: "Dark Mode", action: () => toggleTheme("dark"), icon: <Moon size={12} className={cn(theme === "dark" && "text-primary")} /> },
      ]
    },
    {
      name: "Help",
      isOpen: showHelpMenu,
      setOpen: setShowHelpMenu,
      options: [
        { label: "Supported Formats", action: () => setShowSupportedFormats(true) }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex flex-col font-sans overflow-hidden transition-colors duration-300">
      {/* Supported Formats Popup */}
      <AnimatePresence>
        {showSupportedFormats && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-popover border border-border p-8 rounded-3xl max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Supported Formats</h2>
                <button onClick={() => setShowSupportedFormats(false)} className="opacity-40 hover:opacity-100 cursor-pointer"><X size={20} /></button>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>Video-Zone supports a wide range of modern video formats:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['.MP4', '.WEBM', '.MKV', '.MOV', '.AVI'].map(fmt => (
                    <div key={fmt} className="bg-muted px-4 py-2 rounded-xl font-mono text-[10px] font-bold">{fmt}</div>
                  ))}
                </div>
              </div>
              <Button onClick={() => setShowSupportedFormats(false)} className="w-full mt-8 rounded-xl cursor-pointer">Close</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background Glow */}
...
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

          {/* New Multi-Menu System */}
          <div className="flex items-center gap-6">
            {menus.map((menu) => (
              <div key={menu.name} className="relative group">
                <button 
                  onClick={() => menu.setOpen?.(!menu.isOpen)}
                  className="text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  {menu.name} <ChevronDown size={12} />
                </button>
                
                {menu.name === "File" ? (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 z-50">
                    {menu.options.map((opt) => (
                      <button 
                        key={opt.label}
                        onClick={opt.action}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-accent transition-colors cursor-pointer"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <AnimatePresence>
                    {menu.isOpen && (
                      <>
                        <div className="fixed inset-0" onClick={() => menu.setOpen?.(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-xl py-2 z-50"
                        >
                          {menu.options.map((opt) => (
                            <button 
                              key={opt.label}
                              // @ts-ignore
                              onClick={opt.action}
                              className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-accent transition-colors flex items-center justify-between cursor-pointer"
                            >
                              {opt.label}
                              {/* @ts-ignore */}
                              {opt.icon}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                )}
              </div>
            ))}
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
              <VideoPlayer src={videoPath} isLocal={true} displayMode={displayMode} onBackToFull={() => setDisplayMode("full")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  )
}

export default App
