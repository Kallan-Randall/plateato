import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { EXP_PRESETS, isoDatePlusDays } from '@/lib/expiration';
import { supabase } from '@/lib/supabase';

type Unit = { id: string; abbreviation: string; dimension: string };
type Location = { id: string; name: string; sort_order: number };
type PantryItemRow = {
  id: string;
  name: string;
  quantity: number | null;
  unit_id: string | null;
  location_id: string | null;
  expiration_date: string | null;
};

export default function EditItemScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitId, setUnitId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [expiration, setExpiration] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [itemRes, unitsRes, locsRes] = await Promise.all([
        supabase
          .from('pantry_items')
          .select('id, name, quantity, unit_id, location_id, expiration_date')
          .eq('id', id)
          .maybeSingle(),
        supabase.from('units').select('id, abbreviation, dimension'),
        supabase.from('locations').select('id, name, sort_order').order('sort_order'),
      ]);
      if (!active) return;
      if (unitsRes.data) setUnits(unitsRes.data as unknown as Unit[]);
      if (locsRes.data) setLocations(locsRes.data as unknown as Location[]);
      const item = itemRes.data as unknown as PantryItemRow | null;
      if (item) {
        setName(item.name);
        setQuantity(item.quantity != null ? String(item.quantity) : '1');
        setUnitId(item.unit_id);
        setLocationId(item.location_id);
        setExpiration(item.expiration_date);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const adjust = (delta: number) =>
    setQuantity(String(Math.max(0, (Number(quantity) || 0) + delta)));

  const save = async () => {
    if (!session) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase
      .from('pantry_items')
      .update({
        quantity: Number(quantity) || 0,
        unit_id: unitId,
        location_id: locationId,
        expiration_date: expiration,
        tracking_mode: 'precise',
        updated_by: session.user.id,
      })
      .eq('id', id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    router.back();
  };

  const remove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setSaving(true);
    setError(null);
    const { error: delError } = await supabase.from('pantry_items').delete().eq('id', id);
    setSaving(false);
    if (delError) {
      setError(delError.message);
      return;
    }
    router.back();
  };

  const currentDimension = units.find((u) => u.id === unitId)?.dimension;
  const unitOptions = units.filter((u) => u.dimension === currentDimension);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
          <ThemedText type="smallBold">Edit item</ThemedText>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" themeColor="primary">
            {name}
          </ThemedText>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Quantity
            </ThemedText>
            <View style={styles.qtyRow}>
              <Pressable
                onPress={() => adjust(-1)}
                style={[styles.stepBtn, { borderColor: theme.border }]}>
                <ThemedText style={styles.stepLabel}>−</ThemedText>
              </Pressable>
              <TextField
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                style={styles.qtyInput}
              />
              <Pressable
                onPress={() => adjust(1)}
                style={[styles.stepBtn, { borderColor: theme.border }]}>
                <ThemedText style={styles.stepLabel}>+</ThemedText>
              </Pressable>
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
              {EXP_PRESETS.map((p) => {
                const value = p.days != null ? isoDatePlusDays(p.days) : null;
                return (
                  <Chip
                    key={p.label}
                    label={p.label}
                    selected={expiration === value}
                    onPress={() => setExpiration(value)}
                  />
                );
              })}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {expiration ? `Expires ${expiration}` : 'No expiration date'}
            </ThemedText>
          </View>

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Button
            title="Save changes"
            onPress={save}
            loading={saving}
            disabled={!unitId || !locationId}
          />
          <Button
            title={confirmRemove ? 'Tap again to remove' : 'Remove from pantry'}
            variant="secondary"
            onPress={remove}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  content: { padding: Spacing.four, gap: Spacing.four },
  field: { gap: Spacing.two },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  qtyInput: { width: 80 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: 22, lineHeight: 26 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
