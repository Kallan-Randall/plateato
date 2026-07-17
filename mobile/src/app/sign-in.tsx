import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Where the confirmation email's link lands after Supabase verifies the account.
const EMAIL_CONFIRMED_URL = 'https://kallan-randall.github.io/plateato/confirmed.html';

export default function SignInScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    if (mode === 'signIn') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(
          signInError.message === 'Email not confirmed'
            ? 'Confirm your email first — check your inbox for the link we sent.'
            : signInError.message,
        );
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: EMAIL_CONFIRMED_URL },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (!data.session) {
        // With email confirmation enabled there is no session until the link
        // in the email is clicked, so point the user at their inbox.
        setNotice(`Almost there — we sent a confirmation link to ${email}. Confirm, then sign in.`);
        setMode('signIn');
      }
    }
    // On success, the auth listener in AuthProvider updates the route.
    setLoading(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <View style={styles.header}>
            <ThemedText type="title" themeColor="primary">
              Plateato
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {mode === 'signIn' ? 'Welcome back.' : 'Create your account.'}
            </ThemedText>
          </View>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            placeholder="At least 6 characters"
          />

          {notice ? (
            <ThemedText type="small" themeColor="success">
              {notice}
            </ThemedText>
          ) : null}
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Button
            title={mode === 'signIn' ? 'Sign in' : 'Create account'}
            onPress={submit}
            loading={loading}
            disabled={!email || !password}
          />

          <Button
            title={mode === 'signIn' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
            variant="secondary"
            onPress={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setError(null);
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, justifyContent: 'center' },
  form: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  header: { alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.two },
});
