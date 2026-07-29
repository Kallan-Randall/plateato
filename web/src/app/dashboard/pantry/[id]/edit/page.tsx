import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { EditPantryItemForm } from './edit-form';

export default async function EditPantryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [itemRes, unitsRes, locationsRes] = await Promise.all([
    supabase
      .from('pantry_items')
      .select('id, name, quantity, unit_id, location_id, expiration_date')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('units').select('id, abbreviation, dimension'),
    supabase.from('locations').select('id, name, sort_order').order('sort_order'),
  ]);

  if (!itemRes.data) notFound();

  return (
    <EditPantryItemForm
      item={itemRes.data}
      units={unitsRes.data ?? []}
      locations={locationsRes.data ?? []}
    />
  );
}
