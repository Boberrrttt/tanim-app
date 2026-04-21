import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, LogOut, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getFarms } from '@/services/farm.service';
import { swrKeys } from '@/constants/swr-keys';
import { clearAuthData, getUserData } from '@/services/token.service';
import { useAppDialog } from '@/contexts/app-dialog-context';
import { colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/design-tokens';
import { IFarm } from '@/types/farm.types';
import { DEMO_FARM, DEMO_FARM_BADGE, DEMO_FARM_ID } from '@/constants/demo-farm';

const FarmerScreen = () => {
  const router = useRouter();
  const { showDialog } = useAppDialog();
  const [helloLine, setHelloLine] = useState('Hello, Farmer!');
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [showDemoFarm, setShowDemoFarm] = useState(false);

  const { data: farmsPayload, isLoading: farmsListLoading } = useSWR(
    farmerId ? swrKeys.farmsList(farmerId) : null,
    () => getFarms(farmerId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
    }
  );

  const apiFarms: IFarm[] = farmsPayload?.data ?? [];
  const farms: IFarm[] = showDemoFarm
    ? [DEMO_FARM, ...apiFarms.filter((f) => f.farm_id !== DEMO_FARM_ID)]
    : apiFarms;
  const loading =
    farmerId === null || (farmsListLoading && farmsPayload === undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getUserData();
        if (cancelled) return;
        setFarmerId(user?.farmer_id ?? null);
        setShowDemoFarm(user?.demoFarmAccess === true);
        const first = user?.first_name?.trim() ?? '';
        const last = user?.last_name?.trim() ?? '';
        const full = [first, last].filter(Boolean).join(' ');
        setHelloLine(full ? `Hello, ${full}!` : 'Hello, Farmer!');
      } catch {
        if (!cancelled) {
          setFarmerId(null);
          setHelloLine('Hello, Farmer!');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    showDialog({
      title: 'Sign out?',
      message: "You'll need to sign in again to access your farms.",
      variant: 'warning',
      buttons: [
        {
          label: 'Cancel',
          variant: 'ghost',
          onPress: (dismiss) => dismiss(),
        },
        {
          label: 'Sign out',
          variant: 'destructive',
          onPress: async (dismiss) => {
            await clearAuthData();
            dismiss();
            router.replace('/login');
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderInner}>
          <View style={styles.headerBrand}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
              accessibilityLabel="Tanim logo"
            />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Tanim
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {helloLine}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleLogout}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Logout"
            accessibilityRole="button"
          >
            <LogOut size={22} color={colors.foreground} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>🌾 My Farms</Text>
        <Text style={styles.screenDescription}>
          Tap your farm to see soil health and crop suggestions.
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : farms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No farms yet. Add a farm to start.</Text>
          </View>
        ) : (
          farms.map((farm: IFarm) => {
            const isDemo = farm.farm_id === DEMO_FARM_ID;
            return (
              <TouchableOpacity
                key={farm.farm_id}
                style={styles.farmRow}
                onPress={() =>
                  router.push(`/farmer/${farm.farm_id}` as import('expo-router').Href)
                }
                activeOpacity={0.92}
              >
                <View style={styles.farmRowLeft}>
                  <View style={styles.iconWell}>
                    <MapPin size={28} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.farmRowText}>
                    <Text style={styles.farmName}>{farm.farm_name}</Text>
                    <Text style={styles.farmHint}>
                      {isDemo
                        ? DEMO_FARM_BADGE
                        : `${farm.farm_measurement} hectares · Tap to view details`}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={24} color={colors.mutedForeground} strokeWidth={2} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageHeader: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pageHeaderInner: {
    maxWidth: 672,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
    maxWidth: 672,
    width: '100%',
    alignSelf: 'center',
    gap: spacing.lg,
  },
  screenTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  screenDescription: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginTop: -spacing.sm,
  },
  farmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...(shadow.sm ?? {}),
  },
  farmRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
    minWidth: 0,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryAlpha10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmRowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  farmName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  farmHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    ...(shadow.sm ?? {}),
  },
  emptyText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  heroLogo: {
    width: 28,
    height: 28,
  },
});

export default FarmerScreen;
