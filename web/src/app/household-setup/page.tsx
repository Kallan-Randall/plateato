'use client';

import { useActionState } from 'react';

import { createHousehold, joinHousehold, type HouseholdActionState } from './actions';

const initialState: HouseholdActionState = { error: null };

export default function HouseholdSetupPage() {
  const [createState, createAction, isCreating] = useActionState(createHousehold, initialState);
  const [joinState, joinAction, isJoining] = useActionState(joinHousehold, initialState);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-primary">Set up your household</h1>
        <p className="mt-1 text-foreground-secondary">Create one, or join with an invite code.</p>
      </div>

      <form action={createAction} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase text-foreground-secondary">Create</h2>
        <input
          type="text"
          name="name"
          required
          placeholder="Household name"
          className="h-12 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
        />
        {createState.error ? <p className="text-sm text-danger">{createState.error}</p> : null}
        <button
          type="submit"
          disabled={isCreating}
          className="h-12 rounded-xl bg-primary font-medium text-on-primary disabled:opacity-60"
        >
          {isCreating ? 'Creating…' : 'Create household'}
        </button>
      </form>

      <form action={joinAction} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase text-foreground-secondary">Join</h2>
        <input
          type="text"
          name="code"
          required
          placeholder="Invite code"
          className="h-12 rounded-xl border border-border bg-background-element px-3 uppercase outline-none focus:border-primary"
        />
        {joinState.error ? <p className="text-sm text-danger">{joinState.error}</p> : null}
        <button
          type="submit"
          disabled={isJoining}
          className="h-12 rounded-xl border border-border font-medium text-foreground disabled:opacity-60"
        >
          {isJoining ? 'Joining…' : 'Join household'}
        </button>
      </form>
    </div>
  );
}
