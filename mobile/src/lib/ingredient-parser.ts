/**
 * Deterministic ingredient-line parser: turns what a user types
 * ("2 cups flour, sifted") into the hybrid model recipe_ingredients stores
 * (parsed_quantity, parsed_unit_id, an item name to fuzzy-match against the
 * catalog, and an optional prep note). Handles the common ~80-90% of
 * formats; anything it can't confidently parse still saves with the raw
 * text intact and match_confidence 'unmatched', for a quick manual link.
 *
 * Deliberately not calling this "smart" — it's regex and a lookup table, no
 * NLP. An LLM fallback is a planned fast-follow once web recipe import
 * lands, where messier pasted text makes it worth the latency/cost.
 */

export type MatchConfidence = 'high' | 'low' | 'unmatched';

export type ParsedIngredient = {
  rawText: string;
  quantity: number | null;
  unitId: string | null;
  itemText: string;
  prepNote: string | null;
  commonItemId: string | null;
  matchConfidence: MatchConfidence;
};

/** The subset of a common_items row the matcher needs. */
export type CommonItemForMatching = {
  id: string;
  name: string;
  aliases: string[];
};

// Unicode vulgar fractions recipes commonly use, mapped to decimal.
const VULGAR_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

// Natural-language unit words/abbreviations (lowercase) to our units.id.
// "fl oz" is checked as a two-word phrase before single-word matching.
const UNIT_WORDS: Record<string, string> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  'fl oz': 'floz',
  floz: 'floz',
  'fluid ounce': 'floz',
  'fluid ounces': 'floz',
  each: 'each',
  ea: 'each',
};

// Leading size/prep descriptors that precede the item name without a comma
// ("2 large eggs", "boneless skinless chicken breast") — common enough that
// leaving them in would drag an otherwise-exact catalog match down to 'low'.
const LEADING_DESCRIPTORS = new Set([
  'small',
  'medium',
  'large',
  'extra-large',
  'jumbo',
  'boneless',
  'skinless',
  'fresh',
  'ripe',
  'whole',
]);

// Generic packaging words that show up before an item name ("1 can diced
// tomatoes") but aren't one of our units and shouldn't be matched against
// the catalog as part of the item name either.
const PACKAGING_WORDS = new Set([
  'can',
  'cans',
  'jar',
  'jars',
  'package',
  'packages',
  'pkg',
  'box',
  'boxes',
  'bag',
  'bags',
  'bunch',
  'bunches',
  'clove',
  'cloves',
  'slice',
  'slices',
  'stick',
  'sticks',
]);

/** Leading quantity: mixed number, fraction (ascii or unicode), decimal,
 * integer, or a simple range ("1-2", "1 to 2" — averaged to one number). */
function parseLeadingQuantity(text: string): { quantity: number | null; rest: string } {
  const trimmed = text.trim();

  // Range: "1-2 cups" or "1 to 2 cups" — average the bounds.
  const range = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(.*)$/i);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    return { quantity: (lo + hi) / 2, rest: range[3] };
  }

  // Mixed number: "1 1/2 cups"
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    return { quantity: den === 0 ? whole : whole + num / den, rest: mixed[4] };
  }

  // Simple fraction: "1/2 cup"
  const fraction = trimmed.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (fraction) {
    const num = Number(fraction[1]);
    const den = Number(fraction[2]);
    return { quantity: den === 0 ? null : num / den, rest: fraction[3] };
  }

  // Unicode vulgar fraction, optionally preceded by a whole number: "1½ cups"
  const vulgarKeys = Object.keys(VULGAR_FRACTIONS).join('');
  const vulgar = trimmed.match(new RegExp(`^(\\d+)?([${vulgarKeys}])\\s*(.*)$`));
  if (vulgar) {
    const whole = vulgar[1] ? Number(vulgar[1]) : 0;
    return { quantity: whole + VULGAR_FRACTIONS[vulgar[2]], rest: vulgar[3] };
  }

  // Decimal or integer: "1.5 cups" / "2 cups"
  const number = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (number) {
    return { quantity: Number(number[1]), rest: number[2] };
  }

  return { quantity: null, rest: trimmed };
}

/** Strips a parenthetical package-size hint ("(14 oz)") — informational,
 * not something our single quantity+unit pair can represent, but it
 * shouldn't pollute item-name matching either. */
