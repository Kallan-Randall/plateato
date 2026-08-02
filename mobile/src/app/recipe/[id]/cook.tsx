import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { formatCleanQuantity } from '@/lib/format-quantity';
import { type PantryStockRow, type UnitInfo } from '@/lib/pantry-match';
import { supabase } from '@/lib/supabase';

type Recipe = { id: string; title: string; servings: number };
type RecipeIngredient = {
  id: string;
  sort_order: number;
  raw_text: string;
  parsed_quantity: number | null;
  parsed_unit_id: string | null;
  common_item_id: string | null;
  prep_note: string | null;
};
type RecipeStep = { id: string; step_number: number; text: string; timer_seconds: number | null };
type CommonItemLookup = { id: string; name: string };
type DisplayUnit = UnitInfo & { abbreviation: string };
type PantryRow = PantryStockRow & { id: string; approximate_level: 'full' | 'half' | 'low' | null };

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const LEVEL_DOWN: Record<'full' | 'half' | 'low', 'full' | 'half' | 'low'> = {
  full: 'half',
  half: 'low',
  low: 'low',
};

export default function CookingModeScreen() {
  useKeepAwake();
  const theme = useTheme();
  const { session } = useAuth();
  const { id, servings: servingsParam } = useLocalSearchParams<{ id: string; servings?: string }>();

  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [commonItems, setCommonItems] = useState<CommonItemLookup[]>([]);
  const [pantryRows, setPantryRows] = useState<PantryRow[]>([]);
  const [units, setUnits] = useState<DisplayUnit[]>([]);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [activeTimerStepId, setActiveTimerStepId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);

  const [converterOpen, setConverterOpen] = useState(false);
  const [converterAmount, setConverterAmount] = useState('1');
  const [fromUnitId, setFromUnitId] = useState('cup');
  const [toUnitId, setToUnitId] = useState('ml');

  const [phase, setPhase] = useState<'cooking' | 'confirm' | 'done'>('cooking');
  const [numericAdjust, setNumericAdjust] = useState<Record<string, string>>({});
  const [levelAdjust, setLevelAdjust] = useState<Record<string, 'full' | 'half' | 'low'>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [recipeRes, ingredientsRes, stepsRes, commonItemsRes, pantryRes, unitsRes] = await Promise.all([
        supabase.from('recipes').select('id, title, servings').eq('id', id).maybeSingle(),
        supabase.from('recipe_ingredients').select('*').eq('recipe_id', id).order('sort_order'),
        supabase.from('recipe_steps').select('*').eq('recipe_id', id).order('step_number'),
        supabase.from('common_items').select('id, name'),
        supabase.from('pantry_items').select('id, common_item_id, quantity, unit_id, tracking_mode, approximate_level'),
        supabase.from('units').select('id, abbreviation, dimension, to_base_factor'),
      ]);
      if (!active) return;
      setRecipe(recipeRes.data as unknown as Recipe | null);
      setIngredients((ingredientsRes.data as unknown as RecipeIngredient[]) ?? []);
      setSteps((stepsRes.data as unknown as RecipeStep[]) ?? []);
      setCommonItems((commonItemsRes.data as unknown as CommonItemLookup[]) ?? []);
      setPantryRows((pantryRes.data as unknown as PantryRow[]) ?? []);
      setUnits((unitsRes.data as unknown as DisplayUnit[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Self-rescheduling one-second countdown; stops naturally at 0 or when paused.
  useEffect(() => {
    if (activeTimerStepId == null || timerPaused || remainingSeconds <= 0) return;
    const timeout = setTimeout(() => setRemainingSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
  }, [activeTimerStepId, timerPaused, remainingSeconds]);

  const targetServings = useMemo(() => {
    const parsed = servingsParam ? Number(servingsParam) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return recipe?.servings ?? 1;
  }, [servingsParam, recipe]);

  const scaleFactor = recipe && recipe.servings > 0 ? targetServings / recipe.servings : 1;

  const commonItemName = (commonItemId: string | null) =>
    commonItemId ? commonItems.find((c) => c.id === commonItemId)?.name ?? null : null;

  const toggleChecked = (ingredientId: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });

  const startTimer = (step: RecipeStep) => {
    if (!step.timer_seconds) return;
    setActiveTimerStepId(step.id);
    setRemainingSeconds(step.timer_seconds);
    setTimerPaused(false);
  };

  const convertedAmount = useMemo(() => {
    const amount = Number(converterAmount);
    const fromUnit = units.find((u) => u.id === fromUnitId);
    const toUnit = units.find((u) => u.id === toUnitId);
    if (!Number.isFinite(amount) || !fromUnit || !toUnit || fromUnit.dimension !== toUnit.dimension) return null;
    return (amount * fromUnit.to_base_factor) / toUnit.to_base_factor;
  }, [converterAmount, fromUnitId, toUnitId, units]);

  // Adjustable pantry rows: only ones a matched, present ingredient can
  // actually decrement — nothing to do for missing/unlinked ingredients.
  const adjustableRows = useMemo(() => {
    const rows: { ingredient: RecipeIngredient; pantryRow: PantryRow }[] = [];
    for (const ing of ingredients) {
      if (!ing.common_item_id) continue;
      const pantryRow = pantryRows.find((p) => p.common_item_id === ing.common_item_id);
      if (pantryRow) rows.push({ ingredient: ing, pantryRow });
    }
    return rows;
  }, [ingredients, pantryRows]);

  const enterConfirmPhase = () => {
    if (adjustableRows.length === 0) {
      finishCooking({}, {});
      return;
    }
    const numeric: Record<string, string> = {};
    const level: Record<string, 'full' | 'half' | 'low'> = {};
    for (const { ingredient, pantryRow } of adjustableRows) {
      if (pantryRow.tracking_mode === 'approximate') {
        level[pantryRow.id] = pantryRow.approximate_level ? LEVEL_DOWN[pantryRow.approximate_level] : 'low';
      } else if (pantryRow.tracking_mode === 'count') {
        numeric[pantryRow.id] = '1';
      } else {
        const neededUnit = units.find((u) => u.id === ingredient.parsed_unit_id);
        const rowUnit = units.find((u) => u.id === pantryRow.unit_id);
        if (ingredient.parsed_quantity != null && neededUnit && rowUnit && neededUnit.dimension === rowUnit.dimension) {
          const scaledInRowUnit =
            (ingredient.parsed_quantity * scaleFactor * neededUnit.to_base_factor) / rowUnit.to_base_factor;
          numeric[pantryRow.id] = String(Math.round(scaledInRowUnit * 100) / 100);
        } else {
          numeric[pantryRow.id] = '';
        }
      }
    }
    setNumericAdjust(numeric);
    setLevelAdjust(level);
    setPhase('confirm');
  };

  const finishCooking = async (
    numeric: Record<string, string>,
    level: Record<string, 'full' | 'half' | 'low'>,
  ) => {
    if (!session) return;
    setSaving(true);

    const updates = adjustableRows.map(({ pantryRow }) => {
      if (pantryRow.tracking_mode === 'approximate') {
        const newLevel = level[pantryRow.id];
        if (!newLevel) return Promise.resolve();
        return supabase
          .from('pantry_items')
          .update({ approximate_level: newLevel, updated_by: session.user.id })
          .eq('id', pantryRow.id);
      }
      const used = Number(numeric[pantryRow.id]);
      if (!Number.isFinite(used) || used <= 0) return Promise.resolve();
      const newQuantity = Math.max(0, (pantryRow.quantity ?? 0) - used);
      return supabase
        .from('pantry_items')
        .update({ quantity: newQuantity, updated_by: session.user.id })
        .eq('id', pantryRow.id);
    });

    await Promise.all(updates);
    await supabase
      .from('cooking_history')
      .insert({ recipe_id: id, cooked_by: session.user.id, servings_cooked: targetServings });

    setSaving(false);
    setPhase('done');
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

  if (phase === 'done') {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle" themeColor="primary" style={styles.centerText}>
          Nice work!
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {recipe.title} marked as cooked.
        </ThemedText>
        <Button title="Back to recipe" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  if (phase === 'confirm') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setPhase('cooking')} hitSlop={8}>
              <ThemedText themeColor="textSecondary">‹ Back</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">How much did you use?</ThemedText>
            <View style={styles.spacer} />
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="small" themeColor="textSecondary">
              We'll subtract this from your pantry. Adjust for eyeballed amounts or substitutions.
            </ThemedText>
            {adjustableRows.map(({ ingredient, pantryRow }) => (
              <View key={pantryRow.id} style={styles.adjustRow}>
                <ThemedText type="default">{commonItemName(ingredient.common_item_id) ?? ingredient.raw_text}</ThemedText>
                {pantryRow.tracking_mode === 'approximate' ? (
                  <View style={styles.chipsWrap}>
                    {(['full', 'half', 'low'] as const).map((lvl) => (
                      <Chip
                        key={lvl}
                        label={lvl}
                        selected={levelAdjust[pantryRow.id] === lvl}
                        onPress={() => setLevelAdjust((prev) => ({ ...prev, [pantryRow.id]: lvl }))}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.usedRow}>
                    <TextField
                      value={numericAdjust[pantryRow.id] ?? ''}
                      onChangeText={(v) => setNumericAdjust((prev) => ({ ...prev, [pantryRow.id]: v }))}
                      keyboardType="numeric"
                      style={styles.usedInput}
                    />
                    <ThemedText type="small" themeColor="textSecondary">
                      {units.find((u) => u.id === pantryRow.unit_id)?.abbreviation ?? ''}
                      {' used (had '}
                      {pantryRow.quantity ?? 0}
                      {')'}
                    </ThemedText>
                  </View>
                )}
              </View>
            ))}
            <Button
              title="Confirm & finish"
              onPress={() => finishCooking(numericAdjust, levelAdjust)}
              loading={saving}
            />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const currentStep = steps[currentStepIndex] as RecipeStep | undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText themeColor="textSecondary">× Exit</ThemedText>
          </Pressable>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.headerTitle}>
            {recipe.title}
          </ThemedText>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {currentStep ? (
            <View style={styles.field}>
              <View style={styles.stepNavRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Step {currentStepIndex + 1} of {steps.length}
                </ThemedText>
                <View style={styles.stepNavButtons}>
                  <Pressable
                    onPress={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                    disabled={currentStepIndex === 0}
                    style={[styles.navBtn, { borderColor: theme.border, opacity: currentStepIndex === 0 ? 0.4 : 1 }]}>
                    <ThemedText type="small">Prev</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setCurrentStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                    disabled={currentStepIndex === steps.length - 1}
                    style={[
                      styles.navBtn,
                      { borderColor: theme.border, opacity: currentStepIndex === steps.length - 1 ? 0.4 : 1 },
                    ]}>
                    <ThemedText type="small">Next</ThemedText>
                  </Pressable>
                </View>
              </View>
              <ThemedText type="subtitle">{currentStep.text}</ThemedText>
              {currentStep.timer_seconds ? (
                <TimerControl
                  step={currentStep}
                  isActive={activeTimerStepId === currentStep.id}
                  remainingSeconds={remainingSeconds}
                  paused={timerPaused}
                  onStart={() => startTimer(currentStep)}
                  onTogglePause={() => setTimerPaused((p) => !p)}
                  theme={theme}
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Ingredients
            </ThemedText>
            {ingredients.map((ing) => {
              const checked = checkedIds.has(ing.id);
              const scaledQty = ing.parsed_quantity != null ? ing.parsed_quantity * scaleFactor : null;
              const unitAbbrev = units.find((u) => u.id === ing.parsed_unit_id)?.abbreviation;
              const label =
                scaledQty != null
                  ? `${formatCleanQuantity(scaledQty)}${unitAbbrev ? ` ${unitAbbrev}` : ''} ${
                      commonItemName(ing.common_item_id) ?? ing.raw_text
                    }`
                  : ing.raw_text;
              return (
                <Pressable key={ing.id} onPress={() => toggleChecked(ing.id)} style={styles.checkRow}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: checked ? theme.primary : theme.border,
                        backgroundColor: checked ? theme.primary : 'transparent',
                      },
                    ]}>
                    {checked ? (
                      <ThemedText type="small" style={{ color: theme.onPrimary, lineHeight: 16 }}>
                        ✓
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText
                    type="default"
                    themeColor={checked ? 'textSecondary' : 'text'}
                    style={[styles.checkLabel, checked && styles.strikethrough]}>
                    {label}
                    {ing.prep_note ? `, ${ing.prep_note}` : ''}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              All steps
            </ThemedText>
            {steps.map((step, i) => (
              <Pressable
                key={step.id}
                onPress={() => setCurrentStepIndex(i)}
                style={[
                  styles.stepListRow,
                  {
                    backgroundColor: i === currentStepIndex ? theme.backgroundSelected : 'transparent',
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText type="smallBold" style={styles.stepNumber}>
                  {step.step_number}.
                </ThemedText>
                <ThemedText type="small" style={styles.stepListText}>
                  {step.text}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.field}>
            <Pressable onPress={() => setConverterOpen((o) => !o)}>
              <ThemedText type="small" themeColor="primary">
                {converterOpen ? 'Hide unit converter' : 'Unit converter'}
              </ThemedText>
            </Pressable>
            {converterOpen ? (
              <View style={styles.converter}>
                <TextField
                  label="Amount"
                  value={converterAmount}
                  onChangeText={setConverterAmount}
                  keyboardType="numeric"
                  style={styles.converterInput}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  From
                </ThemedText>
                <View style={styles.chipsWrap}>
                  {units.map((u) => (
                    <Chip key={u.id} label={u.abbreviation} selected={fromUnitId === u.id} onPress={() => setFromUnitId(u.id)} />
                  ))}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  To
                </ThemedText>
                <View style={styles.chipsWrap}>
                  {units
                    .filter((u) => u.dimension === units.find((x) => x.id === fromUnitId)?.dimension)
                    .map((u) => (
                      <Chip key={u.id} label={u.abbreviation} selected={toUnitId === u.id} onPress={() => setToUnitId(u.id)} />
                    ))}
                </View>
                <ThemedText type="default">
                  {convertedAmount != null
                    ? `= ${formatCleanQuantity(convertedAmount)} ${units.find((u) => u.id === toUnitId)?.abbreviation}`
                    : '—'}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <Button title="Finish cooking" onPress={enterConfirmPhase} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TimerControl({
  step,
  isActive,
  remainingSeconds,
  paused,
  onStart,
  onTogglePause,
  theme,
}: {
  step: RecipeStep;
  isActive: boolean;
  remainingSeconds: number;
  paused: boolean;
  onStart: () => void;
  onTogglePause: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  if (!isActive) {
    return (
      <Pressable onPress={onStart} style={[styles.timerBtn, { borderColor: theme.border }]}>
        <ThemedText type="small">⏱ Start timer ({formatCountdown(step.timer_seconds ?? 0)})</ThemedText>
      </Pressable>
    );
  }
  const done = remainingSeconds <= 0;
  return (
    <Pressable onPress={onTogglePause} style={[styles.timerBtn, { borderColor: done ? theme.danger : theme.primary }]}>
      <ThemedText type="smallBold" themeColor={done ? 'danger' : 'primary'}>
        {done ? "Time's up!" : `${formatCountdown(remainingSeconds)} ${paused ? '(paused)' : ''}`}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
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
  content: { padding: Spacing.four, gap: Spacing.five },
  field: { gap: Spacing.two },
  stepNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepNavButtons: { flexDirection: 'row', gap: Spacing.two },
  navBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 999, borderWidth: 1 },
  timerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { flex: 1 },
  strikethrough: { textDecorationLine: 'line-through' },
  stepListRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.one,
  },
  stepNumber: { width: 20 },
  stepListText: { flex: 1 },
  converter: { gap: Spacing.two, marginTop: Spacing.two },
  converterInput: { width: 120 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  adjustRow: { gap: Spacing.two, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  usedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  usedInput: { width: 90 },
});
