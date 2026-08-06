import { describe, expect, it } from 'vitest';

import { type CommonItemForMatching, matchCommonItem, parseIngredientLine } from './ingredient-parser';

// Mirrors the shape (not necessarily the content) of the real seed data in
// supabase/migrations/0002_pantry.sql, plus a couple of items with aliases
// to exercise that path specifically.
const catalog: CommonItemForMatching[] = [
  { id: 'flour', name: 'Flour', aliases: [] },
  { id: 'butter', name: 'Butter', aliases: [] },
  { id: 'eggs', name: 'Eggs', aliases: [] },
  { id: 'onion', name: 'Onion', aliases: [] },
  { id: 'garlic', name: 'Garlic', aliases: [] },
  { id: 'bacon', name: 'Bacon', aliases: [] },
  { id: 'chicken-breast', name: 'Chicken breast', aliases: [] },
  { id: 'tomato', name: 'Tomato', aliases: [] },
  { id: 'canned-tomatoes', name: 'Canned tomatoes', aliases: ['diced tomatoes', 'crushed tomatoes'] },
];

describe('parseIngredientLine — quantity parsing', () => {
  it('parses a plain integer quantity', () => {
    expect(parseIngredientLine('2 cups flour', catalog).quantity).toBe(2);
  });

  it('parses a decimal quantity', () => {
    expect(parseIngredientLine('1.5 cups flour', catalog).quantity).toBe(1.5);
  });

  it('parses a simple ascii fraction', () => {
    expect(parseIngredientLine('1/2 cup butter', catalog).quantity).toBe(0.5);
  });

  it('parses a mixed number (whole + fraction)', () => {
    expect(parseIngredientLine('1 1/2 tsp baking soda', catalog).quantity).toBe(1.5);
  });

  it('parses a unicode vulgar fraction on its own', () => {
    expect(parseIngredientLine('½ cup butter', catalog).quantity).toBe(0.5);
  });

  it('parses a whole number attached to a vulgar fraction', () => {
    expect(parseIngredientLine('1½ cups flour', catalog).quantity).toBe(1.5);
  });

  it('averages a numeric range to a single quantity', () => {
    expect(parseIngredientLine('3-4 cloves garlic', catalog).quantity).toBe(3.5);
  });

  it('averages a "to" range to a single quantity', () => {
    expect(parseIngredientLine('1 to 2 onions', catalog).quantity).toBe(1.5);
  });

  it('returns null quantity when the line has no leading number', () => {
    expect(parseIngredientLine('salt and pepper to taste', catalog).quantity).toBeNull();
  });
});

describe('parseIngredientLine — unit parsing', () => {
  it('maps a unit word to its units.id', () => {
    expect(parseIngredientLine('2 cups flour', catalog).unitId).toBe('cup');
  });

  it('maps "fl oz" as a two-word unit before falling back to single words', () => {
    expect(parseIngredientLine('2 fl oz vanilla extract', catalog).unitId).toBe('floz');
  });

  it('maps a packaging word ("slices") to the count unit "each"', () => {
    expect(parseIngredientLine('2 slices bacon', catalog).unitId).toBe('each');
  });

  it('leaves unitId null when no unit or packaging word is present', () => {
    const result = parseIngredientLine('2 large eggs', catalog);
    expect(result.unitId).toBeNull();
  });
});

describe('parseIngredientLine — parenthetical package hints', () => {
  it('strips a parenthetical size hint and still finds the packaging unit', () => {
    const result = parseIngredientLine('1 (14 oz) can diced tomatoes', catalog);
    expect(result.quantity).toBe(1);
    expect(result.unitId).toBe('each');
    expect(result.itemText).toBe('diced tomatoes');
  });
});

describe('parseIngredientLine — prep notes', () => {
  it('splits a trailing comma clause into a prep note', () => {
    const result = parseIngredientLine('2 cups flour, sifted', catalog);
    expect(result.itemText).toBe('flour');
    expect(result.prepNote).toBe('sifted');
  });

  it('keeps everything after the first comma together as one note', () => {
    const result = parseIngredientLine('1 onion, diced, caramelized', catalog);
    expect(result.prepNote).toBe('diced, caramelized');
  });

  it('leaves prepNote null when there is no comma', () => {
    expect(parseIngredientLine('2 cups flour', catalog).prepNote).toBeNull();
  });
});

describe('parseIngredientLine — leading descriptors', () => {
  it('strips a single leading size descriptor before matching', () => {
    const result = parseIngredientLine('2 large eggs', catalog);
    expect(result.itemText).toBe('eggs');
    expect(result.commonItemId).toBe('eggs');
    expect(result.matchConfidence).toBe('high');
  });

  it('strips multiple stacked descriptors', () => {
    const result = parseIngredientLine('1 boneless skinless chicken breast', catalog);
    expect(result.itemText).toBe('chicken breast');
    expect(result.commonItemId).toBe('chicken-breast');
  });
});

describe('parseIngredientLine — catalog matching integration', () => {
  it('resolves an exact-name match at high confidence', () => {
    const result = parseIngredientLine('2 cups flour', catalog);
    expect(result.commonItemId).toBe('flour');
    expect(result.matchConfidence).toBe('high');
  });

  it('resolves an alias match at high confidence', () => {
    const result = parseIngredientLine('1 can diced tomatoes', catalog);
    expect(result.commonItemId).toBe('canned-tomatoes');
    expect(result.matchConfidence).toBe('high');
  });

  it('falls back to a low-confidence substring match', () => {
    const result = parseIngredientLine('1 yellow onion', catalog);
    expect(result.commonItemId).toBe('onion');
    expect(result.matchConfidence).toBe('low');
  });

  it('reports unmatched when nothing in the catalog is close', () => {
    const result = parseIngredientLine('2 tbsp olive oil', catalog);
    expect(result.commonItemId).toBeNull();
    expect(result.matchConfidence).toBe('unmatched');
  });

  it('reports unmatched (not a stale low/high value) when there is no item text at all', () => {
    const result = parseIngredientLine('2 cups', catalog);
    expect(result.itemText).toBe('');
    expect(result.matchConfidence).toBe('unmatched');
  });
});

describe('parseIngredientLine — always preserves the original input', () => {
  it('round-trips rawText unchanged regardless of how the line parses', () => {
    const line = '1 (14 oz) can diced tomatoes, drained';
    expect(parseIngredientLine(line, catalog).rawText).toBe(line);
  });

  it('never throws on an empty string, and reports it as unmatched', () => {
    const result = parseIngredientLine('', catalog);
    expect(result.quantity).toBeNull();
    expect(result.unitId).toBeNull();
    expect(result.matchConfidence).toBe('unmatched');
  });
});

describe('matchCommonItem', () => {
  it('matches case-insensitively', () => {
    expect(matchCommonItem('FLOUR', catalog).matchConfidence).toBe('high');
  });

  it('matches a simple regular plural against a singular catalog name', () => {
    expect(matchCommonItem('onions', catalog)).toEqual({ commonItemId: 'onion', matchConfidence: 'high' });
  });

  it('returns unmatched for an empty needle', () => {
    expect(matchCommonItem('', catalog)).toEqual({ commonItemId: null, matchConfidence: 'unmatched' });
  });

  it('prefers the longest matching candidate when multiple substrings match', () => {
    // "tomatoes" is a substring match for both the plain "Tomato" item and
    // "Canned tomatoes"' aliases — the longer alias candidates should win.
    const result = matchCommonItem('tomatoes', catalog);
    expect(result).toEqual({ commonItemId: 'canned-tomatoes', matchConfidence: 'low' });
  });
});
