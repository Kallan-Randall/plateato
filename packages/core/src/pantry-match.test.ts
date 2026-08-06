import { describe, expect, it } from 'vitest';

import {
  type PantryStockRow,
  type UnitInfo,
  matchIngredient,
  matchStatusColor,
  pantryMatchCount,
} from './pantry-match';

// Mirrors the real unit engine seed data in supabase/migrations/0001_foundation.sql.
const units: UnitInfo[] = [
  { id: 'g', dimension: 'mass', to_base_factor: 1 },
  { id: 'kg', dimension: 'mass', to_base_factor: 1000 },
  { id: 'oz', dimension: 'mass', to_base_factor: 28.3495 },
  { id: 'lb', dimension: 'mass', to_base_factor: 453.592 },
  { id: 'ml', dimension: 'volume', to_base_factor: 1 },
  { id: 'l', dimension: 'volume', to_base_factor: 1000 },
  { id: 'cup', dimension: 'volume', to_base_factor: 236.588 },
  { id: 'each', dimension: 'count', to_base_factor: 1 },
];

describe('pantryMatchCount', () => {
  it('counts ingredients present in the pantry set', () => {
    const ingredients = [{ common_item_id: 'flour' }, { common_item_id: 'butter' }, { common_item_id: 'eggs' }];
    const pantryIds = new Set(['flour', 'eggs']);
    expect(pantryMatchCount(ingredients, pantryIds)).toEqual({ have: 2, total: 3 });
  });

  it('never counts an unlinked ingredient as "have", even against an empty pantry set', () => {
    const ingredients = [{ common_item_id: null }];
    expect(pantryMatchCount(ingredients, new Set())).toEqual({ have: 0, total: 1 });
  });

  it('returns 0/0 for a recipe with no ingredients', () => {
    expect(pantryMatchCount([], new Set(['flour']))).toEqual({ have: 0, total: 0 });
  });
});

describe('matchStatusColor', () => {
  it('is textSecondary when there is nothing to check', () => {
    expect(matchStatusColor(0, 0)).toBe('textSecondary');
  });

  it('is success at or above 75%', () => {
    expect(matchStatusColor(3, 4)).toBe('success');
    expect(matchStatusColor(4, 4)).toBe('success');
  });

  it('is warning for any partial match below 75%', () => {
    expect(matchStatusColor(1, 4)).toBe('warning');
  });

  it('is textSecondary for a zero match, not warning', () => {
    expect(matchStatusColor(0, 4)).toBe('textSecondary');
  });
});

describe('matchIngredient', () => {
  it('reports unmatched when the ingredient has no catalog link', () => {
    const result = matchIngredient({ common_item_id: null, parsed_quantity: 1, parsed_unit_id: 'cup' }, [], units);
    expect(result).toEqual({ status: 'unmatched', shortfall: null });
  });

  it('reports missing when nothing in the pantry matches the item', () => {
    const result = matchIngredient(
      { common_item_id: 'flour', parsed_quantity: 1, parsed_unit_id: 'cup' },
      [{ common_item_id: 'butter', quantity: 1, unit_id: 'cup', tracking_mode: 'precise' }],
      units,
    );
    expect(result).toEqual({ status: 'missing', shortfall: null });
  });

  it('is presence-only "have" when the ingredient line has no parsed unit', () => {
    // e.g. "2 onions" - nothing to compare quantities in.
    const result = matchIngredient(
      { common_item_id: 'onion', parsed_quantity: 2, parsed_unit_id: null },
      [{ common_item_id: 'onion', quantity: 1, unit_id: 'each', tracking_mode: 'precise' }],
      units,
    );
    expect(result).toEqual({ status: 'have', shortfall: null });
  });

  it('is presence-only "have" when the matching stock is count- or approximate-tracked', () => {
    const result = matchIngredient(
      { common_item_id: 'flour', parsed_quantity: 10, parsed_unit_id: 'cup' },
      [{ common_item_id: 'flour', quantity: 1, unit_id: 'cup', tracking_mode: 'approximate' }],
      units,
    );
    expect(result).toEqual({ status: 'have', shortfall: null });
  });

  it('is "have" when precise stock in the same unit covers the need', () => {
    const result = matchIngredient(
      { common_item_id: 'flour', parsed_quantity: 2, parsed_unit_id: 'cup' },
      [{ common_item_id: 'flour', quantity: 3, unit_id: 'cup', tracking_mode: 'precise' }],
      units,
    );
    expect(result).toEqual({ status: 'have', shortfall: null });
  });

  it('converts across units within the same dimension to decide sufficiency', () => {
    // Recipe needs 1 lb; pantry has 500 g. 1 lb = 453.592 g, so 500 g covers it.
    const result = matchIngredient(
      { common_item_id: 'beef', parsed_quantity: 1, parsed_unit_id: 'lb' },
      [{ common_item_id: 'beef', quantity: 500, unit_id: 'g', tracking_mode: 'precise' }],
      units,
    );
    expect(result.status).toBe('have');
  });

  it('flags "low" with a shortfall in the recipe\'s own unit when precise stock falls short', () => {
    // Recipe needs 1 lb (453.592 g); pantry has 200 g. Short by 253.592 g,
    // which back-converts to roughly 0.559 lb.
    const result = matchIngredient(
      { common_item_id: 'beef', parsed_quantity: 1, parsed_unit_id: 'lb' },
      [{ common_item_id: 'beef', quantity: 200, unit_id: 'g', tracking_mode: 'precise' }],
      units,
    );
    expect(result.status).toBe('low');
    expect(result.shortfall).toBeCloseTo(0.5591, 3);
  });

  it('sums multiple precise pantry rows of the same item before comparing', () => {
    const result = matchIngredient(
      { common_item_id: 'flour', parsed_quantity: 500, parsed_unit_id: 'g' },
      [
        { common_item_id: 'flour', quantity: 200, unit_id: 'g', tracking_mode: 'precise' },
        { common_item_id: 'flour', quantity: 400, unit_id: 'g', tracking_mode: 'precise' },
      ],
      units,
    );
    expect(result).toEqual({ status: 'have', shortfall: null });
  });

  it('cannot credit stock tracked in an incompatible dimension (no density conversion)', () => {
    // Recipe needs 2 cups (volume); pantry only has a mass-tracked amount of
    // the same item. That row can't be compared, so it counts as if absent.
    const result = matchIngredient(
      { common_item_id: 'flour', parsed_quantity: 2, parsed_unit_id: 'cup' },
      [{ common_item_id: 'flour', quantity: 1000, unit_id: 'g', tracking_mode: 'precise' }],
      units,
    );
    expect(result.status).toBe('low');
    expect(result.shortfall).toBe(2);
  });
});
