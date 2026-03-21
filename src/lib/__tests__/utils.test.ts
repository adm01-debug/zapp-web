import { describe, it, expect } from 'vitest';
import { cn, wrap } from '@/lib/utils';

describe('cn (classnames utility)', () => {
  it('merges simple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isHidden = false;
    expect(cn('base', isHidden && 'hidden', 'visible')).toBe('base visible');
  });

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('handles empty string', () => {
    expect(cn('')).toBe('');
  });

  it('merges tailwind classes correctly', () => {
    // tailwind-merge should deduplicate
    const result = cn('px-4 py-2', 'px-8');
    expect(result).toContain('px-8');
    expect(result).not.toContain('px-4');
  });

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles objects with boolean values', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles complex tailwind conflicts', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('preserves non-conflicting classes', () => {
    const result = cn('font-bold text-sm', 'text-lg');
    expect(result).toContain('font-bold');
    expect(result).toContain('text-lg');
    expect(result).not.toContain('text-sm');
  });

  it('handles no arguments', () => {
    expect(cn()).toBe('');
  });

  it('merges margin classes', () => {
    const result = cn('m-2', 'm-4');
    expect(result).toBe('m-4');
  });

  it('handles mixed conditional and static', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active', !isActive && 'inactive');
    expect(result).toBe('base active');
  });

  it('handles deeply nested arrays', () => {
    expect(cn(['a', ['b', 'c']])).toBe('a b c');
  });

  it('merges background color classes', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('preserves responsive prefixes', () => {
    const result = cn('md:text-lg', 'lg:text-xl');
    expect(result).toContain('md:text-lg');
    expect(result).toContain('lg:text-xl');
  });
});

describe('wrap', () => {
  it('wraps value within range', () => {
    expect(wrap(0, 5, 7)).toBe(2);
  });

  it('returns value when in range', () => {
    expect(wrap(0, 10, 5)).toBe(5);
  });

  it('handles negative values', () => {
    expect(wrap(0, 5, -1)).toBe(4);
  });

  it('returns min when value equals min', () => {
    expect(wrap(0, 5, 0)).toBe(0);
  });

  it('wraps at max boundary', () => {
    expect(wrap(0, 5, 5)).toBe(0);
  });
});
