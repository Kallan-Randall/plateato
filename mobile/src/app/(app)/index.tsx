import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ThemedText type="subtitle" themeColor="primary">
            Home
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Your dashboard — expiring soon, today&apos;s plan, and recipe ideas. (Phase 4)
          </ThemedText>
        </View>

        {/* Temporary: moves to a Settings screen later. */}
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.four },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  subtitle: { textAlign: 'center' },
});
