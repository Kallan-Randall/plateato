import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { expirationStatus, isoDatePlusDays } from '@/lib/expiration';
import { supabase } from '@/lib/supabase';

const EXPIRING_WINDOW_DAYS = 7;

type ExpiringItem = {
  id: string;
  name: string;
  expiration_date: string | null;
  location: { name: string } | null;
};

type ShoppingSnapshot = { count: number; preview: string[] };

export default function HomeScreen() {
  const theme = useTheme();
  const [expiring, setExpiring] = useState<ExpiringItem[]>([]);
  const [shopping, setShopping] = useState<ShoppingSnapshot>({ count: 0, preview: [] });
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    const expiringReq = supabase
      .from('pantry_items')
      .select('id, name, expiration_date, location:locations(name)')
      .not('expiration_date', 'is', null)
      .lte('expiration_date', isoDatePlusDays(EXPIRING_WINDOW_DAYS))
      .order('expiration_date')
      .limit(5);

    const shoppingReq = (async (): Promise<ShoppingSnapshot> => {
      const { data: listId } = await supabase.rpc('ensure_shopping_list');
      if (!listId) return { count: 0, preview: [] };
      const { data, count } = await supabase
        .from('shopping_list_items')
        .select('name', { count: 'exact' })
        .eq('list_id', listId as string)
        .eq('checked', false)
        .order('created_at')
        .limit(3);
      return {
        count: count ?? 0,
        preview: ((data ?? []) as { name: string }[]).map((d) => d.name),
      };
    })();

    const [expiringRes, shoppingRes] = await Promise.all([expiringReq, shoppingReq]);
    if (expiringRes.data) setExpiring(expiringRes.data as unknown as ExpiringItem[]);
    setShopping(shoppingRes);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard]),
  );

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

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

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
              EXPIRING SOON
            </ThemedText>
            {expiring.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing expiring in the next {EXPIRING_WINDOW_DAYS} days.
              </ThemedText>
            ) : (
              expiring.map((item) => {
                const exp = expirationStatus(item.expiration_date);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(('/edit-item?id=' + item.id) as Href)}
                    style={({ pressed }) => [
                      styles.cardRow,
                      { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 },
                    ]}>
                    <View style={styles.rowLeft}>
                      {exp ? (
                        <View style={[styles.dot, { backgroundColor: theme[exp.color] }]} />
                      ) : null}
                      <ThemedText type="default">{item.name}</ThemedText>
                    </View>
                    <View style={styles.rowRight}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.location?.name ?? ''}
                      </ThemedText>
                      {exp ? (
                        <ThemedText type="small" themeColor={exp.color}>
                          {exp.label}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          <Pressable
            onPress={() => router.push('/shopping' as Href)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
              SHOPPING LIST
            </ThemedText>
            {shopping.count === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing on the list. Tap to add items.
              </ThemedText>
            ) : (
              <View style={styles.shoppingSummary}>
                <ThemedText type="default">
                  {shopping.count} {shopping.count === 1 ? 'item' : 'items'} to buy
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {shopping.preview.join(', ')}
                  {shopping.count > shopping.preview.length ? '…' : ''}
                </ThemedText>
              </View>
            )}
          </Pressable>
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTitle: { letterSpacing: 0.5 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  shoppingSummary: { gap: Spacing.one },
});
