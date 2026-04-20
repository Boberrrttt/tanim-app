import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
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
    return 'Rain expected. Postpone irrigation and fertilizer application. Good time for transplanting seedlings.';
  } else if (tempCelsius > 35) {
    return 'High temperature warning. Increase irrigation frequency and provide shade for sensitive crops.';
  } else if (tempCelsius < 20) {
    return 'Cool weather. Ideal for leafy vegetables. Reduce watering and watch for frost.';
  } else if (humidity > 80) {
    return 'High humidity. Monitor crops for fungal diseases. Ensure good air circulation.';
  } else if (desc?.includes('clear') && tempCelsius >= 25 && tempCelsius <= 32) {
    return 'Perfect farming conditions! Ideal for planting, weeding, and harvesting activities.';
  } else {
    return 'Moderate conditions. Continue regular farm maintenance and monitoring.';
  }
};

function healthStatusBadge(status: string) {
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
  percent,
  status,
  actualValue,
  unit,
  maxValue,
}: {
  element: string;
  symbol: string;
  percent: number;
  status: string;
  actualValue: string;
  unit: string;
  maxValue: string;
}) => {
  const badge = healthStatusBadge(status);
  return (
    <View style={styles.healthCard}>
      <View style={styles.healthCardHeader}>
        <View style={styles.healthCardTitle}>
          <Text style={styles.healthSymbol}>{symbol}</Text>
          <Text style={styles.healthElement}>{element}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.fg }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.healthCardFooter}>
        <Text style={styles.healthValue}>0</Text>
        <Text style={styles.healthValueMain}>{actualValue}{unit}</Text>
        <Text style={styles.healthValue}>{maxValue}{unit}</Text>
      </View>
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

  const {
    farmerId,
    farm,
    soilHealthForDisplay,
    soilHealthFromPending,
    soilHealthFromFarmingSession,
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
    mutate: farmDetailMutate,
  } = useFarmDetailData(id);

  const todayIs = `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;

  useEffect(() => {
    setSelectedCrop(null);
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

    setFertilizerData(null);
    if (!selectedCrop || !soilHealthForDisplay || !id || farmingSessionActive) {
      setFertilizerLoading(false);
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
            farm_id: id,
            cycle_start_date: localTodayYmd(),
          },
          { signal: controller.signal }
        );
        if (cancelled) return;
        if (res.status !== 'success' || !res.data) {
          setFertilizerData(null);
          setFertilizerError(res.message ?? 'Fertilizer recommendation failed.');
          return;
        }
        setFertilizerData(res.data);
      } catch (e: unknown) {
        if (cancelled || isAbortLikeError(e)) return;
        const ax = e as { message?: string };
        setFertilizerData(null);
        setFertilizerError(ax?.message ?? 'Could not load fertilizer recommendation.');
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
    pendingSoilReceivedAt,
  ]);

  const onStartFarming = useCallback(async () => {
    if (
      !id ||
      !farmerId ||
      !selectedCrop ||
      !soilHealthForDisplay ||
      !fertilizerData ||
      farmingSessionActive
    ) {
      return;
    }
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
        farm_id: id,
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
          title: 'Could not start farming',
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
        title: 'Farming started',
        message:
          'Soil, crop, and fertilizer plan are saved on the server. This farm will keep using this snapshot.',
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
        'Network or server error.';
      showDialog({
        title: 'Could not start farming',
        message: msg,
        variant: 'error',
      });
    } finally {
      setStartFarmingSaving(false);
    }
  }, [
    id,
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
  ]);

  const onCancelFarming = useCallback(() => {
    if (!id || !farmerId || !farmingSessionActive) return;
    showDialog({
      title: 'End farming?',
      message:
        'This ends the active farming session. Your snapshot stays on the server for history; this farm will use live ML readings again when you are not in an active session.',
      variant: 'warning',
      buttons: [
        { label: 'Keep farming', variant: 'ghost', onPress: (d) => d() },
        {
          label: 'End farming',
          variant: 'destructive',
          onPress: (d) => {
            d();
            void (async () => {
              setCancelFarmingSaving(true);
              try {
                const res = await cancelFarmingSession(id, farmerId);
                if (res.status !== 'success') {
                  showDialog({
                    title: 'Could not end farming',
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
                  title: 'Farming ended',
                  message: res.data?.ended ?? res.data?.removed
                    ? 'Session marked ended. This farm will use live ML readings again when available.'
                    : 'No active session was stored for this farm.',
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
                  'Network or server error.';
                showDialog({
                  title: 'Could not end farming',
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
  }, [id, farmerId, farmingSessionActive, farmDetailMutate, showDialog]);

  useEffect(() => {
    if (!farmsError || isAbortLikeError(farmsError)) return;
    console.error('Error loading farm details:', farmsError);
    showDialog({
      title: 'Could not load farm',
      message: 'Farm details could not be loaded. Check your connection and try again.',
      variant: 'error',
    });
  }, [farmsError, showDialog]);

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
          <Text style={styles.loadingText}>Loading farm details...</Text>
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
    !farmingSessionActive;

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.farmCallout}>
          <MapPin size={24} color={colors.primary} strokeWidth={2} />
          <View style={styles.farmCalloutText}>
            <Text style={styles.farmCalloutTitle}>{farm?.farm_name ?? 'Farm Details'}</Text>
            <Text style={styles.farmCalloutMeta}>{farm?.farm_measurement} hectares</Text>
          </View>
        </View>

        {farmingSessionActive && farmingStartedAt ? (
          <View style={styles.pinnedFarmBanner}>
            <Sprout size={20} color={colors.primary} strokeWidth={2} />
            <View style={styles.pinnedFarmBannerText}>
              <Text style={styles.pinnedFarmBannerTitle}>Farming in progress</Text>
              <Text style={styles.pinnedFarmBannerBody}>
                This farm uses your saved soil, crop, and fertilizer plan from{' '}
                {new Date(farmingStartedAt).toLocaleString()}. ML pending soil is not polled for this
                farm anymore.
              </Text>
            </View>
          </View>
        ) : null}

        {farmingSessionActive && farmerId ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ban size={26} color={colors.destructive} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Cancel farming</Text>
            </View>
            <Text style={styles.sectionDescription}>
              End the saved session for this farm. ML pending soil will be used again for readings when
              available.
            </Text>
            <TouchableOpacity
              style={[
                styles.cancelFarmingButton,
                cancelFarmingSaving && styles.cancelFarmingButtonDisabled,
              ]}
              disabled={cancelFarmingSaving}
              onPress={onCancelFarming}
              activeOpacity={0.85}
              accessibilityLabel="End farming for this farm"
            >
              {cancelFarmingSaving ? (
                <ActivityIndicator color={colors.destructive} />
              ) : (
                <>
                  <Ban size={20} color={colors.destructive} strokeWidth={2.2} />
                  <Text style={styles.cancelFarmingButtonText}>End farming for this farm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Soil Health */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ChartLine size={26} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>🧪 Soil Health</Text>
          </View>

          {soilHealthFromFarmingSession ? (
            <Text style={styles.soilPendingNote}>
              Values from your saved farming session (tanim-api). They match the soil snapshot taken when
              you pressed Start farming — not live ML pending readings.
            </Text>
          ) : null}
          {soilHealthFromPending ? (
            <Text style={styles.soilPendingNote}>
              Values from your ML service (GET /pending/soil): global latest reading from /predict, not
              tanim-api. Open farm uses this for cards and fertilizer; N, P, K, salinity, pH, moisture,
              temperature match the model feature vector.
            </Text>
          ) : null}

          {soilHealthForDisplay ? (
            <>
              <View style={styles.healthGrid}>
                <HealthCard
                  element="Nitrogen"
                  symbol="𝐍"
                  percent={soilHealthForDisplay.nitrogen}
                  status="Good"
                  actualValue={soilHealthForDisplay.nitrogen?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Phosphorus"
                  symbol="𝐏"
                  percent={soilHealthForDisplay.phosphorus}
                  status="Good"
                  actualValue={soilHealthForDisplay.phosphorus?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Potassium"
                  symbol="𝐊"
                  percent={soilHealthForDisplay.potassium}
                  status="Good"
                  actualValue={soilHealthForDisplay.potassium?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Salinity"
                  symbol="🧂"
                  percent={soilHealthForDisplay.salinity * 15}
                  status="Low"
                  actualValue={soilHealthForDisplay.salinity?.toString() ?? '0'}
                  unit=" dS/m"
                  maxValue="6.5"
                />
                <HealthCard
                  element="pH"
                  symbol="🧪"
                  percent={soilHealthForDisplay.ph * 10}
                  status="Good"
                  actualValue={soilHealthForDisplay.ph?.toString() ?? '0'}
                  unit=" pH"
                  maxValue="10"
                />
                <HealthCard
                  element="Moisture"
                  symbol="💧"
                  percent={soilHealthForDisplay.moisture}
                  status="Good"
                  actualValue={soilHealthForDisplay.moisture?.toString() ?? '0'}
                  unit="%"
                  maxValue="100"
                />
                <HealthCard
                  element="Temperature"
                  symbol="🌡️"
                  percent={Math.min(100, Math.max(0, soilHealthForDisplay.temperature * 2))}
                  status="Good"
                  actualValue={soilHealthForDisplay.temperature?.toString() ?? '0'}
                  unit=" °C"
                  maxValue="50"
                />
              </View>
            </>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No soil health test yet. Complete a soil health test for this farm to see recommendations.
              </Text>
            </View>
          )}
        </View>

        {/* Weather Today */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Umbrella size={26} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>🌤️ Weather Today</Text>
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
                  <Text style={styles.recommendationTitle}>What to do today</Text>
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
              <Text style={[styles.weatherCondition, { marginTop: spacing.sm }]}>Loading weather…</Text>
            </View>
          ) : (
            <View style={styles.weatherCard}>
              <Text style={styles.weatherEmoji}>⛅</Text>
              <View style={styles.weatherTemp}>
                <Text style={styles.tempValue}>--</Text>
                <Text style={styles.weatherCondition}>Weather unavailable</Text>
              </View>
            </View>
          )}
        </View>

        {/* Best Crop Suggestion - Top 3 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ChartLine size={26} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>🌾 Top Crop Suggestions</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose a crop to get N–P₂O₅–K₂O rates and commercial fertilizer options from your latest soil
            test (N, P, K, pH) and the selected crop.
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
                    farmingSessionActive && styles.cropSuggestionCardDisabled,
                  ]}
                  onPress={() => {
                    if (farmingSessionActive) return;
                    setSelectedCrop(crop.crop_class);
                  }}
                  activeOpacity={farmingSessionActive ? 1 : 0.7}
                  disabled={farmingSessionActive}
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
                    {Math.round(crop.probability * 100)}% match
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Complete a soil health test for this farm to see crop recommendations.
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
            Recommendations use BSWM-style rules: your readings are classified (Low / Medium / High), then
            matched to this crop’s rate table. Always follow product labels and local extension
            advice.
          </Text>

          {!selectedCrop ? (
            <View style={styles.fertilizerEmptyCard}>
              <FlaskConical size={28} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Select a crop first</Text>
              <Text style={styles.fertilizerEmptyBody}>
                Tap one of the top crop suggestions. We’ll send your soil N, P, K, pH and that crop to the
                ML service for a full recommendation.
              </Text>
            </View>
          ) : !soilHealthForDisplay ? (
            <View style={styles.fertilizerEmptyCard}>
              <FlaskConical size={28} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Soil data needed</Text>
              <Text style={styles.fertilizerEmptyBody}>
                Add or update a soil health test for this farm. N, P, K, and pH from your latest reading are
                required for fertilizer rates.
              </Text>
            </View>
          ) : fertilizerLoading ? (
            <View style={styles.fertilizerLoadingBlock}>
              <ActivityIndicator size="small" color={colors.primary} />
              <View style={styles.fertilizerLoadingCopy}>
                <Text style={styles.fertilizerLoadingTitle}>Analyzing your soil…</Text>
                <Text style={styles.fertilizerLoadingSub}>
                  Matching {selectedCrop} with your latest readings.
                </Text>
              </View>
            </View>
          ) : fertilizerError ? (
            <View style={styles.fertilizerEmptyCard}>
              <Info size={28} color={colors.warning} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Couldn’t load a suggestion</Text>
              <Text style={styles.fertilizerEmptyBody}>{fertilizerError}</Text>
              <Text style={styles.fertilizerEmptyHint}>
                Check your connection and ML service settings, then try selecting the crop again.
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
                      <Text style={styles.fertilizerEmptyTitle}>No crop calendar in response</Text>
                      <Text style={styles.fertilizerEmptyBody}>
                        The fertilizer model did not return a usable{' '}
                        <Text style={styles.sectionDescriptionEm}>farming_timeline</Text> (phases and
                        total_days). Update the model service or try again.
                      </Text>
                    </View>
                  );
                }
                const ymd = (farmingSessionCycleStartYmd ||
                  ft.cycle_start_date?.trim() ||
                  localTodayYmd()) as string;
                const cycleStart = parseYmdLocal(ymd);
                if (!cycleStart) {
                  return (
                    <View style={[styles.fertilizerEmptyCard, styles.timelineWrap]}>
                      <Info size={28} color={colors.warning} strokeWidth={2} />
                      <Text style={styles.fertilizerEmptyTitle}>Invalid cycle start date</Text>
                      <Text style={styles.fertilizerEmptyBody}>
                        Could not parse Day 1 ({ymd}). Check cycle_start_date from the session or model.
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
                const footnote = farmingSessionCycleStartYmd
                  ? `From model: template_id “${ft.template_id}”, ${ft.total_days}-day cycle. Day 1 = ${ymd} (when farming started).`
                  : `From model: template_id “${ft.template_id}”, ${ft.total_days}-day cycle. Day 1 = ${ymd} (preview uses today until you start farming).`;
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
                Classified from your N, P, and K readings (Low / Medium / High).
              </Text>
              <View style={styles.fertNpkRow}>
                {(
                  [
                    { key: 'nitrogen' as const, symbol: 'N' },
                    { key: 'phosphorus' as const, symbol: 'P' },
                    { key: 'potassium' as const, symbol: 'K' },
                  ] as const
                ).map(({ key, symbol }) => {
                  const status = fertilizerData[key];
                  const badge = healthStatusBadge(status);
                  return (
                    <View key={key} style={styles.fertNpkPill}>
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
                  <Text style={styles.fertRowLabel}>Recommended N–P₂O₅–K₂O (kg/ha)</Text>
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
                <Text style={styles.fertOptionTitle}>Mode of application</Text>
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
                  Decision support only. Confirm soil needs with a lab or agronomist before buying or
                  applying fertilizer.
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.fertilizerEmptyCard}>
              <FlaskConical size={28} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>No result yet</Text>
              <Text style={styles.fertilizerEmptyBody}>
                Try tapping your crop again in a moment. If this keeps happening, the model may be
                temporarily unavailable.
              </Text>
            </View>
          )}
        </View>

        {!farmingSessionActive ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Play size={26} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Start farming</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Save your current soil readings, selected crop, and fertilizer recommendation to the Tanim API.
            </Text>
            <TouchableOpacity
              style={[
                styles.startFarmingButton,
                (!canStartFarming || startFarmingSaving || !farmerId) && styles.startFarmingButtonDisabled,
              ]}
              disabled={!canStartFarming || startFarmingSaving || !farmerId}
              onPress={onStartFarming}
              activeOpacity={0.85}
            >
              {startFarmingSaving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Play size={20} color={colors.primaryForeground} strokeWidth={2.2} />
                  <Text style={styles.startFarmingButtonText}>Save plan & start farming</Text>
                </>
              )}
            </TouchableOpacity>
            {!farmerId ? (
              <Text style={styles.startFarmingHint}>Farmer account required to save to the server.</Text>
            ) : !canStartFarming ? (
              <Text style={styles.startFarmingHint}>
                Select a crop and wait for the fertilizer recommendation to load.
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
  statusText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  progressBar: {
    height: 10,
    backgroundColor: colors.muted,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  healthCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
  },
  healthValueMain: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
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
