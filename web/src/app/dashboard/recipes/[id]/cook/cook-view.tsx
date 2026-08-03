'use client';

import { type PantryStockRow, type UnitInfo, formatCleanQuantity } from '@plateato/core';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Chip } from '@/components/chip';

import { type PantryAdjustment, finishCooking } from '../../actions';

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

export function CookingModeView({
  recipe,
  targetServings,
  ingredients,
  steps,
  commonItems,
  pantryRows,
  units,
}: {
  recipe: Recipe;
  targetServings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  commonItems: CommonItemLookup[];
  pantryRows: PantryRow[];
  units: DisplayUnit[];
}) {
  const router = useRouter();

  // Keep the screen awake while cooking. The browser releases the lock
  // whenever the tab is hidden, so it's re-acquired on visibility change.
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let cancelled = false;
    const requestLock = async () => {
      try {
        const lock = await navigator.wakeLock?.request('screen');
        if (cancelled) lock?.release();
        else wakeLock = lock ?? null;
      } catch {
        // Not supported, or the tab isn't visible/focused - cooking mode
        // still works, it just won't keep the screen on.
      }
    };
    requestLock();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestLock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      wakeLock?.release();
    };
  }, []);

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

  // Self-rescheduling one-second countdown; stops naturally at 0 or when paused.
  useEffect(() => {
    if (activeTimerStepId == null || timerPaused || remainingSeconds <= 0) return;
    const timeout = setTimeout(() => setRemainingSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
  }, [activeTimerStepId, timerPaused, remainingSeconds]);

  const scaleFactor = recipe.servings > 0 ? targetServings / recipe.servings : 1;

  const commonItemName = (commonItemId: string | null) =>
    commonItemId ? (commonItems.find((c) => c.id === commonItemId)?.name ?? null) : null;

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
  // actually decrement.
  const adjustableRows = useMemo(() => {
    const rows: { ingredient: RecipeIngredient; pantryRow: PantryRow }[] = [];
    for (const ing of ingredients) {
      if (!ing.common_item_id) continue;
      const pantryRow = pantryRows.find((p) => p.common_item_id === ing.common_item_id);
      if (pantryRow) rows.push({ ingredient: ing, pantryRow });
    }
    return rows;
  }, [ingredients, pantryRows]);

  const buildAdjustments = (
    numeric: Record<string, string>,
    level: Record<string, 'full' | 'half' | 'low'>,
  ): PantryAdjustment[] =>
    adjustableRows
      .map(({ pantryRow }): PantryAdjustment | null => {
        if (pantryRow.tracking_mode === 'approximate') {
          const newLevel = level[pantryRow.id];
          return newLevel ? { pantryRowId: pantryRow.id, mode: 'level', newLevel } : null;
        }
        const used = Number(numeric[pantryRow.id]);
        if (!Number.isFinite(used) || used <= 0) return null;
        const newQuantity = Math.max(0, (pantryRow.quantity ?? 0) - used);
        return { pantryRowId: pantryRow.id, mode: 'quantity', newQuantity };
      })
      .filter((a): a is PantryAdjustment => a !== null);

  const runFinishCooking = async (adjustments: PantryAdjustment[]) => {
    setSaving(true);
    await finishCooking(recipe.id, targetServings, adjustments);
    setSaving(false);
    setPhase('done');
  };

  const enterConfirmPhase = () => {
    if (adjustableRows.length === 0) {
      runFinishCooking([]);
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
        if (
          ingredient.parsed_quantity != null &&
          neededUnit &&
          rowUnit &&
          neededUnit.dimension === rowUnit.dimension
        ) {
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

  if (phase === 'done') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-2xl font-semibold text-primary">Nice work!</h1>
        <p className="text-foreground-secondary">{recipe.title} marked as cooked.</p>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/recipes/${recipe.id}`)}
          className="h-12 rounded-xl bg-primary px-6 font-medium text-on-primary"
        >
          Back to recipe
        </button>
      </div>
    );
  }

  if (phase === 'confirm') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPhase('cooking')}
            className="-my-2 py-2 text-sm text-foreground-secondary"
          >
            ‹ Back
          </button>
          <h1 className="text-sm font-semibold">How much did you use?</h1>
          <span className="w-16" />
        </div>
        <p className="text-sm text-foreground-secondary">
          We&rsquo;ll subtract this from your pantry. Adjust for eyeballed amounts or substitutions.
        </p>
        {adjustableRows.map(({ ingredient, pantryRow }) => (
          <div key={pantryRow.id} className="flex flex-col gap-2 border-b border-border pb-4">
            <span className="text-foreground">{commonItemName(ingredient.common_item_id) ?? ingredient.raw_text}</span>
            {pantryRow.tracking_mode === 'approximate' ? (
              <div className="flex flex-wrap gap-2">
                {(['full', 'half', 'low'] as const).map((lvl) => (
                  <Chip
                    key={lvl}
                    label={lvl}
                    selected={levelAdjust[pantryRow.id] === lvl}
                    onClick={() => setLevelAdjust((prev) => ({ ...prev, [pantryRow.id]: lvl }))}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={numericAdjust[pantryRow.id] ?? ''}
                  onChange={(e) => setNumericAdjust((prev) => ({ ...prev, [pantryRow.id]: e.target.value }))}
                  className="h-11 w-24 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
                />
                <span className="text-sm text-foreground-secondary">
                  {units.find((u) => u.id === pantryRow.unit_id)?.abbreviation ?? ''} used (had{' '}
                  {pantryRow.quantity ?? 0})
                </span>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => runFinishCooking(buildAdjustments(numericAdjust, levelAdjust))}
          disabled={saving}
          className="h-12 rounded-xl bg-primary font-medium text-on-primary disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Confirm & finish'}
        </button>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex] as RecipeStep | undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/recipes/${recipe.id}`)}
          className="-my-2 py-2 text-sm text-foreground-secondary"
        >
          × Exit
        </button>
        <h1 className="truncate text-sm font-semibold">{recipe.title}</h1>
        <span className="w-16" />
      </div>

      {currentStep ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                disabled={currentStepIndex === 0}
                className="rounded-full border border-border px-3 py-1 text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                disabled={currentStepIndex === steps.length - 1}
                className="rounded-full border border-border px-3 py-1 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
          <p className="text-xl font-semibold text-foreground">{currentStep.text}</p>
          {currentStep.timer_seconds ? (
            <TimerControl
              step={currentStep}
              isActive={activeTimerStepId === currentStep.id}
              remainingSeconds={remainingSeconds}
              paused={timerPaused}
              onStart={() => startTimer(currentStep)}
              onTogglePause={() => setTimerPaused((p) => !p)}
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <span className="text-sm text-foreground-secondary">Ingredients</span>
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
            <button
              key={ing.id}
              type="button"
              onClick={() => toggleChecked(ing.id)}
              className="flex items-center gap-3 py-2 text-left"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs ${
                  checked ? 'border-primary bg-primary text-on-primary' : 'border-border'
                }`}
              >
                {checked ? '✓' : ''}
              </span>
              <span className={checked ? 'text-foreground-secondary line-through' : 'text-foreground'}>
                {label}
                {ing.prep_note ? `, ${ing.prep_note}` : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-foreground-secondary">All steps</span>
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setCurrentStepIndex(i)}
            className={`flex gap-2 rounded-xl border border-border p-2 text-left ${
              i === currentStepIndex ? 'bg-background-selected' : ''
            }`}
          >
            <span className="w-5 font-semibold">{step.step_number}.</span>
            <span className="text-sm text-foreground">{step.text}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setConverterOpen((o) => !o)} className="self-start text-sm text-primary">
          {converterOpen ? 'Hide unit converter' : 'Unit converter'}
        </button>
        {converterOpen ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-sm text-foreground-secondary">
              Amount
              <input
                type="number"
                value={converterAmount}
                onChange={(e) => setConverterAmount(e.target.value)}
                className="h-11 w-28 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
              />
            </label>
            <span className="text-sm text-foreground-secondary">From</span>
            <div className="flex flex-wrap gap-2">
              {units.map((u) => (
                <Chip key={u.id} label={u.abbreviation} selected={fromUnitId === u.id} onClick={() => setFromUnitId(u.id)} />
              ))}
            </div>
            <span className="text-sm text-foreground-secondary">To</span>
            <div className="flex flex-wrap gap-2">
              {units
                .filter((u) => u.dimension === units.find((x) => x.id === fromUnitId)?.dimension)
                .map((u) => (
                  <Chip key={u.id} label={u.abbreviation} selected={toUnitId === u.id} onClick={() => setToUnitId(u.id)} />
                ))}
            </div>
            <span className="text-foreground">
              {convertedAmount != null
                ? `= ${formatCleanQuantity(convertedAmount)} ${units.find((u) => u.id === toUnitId)?.abbreviation}`
                : '—'}
            </span>
          </div>
        ) : null}
      </div>

      <button type="button" onClick={enterConfirmPhase} className="h-12 rounded-xl bg-primary font-medium text-on-primary">
        Finish cooking
      </button>
    </div>
  );
}

function TimerControl({
  step,
  isActive,
  remainingSeconds,
  paused,
  onStart,
  onTogglePause,
}: {
  step: RecipeStep;
  isActive: boolean;
  remainingSeconds: number;
  paused: boolean;
  onStart: () => void;
  onTogglePause: () => void;
}) {
  if (!isActive) {
    return (
      <button type="button" onClick={onStart} className="self-start rounded-xl border border-border px-4 py-2 text-sm">
        ⏱ Start timer ({formatCountdown(step.timer_seconds ?? 0)})
      </button>
    );
  }
  const done = remainingSeconds <= 0;
  return (
    <button
      type="button"
      onClick={onTogglePause}
      className={`self-start rounded-xl border px-4 py-2 text-sm font-semibold ${
        done ? 'border-danger text-danger' : 'border-primary text-primary'
      }`}
    >
      {done ? "Time's up!" : `${formatCountdown(remainingSeconds)} ${paused ? '(paused)' : ''}`}
    </button>
  );
}
