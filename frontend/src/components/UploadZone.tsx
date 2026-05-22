import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Video, FolderPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
}

const VIDEO_CONFIG = {
  label: "Videos",
  hint: "MP4, WEBM, MKV, MOV, AVI",
  accept: { "video/*": [".mp4", ".webm", ".mkv", ".mov", ".avi"] },
};

export const UploadZone: React.FC<UploadZoneProps> = ({ 
  onFilesSelected, 
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: VIDEO_CONFIG.accept,
    noClick: true, // Disable click-to-open on the entire zone
    multiple: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onDrag, onDragStart, onDragEnd, ...rootProps } = getRootProps();

  return (
    <div className="w-full flex flex-col items-center gap-12">
      <div className="relative w-full max-w-4xl group">
        <div className="relative h-96">
          {/* CONTENT LAYER */}
          <div 
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center p-12 pointer-events-none transition-all duration-150",
              isDragActive ? "z-0" : "z-20"
            )}
          >
            <div className="flex flex-col items-center text-center gap-8">
              <div className="p-8 rounded-[3rem] bg-background/50 border border-border shadow-2xl relative">
                <Video size={64} strokeWidth={1.5} className="text-primary/60" />
              </div>

              <div className="flex flex-col items-center gap-2">
                <h3 className="text-3xl font-bold tracking-tight">
                  Drop video here
                </h3>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/30">
                  DRAG & DROP TO UPLOAD · {VIDEO_CONFIG.hint}
                </p>
              </div>
            </div>
          </div>

          {/* ACTIVE DROP ZONE - grey borders by default as requested */}
          <motion.div
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...(rootProps as any)}
            initial={false}
            animate={{ 
              scale: isDragActive ? 1.02 : 1,
              backgroundColor: isDragActive ? "var(--glass-bg-matte)" : "var(--glass-bg)",
              borderColor: isDragActive ? "var(--primary)" : "var(--border)",
              backdropFilter: isDragActive ? "blur(40px)" : "blur(20px)",
              borderRadius: isDragActive ? "4rem" : "3.5rem",
              boxShadow: isDragActive ? "0 32px 64px -16px rgba(0,0,0,0.1)" : "none",
              zIndex: isDragActive ? 40 : 10,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute inset-x-0 inset-y-0 border-4 border-dashed flex items-center justify-center cursor-default"
          >
            <input {...getInputProps()} />
            
            <AnimatePresence>
              {isDragActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="z-50"
                >
                  <span className="text-5xl font-bold text-primary/40 uppercase tracking-tighter">Drop here</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Import button below and middle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        className="flex items-center gap-4 px-12 py-5 bg-primary text-primary-foreground rounded-full text-lg font-bold shadow-2xl shadow-primary/20 transition-all z-30"
      >
        <FolderPlus size={24} strokeWidth={2.5} />
        Import
      </motion.button>
    </div>
  );
};
