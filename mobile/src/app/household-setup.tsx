import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function HouseholdSetupScreen() {
  const { refreshHousehold, signOut } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy('create');
    setError(null);
    const { error } = await supabase.rpc('create_household', { p_name: name.trim() });
    if (error) {
      setError(error.message);
      setBusy(null);
      return;
    }
    // Membership now exists -> re-check flips the gate to the main app.
    await refreshHousehold();
  };

  const join = async () => {
    setBusy('join');
    setError(null);
    const { error } = await supabase.rpc('accept_invite', { p_code: code.trim().toUpperCase() });
    if (error) {
      setError(error.message);
      setBusy(null);
      return;
    }
    await refreshHousehold();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="subtitle" themeColor="primary">
            Your household
          </ThemedText>
          <ThemedText themeColor="textSecondary">Create a new one, or join with a code.</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            CREATE A HOUSEHOLD
          </ThemedText>
          <TextField
            label="Household name"
            value={name}
            onChangeText={setName}
            placeholder="The Randalls"
          />
          <Button
            title="Create"
            onPress={create}
            loading={busy === 'create'}
            disabled={!name.trim() || busy !== null}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            JOIN WITH A CODE
          </ThemedText>
          <TextField
            label="Invite code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            placeholder="A1B2C3"
          />
          <Button
            title="Join"
            variant="secondary"
            onPress={join}
            loading={busy === 'join'}
            disabled={!code.trim() || busy !== null}
          />
        </View>

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        <View style={styles.footer}>
          <Button title="Sign out" variant="secondary" onPress={signOut} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, gap: Spacing.three },
  header: { alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.two },
  section: { gap: Spacing.two },
  divider: { alignItems: 'center' },
  footer: { marginTop: Spacing.two },
});
