import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onClose?: () => void;
}

export function ImagePreview({ src, alt = 'Image', onClose }: ImagePreviewProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
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
              setIsZoomed(!isZoomed);
            }}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
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

      {/* Image */}
      <motion.img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        animate={{ scale: isZoomed ? 1.5 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl cursor-zoom-in"
        style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
      />
    </motion.div>
  );
}

interface MessageImageProps {
  src: string;
  alt?: string;
}

export function MessageImage({ src, alt = 'Image' }: MessageImageProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative cursor-pointer overflow-hidden rounded-lg"
        onClick={() => setShowPreview(true)}
      >
        {!isLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
        )}
        <motion.img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          className="max-w-[280px] max-h-[200px] object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
          <span className="text-primary-foreground text-xs font-medium">Clique para expandir</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPreview && (
          <ImagePreview src={src} alt={alt} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
