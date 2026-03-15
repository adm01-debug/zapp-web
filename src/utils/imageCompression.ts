/**
 * Client-side image compression utility
 * Compresses images before upload to reduce storage usage and improve upload speed
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  maxSizeMB?: number;
  outputType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSizeMB: 2,
  outputType: 'image/jpeg',
};

/**
 * Creates an image element from a File
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculates new dimensions maintaining aspect ratio
 */
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

/**
 * Compresses an image file
 * Returns the compressed file and metadata
 */
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

  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      width: 0,
      height: 0,
      wasCompressed: false,
    };
  }

  // Skip compression for GIFs (loses animation)
  if (file.type === 'image/gif') {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      width: 0,
      height: 0,
      wasCompressed: false,
    };
  }

  // Skip if already under size limit
  const maxSizeBytes = (opts.maxSizeMB || 2) * 1024 * 1024;
  if (originalSize <= maxSizeBytes) {
    // Still resize if needed
    const img = await loadImage(file);
    const dims = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      opts.maxWidth || 1920,
      opts.maxHeight || 1920
    );

    if (dims.width === img.naturalWidth && dims.height === img.naturalHeight) {
      URL.revokeObjectURL(img.src);
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        width: img.naturalWidth,
        height: img.naturalHeight,
        wasCompressed: false,
      };
    }
  }

  const img = await loadImage(file);
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth || 1920,
    opts.maxHeight || 1920
  );

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  // Convert to blob with quality
  const outputType = opts.outputType || 'image/jpeg';
  let quality = opts.quality || 0.8;

  let blob = await canvasToBlob(canvas, outputType, quality);

  // Iteratively reduce quality if still too large
  while (blob.size > maxSizeBytes && quality > 0.1) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  // Create new File from blob
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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      type,
      quality
    );
  });
}

/**
 * Creates an instant preview URL for an image file
 */
export function createImagePreview(file: File): string | null {
  if (!file.type.startsWith('image/')) return null;
  return URL.createObjectURL(file);
}

/**
 * Formats file size reduction info
 */
export function formatCompressionInfo(
  originalSize: number,
  compressedSize: number
): string {
  const savedBytes = originalSize - compressedSize;
  const savedPercent = Math.round((savedBytes / originalSize) * 100);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };
  return `${formatSize(originalSize)} → ${formatSize(compressedSize)} (-${savedPercent}%)`;
}