function stripParenthetical(text: string): string {
  return text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Splits a trailing comma-clause off as a prep note: "flour, sifted" ->
 * ("flour", "sifted"). Only the first comma counts, so "onion, diced,
 * caramelized" keeps "diced, caramelized" together as one note. */
function extractPrepNote(text: string): { itemText: string; prepNote: string | null } {
  const commaIndex = text.indexOf(',');
  if (commaIndex === -1) return { itemText: text.trim(), prepNote: null };
  return {
    itemText: text.slice(0, commaIndex).trim(),
    prepNote: text.slice(commaIndex + 1).trim() || null,
  };
}

/** Consumes a leading unit word from `rest` if present, returning the
 * matched units.id and what remains. Checks "fl oz" before single words. */
function parseLeadingUnit(rest: string): { unitId: string | null; rest: string } {
  const trimmed = rest.trim();
  const twoWord = trimmed.match(/^(\w+\s+\w+)\b\s*(.*)$/);
  if (twoWord && UNIT_WORDS[twoWord[1].toLowerCase()]) {
    return { unitId: UNIT_WORDS[twoWord[1].toLowerCase()], rest: twoWord[2] };
  }

  const oneWord = trimmed.match(/^(\w+)\b\s*(.*)$/);
  if (oneWord) {
    const word = oneWord[1].toLowerCase();
    if (UNIT_WORDS[word]) return { unitId: UNIT_WORDS[word], rest: oneWord[2] };
    if (PACKAGING_WORDS.has(word)) return { unitId: 'each', rest: oneWord[2] };
  }

  return { unitId: null, rest: trimmed };
}

/** Drops leading descriptor words ("large", "boneless skinless") so they
 * don't get stuck in the text matched against the catalog. Loops so
 * multiple stack: "boneless skinless chicken breast" -> "chicken breast". */
function stripLeadingDescriptors(text: string): string {
  let rest = text.trim();
  for (;;) {
    const match = rest.match(/^([\w-]+)\b\s*(.*)$/);
    if (!match || !LEADING_DESCRIPTORS.has(match[1].toLowerCase())) break;
    rest = match[2];
  }
  return rest;
}

/** Lowercase, trim, and de-pluralize just enough for equality comparisons
 * ("onions" -> "onion"). Not linguistically complete (won't fix "tomatoes"
 * -> "tomato"), but catches the common regular-plural case cheaply. */
function normalize(text: string): string {
  const lower = text.toLowerCase().trim();
  return lower.length > 3 && lower.endsWith('s') ? lower.slice(0, -1) : lower;
}

export function matchCommonItem(
  itemText: string,
  catalog: CommonItemForMatching[],
): { commonItemId: string | null; matchConfidence: MatchConfidence } {
  const needle = normalize(itemText);
  if (!needle) return { commonItemId: null, matchConfidence: 'unmatched' };

  for (const item of catalog) {
    const candidates = [item.name, ...item.aliases].map(normalize);
    if (candidates.includes(needle)) {
      return { commonItemId: item.id, matchConfidence: 'high' };
    }
  }

  let best: { id: string; score: number } | null = null;
  for (const item of catalog) {
    for (const candidate of [item.name, ...item.aliases].map(normalize)) {
      if (candidate.length < 3) continue;
      if (needle.includes(candidate) || candidate.includes(needle)) {
        const score = candidate.length;
        if (!best || score > best.score) best = { id: item.id, score };
      }
    }
  }
  if (best) return { commonItemId: best.id, matchConfidence: 'low' };

  return { commonItemId: null, matchConfidence: 'unmatched' };
}

export function parseIngredientLine(
  rawText: string,
  catalog: CommonItemForMatching[],
): ParsedIngredient {
  const withoutParens = stripParenthetical(rawText);
  const { quantity, rest: afterQuantity } = parseLeadingQuantity(withoutParens);
  const { unitId, rest: afterUnit } = parseLeadingUnit(afterQuantity);
  const { itemText: rawItemText, prepNote } = extractPrepNote(afterUnit);
  const itemText = stripLeadingDescriptors(rawItemText) || rawItemText;
  const { commonItemId, matchConfidence } = matchCommonItem(itemText, catalog);

  return {
    rawText,
    quantity,
    unitId,
    itemText,
    prepNote,
    commonItemId,
    matchConfidence: itemText ? matchConfidence : 'unmatched',
  };
}
