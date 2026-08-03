import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { expirationStatus, isoDatePlusDays } from '@/lib/expiration';
import { supabase } from '@/lib/supabase';
import { matchStatusColor, pantryMatchCount } from '@plateato/core';

const EXPIRING_WINDOW_DAYS = 7;
// Below this pantry-match ratio a recipe isn't a realistic "cook tonight"
// suggestion — you're still missing more than you have.
const SUGGESTION_MATCH_THRESHOLD = 0.5;
const MAX_SUGGESTIONS = 3;

type ExpiringItem = {
  id: string;
  name: string;
  expiration_date: string | null;
  location: { name: string } | null;
};

type ShoppingSnapshot = { count: number; preview: string[] };
type RecipeSuggestion = { id: string; title: string; have: number; total: number };

export default function HomeScreen() {
  const theme = useTheme();
  const [expiring, setExpiring] = useState<ExpiringItem[]>([]);
  const [shopping, setShopping] = useState<ShoppingSnapshot>({ count: 0, preview: [] });
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    const expiringReq = supabase
      .from('pantry_items')
      .select('id, name, expiration_date, location:locations(name)')
      .not('expiration_date', 'is', null)
      .lte('expiration_date', isoDatePlusDays(EXPIRING_WINDOW_DAYS))
      .order('expiration_date')
      .limit(5);

    const shoppingReq = (async (): Promise<ShoppingSnapshot> => {
      const { data: listId } = await supabase.rpc('ensure_shopping_list');
      if (!listId) return { count: 0, preview: [] };
      const { data, count } = await supabase
        .from('shopping_list_items')
        .select('name', { count: 'exact' })
        .eq('list_id', listId as string)
        .eq('checked', false)
        .order('created_at')
        .limit(3);
      return {
        count: count ?? 0,
        preview: ((data ?? []) as { name: string }[]).map((d) => d.name),
      };
    })();

    const suggestionsReq = (async (): Promise<RecipeSuggestion[]> => {
      const [recipesRes, pantryRes] = await Promise.all([
        supabase.from('recipes').select('id, title, recipe_ingredients(common_item_id)'),
        supabase.from('pantry_items').select('common_item_id').not('common_item_id', 'is', null),
      ]);
      if (!recipesRes.data) return [];
      const pantryIds = new Set(
        (pantryRes.data as unknown as { common_item_id: string }[] | null)?.map((p) => p.common_item_id) ?? [],
      );
      const rows = recipesRes.data as unknown as {
        id: string;
        title: string;
        recipe_ingredients: { common_item_id: string | null }[];
      }[];
      return rows
        .map((row) => ({ id: row.id, title: row.title, ...pantryMatchCount(row.recipe_ingredients, pantryIds) }))
        .filter((r) => r.total > 0 && r.have / r.total >= SUGGESTION_MATCH_THRESHOLD)
        .sort((a, b) => b.have / b.total - a.have / a.total || a.title.localeCompare(b.title))
        .slice(0, MAX_SUGGESTIONS);
    })();

    const [expiringRes, shoppingRes, suggestionsRes] = await Promise.all([expiringReq, shoppingReq, suggestionsReq]);
    if (expiringRes.data) setExpiring(expiringRes.data as unknown as ExpiringItem[]);
    setShopping(shoppingRes);
    setSuggestions(suggestionsRes);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard]),
  );

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
        <View style={styles.header}>
          <ThemedText type="subtitle" themeColor="primary">
            Home
          </ThemedText>
          <Pressable onPress={() => router.push('/settings' as Href)} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              Settings
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
              EXPIRING SOON
            </ThemedText>
            {expiring.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing expiring in the next {EXPIRING_WINDOW_DAYS} days.
              </ThemedText>
            ) : (
              expiring.map((item) => {
                const exp = expirationStatus(item.expiration_date);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(('/edit-item?id=' + item.id) as Href)}
                    style={({ pressed }) => [
                      styles.cardRow,
                      { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 },
                    ]}>
                    <View style={styles.rowLeft}>
                      {exp ? (
                        <View style={[styles.dot, { backgroundColor: theme[exp.color] }]} />
                      ) : null}
                      <ThemedText type="default">{item.name}</ThemedText>
                    </View>
                    <View style={styles.rowRight}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.location?.name ?? ''}
                      </ThemedText>
                      {exp ? (
                        <ThemedText type="small" themeColor={exp.color}>
                          {exp.label}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
              RECIPE SUGGESTIONS
            </ThemedText>
            {suggestions.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Add recipes and stock your pantry to see what you can cook.
              </ThemedText>
            ) : (
              suggestions.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/recipe/${r.id}` as Href)}
                  style={({ pressed }) => [
                    styles.cardRow,
                    { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <ThemedText type="default">{r.title}</ThemedText>
                  <ThemedText type="small" themeColor={matchStatusColor(r.have, r.total)}>
                    {r.have}/{r.total}
                  </ThemedText>
                </Pressable>
              ))
            )}
          </View>

          <Pressable
            onPress={() => router.push('/shopping' as Href)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
              SHOPPING LIST
            </ThemedText>
            {shopping.count === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing on the list. Tap to add items.
              </ThemedText>
            ) : (
              <View style={styles.shoppingSummary}>
                <ThemedText type="default">
                  {shopping.count} {shopping.count === 1 ? 'item' : 'items'} to buy
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {shopping.preview.join(', ')}
                  {shopping.count > shopping.preview.length ? '…' : ''}
                </ThemedText>
              </View>
            )}
          </Pressable>
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTitle: { letterSpacing: 0.5 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  shoppingSummary: { gap: Spacing.one },
});
