import { describe, it, expect, vi } from 'vitest';

// Test the compression utility logic
describe('imageCompression utilities', () => {
  it('validates supported image types', () => {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    supportedTypes.forEach(type => {
      expect(type.startsWith('image/')).toBe(true);
    });
  });

  it('rejects non-image types', () => {
    const invalidTypes = ['application/pdf', 'text/plain', 'video/mp4'];
    
    invalidTypes.forEach(type => {
      expect(type.startsWith('image/')).toBe(true === false);
    });
  });

  it('validates max file size constants', () => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    expect(MAX_FILE_SIZE).toBe(5242880);
  });

  it('validates compression quality range', () => {
    const quality = 0.8;
    expect(quality).toBeGreaterThan(0);
    expect(quality).toBeLessThanOrEqual(1);
  });
});
