'use server';

import { revalidatePath } from 'next/cache';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

export async function addShoppingItem(name: string): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: null };

  const supabase = await createClient();
  const { userId } = await requireHouseholdId(supabase);

  const { data: listId, error: listError } = await supabase.rpc('ensure_shopping_list');
  if (listError || !listId) return { error: listError?.message ?? 'Could not find your shopping list' };

  // Inherit the category from a matching catalog item, for aisle grouping.
  const { data: match } = await supabase
    .from('common_items')
    .select('category_id')
    .ilike('name', trimmed)
    .maybeSingle();

  const { error } = await supabase.from('shopping_list_items').insert({
    list_id: listId,
    name: trimmed,
    category_id: match?.category_id ?? 'other',
    added_by: userId,
  });
  if (error) return { error: error.message };

  revalidatePath('/dashboard/shopping');
  return { error: null };
}

export async function toggleShoppingItem(id: string, checked: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const { error } = await supabase.from('shopping_list_items').update({ checked }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/shopping');
  return { error: null };
}

export async function clearCheckedItems(listId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('list_id', listId)
    .eq('checked', true);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/shopping');
  return { error: null };
}
