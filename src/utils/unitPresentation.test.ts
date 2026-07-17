import { describe, expect, it } from 'vitest';

import { formatUnitQuantity, formatUnitSymbols } from './unitPresentation';

const beer = { name: 'Beer', plural: 'Beers', symbol: '🍺' };

describe('unit presentation', () => {
  it('chooses singular and plural group units', () => {
    expect(formatUnitQuantity(1, beer)).toBe('1 Beer');
    expect(formatUnitQuantity(2, beer)).toBe('2 Beers');
    expect(formatUnitQuantity(0, beer)).toBe('0 Beers');
  });

  it('uses readable symbols without creating an unbounded string', () => {
    expect(formatUnitSymbols(2, beer)).toBe('🍺🍺');
    expect(formatUnitSymbols(0, beer)).toBe('—');
    expect(formatUnitSymbols(7, beer)).toBe('🍺 × 7');
    expect(formatUnitSymbols(1.5, beer)).toBe('🍺 × 1.5');
  });
});
