import { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '@/lib/supabase';

type AuthState = {
  /** The Supabase auth session, or null when signed out. */
  session: Session | null;
  /** Whether the signed-in user belongs to at least one household. */
  hasHousehold: boolean;
  /** True while the initial session and household state are still resolving. */
  isLoading: boolean;
  /** Re-check household membership (call after creating/joining one). */
  refreshHousehold: () => Promise<void>;
  /** Sign the user out. */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Access the auth state anywhere in the app. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [hasHousehold, setHasHousehold] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Whether this user belongs to any household (a lightweight count query).
  const loadHousehold = useCallback(async (current: Session | null) => {
    if (!current?.user) {
      setHasHousehold(false);
      return;
    }
    const { count } = await supabase
      .from('household_members')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', current.user.id);
    setHasHousehold((count ?? 0) > 0);
  }, []);

  useEffect(() => {
    let active = true;

    // Resolve any existing session on startup.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadHousehold(data.session);
      setIsLoading(false);
    });

    // Stay in sync with future logins and logouts.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Calling Supabase *inside* this callback can deadlock, so run the
      // household check on the next tick instead.
      setTimeout(() => loadHousehold(next), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadHousehold]);

  const refreshHousehold = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadHousehold(data.session);
  }, [loadHousehold]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, hasHousehold, isLoading, refreshHousehold, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
