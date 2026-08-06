import { describe, expect, it } from 'vitest';

import { formatCleanQuantity } from './format-quantity';

describe('formatCleanQuantity', () => {
  it('shows a whole number with no fraction suffix', () => {
    expect(formatCleanQuantity(2)).toBe('2');
    expect(formatCleanQuantity(0)).toBe('0');
  });

  it('snaps an exact half to its glyph, with the whole-number prefix', () => {
    expect(formatCleanQuantity(1.5)).toBe('1½');
  });

  it('omits the whole-number prefix when it is zero', () => {
    expect(formatCleanQuantity(0.5)).toBe('½');
  });

  it('snaps a repeating-decimal third to its glyph', () => {
    expect(formatCleanQuantity(2 + 1 / 3)).toBe('2⅓');
  });

  it('snaps a value close to (but not exactly) a fraction, within tolerance', () => {
    // 236.588 = 1 cup converted to ml; its fractional part (.588) is close
    // enough to 3/5 (.6) to read as a clean fraction instead of a decimal
    // scaling artifact.
    expect(formatCleanQuantity(236.588)).toBe('236⅗');
  });

  it('falls back to a rounded decimal when nothing is close enough to snap to', () => {
    expect(formatCleanQuantity(3.05)).toBe('3.05');
  });

  it('does not round up toward the next whole number, even very close to it', () => {
    // Known asymmetry: the snap-to-whole-number check only looks at
    // fractions just *above* the floor (frac < 0.01), not close to the next
    // ceiling, so this reads as "3.95" rather than "4".
    expect(formatCleanQuantity(3.95)).toBe('3.95');
  });
});
