import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mutate } from 'swr';
import {
  ArrowLeft,
  ChartLine,
  MapPin,
  Umbrella,
  Droplet,
  Wind,
  Clover,
  BrainCircuit,
  FlaskConical,
  Info,
  Play,
  Sprout,
  Ban,
  ChevronRight,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isAbortLikeError } from '@/services/api';
import {
  predictFertilizer,
  normalizeFarmingTimeline,
  type FertilizerPredictData,
} from '@/services/ml.service';
import { useFarmDetailData } from '@/hooks/use-farm-detail-data';
import { swrKeys } from '@/constants/swr-keys';
import { cancelFarmingSession, startFarmingSession } from '@/services/farming-session.service';
import { useAppDialog } from '@/contexts/app-dialog-context';
import { fontFamily, fontSize, radius, colors, spacing, shadow } from '@/constants/design-tokens';
import FarmingTimeline from '@/components/FarmingTimeline';
import { getCurrentCycleDay, getCycleEndDate } from '@/constants/crop-cycle';
import { getDemoFertilizerForCrop, isDemoFarmId } from '@/constants/demo-farm';
import { soilHealthQualitative, qualitativeProgressPercent } from '@/utils/soil-qualitative';

const kelvinToCelsius = (kelvin: number) => Math.round(kelvin - 273.15);

const getWeatherEmoji = (description: string) => {
  const desc = description?.toLowerCase();
  if (desc?.includes('clear')) return '☀️';
  if (desc?.includes('cloud')) return '⛅';
  if (desc?.includes('rain')) return '🌧️';
  if (desc?.includes('snow')) return '❄️';
  if (desc?.includes('thunder')) return '⛈️';
  if (desc?.includes('mist') || desc?.includes('fog')) return '🌫️';
  return '☀️';
};

