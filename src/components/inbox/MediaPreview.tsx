import { useState, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import { 
  X, 
  Download, 
  Play, 
  Pause, 
  FileText, 
  File, 
  FileSpreadsheet, 
  FileImage, 
  FileArchive, 
  ExternalLink,
  Volume2,
  VolumeX,
  Maximize,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  getFileCategory, 
  formatFileSize, 
  getFileExtension,
  WHATSAPP_FILE_TYPES 
} from '@/utils/whatsappFileTypes';

// Get appropriate icon for file type
function getFileIcon(fileName: string, mimeType?: string) {
  const extension = getFileExtension(fileName).toLowerCase();
  
  // Document types
  if (['pdf'].includes(extension)) {
    return <FileText className="w-8 h-8 text-destructive" />;
  }
  if (['doc', 'docx'].includes(extension)) {
    return <FileText className="w-8 h-8 text-info" />;
  }
  if (['xls', 'xlsx'].includes(extension)) {
    return <FileSpreadsheet className="w-8 h-8 text-success" />;
  }
  if (['ppt', 'pptx'].includes(extension)) {
    return <FileText className="w-8 h-8 text-warning" />;
  }
  if (['zip', 'rar', '7z'].includes(extension)) {
    return <FileArchive className="w-8 h-8 text-warning" />;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return <FileImage className="w-8 h-8 text-primary" />;
  }
  
  return <File className="w-8 h-8 text-muted-foreground" />;
}

// Document Preview Component
interface DocumentPreviewProps {
  url: string;
  fileName: string;
  fileSize?: number;
  isSent: boolean;
}

export function DocumentPreview({ url, fileName, fileSize, isSent }: DocumentPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const extension = getFileExtension(fileName).toUpperCase();

  const handleDownload = async () => {
    // Blocked by security policy
    log.warn('[SECURITY] File download blocked by data protection policy');
    const { toast: toastFn } = await import('sonner');
    toastFn.error('🔒 Download bloqueado por política de segurança', {
      description: 'O download de arquivos está desabilitado para proteção de dados.',
    });
  };

  const handleOpen = () => {
    // Blocked - opening in new tab allows downloading
    import('sonner').then(({ toast }) => {
      toast.error('🔒 Abertura externa bloqueada por política de segurança');
    });
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg min-w-[240px] max-w-[300px] cursor-pointer transition-all",
        isSent 
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/15" 
          : "bg-muted/50 hover:bg-muted/70 border border-border/30"
      )}
      onClick={handleOpen}
    >
      {/* File Icon */}
      <div className={cn(
        "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
        isSent ? "bg-primary-foreground/20" : "bg-card"
      )}>
        {getFileIcon(fileName)}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isSent ? "text-primary-foreground" : "text-foreground"
        )}>
          {fileName}
        </p>
        <div className={cn(
          "flex items-center gap-2 text-xs",
          isSent ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span className="font-medium">{extension}</span>
          {fileSize && (
            <>
              <span>•</span>
              <span>{formatFileSize(fileSize)}</span>
            </>
          )}
        </div>
      </div>

      {/* Download Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          isSent 
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" 
            : "bg-primary/10 hover:bg-primary/20 text-primary"
        )}
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </motion.button>
    </motion.div>
  );
}

// Video Preview Component
interface VideoPreviewProps {
  url: string;
  caption?: string;
  isSent: boolean;
}

export const VideoPreview = forwardRef<HTMLDivElement, VideoPreviewProps>(
  function VideoPreview({ url, caption, isSent }, ref) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div ref={ref}>
      <div className="space-y-2">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative rounded-lg overflow-hidden max-w-[300px] cursor-pointer"
          onClick={() => setShowFullscreen(true)}
        >
          {/* Loading state */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Video */}
          <video
            src={url}
            className="w-full max-h-[200px] object-cover rounded-lg"
            muted={isMuted}
            loop
            playsInline
            onLoadedData={() => setIsLoaded(true)}
            onMouseEnter={(e) => {
              e.currentTarget.play();
              setIsPlaying(true);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
              setIsPlaying(false);
            }}
          />

          {/* Play Overlay */}
          <AnimatePresence>
            {!isPlaying && isLoaded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/30 flex items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-primary ml-0.5" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fullscreen button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowFullscreen(true);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/50 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/70"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* Caption */}
        {caption && (
          <p className={cn(
            "text-sm",
            isSent ? "text-primary-foreground" : "text-foreground"
          )}>
            {caption}
          </p>
        )}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <VideoFullscreen
            url={url}
            onClose={() => setShowFullscreen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

// Video Fullscreen Modal
interface VideoFullscreenProps {
  url: string;
  onClose: () => void;
}

function VideoFullscreen({ url, onClose }: VideoFullscreenProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newRate = speeds[nextIndex];
    setPlaybackRate(newRate);
    if (videoRef.current) videoRef.current.playbackRate = newRate;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex items-center justify-center"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 px-3 font-semibold text-xs"
            onClick={(e) => {
              e.stopPropagation();
              cycleSpeed();
            }}
          >
            {playbackRate}x
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="secondary"
            size="icon"
            disabled
            className="opacity-50 cursor-not-allowed"
            onClick={(e) => {
              e.stopPropagation();
              import('sonner').then(({ toast }) => toast.error('🔒 Download bloqueado por política de segurança'));
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="secondary" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        src={url}
        controls
        controlsList="nodownload"
        autoPlay
        muted={isMuted}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onLoadedMetadata={() => {
          if (videoRef.current) videoRef.current.playbackRate = playbackRate;
        }}
        className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
      />
    </motion.div>
  );
}

// Sticker Preview Component
interface StickerPreviewProps {
  url: string;
  isSent: boolean;
}

export function StickerPreview({ url, isSent }: StickerPreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative"
    >
      {!isLoaded && (
        <div className="w-[120px] h-[120px] bg-muted animate-pulse rounded-lg" />
      )}
      <motion.img
        src={url}
        alt="Sticker"
        onLoad={() => setIsLoaded(true)}
        whileHover={{ scale: 1.1 }}
        className={cn(
          "max-w-[120px] max-h-[120px] object-contain",
          !isLoaded && "hidden"
        )}
      />
    </motion.div>
  );
}

// Combined Media Message Component for ChatPanel
interface MediaMessageProps {
  type: 'video' | 'document' | 'sticker';
  url: string;
  fileName?: string;
  fileSize?: number;
  caption?: string;
  isSent: boolean;
}

export function MediaMessage({ type, url, fileName, fileSize, caption, isSent }: MediaMessageProps) {
  switch (type) {
    case 'video':
      return <VideoPreview url={url} caption={caption} isSent={isSent} />;
    case 'document':
      return (
        <DocumentPreview 
          url={url} 
          fileName={fileName || 'document'} 
          fileSize={fileSize}
          isSent={isSent} 
        />
      );
    case 'sticker':
      return <StickerPreview url={url} isSent={isSent} />;
    default:
      return null;
  }
}
