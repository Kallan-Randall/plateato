import { describe, expect, it } from 'vitest';

import { capitalize, formatQuantity } from './format';

describe('capitalize', () => {
  it('uppercases the first letter and leaves the rest alone', () => {
    expect(capitalize('half')).toBe('Half');
  });

  it('handles an already-capitalized string as a no-op', () => {
    expect(capitalize('Full')).toBe('Full');
  });

  it('handles an empty string without throwing', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('formatQuantity', () => {
  it('shows the approximate level, capitalized, for approximate tracking', () => {
    expect(formatQuantity({ quantity: null, trackingMode: 'approximate', approximateLevel: 'half' })).toBe('Half');
  });

  it('returns null for approximate tracking with no level set', () => {
    expect(formatQuantity({ quantity: null, trackingMode: 'approximate', approximateLevel: null })).toBeNull();
  });

  it('shows quantity + unit abbreviation for precise tracking', () => {
    expect(formatQuantity({ quantity: 500, unit: { abbreviation: 'g' } })).toBe('500 g');
  });

  it('shows a bare quantity when there is no unit', () => {
    expect(formatQuantity({ quantity: 3 })).toBe('3');
  });

  it('returns null when there is no quantity to show', () => {
    expect(formatQuantity({ quantity: null })).toBeNull();
  });
});
