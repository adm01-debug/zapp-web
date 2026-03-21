/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/motion', () => ({
  motion: {
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'uploads/test.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.test/uploads/test.jpg' } }),
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('@/hooks/useEvolutionApi', () => ({
  useEvolutionApi: () => ({
    sendMediaMessage: vi.fn().mockResolvedValue({ key: { id: 'ext1' } }),
    sendAudioMessage: vi.fn().mockResolvedValue({ key: { id: 'ext2' } }),
    isLoading: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/imageCompression', () => ({
  compressImage: vi.fn().mockResolvedValue({ wasCompressed: false, file: new File([], 'test.jpg'), originalSize: 100, compressedSize: 100 }),
  formatCompressionInfo: vi.fn().mockReturnValue('no change'),
}));

import { FileUploader } from '../FileUploader';
import { validateFile, formatFileSize, getFileInputAccept, getFileCategory } from '@/utils/whatsappFileTypes';

describe('FileUploader - Component', () => {
  const baseProps = {
    instanceName: 'wpp2',
    recipientNumber: '+5511999',
    contactId: 'c1',
    connectionId: 'conn1',
    onFileSelect: vi.fn(),
    onFileSent: vi.fn(),
    disabled: false,
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders the attach button', () => {
    render(<FileUploader {...baseProps} />);
    expect(screen.getByTitle('Anexar arquivo')).toBeInTheDocument();
  });

  it('attach button is disabled when disabled prop is true', () => {
    render(<FileUploader {...baseProps} disabled={true} />);
    expect(screen.getByTitle('Anexar arquivo')).toBeDisabled();
  });

  it('has a hidden file input', () => {
    const { container } = render(<FileUploader {...baseProps} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.className).toContain('hidden');
  });

  it('file input accepts correct MIME types', () => {
    const { container } = render(<FileUploader {...baseProps} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const accept = fileInput.getAttribute('accept');
    expect(accept).toContain('image/jpeg');
    expect(accept).toContain('application/pdf');
  });

  it('renders FileUploader with displayName', () => {
    expect(FileUploader.displayName).toBe('FileUploader');
  });
});

describe('FileUploader - File Validation (whatsappFileTypes)', () => {
  it('validates a JPEG image as valid', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.category).toBe('image');
  });

  it('validates a PNG image as valid', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 });
    expect(validateFile(file).valid).toBe(true);
  });

  it('validates a PDF document as valid', () => {
    const file = new File(['x'], 'report.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 });
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.category).toBe('document');
  });

  it('validates an MP4 video as valid', () => {
    const file = new File(['x'], 'video.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 });
    expect(validateFile(file).category).toBe('video');
  });

  it('validates an MP3 audio as valid', () => {
    const file = new File(['x'], 'song.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 });
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.category).toBe('audio');
  });

  it('rejects oversized image', () => {
    const file = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 }); // 20MB
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('muito grande');
  });

  it('rejects unsupported file type', () => {
    const file = new File(['x'], 'malware.exe', { type: 'application/x-msdownload' });
    Object.defineProperty(file, 'size', { value: 1024 });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('não suportado');
  });

  it('validates WebP image as valid', () => {
    const file = new File(['x'], 'sticker.webp', { type: 'image/webp' });
    Object.defineProperty(file, 'size', { value: 100 * 1024 }); // 100KB
    expect(validateFile(file).valid).toBe(true);
  });

  it('validates OGG audio as valid', () => {
    const file = new File(['x'], 'voice.ogg', { type: 'audio/ogg' });
    Object.defineProperty(file, 'size', { value: 500 * 1024 });
    expect(validateFile(file).valid).toBe(true);
    expect(validateFile(file).category).toBe('audio');
  });

  it('validates CSV document as valid', () => {
    const file = new File(['x'], 'data.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateFile(file).category).toBe('document');
  });
});

describe('FileUploader - formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
  });
});

describe('FileUploader - getFileInputAccept', () => {
  it('returns a string of MIME types', () => {
    const accept = getFileInputAccept();
    expect(accept).toContain('image/jpeg');
    expect(accept).toContain('video/mp4');
    expect(accept).toContain('audio/mpeg');
    expect(accept).toContain('application/pdf');
  });
});

describe('FileUploader - getFileCategory', () => {
  it('returns image for image/jpeg', () => {
    expect(getFileCategory('image/jpeg')).toBe('image');
  });

  it('returns video for video/mp4', () => {
    expect(getFileCategory('video/mp4')).toBe('video');
  });

  it('returns audio for audio/mpeg', () => {
    expect(getFileCategory('audio/mpeg')).toBe('audio');
  });

  it('returns document for application/pdf', () => {
    expect(getFileCategory('application/pdf')).toBe('document');
  });

  it('returns document for unknown application/* mime type (fallback)', () => {
    expect(getFileCategory('application/x-unknown-thing')).toBe('document');
  });

  it('returns null for truly unknown mime type', () => {
    expect(getFileCategory('x-custom/something')).toBeNull();
  });
});
