'use client';

import {
  type CommonItemForMatching,
  type ParsedIngredient,
  parseIngredientLine,
} from '@plateato/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import { addRecipe } from '../actions';

let nextLineId = 0;
const newLineId = () => `line-${nextLineId++}`;

type IngredientLine = { id: string; rawText: string; parsed: ParsedIngredient };
type StepLine = { id: string; text: string; timerMinutes: string };

const emptyIngredient = (): IngredientLine => ({ id: newLineId(), rawText: '', parsed: parseIngredientLine('', []) });
const emptyStep = (): StepLine => ({ id: newLineId(), text: '', timerMinutes: '' });

const CONFIDENCE_META: Record<ParsedIngredient['matchConfidence'], { label: string; className: string }> = {
  high: { label: 'Matched', className: 'text-success' },
  low: { label: 'Check match', className: 'text-warning' },
  unmatched: { label: 'No catalog match', className: 'text-foreground-secondary' },
};

export default function AddRecipePage() {
  const router = useRouter();
  const supabase = createClient();

  const [catalog, setCatalog] = useState<CommonItemForMatching[]>([]);
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState('4');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<IngredientLine[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<StepLine[]>([emptyStep()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catalog loaded once; re-parses any lines typed before it arrives.
  useEffect(() => {
    supabase
      .from('common_items')
      .select('id, name, aliases')
      .then(({ data }) => {
        if (!data) return;
        setCatalog(data);
        setIngredients((prev) => prev.map((line) => ({ ...line, parsed: parseIngredientLine(line.rawText, data) })));
      });
  }, [supabase]);

  const updateIngredientText = (id: string, rawText: string) => {
    setIngredients((prev) =>
      prev.map((line) => (line.id === id ? { ...line, rawText, parsed: parseIngredientLine(rawText, catalog) } : line)),
    );
  };
  const addIngredientLine = () => setIngredients((prev) => [...prev, emptyIngredient()]);
  const removeIngredientLine = (id: string) =>
    setIngredients((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== id) : prev));

  const updateStep = (id: string, patch: Partial<StepLine>) =>
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  const addStep = () => setSteps((prev) => [...prev, emptyStep()]);
  const removeStep = (id: string) => setSteps((prev) => (prev.length > 1 ? prev.filter((step) => step.id !== id) : prev));

  const addTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
    setTagInput('');
  };
  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const canSave = !saving && title.trim().length > 0 && ingredients.some((line) => line.rawText.trim().length > 0);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const result = await addRecipe({
      title: title.trim(),
      servings: Number(servings) || 1,
      tags,
      ingredients: ingredients
        .filter((line) => line.rawText.trim())
        .map((line) => ({
          rawText: line.rawText.trim(),
          parsedQuantity: line.parsed.quantity,
          parsedUnitId: line.parsed.unitId,
          commonItemId: line.parsed.commonItemId,
          matchConfidence: line.parsed.matchConfidence,
          prepNote: line.parsed.prepNote,
        })),
      steps: steps
        .filter((step) => step.text.trim())
        .map((step) => ({
          text: step.text.trim(),
          timerSeconds: step.timerMinutes.trim() ? Math.round(Number(step.timerMinutes) * 60) : null,
        })),
    });
    setSaving(false);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard/recipes')}
          className="-my-2 py-2 text-sm text-foreground-secondary"
        >
          Cancel
        </button>
        <h1 className="text-sm font-semibold">New recipe</h1>
        <span className="w-16" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm text-foreground-secondary">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Weeknight chili"
          className="h-12 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="servings" className="text-sm text-foreground-secondary">
          Servings
        </label>
        <input
          id="servings"
          type="number"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="h-12 w-24 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground-secondary">Tags</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="weeknight, freezer-friendly…"
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addTag}
            className="h-11 shrink-0 rounded-xl border border-border px-4 text-sm text-foreground"
          >
            Add
          </button>
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full border border-border px-3 py-1 text-sm text-foreground"
              >
                {tag} ×
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground-secondary">Ingredients</span>
        {ingredients.map((line) => {
          const confidence = line.rawText.trim() ? CONFIDENCE_META[line.parsed.matchConfidence] : null;
          const matchedName = line.parsed.commonItemId
            ? catalog.find((c) => c.id === line.parsed.commonItemId)?.name
            : null;
          return (
            <div key={line.id} className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  type="text"
                  value={line.rawText}
                  onChange={(e) => updateIngredientText(line.id, e.target.value)}
                  placeholder="2 cups flour, sifted"
                  className="h-12 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
                />
                {confidence ? (
                  <span className={`text-sm ${confidence.className}`}>
                    {confidence.label}
                    {matchedName ? ` · ${matchedName}` : ''}
                  </span>
                ) : null}
              </div>
              {ingredients.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeIngredientLine(line.id)}
                  className="px-2 pt-3 text-foreground-secondary"
                  aria-label="Remove ingredient"
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
        <button type="button" onClick={addIngredientLine} className="self-start py-1 text-sm text-primary">
          + Add ingredient
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground-secondary">Steps</span>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-2">
            <span className="w-5 pt-3 text-sm font-semibold">{index + 1}.</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <textarea
                value={step.text}
                onChange={(e) => updateStep(step.id, { text: e.target.value })}
                placeholder="Brown the beef, about 5 minutes."
                rows={2}
                className="rounded-xl border border-border bg-background-element p-3 outline-none focus:border-primary"
              />
              <input
                type="number"
                value={step.timerMinutes}
                onChange={(e) => updateStep(step.id, { timerMinutes: e.target.value })}
                placeholder="Timer (minutes, optional)"
                className="h-11 w-56 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
              />
            </div>
            {steps.length > 1 ? (
              <button
                type="button"
                onClick={() => removeStep(step.id)}
                className="px-2 pt-3 text-foreground-secondary"
                aria-label="Remove step"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={addStep} className="self-start py-1 text-sm text-primary">
          + Add step
        </button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="h-12 rounded-xl bg-primary font-medium text-on-primary disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save recipe'}
      </button>
    </div>
  );
}
