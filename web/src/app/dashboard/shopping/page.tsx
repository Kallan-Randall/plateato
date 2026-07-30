import { groupBySortedKey } from '@plateato/core';

import { createClient } from '@/lib/supabase/server';

import { ShoppingListView } from './shopping-list-view';

type ShoppingItem = {
  id: string;
  name: string;
  quantity: number | null;
  checked: boolean;
  unit: { abbreviation: string } | null;
  category: { name: string; sort_order: number } | null;
};

export default async function ShoppingPage() {
  const supabase = await createClient();

  const { data: listId } = await supabase.rpc('ensure_shopping_list');

  const { data } = listId
    ? await supabase
        .from('shopping_list_items')
        .select(
          'id, name, quantity, checked, unit:units(abbreviation), category:categories(name, sort_order)',
        )
        .eq('list_id', listId)
        .order('created_at')
        .returns<ShoppingItem[]>()
    : { data: [] as ShoppingItem[] };

  const items = data ?? [];
  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  const sections = groupBySortedKey(unchecked, (item) => ({
    title: item.category?.name ?? 'Other',
    sortOrder: item.category?.sort_order ?? 998,
  }));

  return (
    <ShoppingListView listId={listId ?? null} sections={sections} checked={checked} />
  );
}
