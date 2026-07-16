import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const INVITE_EXPIRY_DAYS = 7;

export default function SettingsScreen() {
  const theme = useTheme();
  const { session, householdId, signOut } = useAuth();

  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [unitPreference, setUnitPreference] = useState<'metric' | 'imperial'>('metric');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'invite' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [householdRes, profileRes] = await Promise.all([
        householdId
          ? supabase.from('households').select('name').eq('id', householdId).maybeSingle()
          : Promise.resolve({ data: null }),
        session
          ? supabase
              .from('profiles')
              .select('unit_preference')
              .eq('id', session.user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!active) return;
      if (householdRes.data) setHouseholdName((householdRes.data as { name: string }).name);
      if (profileRes.data) {
        setUnitPreference(
          (profileRes.data as { unit_preference: 'metric' | 'imperial' }).unit_preference,
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [householdId, session]);

  const generateInvite = async () => {
    if (!householdId || !session) return;
    setBusy('invite');
    setError(null);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000).toISOString();
    const { data, error: inviteError } = await supabase
      .from('household_invites')
      .insert({ household_id: householdId, created_by: session.user.id, expires_at: expiresAt })
      .select('code')
      .maybeSingle();
    setBusy(null);
    if (inviteError) {
      setError(inviteError.message);
      return;
    }
    setInviteCode((data as { code: string } | null)?.code ?? null);
  };

  const setUnits = async (pref: 'metric' | 'imperial') => {
    if (!session) return;
    setUnitPreference(pref);
    await supabase.from('profiles').update({ unit_preference: pref }).eq('id', session.user.id);
  };

  const deleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy('delete');
    setError(null);
    const { error: deleteError } = await supabase.rpc('delete_account');
    if (deleteError) {
      setError(deleteError.message);
      setBusy(null);
      return;
    }
    // The server-side user is gone; clear the local session to leave the app.
    await supabase.auth.signOut({ scope: 'local' });
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText themeColor="textSecondary">Close</ThemedText>
          </Pressable>
          <ThemedText type="smallBold">Settings</ThemedText>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              HOUSEHOLD
            </ThemedText>
            <ThemedText type="default">{householdName ?? '—'}</ThemedText>
            {inviteCode ? (
              <View style={[styles.inviteBox, { borderColor: theme.primary }]}>
                <ThemedText type="subtitle" themeColor="primary" style={styles.inviteCode}>
                  {inviteCode}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.inviteHint}>
                  Share this code — it lets someone join your household for the next{' '}
                  {INVITE_EXPIRY_DAYS} days.
                </ThemedText>
              </View>
            ) : null}
            <Button
              title={inviteCode ? 'Generate another code' : 'Generate invite code'}
              variant="secondary"
              onPress={generateInvite}
              loading={busy === 'invite'}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              PREFERENCES
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Preferred units
            </ThemedText>
            <View style={styles.chipsWrap}>
              <Chip
                label="Metric"
                selected={unitPreference === 'metric'}
                onPress={() => setUnits('metric')}
              />
              <Chip
                label="Imperial"
                selected={unitPreference === 'imperial'}
                onPress={() => setUnits('imperial')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              ACCOUNT
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Signed in as {session?.user.email ?? '—'}
            </ThemedText>
            <Button title="Sign out" variant="secondary" onPress={signOut} />
          </View>

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <View style={[styles.dangerZone, { borderColor: theme.danger }]}>
            <ThemedText type="smallBold" themeColor="danger">
              DANGER ZONE
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Deleting your account is permanent. Households where you are the only member are
              removed along with their pantry and shopping data.
            </ThemedText>
            <Pressable
              onPress={deleteAccount}
              disabled={busy === 'delete'}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  borderColor: theme.danger,
                  backgroundColor: confirmDelete ? theme.danger : 'transparent',
                  opacity: busy === 'delete' ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}>
              {busy === 'delete' ? (
                <ActivityIndicator color={confirmDelete ? theme.onPrimary : theme.danger} />
              ) : (
                <ThemedText
                  type="default"
                  style={{ color: confirmDelete ? theme.onPrimary : theme.danger }}>
                  {confirmDelete ? 'Tap again to permanently delete' : 'Delete account'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spacer: { width: 50 },
  content: { padding: Spacing.four, gap: Spacing.five },
  section: { gap: Spacing.two },
  sectionTitle: { letterSpacing: 0.5 },
  inviteBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  inviteCode: { letterSpacing: 4 },
  inviteHint: { textAlign: 'center' },
  chipsWrap: { flexDirection: 'row', gap: Spacing.two },
  dangerZone: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  deleteButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
