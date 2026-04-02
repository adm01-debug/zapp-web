import { describe, it, expect } from 'vitest';
import { PERIOD_OPTIONS, CHART_COLORS, CHART_TOOLTIP_STYLE } from '../useReportsData';

describe('useReportsData constants', () => {
  it('exports valid period options', () => {
    expect(PERIOD_OPTIONS).toHaveLength(4);
    PERIOD_OPTIONS.forEach(opt => {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
      expect(parseInt(opt.value)).toBeGreaterThan(0);
    });
  });

  it('exports chart colors array', () => {
    expect(CHART_COLORS).toHaveLength(5);
    CHART_COLORS.forEach(color => {
      expect(color).toMatch(/^hsl\(var\(--/);
    });
  });

  it('exports chart tooltip style object', () => {
    expect(CHART_TOOLTIP_STYLE).toHaveProperty('backgroundColor');
    expect(CHART_TOOLTIP_STYLE).toHaveProperty('border');
    expect(CHART_TOOLTIP_STYLE).toHaveProperty('borderRadius');
  });
});
