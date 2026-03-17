import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Image, Play, FileText, Globe, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: 'website' | 'image' | 'video' | 'article';
  favicon?: string;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
  compact?: boolean;
  showRemove?: boolean;
  onRemove?: () => void;
}

// URL regex pattern
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Image file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

function isImageUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext));
}

function isVideoUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext));
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

function getYouTubeThumbnail(url: string): string | null {
  let videoId = null;
  
  if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    videoId = urlParams.get('v');
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  }
  
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
}

function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return url;
  }
}

function getFavicon(url: string): string {
  try {
    const domain = new URL(url).origin;
    return `${domain}/favicon.ico`;
  } catch {
    return '';
  }
}

export function LinkPreview({ url, className, compact = false, showRemove, onRemove }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      setIsLoading(true);
      setError(false);

      try {
        // Check if it's a direct media URL
        if (isImageUrl(url)) {
          setMetadata({
            url,
            type: 'image',
            image: url,
            title: url.split('/').pop() || 'Image',
          });
          setIsLoading(false);
          return;
        }

        if (isVideoUrl(url)) {
          setMetadata({
            url,
            type: 'video',
            title: url.split('/').pop() || 'Video',
          });
          setIsLoading(false);
          return;
        }

        // YouTube special handling
        if (isYouTubeUrl(url)) {
          const thumbnail = getYouTubeThumbnail(url);
          setMetadata({
            url,
            type: 'video',
            title: 'YouTube Video',
            image: thumbnail || undefined,
            siteName: 'YouTube',
            favicon: 'https://www.youtube.com/favicon.ico',
          });
          setIsLoading(false);
          return;
        }

        // For other URLs, we'd normally fetch metadata from a server
        // Here we use client-side fallback
        setMetadata({
          url,
          type: 'website',
          title: getDomain(url),
          siteName: getDomain(url),
          favicon: getFavicon(url),
        });
        setIsLoading(false);
      } catch (err) {
        setError(true);
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50",
          className
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando preview...</span>
      </motion.div>
    );
  }

  if (error || !metadata) {
    return (
      <motion.a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-primary underline-offset-2 hover:underline",
          className
        )}
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span className="truncate">{url}</span>
        <ExternalLink className="w-3 h-3 shrink-0" />
      </motion.a>
    );
  }

  // Direct image preview
  if (metadata.type === 'image' && metadata.image && !imageError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("relative group rounded-xl overflow-hidden", className)}
      >
        {showRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={metadata.image}
            alt={metadata.title || 'Image'}
            onError={() => setImageError(true)}
            className="max-w-full max-h-64 rounded-xl object-cover hover:scale-[1.02] transition-transform"
          />
        </a>
      </motion.div>
    );
  }

  // Compact version
  if (compact) {
    return (
      <motion.a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors group",
          className
        )}
      >
        {metadata.favicon && !imageError ? (
          <img 
            src={metadata.favicon} 
            alt="" 
            className="w-4 h-4 rounded"
            onError={() => setImageError(true)}
          />
        ) : (
          <Globe className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium truncate flex-1">
          {metadata.title || getDomain(url)}
        </span>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
      </motion.a>
    );
  }

  // Full preview card
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "block rounded-xl overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all group",
        className
      )}
    >
      {/* Image/Video thumbnail */}
      {metadata.image && !imageError && (
        <div className="relative aspect-video bg-muted overflow-hidden">
          <img
            src={metadata.image}
            alt={metadata.title || ''}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {metadata.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="p-3 rounded-full bg-white/90 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-black fill-black" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2">
          {metadata.favicon && !imageError ? (
            <img 
              src={metadata.favicon} 
              alt="" 
              className="w-4 h-4 rounded"
              onError={() => setImageError(true)}
            />
          ) : (
            <Globe className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {metadata.siteName || getDomain(url)}
          </span>
        </div>

        {metadata.title && (
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {metadata.title}
          </h4>
        )}

        {metadata.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        )}
      </div>

      {showRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove?.();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.a>
  );
}

// Extract links from text
export function extractLinks(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

// Component to render text with link previews
interface TextWithLinksProps {
  text: string;
  className?: string;
  showPreviews?: boolean;
  maxPreviews?: number;
}

export function TextWithLinks({ text, className, showPreviews = true, maxPreviews = 3 }: TextWithLinksProps) {
  const links = useMemo(() => extractLinks(text), [text]);
  const displayLinks = links.slice(0, maxPreviews);

  // Replace URLs with styled links (sanitize text to prevent XSS)
  const formattedText = useMemo(() => {
    // Escape HTML entities in the original text first
    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let result = escapeHtml(text);
    links.forEach(link => {
      const escapedLink = escapeHtml(link);
      result = result.replace(
        escapedLink,
        `<a href="${encodeURI(link)}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:text-primary/80">${escapedLink}</a>`
      );
    });
    return result;
  }, [text, links]);

  return (
    <div className={cn("space-y-2", className)}>
      <div dangerouslySetInnerHTML={{ __html: formattedText }} />
      
      {showPreviews && displayLinks.length > 0 && (
        <AnimatePresence>
          <div className="space-y-2 pt-2">
            {displayLinks.map((link, index) => (
              <motion.div
                key={link}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <LinkPreview url={link} compact={displayLinks.length > 1} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
