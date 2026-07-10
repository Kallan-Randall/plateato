import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { EXP_PRESETS, closestPresetDays, isoDatePlusDays } from '@/lib/expiration';
import { supabase } from '@/lib/supabase';

type CommonItem = {
  id: string;
  name: string;
  category_id: string | null;
  default_unit_id: string | null;
  default_location_id: string | null;
  typical_shelf_life_days: number | null;
};
type Unit = { id: string; abbreviation: string; dimension: string };
type Location = { id: string; name: string; sort_order: number };
type Selected = { commonItemId: string | null; name: string; categoryId: string | null };

export default function AddItemScreen() {
  const theme = useTheme();
  const { householdId, session } = useAuth();

  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommonItem[]>([]);

  const [selected, setSelected] = useState<Selected | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitId, setUnitId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [expDays, setExpDays] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference data (small tables) loaded once.
  useEffect(() => {
    supabase
      .from('units')
      .select('id, abbreviation, dimension')
      .then(({ data }) => data && setUnits(data as unknown as Unit[]));
    supabase
      .from('locations')
      .select('id, name, sort_order')
      .order('sort_order')
      .then(({ data }) => data && setLocations(data as unknown as Location[]));
  }, []);

  // Search the catalog whenever the query changes.
  useEffect(() => {
    let active = true;
    (async () => {
      let request = supabase
        .from('common_items')
        .select('id, name, category_id, default_unit_id, default_location_id, typical_shelf_life_days')
        .order('name')
        .limit(25);
      if (query.trim()) request = request.ilike('name', `%${query.trim()}%`);
      const { data } = await request;
      if (active && data) setResults(data as unknown as CommonItem[]);
    })();
    return () => {
      active = false;
    };
  }, [query]);

  const selectItem = (item: CommonItem) => {
    setSelected({ commonItemId: item.id, name: item.name, categoryId: item.category_id });
    setUnitId(item.default_unit_id ?? 'each');
    setLocationId(item.default_location_id ?? 'pantry');
    setExpDays(closestPresetDays(item.typical_shelf_life_days));
    setQuantity('1');
  };

  const selectCustom = () => {
    setSelected({ commonItemId: null, name: query.trim(), categoryId: 'other' });
    setUnitId('each');
    setLocationId('pantry');
    setExpDays(null);
    setQuantity('1');
  };

  const save = async () => {
    if (!householdId || !session || !selected) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.from('pantry_items').insert({
      household_id: householdId,
      common_item_id: selected.commonItemId,
      name: selected.name,
      category_id: selected.categoryId,
      location_id: locationId,
      tracking_mode: 'precise',
      quantity: Number(quantity) || 0,
      unit_id: unitId,
      expiration_date: expDays != null ? isoDatePlusDays(expDays) : null,
      created_by: session.user.id,
      updated_by: session.user.id,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    router.back();
  };

  const currentDimension = units.find((u) => u.id === unitId)?.dimension;
  const unitOptions = units.filter((u) => u.dimension === currentDimension);
  const alreadyInResults = results.some(
    (r) => r.name.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
          <ThemedText type="smallBold">{selected ? 'Confirm item' : 'Add item'}</ThemedText>
          <View style={styles.spacer} />
        </View>

        {!selected ? (
          <View style={styles.searchBody}>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Search: milk, onion, olive oil…"
              autoFocus
              autoCorrect={false}
            />
            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
              {results.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => selectItem(item)}
                  style={[styles.resultRow, { borderBottomColor: theme.border }]}>
                  <ThemedText>{item.name}</ThemedText>
                </Pressable>
              ))}
              {query.trim() && !alreadyInResults ? (
                <Pressable
                  onPress={selectCustom}
                  style={[styles.resultRow, { borderBottomColor: theme.border }]}>
                  <ThemedText themeColor="primary">Add “{query.trim()}” as a custom item</ThemedText>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.confirmContent} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle" themeColor="primary">
              {selected.name}
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Quantity
              </ThemedText>
              <View style={styles.qtyRow}>
                <TextField
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  style={styles.qtyInput}
                />
                <View style={styles.chipsWrap}>
                  {unitOptions.map((u) => (
                    <Chip
                      key={u.id}
                      label={u.abbreviation}
                      selected={u.id === unitId}
                      onPress={() => setUnitId(u.id)}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Location
              </ThemedText>
              <View style={styles.chipsWrap}>
                {locations.map((l) => (
                  <Chip
                    key={l.id}
                    label={l.name}
                    selected={l.id === locationId}
                    onPress={() => setLocationId(l.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Expiration
              </ThemedText>
              <View style={styles.chipsWrap}>
                {EXP_PRESETS.map((p) => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    selected={p.days === expDays}
                    onPress={() => setExpDays(p.days)}
                  />
                ))}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {expDays != null ? `Expires ${isoDatePlusDays(expDays)}` : 'No expiration date'}
              </ThemedText>
            </View>

            {error ? (
              <ThemedText type="small" themeColor="danger">
                {error}
              </ThemedText>
            ) : null}

            <Button
              title="Save to pantry"
              onPress={save}
              loading={saving}
              disabled={!unitId || !locationId}
            />
            <Button title="Back to search" variant="secondary" onPress={() => setSelected(null)} />
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spacer: { width: 50 },
  searchBody: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.three },
  results: { flex: 1 },
  resultRow: {
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  confirmContent: { padding: Spacing.four, gap: Spacing.four },
  field: { gap: Spacing.two },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
  qtyInput: { width: 90 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
