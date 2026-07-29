'use client';

import { useActionState, useState } from 'react';

import { authenticate, type AuthActionState } from './actions';

const initialState: AuthActionState = { error: null, notice: null };

export default function LoginPage() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [state, formAction, isPending] = useActionState(authenticate, initialState);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-primary">Plateato</h1>
        <p className="mt-1 text-foreground-secondary">
          {mode === 'signIn' ? 'Welcome back.' : 'Create your account.'}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="mode" value={mode} />

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="h-12 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            placeholder="At least 6 characters"
            className="h-12 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
          />
        </label>

        {state.notice ? <p className="text-sm text-success">{state.notice}</p> : null}
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="h-12 rounded-xl bg-primary font-medium text-on-primary disabled:opacity-60"
        >
          {isPending ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          className="h-12 rounded-xl border border-border font-medium text-foreground"
        >
          {mode === 'signIn' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
