import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { matchStatusColor, pantryMatchCount } from '@plateato/core';

type RecipeRow = {
  id: string;
  title: string;
  photo_url: string | null;
  servings: number;
  tags: string[];
  created_at: string;
  recipe_ingredients: { common_item_id: string | null }[];
  cooking_history: { cooked_at: string }[];
};

type Recipe = RecipeRow & {
  ingredientCount: number;
  have: number;
  total: number;
  lastCookedAt: string | null;
};

type SortMode = 'name' | 'recent' | 'match';

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'match', label: 'Best match' },
  { mode: 'recent', label: 'Recently used' },
  { mode: 'name', label: 'Name' },
];

export default function RecipesScreen() {
  const theme = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('match');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const fetchRecipes = useCallback(async () => {
    const [recipesRes, pantryRes] = await Promise.all([
      supabase
        .from('recipes')
        .select(
          'id, title, photo_url, servings, tags, created_at, recipe_ingredients(common_item_id), cooking_history(cooked_at)',
        ),
      supabase.from('pantry_items').select('common_item_id').not('common_item_id', 'is', null),
    ]);

    if (!recipesRes.error && recipesRes.data) {
      const pantryIds = new Set(
        (pantryRes.data as unknown as { common_item_id: string }[] | null)?.map((p) => p.common_item_id) ?? [],
      );
      const rows = recipesRes.data as unknown as RecipeRow[];
      const enriched = rows.map((row) => {
        const { have, total } = pantryMatchCount(row.recipe_ingredients, pantryIds);
        const lastCookedAt = row.cooking_history.length
          ? row.cooking_history.reduce((max, h) => (h.cooked_at > max ? h.cooked_at : max), row.cooking_history[0].cooked_at)
          : null;
        return { ...row, ingredientCount: row.recipe_ingredients.length, have, total, lastCookedAt };
      });
      setRecipes(enriched);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [fetchRecipes]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecipes();
  }, [fetchRecipes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [recipes]);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  const visibleRecipes = useMemo(() => {
    const filtered =
      selectedTags.size === 0 ? recipes : recipes.filter((r) => r.tags.some((t) => selectedTags.has(t)));
    const sorted = [...filtered];
    if (sortMode === 'name') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === 'recent') {
      sorted.sort((a, b) => {
        if (!a.lastCookedAt && !b.lastCookedAt) return a.title.localeCompare(b.title);
        if (!a.lastCookedAt) return 1;
        if (!b.lastCookedAt) return -1;
        return b.lastCookedAt.localeCompare(a.lastCookedAt);
      });
    } else {
      sorted.sort((a, b) => {
        const pctA = a.total === 0 ? -1 : a.have / a.total;
        const pctB = b.total === 0 ? -1 : b.have / b.total;
        return pctB - pctA || a.title.localeCompare(b.title);
      });
    }
    return sorted;
  }, [recipes, selectedTags, sortMode]);

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
            Recipes
          </ThemedText>
          <Pressable
            onPress={() => router.push('/add-recipe' as Href)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText type="small" style={{ color: theme.onPrimary }}>
              + Add
            </ThemedText>
          </Pressable>
        </View>

        {recipes.length > 0 ? (
          <>
            <View style={styles.chipsWrap}>
              {SORT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.mode}
                  label={opt.label}
                  selected={sortMode === opt.mode}
                  onPress={() => setSortMode(opt.mode)}
                />
              ))}
            </View>
            {allTags.length > 0 ? (
              <View style={styles.chipsWrap}>
                {allTags.map((tag) => (
                  <Chip key={tag} label={tag} selected={selectedTags.has(tag)} onPress={() => toggleTag(tag)} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        <FlatList
          data={visibleRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/recipe/${item.id}` as Href)}
              style={({ pressed }) => [
                styles.card,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
              ]}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="title" themeColor="primary" style={styles.photoInitial}>
                    {item.title.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <ThemedText type="default" style={styles.cardTitle}>
                    {item.title}
                  </ThemedText>
                  {item.total > 0 ? (
                    <ThemedText type="smallBold" themeColor={matchStatusColor(item.have, item.total)}>
                      {item.have}/{item.total}
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.servings} servings · {item.ingredientCount} ingredients
                </ThemedText>
                {item.tags.length > 0 ? (
                  <View style={styles.tagRow}>
                    {item.tags.map((tag) => (
                      <View key={tag} style={[styles.tagPill, { borderColor: theme.border }]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {tag}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
                {recipes.length === 0 ? 'No recipes yet.' : 'No recipes match this filter.'}
              </ThemedText>
              {recipes.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Tap “+ Add” to save your first one.
                </ThemedText>
              ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  addButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
  },
  photo: { width: 64, height: 64, borderRadius: 12 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoInitial: { fontSize: 24, lineHeight: 28 },
  cardBody: { flex: 1, gap: Spacing.half, justifyContent: 'center' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  cardTitle: { flexShrink: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  tagPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyText: { textAlign: 'center' },
});
