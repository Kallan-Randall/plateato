import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type PantryItem = {
  id: string;
  name: string;
  tracking_mode: 'precise' | 'count' | 'approximate';
  quantity: number | null;
  approximate_level: 'full' | 'half' | 'low' | null;
  expiration_date: string | null;
  unit: { abbreviation: string } | null;
  location: { name: string; sort_order: number } | null;
};

type Section = { title: string; sortOrder: number; data: PantryItem[] };

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// How a quantity reads depends on the item's tracking mode.
function formatQuantity(item: PantryItem): string {
  if (item.tracking_mode === 'approximate') {
    return item.approximate_level ? capitalize(item.approximate_level) : '—';
  }
  if (item.quantity == null) return '—';
  return item.unit?.abbreviation ? `${item.quantity} ${item.unit.abbreviation}` : `${item.quantity}`;
}

type ExpStatus = { label: string; color: 'success' | 'warning' | 'danger' };

function expirationStatus(date: string | null): ExpStatus | null {
  if (!date) return null;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Expired', color: 'danger' };
  if (days <= 3) return { label: days === 0 ? 'Today' : `${days}d left`, color: 'warning' };
  return { label: `${days}d`, color: 'success' };
}

function groupByLocation(items: PantryItem[]): Section[] {
  const groups = new Map<string, Section>();
  for (const item of items) {
    const title = item.location?.name ?? 'Unsorted';
    const sortOrder = item.location?.sort_order ?? 999;
    if (!groups.has(title)) groups.set(title, { title, sortOrder, data: [] });
    groups.get(title)!.data.push(item);
  }
  return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export default function PantryScreen() {
  const theme = useTheme();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('pantry_items')
      .select(
        'id, name, tracking_mode, quantity, approximate_level, expiration_date, unit:units(abbreviation), location:locations(name, sort_order)',
      )
      .order('name');
    if (!error && data) {
      setSections(groupByLocation(data as unknown as PantryItem[]));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems();
  }, [fetchItems]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemedText type="subtitle" themeColor="primary" style={styles.title}>
          Pantry
        </ThemedText>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => {
            const exp = expirationStatus(item.expiration_date);
            return (
              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <ThemedText type="default">{item.name}</ThemedText>
                <View style={styles.rowRight}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatQuantity(item)}
                  </ThemedText>
                  {exp ? (
                    <View style={styles.chip}>
                      <View style={[styles.dot, { backgroundColor: theme[exp.color] }]} />
                      <ThemedText type="small" themeColor={exp.color}>
                        {exp.label}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
                Your pantry is empty.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Adding items comes next — the + button is on the way.
              </ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1 },
  title: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  listContent: { paddingBottom: Spacing.six, flexGrow: 1 },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyText: { textAlign: 'center' },
});
