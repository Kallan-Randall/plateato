import { describe, expect, it } from 'vitest';

import { groupBySortedKey } from './grouping';

type Item = { name: string; location: string; sortOrder: number };

const items: Item[] = [
  { name: 'Milk', location: 'Fridge', sortOrder: 1 },
  { name: 'Flour', location: 'Pantry', sortOrder: 2 },
  { name: 'Butter', location: 'Fridge', sortOrder: 1 },
  { name: 'Ice cream', location: 'Freezer', sortOrder: 0 },
];

describe('groupBySortedKey', () => {
  it('buckets items under their group title', () => {
    const groups = groupBySortedKey(items, (i) => ({ title: i.location, sortOrder: i.sortOrder }));
    const fridge = groups.find((g) => g.title === 'Fridge');
    expect(fridge?.data.map((i) => i.name)).toEqual(['Milk', 'Butter']);
  });

  it('orders groups by sortOrder ascending, not first-seen order', () => {
    const groups = groupBySortedKey(items, (i) => ({ title: i.location, sortOrder: i.sortOrder }));
    expect(groups.map((g) => g.title)).toEqual(['Freezer', 'Fridge', 'Pantry']);
  });

  it('returns an empty array for an empty input', () => {
    expect(groupBySortedKey([], (i: Item) => ({ title: i.location, sortOrder: i.sortOrder }))).toEqual([]);
  });

  it('creates one group per distinct title even if sortOrder repeats', () => {
    const groups = groupBySortedKey(items, (i) => ({ title: i.location, sortOrder: i.sortOrder }));
    expect(groups).toHaveLength(3);
  });
});
