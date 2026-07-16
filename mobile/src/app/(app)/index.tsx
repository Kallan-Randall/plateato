import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" themeColor="primary">
            Home
          </ThemedText>
          <Pressable onPress={() => router.push('/settings' as Href)} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              Settings
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.center}>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Your dashboard — expiring soon, today&apos;s plan, and recipe ideas are on the way.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  subtitle: { textAlign: 'center' },
});
