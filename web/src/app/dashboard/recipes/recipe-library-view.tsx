'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Chip } from '@/components/chip';

export type Recipe = {
  id: string;
  title: string;
  photoUrl: string | null;
  servings: number;
  tags: string[];
  ingredientCount: number;
  have: number;
  total: number;
  lastCookedAt: string | null;
};

type SortMode = 'match' | 'recent' | 'name';

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'match', label: 'Best match' },
  { mode: 'recent', label: 'Recently used' },
  { mode: 'name', label: 'Name' },
];

const matchTextClass = { success: 'text-success', warning: 'text-warning', textSecondary: 'text-foreground-secondary' };

function matchColorClass(have: number, total: number) {
  if (total === 0) return matchTextClass.textSecondary;
  const pct = have / total;
  if (pct >= 0.75) return matchTextClass.success;
  if (pct > 0) return matchTextClass.warning;
  return matchTextClass.textSecondary;
}

export function RecipeLibraryView({ recipes }: { recipes: Recipe[] }) {
  const [sortMode, setSortMode] = useState<SortMode>('match');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Recipes</h1>
        <Link
          href="/dashboard/recipes/add"
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary"
        >
          + Add
        </Link>
      </div>

      {recipes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <Chip key={opt.mode} label={opt.label} selected={sortMode === opt.mode} onClick={() => setSortMode(opt.mode)} />
            ))}
          </div>
          {allTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Chip key={tag} label={tag} selected={selectedTags.has(tag)} onClick={() => toggleTag(tag)} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {visibleRecipes.length === 0 ? (
        <p className="text-foreground-secondary">
          {recipes.length === 0
            ? 'No recipes yet. Tap "+ Add" to save your first one.'
            : 'No recipes match this filter.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/dashboard/recipes/${recipe.id}`}
              className="flex gap-4 rounded-2xl border border-border bg-background-element p-4 hover:bg-background-selected"
            >
              {recipe.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar-sized card thumbnail, not worth next/image's overhead here
                <img src={recipe.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-background-selected text-2xl font-semibold text-primary">
                  {recipe.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1 justify-center">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-foreground">{recipe.title}</span>
                  {recipe.total > 0 ? (
                    <span className={`shrink-0 text-sm font-semibold ${matchColorClass(recipe.have, recipe.total)}`}>
                      {recipe.have}/{recipe.total}
                    </span>
                  ) : null}
                </div>
                <span className="text-sm text-foreground-secondary">
                  {recipe.servings} servings · {recipe.ingredientCount} ingredients
                </span>
                {recipe.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
