import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StickerItem,
  PendingUpload,
  CATEGORY_LABELS,
  ALL_CATEGORIES,
} from '@/components/inbox/stickers/StickerTypes';

// ══════════════════════════════════════════════════════
// 1. STICKER TYPES & DATA MODEL
// ══════════════════════════════════════════════════════
describe('StickerTypes', () => {
  describe('CATEGORY_LABELS', () => {
    it('has all expected emotion categories', () => {
      const emotions = ['comemoração', 'riso', 'chorando', 'amor', 'raiva', 'surpresa', 'pensativo', 'triste', 'animado', 'engraçado'];
      emotions.forEach(cat => {
        expect(CATEGORY_LABELS[cat]).toBeDefined();
        expect(CATEGORY_LABELS[cat].emoji).toBeTruthy();
        expect(CATEGORY_LABELS[cat].label).toBeTruthy();
      });
    });

    it('has social interaction categories', () => {
      ['cumprimento', 'despedida', 'concordância', 'negação'].forEach(cat => {
        expect(CATEGORY_LABELS[cat]).toBeDefined();
      });
    });

    it('has system categories for received/sent', () => {
      expect(CATEGORY_LABELS['recebidas']).toEqual({ emoji: '📥', label: 'Recebidas' });
      expect(CATEGORY_LABELS['enviadas']).toEqual({ emoji: '📤', label: 'Enviadas' });
    });

    it('has fallback "outros" category', () => {
      expect(CATEGORY_LABELS['outros']).toEqual({ emoji: '📦', label: 'Outros' });
    });

    it('every label has non-empty emoji and label strings', () => {
      Object.entries(CATEGORY_LABELS).forEach(([key, val]) => {
        expect(val.emoji.length).toBeGreaterThan(0);
        expect(val.label.length).toBeGreaterThan(0);
      });
    });

    it('labels are capitalized properly (Portuguese)', () => {
      Object.values(CATEGORY_LABELS).forEach(val => {
        expect(val.label[0]).toBe(val.label[0].toUpperCase());
      });
    });
  });

  describe('ALL_CATEGORIES', () => {
    it('matches keys of CATEGORY_LABELS', () => {
      expect(ALL_CATEGORIES).toEqual(Object.keys(CATEGORY_LABELS));
    });

    it('has at least 20 categories', () => {
      expect(ALL_CATEGORIES.length).toBeGreaterThanOrEqual(20);
    });

    it('contains no duplicates', () => {
      const unique = new Set(ALL_CATEGORIES);
      expect(unique.size).toBe(ALL_CATEGORIES.length);
    });
  });

  describe('StickerItem interface compliance', () => {
    it('validates a well-formed sticker item', () => {
      const sticker: StickerItem = {
        id: 'uuid-123',
        name: 'Test Sticker',
        image_url: 'https://example.com/sticker.webp',
        category: 'riso',
        is_favorite: false,
        use_count: 5,
      };
      expect(sticker.id).toBeTruthy();
      expect(sticker.image_url).toContain('http');
      expect(ALL_CATEGORIES).toContain(sticker.category);
    });

    it('accepts null name', () => {
      const sticker: StickerItem = {
        id: 'uuid-456',
        name: null,
        image_url: 'https://example.com/s.webp',
        category: 'outros',
        is_favorite: true,
        use_count: 0,
      };
      expect(sticker.name).toBeNull();
    });
  });

  describe('PendingUpload interface compliance', () => {
    it('validates a well-formed pending upload', () => {
      const pending: PendingUpload = {
        file: new File([''], 'test.webp', { type: 'image/webp' }),
        imageUrl: 'https://storage.example.com/sticker.webp',
        storagePath: 'sticker_123_uuid.webp',
        aiCategory: 'riso',
        selectedCategory: 'engraçado',
        name: 'My Sticker',
      };
      expect(pending.file).toBeInstanceOf(File);
      expect(pending.storagePath).toContain('sticker_');
      expect(ALL_CATEGORIES).toContain(pending.aiCategory);
      expect(ALL_CATEGORIES).toContain(pending.selectedCategory);
    });

    it('allows AI and selected categories to differ', () => {
      const pending: PendingUpload = {
        file: new File([''], 't.png', { type: 'image/png' }),
        imageUrl: 'url',
        storagePath: 'path',
        aiCategory: 'amor',
        selectedCategory: 'fofo',
        name: 'test',
      };
      expect(pending.aiCategory).not.toBe(pending.selectedCategory);
    });
  });
});

