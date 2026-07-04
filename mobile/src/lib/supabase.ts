// URL polyfill must be imported before the Supabase client on React Native.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Copy mobile/.env.example to mobile/.env and fill in your project URL and key.',
  );
}

/**
 * Web uses localStorage, but it must be guarded: Expo Router renders web pages
 * on a Node server first (no `window`), so unguarded access crashes there.
 * On native we use AsyncStorage, which has no such issue.
 */
const webStorage: SupportedStorage = {
  getItem: (key) =>
    Promise.resolve(typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

/**
 * The app's single Supabase client. Import this anywhere we talk to the backend.
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
