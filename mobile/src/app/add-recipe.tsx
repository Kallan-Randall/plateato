import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { type CommonItemForMatching, type ParsedIngredient, parseIngredientLine } from '@plateato/core';

let nextLineId = 0;
const newLineId = () => `line-${nextLineId++}`;

type IngredientLine = { id: string; rawText: string; parsed: ParsedIngredient };
type StepLine = { id: string; text: string; timerMinutes: string };

const emptyIngredient = (): IngredientLine => ({
  id: newLineId(),
  rawText: '',
  parsed: parseIngredientLine('', []),
});
const emptyStep = (): StepLine => ({ id: newLineId(), text: '', timerMinutes: '' });

const CONFIDENCE_META: Record<
  ParsedIngredient['matchConfidence'],
  { label: string; color: 'success' | 'warning' | 'textSecondary' }
> = {
  high: { label: 'Matched', color: 'success' },
  low: { label: 'Check match', color: 'warning' },
  unmatched: { label: 'No catalog match', color: 'textSecondary' },
};

export default function AddRecipeScreen() {
  const theme = useTheme();
  const { householdId, session } = useAuth();

  const [catalog, setCatalog] = useState<CommonItemForMatching[]>([]);
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState('4');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<IngredientLine[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<StepLine[]>([emptyStep()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catalog loaded once; re-parses all ingredient lines once it arrives so
  // lines typed before the fetch resolves still get matched.
  useEffect(() => {
    supabase
      .from('common_items')
      .select('id, name, aliases')
      .then(({ data }) => {
        if (!data) return;
        const loaded = data as unknown as CommonItemForMatching[];
        setCatalog(loaded);
        setIngredients((prev) =>
          prev.map((line) => ({ ...line, parsed: parseIngredientLine(line.rawText, loaded) })),
        );
      });
  }, []);

  const updateIngredientText = (id: string, rawText: string) => {
    setIngredients((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, rawText, parsed: parseIngredientLine(rawText, catalog) } : line,
      ),
    );
  };

  const addIngredientLine = () => setIngredients((prev) => [...prev, emptyIngredient()]);
  const removeIngredientLine = (id: string) =>
    setIngredients((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== id) : prev));

  const updateStep = (id: string, patch: Partial<StepLine>) =>
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  const addStep = () => setSteps((prev) => [...prev, emptyStep()]);
  const removeStep = (id: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((step) => step.id !== id) : prev));

  const addTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
    setTagInput('');
  };
  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const canSave =
    !saving && title.trim().length > 0 && ingredients.some((line) => line.rawText.trim().length > 0);

  const save = async () => {
    if (!householdId || !session || !canSave) return;
    setSaving(true);
    setError(null);

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        household_id: householdId,
        title: title.trim(),
        servings: Number(servings) || 1,
        tags,
        created_by: session.user.id,
        updated_by: session.user.id,
      })
      .select('id')
      .single();

    if (recipeError || !recipe) {
      setError(recipeError?.message ?? 'Could not save the recipe.');
      setSaving(false);
      return;
    }

    const ingredientRows = ingredients
      .filter((line) => line.rawText.trim())
      .map((line, index) => ({
        recipe_id: recipe.id,
        sort_order: index,
        raw_text: line.rawText.trim(),
        parsed_quantity: line.parsed.quantity,
        parsed_unit_id: line.parsed.unitId,
        common_item_id: line.parsed.commonItemId,
        match_confidence: line.parsed.matchConfidence,
        prep_note: line.parsed.prepNote,
      }));

    const stepRows = steps
      .filter((step) => step.text.trim())
      .map((step, index) => ({
        recipe_id: recipe.id,
        step_number: index + 1,
        text: step.text.trim(),
        timer_seconds: step.timerMinutes.trim() ? Math.round(Number(step.timerMinutes) * 60) : null,
      }));

    const [ingredientsRes, stepsRes] = await Promise.all([
      ingredientRows.length
        ? supabase.from('recipe_ingredients').insert(ingredientRows)
        : Promise.resolve({ error: null }),
      stepRows.length
        ? supabase.from('recipe_steps').insert(stepRows)
        : Promise.resolve({ error: null }),
    ]);

    setSaving(false);
    if (ingredientsRes.error || stepsRes.error) {
      setError(ingredientsRes.error?.message ?? stepsRes.error?.message ?? 'Could not save recipe details.');
      return;
    }

    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
          <ThemedText type="smallBold">New recipe</ThemedText>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Weeknight chili" />

          <TextField
            label="Servings"
            value={servings}
            onChangeText={setServings}
            keyboardType="numeric"
            style={styles.servingsInput}
          />

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Tags
            </ThemedText>
            <View style={styles.tagRow}>
              <TextField
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                placeholder="weeknight, freezer-friendly…"
                style={styles.tagInput}
                returnKeyType="done"
              />
              <Pressable onPress={addTag} style={[styles.smallAddButton, { borderColor: theme.border }]}>
                <ThemedText type="small">Add</ThemedText>
              </Pressable>
            </View>
            {tags.length > 0 ? (
              <View style={styles.chipsWrap}>
                {tags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => removeTag(tag)}
                    style={[styles.tagChip, { borderColor: theme.border }]}>
                    <ThemedText type="small">{tag} ×</ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Ingredients
            </ThemedText>
            {ingredients.map((line) => {
              const confidence = line.rawText.trim() ? CONFIDENCE_META[line.parsed.matchConfidence] : null;
              const matchedName = line.parsed.commonItemId
                ? catalog.find((c) => c.id === line.parsed.commonItemId)?.name
                : null;
              return (
                <View key={line.id} style={styles.lineRow}>
                  <View style={styles.lineInputWrap}>
                    <TextField
                      value={line.rawText}
                      onChangeText={(text) => updateIngredientText(line.id, text)}
                      placeholder="2 cups flour, sifted"
                      autoCorrect={false}
                    />
                    {confidence ? (
                      <ThemedText type="small" themeColor={confidence.color}>
                        {confidence.label}
                        {matchedName ? ` · ${matchedName}` : ''}
                      </ThemedText>
                    ) : null}
                  </View>
                  {ingredients.length > 1 ? (
                    <Pressable onPress={() => removeIngredientLine(line.id)} hitSlop={8} style={styles.removeBtn}>
                      <ThemedText themeColor="textSecondary">×</ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
            <Pressable onPress={addIngredientLine} style={styles.addLineBtn}>
              <ThemedText type="small" themeColor="primary">
                + Add ingredient
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Steps
            </ThemedText>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.lineRow}>
                <ThemedText type="smallBold" style={styles.stepNumber}>
                  {index + 1}.
                </ThemedText>
                <View style={styles.lineInputWrap}>
                  <TextField
                    value={step.text}
                    onChangeText={(text) => updateStep(step.id, { text })}
                    placeholder="Brown the beef, about 5 minutes."
                    multiline
                  />
                  <TextField
                    value={step.timerMinutes}
                    onChangeText={(text) => updateStep(step.id, { timerMinutes: text })}
                    placeholder="Timer (minutes, optional)"
                    keyboardType="numeric"
                  />
                </View>
                {steps.length > 1 ? (
                  <Pressable onPress={() => removeStep(step.id)} hitSlop={8} style={styles.removeBtn}>
                    <ThemedText themeColor="textSecondary">×</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable onPress={addStep} style={styles.addLineBtn}>
              <ThemedText type="small" themeColor="primary">
                + Add step
              </ThemedText>
            </Pressable>
          </View>

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Button title="Save recipe" onPress={save} loading={saving} disabled={!canSave} />
        </ScrollView>
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
  content: { padding: Spacing.four, gap: Spacing.four },
  field: { gap: Spacing.two },
  servingsInput: { width: 90 },
  tagRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  tagInput: { flex: 1 },
  smallAddButton: {
    height: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tagChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
  },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  lineInputWrap: { flex: 1, gap: Spacing.one },
  stepNumber: { width: 20, paddingTop: Spacing.three },
  removeBtn: { paddingTop: Spacing.three, paddingHorizontal: Spacing.one },
  addLineBtn: { paddingVertical: Spacing.one },
});