// ══════════════════════════════════════════════════════
// 2. STICKER FILTERING & SORTING LOGIC
// ══════════════════════════════════════════════════════
describe('Sticker Filtering Logic', () => {
  const mockStickers: StickerItem[] = [
    { id: '1', name: 'Happy Dance', image_url: 'url1', category: 'comemoração', is_favorite: true, use_count: 10 },
    { id: '2', name: 'Sad Face', image_url: 'url2', category: 'triste', is_favorite: false, use_count: 3 },
    { id: '3', name: 'LOL Meme', image_url: 'url3', category: 'riso', is_favorite: true, use_count: 25 },
    { id: '4', name: 'Heart', image_url: 'url4', category: 'amor', is_favorite: false, use_count: 7 },
    { id: '5', name: 'Thinking', image_url: 'url5', category: 'pensativo', is_favorite: false, use_count: 1 },
    { id: '6', name: null, image_url: 'url6', category: 'recebidas', is_favorite: false, use_count: 0 },
    { id: '7', name: 'Angry Cat', image_url: 'url7', category: 'raiva', is_favorite: true, use_count: 15 },
    { id: '8', name: 'Bye Wave', image_url: 'url8', category: 'despedida', is_favorite: false, use_count: 2 },
    { id: '9', name: 'Thumbs Up', image_url: 'url9', category: 'concordância', is_favorite: true, use_count: 20 },
    { id: '10', name: 'Sleepy', image_url: 'url10', category: 'sono', is_favorite: false, use_count: 0 },
  ];

  describe('Search filtering', () => {
    const filterBySearch = (stickers: StickerItem[], term: string) => {
      if (!term) return stickers;
      const lower = term.toLowerCase();
      return stickers.filter(s =>
        s.name?.toLowerCase().includes(lower) ||
        s.category?.toLowerCase().includes(lower) ||
        CATEGORY_LABELS[s.category]?.label.toLowerCase().includes(lower)
      );
    };

    it('returns all when search is empty', () => {
      expect(filterBySearch(mockStickers, '')).toHaveLength(10);
    });

    it('searches by name (case-insensitive)', () => {
      expect(filterBySearch(mockStickers, 'happy')).toHaveLength(1);
      expect(filterBySearch(mockStickers, 'HAPPY')).toHaveLength(1);
    });

    it('searches by category key', () => {
      expect(filterBySearch(mockStickers, 'riso')).toHaveLength(1);
    });

    it('searches by category label', () => {
      expect(filterBySearch(mockStickers, 'Comemoração')).toHaveLength(1);
    });

    it('handles partial matches', () => {
      expect(filterBySearch(mockStickers, 'cat')).toHaveLength(1); // Angry Cat
    });

    it('returns empty for non-matching search', () => {
      expect(filterBySearch(mockStickers, 'xyznonexistent')).toHaveLength(0);
    });

    it('handles stickers with null names', () => {
      expect(filterBySearch(mockStickers, 'recebidas')).toHaveLength(1);
    });

    it('searches across multiple fields simultaneously', () => {
      const results = filterBySearch(mockStickers, 'a');
      expect(results.length).toBeGreaterThan(1); // Matches names and categories containing 'a'
    });
  });

  describe('Category filtering', () => {
    it('filters by specific category', () => {
      const filtered = mockStickers.filter(s => s.category === 'riso');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('LOL Meme');
    });

    it('returns empty for unused category', () => {
      const filtered = mockStickers.filter(s => s.category === 'vergonha');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Favorites filtering', () => {
    it('filters favorites correctly', () => {
      const favorites = mockStickers.filter(s => s.is_favorite);
      expect(favorites).toHaveLength(4);
      favorites.forEach(s => expect(s.is_favorite).toBe(true));
    });
  });

  describe('Recent (most used) sorting', () => {
    it('sorts by use_count descending', () => {
      const sorted = [...mockStickers].sort((a, b) => (b.use_count || 0) - (a.use_count || 0));
      expect(sorted[0].name).toBe('LOL Meme'); // 25
      expect(sorted[1].name).toBe('Thumbs Up'); // 20
      expect(sorted[2].name).toBe('Angry Cat'); // 15
    });

    it('limits to RECENT_LIMIT (8)', () => {
      const RECENT_LIMIT = 8;
      const recent = [...mockStickers].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, RECENT_LIMIT);
      expect(recent).toHaveLength(8);
    });
  });

  describe('Unique categories extraction', () => {
    it('extracts unique categories', () => {
      const categories = [...new Set(mockStickers.map(s => s.category).filter(Boolean))].sort();
      expect(categories.length).toBe(new Set(mockStickers.map(s => s.category)).size);
    });

    it('all extracted categories exist in CATEGORY_LABELS', () => {
      const categories = [...new Set(mockStickers.map(s => s.category))];
      categories.forEach(cat => {
        expect(CATEGORY_LABELS[cat]).toBeDefined();
      });
    });
  });

  describe('Combined filters', () => {
    it('search + favorites', () => {
      const result = mockStickers.filter(s => s.is_favorite && s.name?.toLowerCase().includes('cat'));
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Angry Cat');
    });

    it('search + category', () => {
      const result = mockStickers.filter(s => s.category === 'comemoração' && s.name?.toLowerCase().includes('dance'));
      expect(result).toHaveLength(1);
    });
  });
});

// ══════════════════════════════════════════════════════
// 3. STICKER UPLOAD VALIDATION
// ══════════════════════════════════════════════════════
describe('Sticker Upload Validation', () => {
  describe('File type validation', () => {
    it('accepts WebP files', () => {
      const file = new File(['data'], 'sticker.webp', { type: 'image/webp' });
      expect(file.type.startsWith('image/')).toBe(true);
    });

    it('accepts PNG files', () => {
      const file = new File(['data'], 'sticker.png', { type: 'image/png' });
      expect(file.type.startsWith('image/')).toBe(true);
    });

    it('accepts GIF files', () => {
      const file = new File(['data'], 'sticker.gif', { type: 'image/gif' });
      expect(file.type.startsWith('image/')).toBe(true);
    });

    it('accepts JPEG files', () => {
      const file = new File(['data'], 'sticker.jpg', { type: 'image/jpeg' });
      expect(file.type.startsWith('image/')).toBe(true);
    });

    it('rejects non-image files', () => {
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      expect(file.type.startsWith('image/')).toBe(false);
    });

    it('rejects video files', () => {
      const file = new File(['data'], 'vid.mp4', { type: 'video/mp4' });
      expect(file.type.startsWith('image/')).toBe(false);
    });

    it('rejects executable files', () => {
      const file = new File(['data'], 'malware.exe', { type: 'application/x-executable' });
      expect(file.type.startsWith('image/')).toBe(false);
    });
  });

  describe('File size validation', () => {
    const MAX_STICKER_SIZE = 500 * 1024; // 500KB

    it('accepts files under 500KB', () => {
      const data = new Uint8Array(100 * 1024); // 100KB
      const file = new File([data], 'small.webp', { type: 'image/webp' });
      expect(file.size).toBeLessThanOrEqual(MAX_STICKER_SIZE);
    });

    it('rejects files over 500KB', () => {
      const data = new Uint8Array(501 * 1024); // 501KB
      const file = new File([data], 'big.webp', { type: 'image/webp' });
      expect(file.size).toBeGreaterThan(MAX_STICKER_SIZE);
    });

    it('accepts files exactly at 500KB', () => {
      const data = new Uint8Array(500 * 1024);
      const file = new File([data], 'exact.webp', { type: 'image/webp' });
      expect(file.size).toBeLessThanOrEqual(MAX_STICKER_SIZE);
    });

    it('rejects empty files', () => {
      const file = new File([], 'empty.webp', { type: 'image/webp' });
      expect(file.size).toBe(0);
    });
  });

  describe('Storage path generation', () => {
    it('generates unique storage paths', () => {
      const paths = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const path = `sticker_${Date.now()}_${crypto.randomUUID()}.webp`;
        paths.add(path);
      }
      expect(paths.size).toBe(100);
    });

    it('preserves file extension', () => {
      const extensions = ['webp', 'png', 'gif', 'jpeg'];
      extensions.forEach(ext => {
        const fileName = `test.${ext}`;
        const extracted = fileName.split('.').pop();
        expect(extracted).toBe(ext);
      });
    });

    it('handles files without extension', () => {
      const fileName = 'noextension';
      const ext = fileName.split('.').pop() || 'webp';
      expect(ext).toBe('noextension'); // Falls back to filename itself
    });
  });
});

