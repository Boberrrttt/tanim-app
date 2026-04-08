import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { Sprout } from 'lucide-react-native';
import { getFarmingSessionsByFarmer } from '@/services/farming-session.service';
import { getUserData } from '@/services/token.service';
import { swrKeys } from '@/constants/swr-keys';
import { colors, fontFamily, fontSize, radius, spacing, shadow } from '@/constants/design-tokens';

/**
 * Thin floating strip after auth: lists farms with an active saved farming session (tanim-api).
 */
export default function FarmingActiveBanner() {
  const insets = useSafeAreaInsets();
  const [farmerId, setFarmerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getUserData();
      if (!cancelled) setFarmerId(u?.farmer_id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data } = useSWR(
    farmerId ? swrKeys.farmingSessionsByFarmer(farmerId) : null,
    () => getFarmingSessionsByFarmer(farmerId!),
    { revalidateOnFocus: true, dedupingInterval: 15_000 }
  );

  const sessions = data?.data;
  if (!sessions?.length) return null;

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} accessibilityRole="summary">
        <Sprout size={16} color={colors.primaryForeground} strokeWidth={2.2} />
        <Text style={styles.title} numberOfLines={1}>
          Farming started
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {sessions.map((s) => (
            <View key={s.farm_id} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {s.farm_name ?? s.farm_id.slice(0, 8)} · {s.selected_crop}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 12,
    backgroundColor: 'transparent',
  },
  bar: {
    marginHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...(shadow.md ?? {}),
  },
  title: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primaryForeground,
    maxWidth: 108,
  },
  chipsScroll: {
    flex: 1,
    maxHeight: 36,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    maxWidth: 220,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.primaryForeground,
  },
});
