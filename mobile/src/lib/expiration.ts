export const EXP_PRESETS: { label: string; days: number | null }[] = [
  { label: 'None', days: null },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '1 year', days: 365 },
];

/** Today + N days, as a YYYY-MM-DD string. */
export function isoDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Map an item's typical shelf life to the nearest preset the user can tap. */
export function closestPresetDays(shelfLife: number | null): number | null {
  if (shelfLife == null) return null;
  let best: number | null = null;
  let bestDiff = Infinity;
  for (const preset of EXP_PRESETS) {
    if (preset.days == null) continue;
    const diff = Math.abs(preset.days - shelfLife);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = preset.days;
    }
  }
  return best;
}