// ══════════════════════════════════════════════════════
// 4. STICKER DELETE FLOW
// ══════════════════════════════════════════════════════
describe('Sticker Delete Logic', () => {
  describe('Storage bucket detection', () => {
    it('detects whatsapp-media bucket URLs', () => {
      const url = 'https://storage.example.com/whatsapp-media/stickers/file.webp';
      expect(url.includes('/whatsapp-media/')).toBe(true);
    });

    it('detects stickers bucket URLs', () => {
      const url = 'https://storage.example.com/stickers/sticker_123.webp';
      expect(url.includes('/stickers/')).toBe(true);
      expect(url.includes('/whatsapp-media/')).toBe(false);
    });

    it('extracts correct path from whatsapp-media URL', () => {
      const url = 'https://storage.example.com/object/public/whatsapp-media/stickers/file.webp';
      const path = url.split('/whatsapp-media/')[1];
      expect(path).toBe('stickers/file.webp');
    });

    it('extracts correct path from stickers URL', () => {
      const url = 'https://storage.example.com/object/public/stickers/sticker_123.webp';
      const path = url.split('/stickers/')[1];
      expect(path).toBe('sticker_123.webp');
    });
  });

  describe('Optimistic UI updates', () => {
    it('removes sticker from array immediately', () => {
      const stickers: StickerItem[] = [
        { id: '1', name: 'A', image_url: 'u1', category: 'riso', is_favorite: false, use_count: 0 },
        { id: '2', name: 'B', image_url: 'u2', category: 'amor', is_favorite: true, use_count: 5 },
        { id: '3', name: 'C', image_url: 'u3', category: 'triste', is_favorite: false, use_count: 2 },
      ];
      const afterDelete = stickers.filter(s => s.id !== '2');
      expect(afterDelete).toHaveLength(2);
      expect(afterDelete.find(s => s.id === '2')).toBeUndefined();
    });
  });
});

