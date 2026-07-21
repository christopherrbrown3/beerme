import { describe, expect, it } from 'vitest';

import { findUnitPreset, UNIT_PRESETS } from './unitPresets';

describe('unit presets', () => {
  it('defines every recommended social IOU unit once', () => {
    expect(UNIT_PRESETS.map((preset) => preset.key)).toEqual([
      'beer',
      'coffee',
      'tea',
      'drink',
      'cookie',
      'pizza',
      'taco',
      'meal',
      'ride',
      'chore',
      'favor',
    ]);
  });

  it('matches stored preset values after harmless case and whitespace differences', () => {
    expect(findUnitPreset({ name: ' beer ', plural: 'BEERS', symbol: '🍺' })?.key).toBe('beer');
  });

  it('treats any non-matching stored unit as custom', () => {
    expect(findUnitPreset({ name: 'High five', plural: 'High fives', symbol: '🙌' })).toBeNull();
    expect(findUnitPreset({ name: 'Beer', plural: 'Beers', symbol: '☕' })).toBeNull();
  });
});
