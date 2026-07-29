export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type QuantityLike = {
  quantity: number | null;
  unit?: { abbreviation: string } | null;
  trackingMode?: 'precise' | 'count' | 'approximate';
  approximateLevel?: 'full' | 'half' | 'low' | null;
};

/**
 * How a quantity reads depends on tracking mode: approximate items show a
 * level ("Half"), everything else shows quantity + unit if present. Returns
 * null when there's nothing to show — callers decide the empty-state string.
 */
export function formatQuantity(item: QuantityLike): string | null {
  if (item.trackingMode === 'approximate') {
    return item.approximateLevel ? capitalize(item.approximateLevel) : null;
  }
  if (item.quantity == null) return null;
  return item.unit?.abbreviation ? `${item.quantity} ${item.unit.abbreviation}` : `${item.quantity}`;
}