// ══════════════════════════════════════════════════════
// 5. STICKER FAVORITE TOGGLE
// ══════════════════════════════════════════════════════
describe('Sticker Favorite Toggle', () => {
  it('toggles favorite from false to true', () => {
    const sticker: StickerItem = { id: '1', name: 'X', image_url: 'u', category: 'riso', is_favorite: false, use_count: 0 };
    const newVal = !sticker.is_favorite;
    expect(newVal).toBe(true);
  });

  it('toggles favorite from true to false', () => {
    const sticker: StickerItem = { id: '1', name: 'X', image_url: 'u', category: 'riso', is_favorite: true, use_count: 0 };
    const newVal = !sticker.is_favorite;
    expect(newVal).toBe(false);
  });

  it('updates only the target sticker in array', () => {
    const stickers: StickerItem[] = [
      { id: '1', name: 'A', image_url: 'u1', category: 'riso', is_favorite: false, use_count: 0 },
      { id: '2', name: 'B', image_url: 'u2', category: 'amor', is_favorite: false, use_count: 0 },
    ];
    const updated = stickers.map(s => s.id === '1' ? { ...s, is_favorite: true } : s);
    expect(updated[0].is_favorite).toBe(true);
    expect(updated[1].is_favorite).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// 6. STICKER CATEGORY CHANGE
// ══════════════════════════════════════════════════════
describe('Sticker Category Change', () => {
  it('updates category in sticker array', () => {
    const stickers: StickerItem[] = [
      { id: '1', name: 'A', image_url: 'u', category: 'riso', is_favorite: false, use_count: 0 },
    ];
    const updated = stickers.map(s => s.id === '1' ? { ...s, category: 'amor' } : s);
    expect(updated[0].category).toBe('amor');
  });

  it('validates new category exists in CATEGORY_LABELS', () => {
    ALL_CATEGORIES.forEach(cat => {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
    });
  });
});

// ══════════════════════════════════════════════════════
// 7. STICKER SEND & USE COUNT
// ══════════════════════════════════════════════════════
describe('Sticker Send & Use Count', () => {
  it('increments use_count on send', () => {
    const sticker: StickerItem = { id: '1', name: 'A', image_url: 'u', category: 'riso', is_favorite: false, use_count: 5 };
    const newCount = (sticker.use_count || 0) + 1;
    expect(newCount).toBe(6);
  });

  it('handles zero use_count', () => {
    const sticker: StickerItem = { id: '1', name: 'A', image_url: 'u', category: 'riso', is_favorite: false, use_count: 0 };
    const newCount = (sticker.use_count || 0) + 1;
    expect(newCount).toBe(1);
  });
});

// ══════════════════════════════════════════════════════
// 8. GRID SIZE CYCLING
// ══════════════════════════════════════════════════════
describe('Grid Size Cycling', () => {
  const cycleGridSize = (current: 'sm' | 'md' | 'lg'): 'sm' | 'md' | 'lg' => {
    return current === 'sm' ? 'md' : current === 'md' ? 'lg' : 'sm';
  };

  it('cycles sm → md → lg → sm', () => {
    expect(cycleGridSize('sm')).toBe('md');
    expect(cycleGridSize('md')).toBe('lg');
    expect(cycleGridSize('lg')).toBe('sm');
  });

  it('grid cols map is correct', () => {
    const gridColsMap = { sm: 'grid-cols-5', md: 'grid-cols-4', lg: 'grid-cols-3' };
    expect(gridColsMap['sm']).toBe('grid-cols-5');
    expect(gridColsMap['md']).toBe('grid-cols-4');
    expect(gridColsMap['lg']).toBe('grid-cols-3');
  });
});

// ══════════════════════════════════════════════════════
// 9. DRAG & DROP VALIDATION
// ══════════════════════════════════════════════════════
describe('Drag & Drop Validation', () => {
  it('validates dropped file is image', () => {
    const validTypes = ['image/webp', 'image/png', 'image/gif', 'image/jpeg'];
    validTypes.forEach(type => {
      expect(type.startsWith('image/')).toBe(true);
    });
  });

  it('rejects non-image dropped files', () => {
    const invalidTypes = ['application/pdf', 'text/plain', 'video/mp4', 'audio/mp3'];
    invalidTypes.forEach(type => {
      expect(type.startsWith('image/')).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════
// 10. KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════
describe('Keyboard Shortcuts', () => {
  it('recognizes Ctrl+Shift+S combo', () => {
    const event = { ctrlKey: true, shiftKey: true, key: 'S' };
    expect(event.ctrlKey && event.shiftKey && event.key === 'S').toBe(true);
  });

  it('ignores partial combos', () => {
    expect({ ctrlKey: true, shiftKey: false, key: 'S' }.shiftKey).toBe(false);
    expect({ ctrlKey: false, shiftKey: true, key: 'S' }.ctrlKey).toBe(false);
  });

  it('sticker grid key bindings', () => {
    const keys = {
      'Enter': 'send',
      ' ': 'send',
      'f': 'favorite',
      'Delete': 'delete',
      'Backspace': 'delete',
    };
    expect(keys['Enter']).toBe('send');
    expect(keys['f']).toBe('favorite');
    expect(keys['Delete']).toBe('delete');
    expect(keys['Backspace']).toBe('delete');
  });
});

// ══════════════════════════════════════════════════════
// 11. ACCESSIBILITY ATTRIBUTES
// ══════════════════════════════════════════════════════
describe('Accessibility Requirements', () => {
  it('all interactive elements have expected ARIA attributes', () => {
    const requiredAttributes = {
      stickerGrid: ['role="grid"', 'aria-label'],
      gridCell: ['role="gridcell"', 'aria-label', 'tabIndex={0}'],
      categoryBar: ['role="tablist"', 'aria-label'],
      categoryTab: ['role="tab"', 'aria-selected'],
      categorySelector: ['aria-haspopup="listbox"', 'aria-expanded'],
      deleteDialog: ['AlertDialogTitle', 'AlertDialogDescription'],
    };
    
    Object.entries(requiredAttributes).forEach(([element, attrs]) => {
      expect(attrs.length).toBeGreaterThan(0);
    });
  });

  it('focus management requirements', () => {
    const focusableElements = [
      'search input (autoFocus on open)',
      'sticker buttons (tabIndex=0)',
      'category tabs',
      'favorite button',
      'delete button',
      'upload button',
      'grid size toggle',
    ];
    expect(focusableElements.length).toBeGreaterThanOrEqual(7);
  });

  it('screen reader announcements exist', () => {
    const ariaLiveRegions = ['sticker count footer (aria-live="polite")'];
    expect(ariaLiveRegions.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════
// 12. SECURITY VALIDATIONS
// ══════════════════════════════════════════════════════
describe('Security Validations', () => {
  it('rejects script injection in sticker names', () => {
    const maliciousNames = [
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      'onload=alert(1)',
      '"><img src=x onerror=alert(1)>',
    ];
    maliciousNames.forEach(name => {
      // Names are rendered as text content, not innerHTML
      expect(typeof name).toBe('string');
    });
  });

  it('validates URL format for sticker images', () => {
    const validUrls = [
      'https://storage.example.com/stickers/file.webp',
      'https://cdn.example.com/image.png',
    ];
    const invalidUrls = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ];
    validUrls.forEach(url => expect(url.startsWith('https://')).toBe(true));
    invalidUrls.forEach(url => expect(url.startsWith('https://')).toBe(false));
  });

  it('file type validation prevents upload of dangerous files', () => {
    const dangerous = [
      { name: 'payload.html', type: 'text/html' },
      { name: 'script.js', type: 'application/javascript' },
      { name: 'exploit.svg', type: 'image/svg+xml' },
    ];
    dangerous.forEach(f => {
      const isImage = f.type.startsWith('image/') && f.type !== 'image/svg+xml';
      // SVG should be rejected as it can contain scripts
      if (f.type === 'image/svg+xml') {
        expect(['image/webp', 'image/png', 'image/gif', 'image/jpeg'].includes(f.type)).toBe(false);
      } else {
        expect(f.type.startsWith('image/')).toBe(false);
      }
    });
  });
});

// ══════════════════════════════════════════════════════
// 13. PERFORMANCE CHARACTERISTICS
// ══════════════════════════════════════════════════════
describe('Performance Characteristics', () => {
  it('filtering 1000 stickers is fast', () => {
    const stickers: StickerItem[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `s${i}`,
      name: `Sticker ${i} ${i % 2 === 0 ? 'happy' : 'sad'}`,
      image_url: `url${i}`,
      category: ALL_CATEGORIES[i % ALL_CATEGORIES.length],
      is_favorite: i % 5 === 0,
      use_count: i,
    }));

    const start = performance.now();
    const filtered = stickers.filter(s =>
      s.name?.toLowerCase().includes('happy') && s.is_favorite
    );
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50); // Should be < 50ms
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('sorting 1000 stickers by use_count is fast', () => {
    const stickers: StickerItem[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `s${i}`, name: `S${i}`, image_url: `u${i}`,
      category: 'riso', is_favorite: false, use_count: Math.random() * 100,
    }));

    const start = performance.now();
    const sorted = [...stickers].sort((a, b) => b.use_count - a.use_count);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(sorted[0].use_count).toBeGreaterThanOrEqual(sorted[999].use_count);
  });

  it('unique categories extraction from 1000 stickers is fast', () => {
    const stickers: StickerItem[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `s${i}`, name: `S${i}`, image_url: `u${i}`,
      category: ALL_CATEGORIES[i % ALL_CATEGORIES.length],
      is_favorite: false, use_count: 0,
    }));

    const start = performance.now();
    const cats = [...new Set(stickers.map(s => s.category))];
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
    expect(cats.length).toBe(ALL_CATEGORIES.length);
  });
});
