export type SortedGroup<T> = { title: string; sortOrder: number; data: T[] };

/**
 * Bucket items into sort-ordered groups (e.g. pantry items by location,
 * shopping items by category). The result is sorted by sortOrder ascending.
 */
export function groupBySortedKey<T>(
  items: T[],
  getGroup: (item: T) => { title: string; sortOrder: number },
): SortedGroup<T>[] {
  const groups = new Map<string, SortedGroup<T>>();
  for (const item of items) {
    const { title, sortOrder } = getGroup(item);
    if (!groups.has(title)) groups.set(title, { title, sortOrder, data: [] });
    groups.get(title)!.data.push(item);
  }
  return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}
