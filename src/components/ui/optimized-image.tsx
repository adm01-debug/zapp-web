import React, { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { useLazyLoad } from '@/hooks/usePerformance';
import { Skeleton } from './skeleton';
import { ImageIcon } from 'lucide-react';

// ============================================
// OPTIMIZED IMAGE COMPONENTS
// ============================================

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  placeholder?: 'skeleton' | 'blur' | 'icon';
  aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9' | 'auto';
  priority?: boolean;
  onLoadComplete?: () => void;
  containerClassName?: string;
}

/**
 * Optimized image with lazy loading and placeholder support
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallback,
  placeholder = 'skeleton',
  aspectRatio = 'auto',
  priority = false,
  onLoadComplete,
  className,
  containerClassName,
  ...props
}: OptimizedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { hasLoaded: shouldLoad } = useLazyLoad(containerRef, 0.1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const shouldRender = priority || shouldLoad;

  const aspectRatioClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    '21:9': 'aspect-[21/9]',
    'auto': '',
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoadComplete?.();
  };

  const handleError = () => {
    setHasError(true);
    if (fallback) {
      // Will try fallback image
    }
  };

  const renderPlaceholder = () => {
    if (placeholder === 'skeleton') {
      return <Skeleton className="absolute inset-0 w-full h-full" />;
    }
    if (placeholder === 'icon') {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      );
    }
    if (placeholder === 'blur') {
      return (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      );
    }
    return null;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        aspectRatioClasses[aspectRatio],
        containerClassName
      )}
    >
      {!isLoaded && !hasError && renderPlaceholder()}
      
      {shouldRender && (
        <img
          src={hasError && fallback ? fallback : src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
        />
      )}
    </div>
  );
});

interface AvatarImageOptimizedProps {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

/**
 * Optimized avatar image with fallback
 */
export const AvatarImageOptimized = memo(function AvatarImageOptimized({
  src,
  alt,
  fallbackText,
  size = 'md',
  className,
}: AvatarImageOptimizedProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Skip expired WhatsApp CDN URLs to avoid 403 errors
  const isExpiredCdn = src?.includes('pps.whatsapp.net') || src?.includes('mmg.whatsapp.net');

  const initials = fallbackText
    ? fallbackText
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : alt.slice(0, 2).toUpperCase();

  if (!src || hasError || isExpiredCdn) {
    return (
      <div
        className={cn(
          'rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center',
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-full overflow-hidden', sizeClasses[size], className)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-full" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
});

interface ImageGalleryProps {
  images: Array<{ src: string; alt: string }>;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  aspectRatio?: '1:1' | '4:3' | '16:9';
  onImageClick?: (index: number) => void;
}

/**
 * Optimized image gallery with masonry-like layout
 */
export const ImageGallery = memo(function ImageGallery({
  images,
  columns = 3,
  gap = 'md',
  aspectRatio = '1:1',
  onImageClick,
}: ImageGalleryProps) {
  const gapClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4',
  };

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap])}>
      {images.map((image, index) => (
        <button
          key={`${image.src}-${index}`}
          onClick={() => onImageClick?.(index)}
          className="relative group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg overflow-hidden"
        >
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            aspectRatio={aspectRatio}
            placeholder="skeleton"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-300" />
        </button>
      ))}
    </div>
  );
});

interface ResponsiveImageProps extends OptimizedImageProps {
  srcSet?: string;
  sizes?: string;
}

/**
 * Responsive image with srcset support
 */
export const ResponsiveImage = memo(function ResponsiveImage({
  src,
  srcSet,
  sizes,
  ...props
}: ResponsiveImageProps) {
  return (
    <OptimizedImage
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      {...props}
    />
  );
});
