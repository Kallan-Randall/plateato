import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EXP_PRESETS, closestPresetDays, expirationStatus, isoDatePlusDays } from './expiration';

// expirationStatus and isoDatePlusDays are both relative to "now", so the
// clock is pinned for the whole file to make every assertion deterministic
// regardless of when the suite actually runs.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('expirationStatus', () => {
  it('returns null when there is no date', () => {
    expect(expirationStatus(null)).toBeNull();
  });

  it('reports a past date as expired', () => {
    expect(expirationStatus('2026-01-10')).toEqual({ label: 'Expired', color: 'danger' });
  });

  it('reports the current date as "Today"', () => {
    expect(expirationStatus('2026-01-15')).toEqual({ label: 'Today', color: 'warning' });
  });

  it('reports the warning threshold (<=3 days) with a day count', () => {
    expect(expirationStatus('2026-01-18')).toEqual({ label: '3d left', color: 'warning' });
  });

  it('reports beyond the warning threshold as a plain day count', () => {
    expect(expirationStatus('2026-01-19')).toEqual({ label: '4d', color: 'success' });
  });
});

describe('isoDatePlusDays', () => {
  it('returns today\'s date for 0 days', () => {
    expect(isoDatePlusDays(0)).toBe('2026-01-15');
  });

  it('adds the given number of days', () => {
    expect(isoDatePlusDays(7)).toBe('2026-01-22');
  });

  it('rolls over a month boundary correctly', () => {
    expect(isoDatePlusDays(20)).toBe('2026-02-04');
  });
});

describe('closestPresetDays', () => {
  it('returns null when there is no shelf life to map', () => {
    expect(closestPresetDays(null)).toBeNull();
  });

  it('picks the nearest preset', () => {
    expect(closestPresetDays(32)).toBe(30);
  });

  it('breaks an exact tie in favor of the earlier (shorter) preset', () => {
    // 5 is equidistant from the 3-day and 7-day presets.
    expect(closestPresetDays(5)).toBe(3);
  });

  it('clamps to the largest preset for a shelf life beyond it', () => {
    expect(closestPresetDays(2000)).toBe(365);
  });

  it('never returns a value outside EXP_PRESETS', () => {
    const validDays = EXP_PRESETS.map((p) => p.days).filter((d): d is number => d != null);
    expect(validDays).toContain(closestPresetDays(100));
  });
});
