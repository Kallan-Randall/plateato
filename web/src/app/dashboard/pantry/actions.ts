'use server';

import { redirect } from 'next/navigation';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

export type PantryItemInput = {
  commonItemId: string | null;
  name: string;
  categoryId: string | null;
  locationId: string | null;
  quantity: number;
  unitId: string | null;
  expirationDate: string | null;
};

export async function addPantryItem(input: PantryItemInput): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { userId, householdId } = await requireHouseholdId(supabase);

  const { error } = await supabase.from('pantry_items').insert({
    household_id: householdId,
    common_item_id: input.commonItemId,
    name: input.name,
    category_id: input.categoryId,
    location_id: input.locationId,
    tracking_mode: 'precise',
    quantity: input.quantity,
    unit_id: input.unitId,
    expiration_date: input.expirationDate,
    created_by: userId,
    updated_by: userId,
  });
  if (error) return { error: error.message };

  redirect('/dashboard/pantry');
}

export async function updatePantryItem(
  id: string,
  input: Pick<PantryItemInput, 'locationId' | 'quantity' | 'unitId' | 'expirationDate'>,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { userId } = await requireHouseholdId(supabase);

  const { error } = await supabase
    .from('pantry_items')
    .update({
      location_id: input.locationId,
      quantity: input.quantity,
      unit_id: input.unitId,
      expiration_date: input.expirationDate,
      tracking_mode: 'precise',
      updated_by: userId,
    })
    .eq('id', id);
  if (error) return { error: error.message };

  redirect('/dashboard/pantry');
}

export async function deletePantryItem(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const { error } = await supabase.from('pantry_items').delete().eq('id', id);
  if (error) return { error: error.message };

  redirect('/dashboard/pantry');
}
