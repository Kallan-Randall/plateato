import { VULGAR_FRACTIONS } from './ingredient-parser';

const FRACTION_GLYPHS = Object.entries(VULGAR_FRACTIONS).map(([glyph, value]) => ({ glyph, value }));

/**
 * Formats a scaled recipe quantity for display, snapping the fractional part
 * to a common cooking fraction ("1½") when it's close to one instead of
 * showing a scaling artifact like "1.3333333333333335".
 */
export function formatCleanQuantity(quantity: number): string {
  const whole = Math.floor(quantity);
  const frac = quantity - whole;

  if (frac < 0.01) return String(whole);

  for (const { glyph, value } of FRACTION_GLYPHS) {
    if (Math.abs(frac - value) < 0.03) {
      return whole > 0 ? `${whole}${glyph}` : glyph;
    }
  }

  return String(Math.round(quantity * 100) / 100);
}
