'use server';

import { redirect } from 'next/navigation';

import { getURL } from '@/lib/get-url';
import { createClient } from '@/lib/supabase/server';

export type AuthActionState = { error: string | null; notice: string | null };

/** Single entry point for the login form — dispatches on a hidden "mode" field
 * so one useActionState hook can drive both sign-in and sign-up. */
export async function authenticate(
  prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  return formData.get('mode') === 'signUp' ? signUp(prevState, formData) : signIn(prevState, formData);
}

async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message =
      error.message === 'Email not confirmed'
        ? 'Confirm your email first — check your inbox for the link we sent.'
        : error.message;
    return { error: message, notice: null };
  }

  redirect('/dashboard');
}

async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getURL()}auth/confirmed` },
  });
  if (error) {
    return { error: error.message, notice: null };
  }
  if (!data.session) {
    // Email confirmation is required — no session until the link is clicked.
    return {
      error: null,
      notice: `Almost there — we sent a confirmation link to ${email}. Confirm, then sign in.`,
    };
  }

  redirect('/dashboard');
}
