/**
 * Client-side image compression utility
 * Optimized for fast WhatsApp uploads
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  maxSizeMB?: number;
  outputType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1280,   // WhatsApp recommended max
  maxHeight: 1280,
  quality: 0.75,
  maxSizeMB: 1,     // Faster uploads with 1MB target
  outputType: 'image/webp', // WebP is ~30% smaller than JPEG
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  wasCompressed: boolean;
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;
  const maxSizeBytes = (opts.maxSizeMB || 1) * 1024 * 1024;

  // Skip non-images and GIFs
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return { file, originalSize, compressedSize: originalSize, compressionRatio: 1, width: 0, height: 0, wasCompressed: false };
  }

  // Use OffscreenCanvas if available (faster, no DOM)
  const useOffscreen = typeof OffscreenCanvas !== 'undefined';

  const img = await loadImage(file);
  const { width, height } = calculateDimensions(
    img.naturalWidth, img.naturalHeight,
    opts.maxWidth || 1280, opts.maxHeight || 1280
  );

  // Skip if already small enough and no resize needed
  if (originalSize <= maxSizeBytes && width === img.naturalWidth && height === img.naturalHeight) {
    return { file, originalSize, compressedSize: originalSize, compressionRatio: 1, width, height, wasCompressed: false };
  }

  // Determine output type - use WebP if supported, fallback to JPEG
  let outputType = opts.outputType || 'image/webp';

  let blob: Blob;

  if (useOffscreen) {
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(img, 0, 0, width, height);

    blob = await offscreen.convertToBlob({ type: outputType, quality: opts.quality || 0.75 });

    // If WebP blob is empty or too large, try reducing quality in bigger steps
    if (blob.size > maxSizeBytes) {
      let q = (opts.quality || 0.75) - 0.15;
      while (blob.size > maxSizeBytes && q > 0.2) {
        blob = await offscreen.convertToBlob({ type: outputType, quality: q });
        q -= 0.15;
      }
    }

    // If still too large, fall back to JPEG (better compression for photos)
    if (blob.size > maxSizeBytes && outputType === 'image/webp') {
      outputType = 'image/jpeg';
      blob = await offscreen.convertToBlob({ type: outputType, quality: 0.6 });
    }
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(img, 0, 0, width, height);

    blob = await canvasToBlob(canvas, outputType, opts.quality || 0.75);

    if (blob.size > maxSizeBytes) {
      let q = (opts.quality || 0.75) - 0.15;
      while (blob.size > maxSizeBytes && q > 0.2) {
        blob = await canvasToBlob(canvas, outputType, q);
        q -= 0.15;
      }
    }

    if (blob.size > maxSizeBytes && outputType === 'image/webp') {
      outputType = 'image/jpeg';
      blob = await canvasToBlob(canvas, outputType, 0.6);
    }
  }

  const ext = outputType === 'image/webp' ? 'webp' : outputType === 'image/png' ? 'png' : 'jpg';
  const compressedFile = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, `.${ext}`),
    { type: outputType }
  );

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
    compressionRatio: compressedFile.size / originalSize,
    width,
    height,
    wasCompressed: true,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => { if (blob) resolve(blob); else reject(new Error('Canvas toBlob failed')); },
      type, quality
    );
  });
}

export function createImagePreview(file: File): string | null {
  if (!file.type.startsWith('image/')) return null;
  return URL.createObjectURL(file);
}

export function formatCompressionInfo(originalSize: number, compressedSize: number): string {
  const savedPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100);
  const fmt = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;
  return `${fmt(originalSize)} → ${fmt(compressedSize)} (-${savedPercent}%)`;
}
