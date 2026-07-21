import { type GroupCurrency } from '../types/groups';

export type UnitPreset = GroupCurrency & {
  key: string;
  label: string;
};

export const UNIT_PRESETS = [
  { key: 'beer', label: 'Beer', name: 'Beer', plural: 'Beers', symbol: '🍺' },
  { key: 'coffee', label: 'Coffee', name: 'Coffee', plural: 'Coffees', symbol: '☕' },
  { key: 'tea', label: 'Tea', name: 'Tea', plural: 'Teas', symbol: '🍵' },
  { key: 'drink', label: 'Drink', name: 'Drink', plural: 'Drinks', symbol: '🥤' },
  { key: 'cookie', label: 'Cookie', name: 'Cookie', plural: 'Cookies', symbol: '🍪' },
  { key: 'pizza', label: 'Pizza', name: 'Pizza', plural: 'Pizzas', symbol: '🍕' },
  { key: 'taco', label: 'Taco', name: 'Taco', plural: 'Tacos', symbol: '🌮' },
  { key: 'meal', label: 'Meal', name: 'Meal', plural: 'Meals', symbol: '🍽️' },
  { key: 'ride', label: 'Ride', name: 'Ride', plural: 'Rides', symbol: '🚗' },
  { key: 'chore', label: 'Chore', name: 'Chore', plural: 'Chores', symbol: '🧹' },
  { key: 'favor', label: 'Favor', name: 'Favor', plural: 'Favors', symbol: '🤝' },
] as const satisfies readonly UnitPreset[];

function normalizePresetValue(value: string) {
  return value.trim().toLowerCase();
}

export function findUnitPreset(currency: GroupCurrency) {
  return (
    UNIT_PRESETS.find(
      (preset) =>
        normalizePresetValue(preset.name) === normalizePresetValue(currency.name) &&
        normalizePresetValue(preset.plural) === normalizePresetValue(currency.plural) &&
        preset.symbol === currency.symbol.trim(),
    ) ?? null
  );
}
