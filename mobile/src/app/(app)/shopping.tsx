import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type ShoppingItem = {
  id: string;
  name: string;
  quantity: number | null;
  checked: boolean;
  unit: { abbreviation: string } | null;
  category: { name: string; sort_order: number } | null;
};

type Section = { title: string; sortOrder: number; data: ShoppingItem[] };

// Unchecked items group by category (aisle-style); checked items sink to the bottom.
function buildSections(items: ShoppingItem[]): Section[] {
  const groups = new Map<string, Section>();
  const done: Section = { title: 'Checked off', sortOrder: 9999, data: [] };
  for (const item of items) {
    if (item.checked) {
      done.data.push(item);
      continue;
    }
    const title = item.category?.name ?? 'Other';
    const sortOrder = item.category?.sort_order ?? 998;
    if (!groups.has(title)) groups.set(title, { title, sortOrder, data: [] });
    groups.get(title)!.data.push(item);
  }
  const sections = [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  if (done.data.length > 0) sections.push(done);
  return sections;
}

function formatQuantity(item: ShoppingItem): string | null {
  if (item.quantity == null) return null;
  return item.unit?.abbreviation
    ? `${item.quantity} ${item.unit.abbreviation}`
    : `${item.quantity}`;
}

export default function ShoppingScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [listId, setListId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchItems = useCallback(async (list: string) => {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select(
        'id, name, quantity, checked, unit:units(abbreviation), category:categories(name, sort_order)',
      )
      .eq('list_id', list)
      .order('created_at');
    if (!error && data) {
      setSections(buildSections(data as unknown as ShoppingItem[]));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Resolve the household's list (created on first use), then load its items.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data, error } = await supabase.rpc('ensure_shopping_list');
        if (!error && data) {
          setListId(data as string);
          fetchItems(data as string);
        } else {
          setLoading(false);
        }
      })();
    }, [fetchItems]),
  );

  const onRefresh = useCallback(() => {
    if (!listId) return;
    setRefreshing(true);
    fetchItems(listId);
  }, [listId, fetchItems]);

  const addItem = async () => {
    const name = newItem.trim();
    if (!name || !listId || !session) return;
    setAdding(true);
    // If the name matches a catalog item, inherit its category for grouping.
    const { data: match } = await supabase
      .from('common_items')
      .select('id, category_id')
      .ilike('name', name)
      .maybeSingle();
    await supabase.from('shopping_list_items').insert({
      list_id: listId,
      common_item_id: match?.id ?? null,
      name,
      category_id: match?.category_id ?? 'other',
      added_by: session.user.id,
    });
    setNewItem('');
    setAdding(false);
    fetchItems(listId);
  };

  const toggleItem = async (item: ShoppingItem) => {
    if (!listId) return;
    await supabase
      .from('shopping_list_items')
      .update({ checked: !item.checked })
      .eq('id', item.id);
    fetchItems(listId);
  };

  const clearChecked = async () => {
    if (!listId) return;
    await supabase.from('shopping_list_items').delete().eq('list_id', listId).eq('checked', true);
    fetchItems(listId);
  };

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
          Shopping
        </ThemedText>

        <View style={styles.addRow}>
          <View style={styles.addField}>
            <TextField
              value={newItem}
              onChangeText={setNewItem}
              placeholder="Add an item: milk, bread…"
              onSubmitEditing={addItem}
              autoCorrect={false}
            />
          </View>
          <Pressable
            onPress={addItem}
            disabled={!newItem.trim() || adding}
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: theme.primary,
                opacity: !newItem.trim() || adding ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}>
            <ThemedText type="small" style={{ color: theme.onPrimary }}>
              Add
            </ThemedText>
          </Pressable>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              {section.title === 'Checked off' ? (
                <Pressable onPress={clearChecked} hitSlop={8}>
                  <ThemedText type="small" themeColor="danger">
                    Clear
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          )}
          renderItem={({ item }) => {
            const qty = formatQuantity(item);
            return (
              <Pressable
                onPress={() => toggleItem(item)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 },
                ]}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: item.checked ? theme.primary : theme.border,
                      backgroundColor: item.checked ? theme.primary : 'transparent',
                    },
                  ]}>
                  {item.checked ? (
                    <ThemedText type="small" style={{ color: theme.onPrimary, lineHeight: 16 }}>
                      ✓
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText
                  type="default"
                  themeColor={item.checked ? 'textSecondary' : 'text'}
                  style={[styles.rowLabel, item.checked && styles.strikethrough]}>
                  {item.name}
                </ThemedText>
                {qty ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {qty}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
                Your list is empty.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Add what you need to buy — everyone in your household sees the same list.
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
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  addField: { flex: 1 },
  addButton: {
    height: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingBottom: Spacing.six, flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  sectionTitle: { textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1 },
  strikethrough: { textDecorationLine: 'line-through' },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyText: { textAlign: 'center' },
});
