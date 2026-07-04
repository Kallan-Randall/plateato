import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
};

/** Temporary placeholder used by each tab until its real screen is built. */
export function PlaceholderScreen({ title, subtitle }: Props) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" themeColor="primary" style={styles.centered}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {subtitle}
          </ThemedText>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
});
