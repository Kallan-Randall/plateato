import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { formatCleanQuantity } from '@/lib/format-quantity';
import {
  type IngredientMatchStatus,
  type PantryStockRow,
  type UnitInfo,
  matchIngredient,
  pantryMatchCount,
} from '@/lib/pantry-match';
import { supabase } from '@/lib/supabase';

type Recipe = {
  id: string;
  title: string;
  photo_url: string | null;
  servings: number;
  tags: string[];
};

type RecipeIngredient = {
  id: string;
  sort_order: number;
  raw_text: string;
  parsed_quantity: number | null;
  parsed_unit_id: string | null;
  common_item_id: string | null;
  match_confidence: string;
  prep_note: string | null;
};

type RecipeStep = { id: string; step_number: number; text: string; timer_seconds: number | null };
type CommonItemLookup = { id: string; name: string; category_id: string | null };
type DisplayUnit = UnitInfo & { abbreviation: string };

const STATUS_META: Record<IngredientMatchStatus, { label: string; color: 'success' | 'warning' | 'danger' | 'textSecondary' }> = {
  have: { label: 'Have it', color: 'success' },
  low: { label: 'Not enough', color: 'warning' },
  missing: { label: 'Missing', color: 'danger' },
  unmatched: { label: 'Unlinked', color: 'textSecondary' },
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

export default function RecipeDetailScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [commonItems, setCommonItems] = useState<CommonItemLookup[]>([]);
  const [pantryRows, setPantryRows] = useState<PantryStockRow[]>([]);
  const [units, setUnits] = useState<DisplayUnit[]>([]);

  const [targetServings, setTargetServings] = useState(1);
  const [addingMissing, setAddingMissing] = useState(false);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  // useFocusEffect (not a plain effect) so returning from Cooking Mode after
  // "mark as cooked" re-reads pantry_items and shows the updated match state.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [recipeRes, ingredientsRes, stepsRes, commonItemsRes, pantryRes, unitsRes] = await Promise.all([
          supabase.from('recipes').select('id, title, photo_url, servings, tags').eq('id', id).maybeSingle(),
          supabase.from('recipe_ingredients').select('*').eq('recipe_id', id).order('sort_order'),
          supabase.from('recipe_steps').select('*').eq('recipe_id', id).order('step_number'),
          supabase.from('common_items').select('id, name, category_id'),
          supabase.from('pantry_items').select('common_item_id, quantity, unit_id, tracking_mode'),
          supabase.from('units').select('id, abbreviation, dimension, to_base_factor'),
        ]);
        if (!active) return;

        const recipeRow = recipeRes.data as unknown as Recipe | null;
        // Only seed the servings stepper on first load — a refocus (e.g.
        // returning from Cooking Mode) shouldn't clobber the user's choice.
        setRecipe((prev) => {
          if (prev === null) {
            setTargetServings(recipeRow?.servings && recipeRow.servings > 0 ? recipeRow.servings : 1);
          }
          return recipeRow;
        });
        setIngredients((ingredientsRes.data as unknown as RecipeIngredient[]) ?? []);
        setSteps((stepsRes.data as unknown as RecipeStep[]) ?? []);
        setCommonItems((commonItemsRes.data as unknown as CommonItemLookup[]) ?? []);
        setPantryRows((pantryRes.data as unknown as PantryStockRow[]) ?? []);
        setUnits((unitsRes.data as unknown as DisplayUnit[]) ?? []);
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [id]),
  );

  const scaleFactor = recipe && recipe.servings > 0 ? targetServings / recipe.servings : 1;

  const commonItemName = (commonItemId: string | null) =>
    commonItemId ? commonItems.find((c) => c.id === commonItemId)?.name ?? null : null;

  // Match against the *scaled* quantity — how much is needed at the servings
  // the user is actually planning to cook, not the recipe's base amount.
  const matches = useMemo(
    () =>
      ingredients.map((ing) =>
        matchIngredient(
          {
            ...ing,
            parsed_quantity: ing.parsed_quantity != null ? ing.parsed_quantity * scaleFactor : null,
          },
          pantryRows,
          units,
        ),
      ),
    [ingredients, pantryRows, units, scaleFactor],
  );

  const summary = useMemo(
    () => pantryMatchCount(ingredients, new Set(pantryRows.filter((p) => p.common_item_id).map((p) => p.common_item_id!))),
    [ingredients, pantryRows],
  );

  const needToBuy = ingredients
    .map((ing, i) => ({ ing, match: matches[i] }))
    .filter(({ match }) => match.status === 'missing' || match.status === 'low');
  const unmatchedCount = matches.filter((m) => m.status === 'unmatched').length;

  const addMissingToShoppingList = async () => {
    if (!session || needToBuy.length === 0) return;
    setAddingMissing(true);
    const { data: listId, error: listError } = await supabase.rpc('ensure_shopping_list');
    if (listError || !listId) {
      setAddingMissing(false);
      return;
    }

    const rows = needToBuy.map(({ ing, match }) => {
      const name = commonItemName(ing.common_item_id) ?? ing.raw_text;
      const scaledNeeded = ing.parsed_quantity != null ? ing.parsed_quantity * scaleFactor : null;
      const quantity = match.status === 'low' && match.shortfall != null ? match.shortfall : scaledNeeded;
      return {
        list_id: listId as string,
        common_item_id: ing.common_item_id,
        name,
        category_id: commonItems.find((c) => c.id === ing.common_item_id)?.category_id ?? 'other',
        quantity,
        unit_id: ing.parsed_unit_id,
        added_by: session.user.id,
      };
    });

    const { error } = await supabase.from('shopping_list_items').insert(rows);
    setAddingMissing(false);
    if (!error) setAddedCount(rows.length);
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (!recipe) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary">Recipe not found.</ThemedText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText themeColor="textSecondary">‹ Back</ThemedText>
          </Pressable>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.headerTitle}>
            {recipe.title}
          </ThemedText>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {recipe.photo_url ? (
            <Image source={{ uri: recipe.photo_url }} style={styles.photo} />
          ) : null}

          <ThemedText type="subtitle" themeColor="primary">
            {recipe.title}
          </ThemedText>

          {recipe.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {recipe.tags.map((tag) => (
                <View key={tag} style={[styles.tagPill, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Servings
            </ThemedText>
            <View style={styles.servingsRow}>
              <Pressable
                onPress={() => setTargetServings((s) => Math.max(1, s - 1))}
                style={[styles.stepBtn, { borderColor: theme.border }]}>
                <ThemedText style={styles.stepLabel}>−</ThemedText>
              </Pressable>
              <ThemedText type="default" style={styles.servingsValue}>
                {targetServings}
              </ThemedText>
              <Pressable
                onPress={() => setTargetServings((s) => s + 1)}
                style={[styles.stepBtn, { borderColor: theme.border }]}>
                <ThemedText style={styles.stepLabel}>+</ThemedText>
              </Pressable>
              {targetServings !== recipe.servings ? (
                <ThemedText type="small" themeColor="textSecondary">
                  (recipe makes {recipe.servings})
                </ThemedText>
              ) : null}
            </View>
          </View>

          {steps.length > 0 ? (
            <Button
              title="Start cooking"
              onPress={() => router.push(`/recipe/${id}/cook?servings=${targetServings}` as Href)}
            />
          ) : null}

          {summary.total > 0 ? (
            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor={summary.have === summary.total ? 'success' : 'text'}>
                Pantry match: {summary.have}/{summary.total}
              </ThemedText>
              {needToBuy.length > 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Need to buy: {needToBuy.map(({ ing }) => commonItemName(ing.common_item_id) ?? ing.raw_text).join(', ')}
                </ThemedText>
              ) : null}
              {unmatchedCount > 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {unmatchedCount} ingredient{unmatchedCount === 1 ? '' : 's'} not linked to the catalog — can't check those.
                </ThemedText>
              ) : null}
              {needToBuy.length > 0 ? (
                <Button
                  title={addedCount != null ? `Added ${addedCount} to shopping list` : 'Add missing to shopping list'}
                  variant="secondary"
                  onPress={addMissingToShoppingList}
                  loading={addingMissing}
                  disabled={addedCount != null}
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Ingredients
            </ThemedText>
            {ingredients.map((ing, i) => {
              const match = matches[i];
              const meta = STATUS_META[match.status];
              const scaledQty = ing.parsed_quantity != null ? ing.parsed_quantity * scaleFactor : null;
              const unitAbbrev = units.find((u) => u.id === ing.parsed_unit_id)?.abbreviation;
              const displayText =
                scaledQty != null
                  ? `${formatCleanQuantity(scaledQty)}${unitAbbrev ? ` ${unitAbbrev}` : ''} ${
                      commonItemName(ing.common_item_id) ?? ing.raw_text
                    }`
                  : ing.raw_text;
              return (
                <View key={ing.id} style={styles.ingredientRow}>
                  <ThemedText type="default" style={styles.ingredientText}>
                    {displayText}
                    {ing.prep_note ? `, ${ing.prep_note}` : ''}
                  </ThemedText>
                  <ThemedText type="small" themeColor={meta.color}>
                    {meta.label}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          {steps.length > 0 ? (
            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Steps
              </ThemedText>
              {steps.map((step) => (
                <View key={step.id} style={styles.stepRow}>
                  <ThemedText type="smallBold" style={styles.stepNumber}>
                    {step.step_number}.
                  </ThemedText>
                  <View style={styles.stepTextWrap}>
                    <ThemedText type="default">{step.text}</ThemedText>
                    {step.timer_seconds ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        ⏱ {formatTimer(step.timer_seconds)}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: Spacing.two },
  spacer: { width: 50 },
  content: { padding: Spacing.four, gap: Spacing.four },
  photo: { width: '100%', height: 200, borderRadius: 16 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  tagPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  field: { gap: Spacing.two },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: 20, lineHeight: 24 },
  servingsValue: { minWidth: 24, textAlign: 'center' },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  ingredientText: { flex: 1 },
  stepRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one },
  stepNumber: { width: 20 },
  stepTextWrap: { flex: 1, gap: Spacing.half },
});