function formatBagsPerHa(bags: number): string {
  const n = Number(bags);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Local calendar date as YYYY-MM-DD — used as Day 1 for the crop calendar (not UTC). */
function localTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmdLocal(ymd: string): Date | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(y, mo, day, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

const getWeatherRecommendation = (
  description: string,
  tempCelsius: number,
  humidity: number
) => {
  const desc = description?.toLowerCase();
  if (desc?.includes('rain')) {
    return 'Rain is on the way. Hold off on watering and applying fertilizer until it passes. Good weather for moving seedlings.';
  } else if (tempCelsius > 35) {
    return 'Very hot. Water more often and give tender crops some shade if you can.';
  } else if (tempCelsius < 20) {
    return 'Cool day. Leafy crops do well. Ease up on watering and watch for cold nights.';
  } else if (humidity > 80) {
    return 'Air is very damp. Watch for mold and leaf diseases; trim or space plants for airflow.';
  } else if (desc?.includes('clear') && tempCelsius >= 25 && tempCelsius <= 32) {
    return 'Nice day for the field—good for planting, weeding, or harvest.';
  } else {
    return 'Fair weather. Keep up your usual checks and field work.';
  }
};

type HealthBadgeKind = 'fertility' | 'ambient';

/** BSWM-style Low / Medium / High; ambient (moisture, temp) uses slightly different band colors. */
function healthStatusBadge(status: string, kind: HealthBadgeKind = 'fertility') {
  if (kind === 'ambient') {
    if (status === 'Medium' || status === 'Moderate')
      return { bg: colors.successLight, fg: colors.success };
    if (status === 'Low')
      return { bg: colors.infoLight, fg: colors.info };
    if (status === 'High' || status === 'Good')
      return { bg: colors.warningLight, fg: colors.warning };
  }
  if (status === 'Good' || status === 'High')
    return { bg: colors.successLight, fg: colors.success };
  if (status === 'Low')
    return { bg: colors.infoLight, fg: colors.info };
  if (status === 'Moderate' || status === 'Medium')
    return { bg: colors.warningLight, fg: colors.warning };
  return { bg: colors.dangerLight, fg: colors.destructive };
}

const HealthCard = ({
  element,
  symbol,
  status,
  actualValue,
  unit,
  statusKind = 'fertility',
}: {
  element: string;
  symbol: string;
  status: string;
  actualValue: string;
  unit: string;
  statusKind?: HealthBadgeKind;
}) => {
  const badge = healthStatusBadge(status, statusKind);
  const fillW = Math.min(100, Math.max(0, qualitativeProgressPercent(status)));
  return (
    <View style={styles.healthCard}>
      <View style={styles.healthCardHeader}>
        <View style={styles.healthCardTitle}>
          <Text style={styles.healthSymbol}>{symbol}</Text>
          <View>
            <Text style={styles.healthElement} numberOfLines={2}>
              {element}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.fg }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${fillW}%`, backgroundColor: badge.fg },
          ]}
        />
      </View>
      <Text style={styles.healthCardReading} numberOfLines={2}>
        {actualValue}
        {unit}
      </Text>
    </View>
  );
};

export default function FarmDetailsScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const { showDialog } = useAppDialog();
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [fertilizerLoading, setFertilizerLoading] = useState(false);
  const [fertilizerData, setFertilizerData] = useState<FertilizerPredictData | null>(null);
  const [fertilizerError, setFertilizerError] = useState<string | null>(null);
  const [startFarmingSaving, setStartFarmingSaving] = useState(false);
  const [cancelFarmingSaving, setCancelFarmingSaving] = useState(false);
  /** Client-only “session” for demo farm so Start Farming works without API writes. */
  const [demoSessionActive, setDemoSessionActive] = useState(false);
  const [demoSessionStartedAt, setDemoSessionStartedAt] = useState<string | null>(null);
  const [demoSessionCycleStartYmd, setDemoSessionCycleStartYmd] = useState<string | null>(null);

  const {
    farmerId,
    farm,
    selectedFarmId,
    soilHealthForDisplay,
    soilHealthFromPending,
    soilHealthFromFarmingSession,
    soilHealthFromApi,
    farmingSessionActive,
    pinnedFertilizerData,
    pinnedSelectedCrop,
    farmingSessionCycleStartYmd,
    farmingStartedAt,
    pendingSoilReceivedAt,
    pendingSoilFeatures,
    weather,
    weatherCoords,
    hasWeatherCoords,
    weatherError,
    weatherLoading,
    topCrops,
    farmsError,
    isInitialLoading,
    demoMode,
    demoAccessDenied,
    mutate: farmDetailMutate,
  } = useFarmDetailData(id);

  const farmIdForApi = (selectedFarmId ?? id) as string | undefined;

  const {
    farms: mutateFarms,
    weather: mutateWeather,
    pendingSoil: mutatePendingSoil,
    farmingSession: mutateFarmingSession,
    soilFromApi: mutateSoilFromApi,
  } = farmDetailMutate;

  const soilQ = useMemo(
    () => (soilHealthForDisplay ? soilHealthQualitative(soilHealthForDisplay) : null),
    [soilHealthForDisplay]
  );

  const [pullRefreshing, setPullRefreshing] = useState(false);

  const onPullRefresh = useCallback(async () => {
    if (demoMode) {
      setPullRefreshing(true);
      await new Promise<void>((r) => setTimeout(r, 450));
      setPullRefreshing(false);
      return;
    }
    setPullRefreshing(true);
    try {
      const tasks = [
        mutateFarms(),
        mutateFarmingSession(),
        mutateWeather(),
      ];
      if (!farmingSessionActive) {
        tasks.push(mutatePendingSoil(), mutateSoilFromApi());
      }
      await Promise.all(tasks);
    } finally {
      setPullRefreshing(false);
    }
  }, [
    demoMode,
    farmingSessionActive,
    mutateFarms,
    mutateFarmingSession,
    mutatePendingSoil,
    mutateSoilFromApi,
    mutateWeather,
  ]);

  const sessionActive = farmingSessionActive || (demoMode && demoSessionActive);

  const todayIs = `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;

  useEffect(() => {
    setSelectedCrop(null);
    setDemoSessionActive(false);
    setDemoSessionStartedAt(null);
    setDemoSessionCycleStartYmd(null);
  }, [id]);

  useEffect(() => {
    if (!farmingSessionActive || !pinnedSelectedCrop) return;
    setSelectedCrop(pinnedSelectedCrop);
  }, [id, farmingSessionActive, pinnedSelectedCrop]);

  useEffect(() => {
    setFertilizerError(null);
    if (farmingSessionActive && pinnedFertilizerData) {
      setFertilizerData(pinnedFertilizerData);
      setFertilizerLoading(false);
      return;
    }

    if (demoMode && demoSessionActive && selectedCrop && id && isDemoFarmId(id)) {
      setFertilizerLoading(false);
      const d = getDemoFertilizerForCrop(selectedCrop);
      setFertilizerData(d);
      setFertilizerError(null);
      return;
    }

    setFertilizerData(null);
    if (!selectedCrop || !soilHealthForDisplay || !id || farmingSessionActive) {
      setFertilizerLoading(false);
      return;
    }

    if (isDemoFarmId(id)) {
      if (!demoMode) {
        setFertilizerData(null);
        setFertilizerLoading(false);
        return;
      }
      setFertilizerLoading(false);
      const d = getDemoFertilizerForCrop(selectedCrop);
      setFertilizerData(d);
      setFertilizerError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setFertilizerLoading(true);
      setFertilizerError(null);
      try {
        const res = await predictFertilizer(
          {
            nitrogen: soilHealthForDisplay.nitrogen,
            phosphorus: soilHealthForDisplay.phosphorus,
            potassium: soilHealthForDisplay.potassium,
            ph: soilHealthForDisplay.ph,
            crop: selectedCrop,
            farm_id: farmIdForApi!,
            cycle_start_date: localTodayYmd(),
          },
          { signal: controller.signal }
        );
        if (cancelled) return;
        if (res.status !== 'success' || !res.data) {
          setFertilizerData(null);
          setFertilizerError(res.message ?? 'Could not get fertilizer suggestions.');
          return;
        }
        setFertilizerData(res.data);
      } catch (e: unknown) {
        if (cancelled || isAbortLikeError(e)) return;
        const ax = e as { message?: string };
        setFertilizerData(null);
        setFertilizerError(ax?.message ?? 'Could not load fertilizer suggestions.');
      } finally {
        if (!cancelled) setFertilizerLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    farmingSessionActive,
    pinnedFertilizerData,
    selectedCrop,
    soilHealthForDisplay,
    id,
    farmIdForApi,
    pendingSoilReceivedAt,
    demoMode,
    demoSessionActive,
  ]);

  const onStartFarming = useCallback(async () => {
    if (
      !id ||
      (!demoMode && !farmerId) ||
      !selectedCrop ||
      !soilHealthForDisplay ||
      !fertilizerData ||
      sessionActive
    ) {
      return;
    }
    if (demoMode) {
      const ymd = localTodayYmd();
      setDemoSessionCycleStartYmd(ymd);
      setDemoSessionStartedAt(new Date().toISOString());
      setDemoSessionActive(true);
      showDialog({
        title: 'Demo session started',
        message:
          'Your plan is active on this device only. Nothing is saved to the server.',
        variant: 'success',
      });
      return;
    }
    if (!farmerId) return;
    setStartFarmingSaving(true);
    try {
      const cycleYmd = localTodayYmd();
      const lat =
        farm?.latitude != null && Number.isFinite(farm.latitude)
          ? farm.latitude
          : weatherCoords?.lat != null && Number.isFinite(weatherCoords.lat)
            ? weatherCoords.lat
            : weather?.latitude != null && Number.isFinite(weather.latitude)
              ? weather.latitude
              : undefined;
      const lon =
        farm?.longitude != null && Number.isFinite(farm.longitude)
          ? farm.longitude
          : weatherCoords?.lon != null && Number.isFinite(weatherCoords.lon)
            ? weatherCoords.lon
            : weather?.longitude != null && Number.isFinite(weather.longitude)
              ? weather.longitude
              : undefined;
      const res = await startFarmingSession({
        farm_id: farmIdForApi!,
        farmer_id: farmerId,
        selected_crop: selectedCrop,
        soil_snapshot: {
          nitrogen: soilHealthForDisplay.nitrogen,
          phosphorus: soilHealthForDisplay.phosphorus,
          potassium: soilHealthForDisplay.potassium,
          ph: soilHealthForDisplay.ph,
          salinity: soilHealthForDisplay.salinity,
          temperature: soilHealthForDisplay.temperature,
          moisture: soilHealthForDisplay.moisture,
          received_at: pendingSoilReceivedAt ?? undefined,
        },
        fertilizer_recommendation: fertilizerData,
        top_crop_probabilities: topCrops,
        cycle_start_date: cycleYmd,
        ...(lat != null && lon != null ? { latitude: lat, longitude: lon } : {}),
        ...(pendingSoilFeatures && pendingSoilFeatures.length >= 6
          ? { features: pendingSoilFeatures }
          : {}),
      });
      if (res.status !== 'success' || !res.data) {
        showDialog({
          title: 'Could not save your plan',
          message:
            typeof res.message === 'string' ? res.message : 'Please try again.',
          variant: 'error',
        });
        return;
      }
      await farmDetailMutate.farmingSession();
      await mutate(swrKeys.farmingSessionsByFarmer(farmerId));
      await farmDetailMutate.farms();
      showDialog({
        title: 'Plan saved',
        message:
          'Your soil readings, crop choice, and fertilizer plan are saved. This farm will use this plan until you end the session.',
        variant: 'success',
      });
    } catch (e: unknown) {
      const ax = e as {
        response?: { data?: { message?: string; detail?: { message?: string } } };
        message?: string;
      };
      const d = ax?.response?.data;
      const msg =
        d?.message ??
        d?.detail?.message ??
        ax?.message ??
        'Connection problem. Try again.';
      showDialog({
        title: 'Could not save your plan',
        message: msg,
        variant: 'error',
      });
    } finally {
      setStartFarmingSaving(false);
    }
  }, [
    id,
    farmIdForApi,
    farmerId,
    selectedCrop,
    soilHealthForDisplay,
    fertilizerData,
    farmingSessionActive,
    pendingSoilReceivedAt,
    pendingSoilFeatures,
    topCrops,
    farmDetailMutate,
    farm,
    weather,
    weatherCoords,
    showDialog,
    sessionActive,
    demoMode,
  ]);

  const onCancelFarming = useCallback(() => {
    if (!id) return;
    if (demoMode && demoSessionActive) {
      setDemoSessionActive(false);
      setDemoSessionStartedAt(null);
      setDemoSessionCycleStartYmd(null);
      showDialog({
        title: 'Demo session ended',
        message: 'You can pick a crop and start again. Nothing was changed on the server.',
        variant: 'success',
      });
      return;
    }
    if (!farmerId || !farmingSessionActive) return;
    showDialog({
      title: 'End this farming session?',
      message:
        'Your saved plan stays in your history. After this, this farm will go back to using fresh soil readings from your sensor when available.',
      variant: 'warning',
      buttons: [
        { label: 'Keep going', variant: 'ghost', onPress: (d) => d() },
        {
          label: 'End session',
          variant: 'destructive',
          onPress: (d) => {
            d();
            void (async () => {
              setCancelFarmingSaving(true);
              try {
                const res = await cancelFarmingSession(farmIdForApi ?? id, farmerId);
                if (res.status !== 'success') {
                showDialog({
                  title: 'Could not end the session',
                  message:
                    typeof res.message === 'string'
                      ? res.message
                      : 'Please try again.',
                  variant: 'error',
                });
                  return;
                }
                await farmDetailMutate.farmingSession();
                await mutate(swrKeys.farmingSessionsByFarmer(farmerId));
                await farmDetailMutate.pendingSoil();
                setSelectedCrop(null);
                showDialog({
                  title: 'Session ended',
                  message: res.data?.ended ?? res.data?.removed
                    ? 'This farm will use new soil readings from your sensor again when they are available.'
                    : 'There was no active session saved for this farm.',
                  variant: 'success',
                });
              } catch (e: unknown) {
                const ax = e as {
                  response?: { data?: { message?: string; detail?: { message?: string } } };
                  message?: string;
                };
                const dat = ax?.response?.data;
                const msg =
                  dat?.message ??
                  dat?.detail?.message ??
                  ax?.message ??
                  'Connection problem. Try again.';
                showDialog({
                  title: 'Could not end the session',
                  message: msg,
                  variant: 'error',
                });
              } finally {
                setCancelFarmingSaving(false);
              }
            })();
          },
        },
      ],
    });
  }, [id, farmIdForApi, farmerId, farmingSessionActive, demoMode, demoSessionActive, farmDetailMutate, showDialog]);

  useEffect(() => {
    if (isDemoFarmId(id) || !farmsError || isAbortLikeError(farmsError)) return;
    console.error('Error loading farm details:', farmsError);
    showDialog({
      title: 'Could not open this farm',
      message: 'Check your internet connection and try again.',
      variant: 'error',
    });
  }, [id, farmsError, showDialog]);

  if (!id || isInitialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your farm…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (demoAccessDenied) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Info size={40} color={colors.mutedForeground} strokeWidth={2} />
          <Text style={styles.loadingText}>Demo farm not available</Text>
          <Text style={[styles.sectionDescription, { textAlign: 'center', paddingHorizontal: spacing.lg }]}>
            The offline demo farm is only for the demo account. Sign out and sign in with username{' '}
            <Text style={styles.sectionDescriptionEm}>farmer</Text> and password{' '}
            <Text style={styles.sectionDescriptionEm}>123456</Text> to try it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasCropSuggestion = topCrops.length > 0;

  const canStartFarming =
    !!selectedCrop &&
    !!soilHealthForDisplay &&
    !!fertilizerData &&
    !fertilizerLoading &&
    !fertilizerError &&
    !sessionActive;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onPullRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.farmCallout}>
          <MapPin size={24} color={colors.primary} strokeWidth={2} />
          <View style={styles.farmCalloutText}>
            <Text style={styles.farmCalloutTitle}>{farm?.farm_name ?? 'Farm Details'}</Text>
            <Text style={styles.farmCalloutMeta}>
              {demoMode ? 'Demo · offline sample data' : `${farm?.farm_measurement} hectares`}
            </Text>
          </View>
        </View>

        {demoMode ? (
          <View style={styles.demoBanner} accessibilityRole="summary">
            <Info size={22} color={colors.primary} strokeWidth={2} />
            <View style={styles.demoBannerText}>
              <Text style={styles.demoBannerTitle}>Demo farm</Text>
              <Text style={styles.demoBannerBody}>
                Soil, weather, crops, and fertilizer below are sample data on this device. No network
                calls are made for this screen.
              </Text>
            </View>
          </View>
        ) : null}

        {sessionActive && (farmingStartedAt || demoSessionStartedAt) ? (
          <View style={styles.pinnedFarmBanner}>
            <Sprout size={20} color={colors.primary} strokeWidth={2} />
            <View style={styles.pinnedFarmBannerText}>
              <Text style={styles.pinnedFarmBannerTitle}>Farming session active</Text>
              <Text style={styles.pinnedFarmBannerBody}>
                {demoMode && demoSessionActive
                  ? `Demo plan started on ${new Date(demoSessionStartedAt || Date.now()).toLocaleString()}. Sample data only on this device.`
                  : `You started this plan on ${new Date(farmingStartedAt!).toLocaleString()}. The app keeps using those saved soil and crop numbers for this farm instead of new sensor readings.`}
              </Text>
            </View>
          </View>
        ) : null}

        {sessionActive && (farmerId || demoMode) ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ban size={26} color={colors.destructive} strokeWidth={2} />
              <Text style={styles.sectionTitle}>End farming session</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Stop using the saved plan for this farm. New soil readings from your sensor will show up
              here again when available.
            </Text>
            <TouchableOpacity
              style={[
                styles.cancelFarmingButton,
                cancelFarmingSaving && styles.cancelFarmingButtonDisabled,
              ]}
              disabled={cancelFarmingSaving}
              onPress={onCancelFarming}
              activeOpacity={0.85}
              accessibilityLabel="End farming session for this farm"
            >
              {cancelFarmingSaving ? (
                <ActivityIndicator color={colors.destructive} />
              ) : (
                <>
                  <Ban size={20} color={colors.destructive} strokeWidth={2.2} />
                  <Text style={styles.cancelFarmingButtonText}>End session for this farm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Soil Health */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ChartLine size={26} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>🧪 Soil health</Text>
          </View>

          {demoMode ? (
            <Text style={styles.soilPendingNote}>
              Sample soil values for this demo—same numbers every time, not from a sensor or server.
            </Text>
          ) : null}
          {!demoMode && soilHealthFromFarmingSession ? (
            <Text style={styles.soilPendingNote}>
              These numbers are from when you saved your plan. They stay the same until you end this
              farming session—not from live sensor checks right now.
            </Text>
          ) : null}
          {!demoMode && soilHealthFromPending ? (
            <Text style={styles.soilPendingNote}>
              These numbers come from your latest soil sensor reading. They feed the cards below and your
              fertilizer suggestions (nitrogen, phosphorus, potassium, salt level, pH, moisture, and
              temperature).
            </Text>
          ) : null}
          {!demoMode && soilHealthFromApi ? (
            <Text style={styles.soilPendingNote}>
              These numbers are your latest soil test saved on your account (from a recent sensor reading,
              or the most recent test we have) while we are not getting new live data from the model.
            </Text>
          ) : null}

          {soilHealthForDisplay ? (
            <View style={styles.healthGrid}>
              <HealthCard
                element="Nitrogen"
                symbol="𝐍"
                status={soilQ ? soilQ.nitrogen : 'Low'}
                actualValue={soilHealthForDisplay.nitrogen?.toString() ?? '0'}
                unit={soilHealthForDisplay.nitrogen <= 6.5 ? '% OM' : ' (sensor)'}
              />
              <HealthCard
                element="Phosphorus"
                symbol="𝐏"
                status={soilQ ? soilQ.phosphorus : 'Low'}
                actualValue={soilHealthForDisplay.phosphorus?.toString() ?? '0'}
                unit=" ppm"
              />
              <HealthCard
                element="Potassium"
                symbol="𝐊"
                status={soilQ ? soilQ.potassium : 'Low'}
                actualValue={soilHealthForDisplay.potassium?.toString() ?? '0'}
                unit=" ppm"
              />
              <HealthCard
                element="Salinity"
                symbol="🧂"
                status={soilQ ? soilQ.salinity : 'Low'}
                actualValue={soilHealthForDisplay.salinity?.toString() ?? '0'}
                unit=" dS/m"
              />
              <HealthCard
                element="pH"
                symbol="🧪"
                status={soilQ ? soilQ.ph : 'Low'}
                actualValue={soilHealthForDisplay.ph?.toString() ?? '0'}
                unit=" pH"
              />
              <HealthCard
                element="Moisture"
                symbol="💧"
                status={soilQ ? soilQ.moisture : 'Low'}
                statusKind="ambient"
                actualValue={soilHealthForDisplay.moisture?.toString() ?? '0'}
                unit="%"
              />
              <HealthCard
                element="Temperature"
                symbol="🌡️"
                status={soilQ ? soilQ.temperature : 'Low'}
                statusKind="ambient"
                actualValue={soilHealthForDisplay.temperature?.toString() ?? '0'}
                unit=" °C"
              />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No soil data yet. Run a soil test for this farm to see readings and tips here.
              </Text>
            </View>
          )}
        </View>

        {/* Weather Today */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Umbrella size={26} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>🌤️ Today’s weather</Text>
          </View>
          <Text style={styles.weatherDate}>{todayIs}</Text>

          {weather ? (
            <>
              <View style={styles.weatherCard}>
                <Text style={styles.weatherEmoji}>{getWeatherEmoji(weather.description)}</Text>
                <View style={styles.weatherTemp}>
                  <View style={styles.tempRow}>
                    <Text style={styles.tempIcon}>🌡️</Text>
                    <Text style={styles.tempValue}>{kelvinToCelsius(weather.temperature)}°C</Text>
                  </View>
                  <Text style={styles.weatherCondition}>{weather.description}</Text>
                </View>
                <View style={styles.weatherDetails}>
                  <View style={styles.weatherDetailItem}>
                    <Droplet size={16} color={colors.mutedForeground} />
                    <Text style={styles.weatherDetailText}>{weather.humidity}% Humidity</Text>
                  </View>
                  <View style={styles.weatherDetailItem}>
                    <Wind size={16} color={colors.mutedForeground} />
                    <Text style={styles.weatherDetailText}>{weather.wind_speed} km/h Wind</Text>
                  </View>
                </View>
              </View>
              <View style={styles.weatherRecommendation}>
                <View style={styles.recommendationHeader}>
                  <BrainCircuit size={22} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.recommendationTitle}>Ideas for today</Text>
                </View>
                <Text style={styles.recommendationText}>
                  {getWeatherRecommendation(
                    weather.description,
                    kelvinToCelsius(weather.temperature),
                    weather.humidity
                  )}
                </Text>
              </View>
            </>
          ) : weatherLoading ? (
            <View style={styles.weatherCard}>
              <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.weatherCondition, { marginTop: spacing.sm }]}>Getting weather…</Text>
            </View>
          ) : (
            <View style={styles.weatherCard}>
              <Text style={styles.weatherEmoji}>⛅</Text>
              <View style={styles.weatherTemp}>
                <Text style={styles.tempValue}>--</Text>
                <Text style={styles.weatherCondition}>Weather not available</Text>
              </View>
            </View>
          )}
        </View>

        {/* Best Crop Suggestion - Top 3 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ChartLine size={26} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>🌾 Suggested crops</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Tap a crop to see fertilizer amounts (nitrogen, phosphate, potash) and product options based
            on your latest soil test and that crop.
          </Text>

          {hasCropSuggestion ? (
            topCrops.map((crop, index) => {
              const isSelected = selectedCrop === crop.crop_class;
              return (
                <TouchableOpacity
                  key={`${crop.crop_class}-${index}`}
                  style={[
                    styles.cropSuggestionCard,
                    isSelected && styles.cropSuggestionCardSelected,
                    sessionActive && styles.cropSuggestionCardDisabled,
                  ]}
                  onPress={() => {
                    if (sessionActive) return;
                    setSelectedCrop(crop.crop_class);
                  }}
                  activeOpacity={sessionActive ? 1 : 0.7}
                  disabled={sessionActive}
                >
                  <View style={styles.cropSuggestionLeft}>
                    <View style={[styles.cropRankBadge, isSelected && styles.cropRankBadgeSelected]}>
                      <Text style={[styles.cropRankText, isSelected && styles.cropRankTextSelected]}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.cropSuggestionName, isSelected && styles.cropSuggestionNameSelected]}>
                      {crop.crop_class}
                    </Text>
                  </View>
                  <Text style={styles.cropProbability}>
                    {Math.round(crop.probability * 100)}% fit
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Run a soil test for this farm to see which crops fit this land best.
              </Text>
            </View>
          )}
        </View>

        {/* Fertilizer — soil-driven model hint for selected crop */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clover size={26} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>
              Fertilizer suggestions{selectedCrop ? ` · ${selectedCrop}` : ''}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            Nutrient and pH levels use BSWM-style low, medium, and high bands. Phosphorus (ppm) uses
            pH-based bands from the same reference. Always follow the bag label and your local
            agriculture office.
          </Text>

          {!selectedCrop ? (
            <View style={styles.fertilizerEmptyCard}>
              <FlaskConical size={28} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Pick a crop first</Text>
              <Text style={styles.fertilizerEmptyBody}>
                Choose one of the suggested crops above. We’ll use your soil numbers and that crop to build
                a fertilizer plan.
              </Text>
            </View>
          ) : !soilHealthForDisplay ? (
            <View style={styles.fertilizerEmptyCard}>
              <FlaskConical size={28} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Need soil numbers</Text>
              <Text style={styles.fertilizerEmptyBody}>
                Add or refresh a soil test for this farm. We need nitrogen, phosphorus, potassium, and pH
                from your latest reading to suggest rates.
              </Text>
            </View>
          ) : fertilizerLoading ? (
            <View style={styles.fertilizerLoadingBlock}>
              <ActivityIndicator size="small" color={colors.primary} />
              <View style={styles.fertilizerLoadingCopy}>
                <Text style={styles.fertilizerLoadingTitle}>Working on your plan…</Text>
                <Text style={styles.fertilizerLoadingSub}>
                  Pairing {selectedCrop} with your latest soil readings.
                </Text>
              </View>
            </View>
          ) : fertilizerError ? (
            <View style={styles.fertilizerEmptyCard}>
              <Info size={28} color={colors.warning} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Couldn’t load suggestions</Text>
              <Text style={styles.fertilizerEmptyBody}>{fertilizerError}</Text>
              <Text style={styles.fertilizerEmptyHint}>
                Check your internet connection, then tap the crop again.
              </Text>
            </View>
          ) : fertilizerData ? (
            <>
              {(() => {
                const ft = normalizeFarmingTimeline(fertilizerData.farming_timeline);
                if (!ft) {
                  return (
                    <View style={[styles.fertilizerEmptyCard, styles.timelineWrap]}>
                      <Info size={28} color={colors.mutedForeground} strokeWidth={2} />
                      <Text style={styles.fertilizerEmptyTitle}>No growing calendar in the answer</Text>
                      <Text style={styles.fertilizerEmptyBody}>
                        The app didn’t get a clear day-by-day schedule for this crop. Try again later, or
                        ask your support contact if it keeps happening.
                      </Text>
                    </View>
                  );
                }
                const ymd = (farmingSessionCycleStartYmd ||
                  demoSessionCycleStartYmd ||
                  ft.cycle_start_date?.trim() ||
                  localTodayYmd()) as string;
                const cycleStart = parseYmdLocal(ymd);
                if (!cycleStart) {
                  return (
                    <View style={[styles.fertilizerEmptyCard, styles.timelineWrap]}>
                      <Info size={28} color={colors.warning} strokeWidth={2} />
                      <Text style={styles.fertilizerEmptyTitle}>Problem with the start date</Text>
                      <Text style={styles.fertilizerEmptyBody}>
                        Day 1 of the crop calendar ({ymd}) could not be read. Try starting the session
                        again or contact support if this repeats.
                      </Text>
                    </View>
                  );
                }
                const cycleEnd = getCycleEndDate(cycleStart, ft.total_days);
                const day = getCurrentCycleDay(cycleStart, ft.total_days);
                const phases = ft.phases.map((p) => ({
                  name: p.name,
                  dayStart: p.day_start,
                  dayEnd: p.day_end,
                  description: p.description,
                }));
                const footnote =
                  farmingSessionCycleStartYmd || demoSessionCycleStartYmd
                    ? `${ft.total_days}-day crop calendar. Day 1 is ${ymd} (when you saved your plan).`
                    : `${ft.total_days}-day crop calendar. Day 1 is ${ymd} for preview until you save your plan.`;
                return (
                  <View style={styles.timelineWrap}>
                    <FarmingTimeline
                      cropName={fertilizerData.crop}
                      cycleStartDate={cycleStart}
                      cycleEndDate={cycleEnd}
                      totalDays={ft.total_days}
                      currentDay={day}
                      phases={phases}
                      plantingWindowNote={ft.planting_window_note}
                      timelineFootnote={footnote}
                    />
                  </View>
                );
              })()}
              <View style={styles.fertSummaryCard}>
                <Text style={styles.fertSummaryTitle}>Summary</Text>
                <View style={styles.fertRow}>
                  <Text style={styles.fertRowLabel}>Crop</Text>
                  <Text style={styles.fertRowValue}>{fertilizerData.crop}</Text>
                </View>
                <View style={styles.fertRow}>
                  <Text style={styles.fertRowLabel}>Soil pH</Text>
                  <Text style={styles.fertRowValue}>{fertilizerData.soil_ph}</Text>
                </View>
              </View>

              <Text style={styles.fertSectionHeading}>Soil nutrient levels</Text>
              <Text style={styles.fertSectionHint}>
                Low, medium, and high are derived from your latest soil numbers using the same rules as
                the soil health cards.
              </Text>
              <View style={styles.fertNpkRow}>
                {(
                  [
                    { k: 'nitrogen' as const, symbol: 'N' },
                    { k: 'phosphorus' as const, symbol: 'P' },
                    { k: 'potassium' as const, symbol: 'K' },
                  ] as const
                ).map(({ k, symbol }) => {
                  const status = soilQ ? soilQ[k] : fertilizerData[k];
                  const badge = healthStatusBadge(status, 'fertility');
                  return (
                    <View key={k} style={styles.fertNpkPill}>
                      <Text style={styles.fertNpkSymbol}>{symbol}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.fg }]}>{status}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.fertSummaryCard}>
                <View style={styles.fertRow}>
                  <Text style={styles.fertRowLabel}>Recommended N–P–K (kg per hectare)</Text>
                  <Text style={styles.fertRowValueEm}>
                    {fertilizerData.fertilizer_recommendation_rate}
                  </Text>
                </View>
                <View style={styles.fertRow}>
                  <Text style={styles.fertRowLabel}>Organic fertilizer</Text>
                  <Text style={styles.fertRowValue}>{fertilizerData.organic_fertilizer}</Text>
                </View>
              </View>

              {(['option_1', 'option_2'] as const).map((optKey, idx) => (
                <View key={optKey} style={styles.fertOptionCard}>
                  <Text style={styles.fertOptionTitle}>Option {idx + 1}</Text>
                  {(['first_application', 'second_application'] as const).map((phase) => (
                    <View key={phase} style={styles.fertPhaseBlock}>
                      <Text style={styles.fertPhaseTitle}>
                        {phase === 'first_application' ? 'First application' : 'Second application'}
                      </Text>
                      {(fertilizerData[optKey][phase] ?? []).map((row, i) => (
                        <View key={`${optKey}-${phase}-${i}`} style={styles.fertLineRow}>
                          <Text style={styles.fertLineFert} numberOfLines={3}>
                            {row.fertilizer}
                          </Text>
                          <Text style={styles.fertLineBags}>
                            {formatBagsPerHa(row.bags_per_ha)} bags/ha
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}

              <View style={styles.fertOptionCard}>
                <Text style={styles.fertOptionTitle}>How to apply</Text>
                <Text style={styles.fertModePhase}>First application</Text>
                <Text style={styles.fertModeBody}>
                  {fertilizerData.mode_of_application.first_application}
                </Text>
                <Text style={styles.fertModePhase}>Second application</Text>
                <Text style={styles.fertModeBody}>
                  {fertilizerData.mode_of_application.second_application}
                </Text>
                <Text style={styles.fertModePhase}>Organic fertilizer</Text>
                <Text style={styles.fertModeBody}>
                  {fertilizerData.mode_of_application.organic_fertilizer}
                </Text>
              </View>

              <View style={styles.fertilizerDisclaimer}>
                <Info size={16} color={colors.mutedForeground} strokeWidth={2} />
                <Text style={styles.fertilizerDisclaimerText}>
                  This is guidance only. Double-check with a soil lab or crop adviser before you buy or
                  spread fertilizer.
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.fertilizerEmptyCard}>
              <FlaskConical size={28} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Nothing to show yet</Text>
              <Text style={styles.fertilizerEmptyBody}>
                Tap your crop again in a moment. If it keeps failing, the service may be busy—try again
                later.
              </Text>
            </View>
          )}
        </View>

        {!sessionActive ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Play size={26} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Save your plan</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Save your soil readings, chosen crop, and fertilizer plan to your account so this farm can
              follow it.
            </Text>
            <TouchableOpacity
              style={[
                styles.startFarmingButton,
                (!canStartFarming || startFarmingSaving || (!demoMode && !farmerId)) &&
                  styles.startFarmingButtonDisabled,
              ]}
              disabled={!canStartFarming || startFarmingSaving || (!demoMode && !farmerId)}
              onPress={onStartFarming}
              activeOpacity={0.85}
            >
              {startFarmingSaving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Play size={20} color={colors.primaryForeground} strokeWidth={2.2} />
                  <Text style={styles.startFarmingButtonText}>Save plan & start session</Text>
                </>
              )}
            </TouchableOpacity>
            {!demoMode && !farmerId ? (
              <Text style={styles.startFarmingHint}>Sign in as a farmer to save your plan.</Text>
            ) : !canStartFarming ? (
              <Text style={styles.startFarmingHint}>
                Pick a crop above and wait until fertilizer suggestions appear.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...(shadow.sm ?? {}),
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryAlpha10,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  farmCalloutText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  farmCalloutTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  farmCalloutMeta: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.infoLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoBannerText: {
    flex: 1,
    gap: 4,
  },
  demoBannerTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  demoBannerBody: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  pinnedFarmBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinnedFarmBannerText: {
    flex: 1,
    gap: 4,
  },
  pinnedFarmBannerTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  pinnedFarmBannerBody: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
    maxWidth: 672,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['4xl'],
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: 14,
    ...(shadow.sm ?? {}),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
    flex: 1,
  },
  sectionDescription: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  sectionDescriptionEm: {
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
  },
  soilPendingNote: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  healthGrid: {
    gap: spacing.md,
  },
  healthCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  healthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthSymbol: {
    fontSize: 16,
  },
  healthElement: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  progressBar: {
    height: 10,
    backgroundColor: colors.muted,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  healthCardReading: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
    textAlign: 'center',
  },
  statusText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  emptyCard: {
    padding: spacing['2xl'],
    backgroundColor: colors.background,
    borderRadius: radius.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  weatherDate: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  weatherCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  weatherEmoji: {
    fontSize: 52,
  },
  weatherTemp: {
    alignItems: 'center',
    gap: 8,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tempIcon: {
    fontSize: 12,
  },
  tempValue: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  weatherCondition: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  weatherHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  weatherDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    justifyContent: 'center',
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherDetailText: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
  },
  weatherRecommendation: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: spacing.sm,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendationTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.greenTextBold,
  },
  recommendationText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.greenText,
    lineHeight: 22,
  },
  suggestionHero: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  suggestionHeroActive: {
    borderColor: colors.greenBorder,
    backgroundColor: colors.successLight,
  },
  suggestionHeroEmpty: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  suggestionHeroTopBar: {
    height: 5,
    backgroundColor: colors.primary,
  },
  suggestionHeroTopBarMuted: {
    backgroundColor: colors.muted,
  },
  suggestionHeroInner: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 6,
  },
  suggestionKicker: {
    fontSize: 10,
    fontFamily: fontFamily.semibold,
    color: colors.greenAccent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  suggestionKickerMuted: {
    color: colors.mutedForeground,
  },
  suggestionTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.greenDark,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  suggestionTitleEmpty: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.mutedForeground,
    letterSpacing: 0,
    lineHeight: 28,
  },
  suggestionFootnote: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: 6,
  },
  suggestionFootnoteWithRule: {
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
  },
  suggestionFootnoteMuted: {
    color: colors.mutedForeground,
  },
  cropSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cropSuggestionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha10,
  },
  cropSuggestionCardDisabled: {
    opacity: 0.65,
  },
  cropSuggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cropRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropRankBadgeSelected: {
    backgroundColor: colors.primary,
  },
  cropRankText: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  cropRankTextSelected: {
    color: colors.primaryForeground,
  },
  cropSuggestionName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
  },
  cropSuggestionNameSelected: {
    color: colors.greenDark,
  },
  cropProbability: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  timelineWrap: {
    marginBottom: spacing.lg,
  },
  startFarmingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  startFarmingButtonDisabled: {
    opacity: 0.5,
  },
  startFarmingButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.primaryForeground,
  },
  startFarmingHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  cancelFarmingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.destructive,
  },
  cancelFarmingButtonDisabled: {
    opacity: 0.55,
  },
  cancelFarmingButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.destructive,
  },
  fertTimelineMissingCard: {
    marginBottom: spacing.lg,
  },
  fertilizerLoadingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fertilizerLoadingCopy: {
    flex: 1,
    gap: 4,
  },
  fertilizerLoadingTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
  },
  fertilizerLoadingSub: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  fertilizerEmptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fertilizerEmptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    textAlign: 'center',
  },
  fertilizerEmptyBody: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    alignSelf: 'center',
  },
  fertilizerEmptyHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
    maxWidth: 300,
    alignSelf: 'center',
    opacity: 0.9,
  },
  fertSummaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fertSummaryTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  fertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  fertRowLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  fertRowValue: {
    flexShrink: 0,
    maxWidth: '58%',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    textAlign: 'right',
  },
  fertRowValueEm: {
    flexShrink: 0,
    maxWidth: '58%',
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.greenDark,
    textAlign: 'right',
  },
  fertSectionHeading: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  fertSectionHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  fertNpkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  fertNpkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fertNpkSymbol: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    width: 18,
  },
  fertOptionCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  fertOptionTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  fertPhaseBlock: {
    gap: spacing.xs,
  },
  fertPhaseTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  fertLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fertLineFert: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.foreground,
    lineHeight: 20,
  },
  fertLineBags: {
    flexShrink: 0,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.greenDark,
  },
  fertModePhase: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  fertModeBody: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.foreground,
    lineHeight: 20,
  },
  fertilizerDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fertilizerDisclaimerText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});
