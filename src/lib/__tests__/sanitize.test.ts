import { describe, it, expect } from 'vitest';
import { sanitizeHtml, stripHtml } from '../sanitize';

describe('sanitizeHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<b>bold</b> <i>italic</i> <em>emphasis</em>';
    expect(sanitizeHtml(input)).toBe('<b>bold</b> <i>italic</i> <em>emphasis</em>');
  });

  it('strips script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe('<p>Hello</p>');
  });

  it('strips event handlers', () => {
    const input = '<p onmouseover="alert(1)">text</p>';
    expect(sanitizeHtml(input)).toBe('<p>text</p>');
  });

  it('strips iframe tags', () => {
    const input = '<iframe src="evil.com"></iframe><p>safe</p>';
    expect(sanitizeHtml(input)).toBe('<p>safe</p>');
  });

  it('allows href on anchor tags', () => {
    const input = '<a href="https://example.com">link</a>';
    expect(sanitizeHtml(input)).toContain('href="https://example.com"');
  });

  it('strips data attributes', () => {
    const input = '<p data-custom="value">text</p>';
    expect(sanitizeHtml(input)).toBe('<p>text</p>');
  });

  it('strips javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('allows list elements', () => {
    const input = '<ul><li>item 1</li><li>item 2</li></ul>';
    expect(sanitizeHtml(input)).toBe('<ul><li>item 1</li><li>item 2</li></ul>');
  });

  it('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('handles plain text', () => {
    expect(sanitizeHtml('just text')).toBe('just text');
  });
});

describe('stripHtml', () => {
  it('removes all HTML tags', () => {
    const input = '<p><b>Hello</b> <i>World</i></p>';
    expect(stripHtml(input)).toBe('Hello World');
  });

  it('removes script content', () => {
    const input = 'safe<script>alert(1)</script>text';
    expect(stripHtml(input)).toBe('safetext');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });
});
