import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isAbortLikeError } from '@/services/api';
import {
  predictFertilizer,
  type FertilizerPredictData,
} from '@/services/ml.service';
import { useFarmDetailData } from '@/hooks/use-farm-detail-data';
import { fontFamily, fontSize, radius, colors, spacing, shadow } from '@/constants/design-tokens';
import FarmingTimeline from '@/components/FarmingTimeline';
import {
  getCropCycleMeta,
  getCurrentCycleDay,
  getCycleEndDate,
  getDefaultPlannedPlantingDate,
} from '@/constants/crop-cycle';

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

/** Human-readable label from model class (underscores, casing). */
function formatFertilizerClassName(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  return s
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function primaryFertilizerConfidence(data: FertilizerPredictData): number | null {
  const match = data.probabilities?.find(
    (p) => p.fertilizer_class === data.prediction
  );
  const p = match?.probability ?? data.probabilities?.[0]?.probability;
  return typeof p === 'number' && Number.isFinite(p) ? p : null;
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
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [fertilizerLoading, setFertilizerLoading] = useState(false);
  const [fertilizerData, setFertilizerData] = useState<FertilizerPredictData | null>(null);
  const [fertilizerError, setFertilizerError] = useState<string | null>(null);

  const { farm, soilHealth, weather, topCrops, farmsError, isInitialLoading } = useFarmDetailData(id);

  const todayIs = `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;

  useEffect(() => {
    setSelectedCrop(null);
  }, [id]);

  useEffect(() => {
    setFertilizerData(null);
    setFertilizerError(null);
    if (!selectedCrop || !soilHealth || !id) {
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
            nitrogen: soilHealth.nitrogen,
            phosphorus: soilHealth.phosphorus,
            potassium: soilHealth.potassium,
            ph: soilHealth.ph,
            temperature: soilHealth.temperature,
            ec: soilHealth.salinity,
            moisture: soilHealth.moisture,
            farm_id: id,
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
  }, [selectedCrop, soilHealth, id]);

  useEffect(() => {
    if (!farmsError || isAbortLikeError(farmsError)) return;
    console.error('Error loading farm details:', farmsError);
    Alert.alert('Error', 'Could not load farm details. Please try again.');
  }, [farmsError]);

  const cycleStartDate = useMemo(() => {
    if (!selectedCrop) return null;
    return getDefaultPlannedPlantingDate();
  }, [selectedCrop]);

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

  const cropCycleMeta = selectedCrop ? getCropCycleMeta(selectedCrop) : null;
  const cycleEndDate =
    cycleStartDate && cropCycleMeta
      ? getCycleEndDate(cycleStartDate, cropCycleMeta.totalDays)
      : null;
  const cycleDay =
    cycleStartDate && cropCycleMeta
      ? getCurrentCycleDay(cycleStartDate, cropCycleMeta.totalDays)
      : 0;

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

        {/* Soil Health */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ChartLine size={26} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>🧪 Soil Health</Text>
          </View>

          {soilHealth ? (
            <>
              <View style={styles.healthGrid}>
                <HealthCard
                  element="Nitrogen"
                  symbol="𝐍"
                  percent={soilHealth.nitrogen}
                  status="Good"
                  actualValue={soilHealth.nitrogen?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Phosphorus"
                  symbol="𝐏"
                  percent={soilHealth.phosphorus}
                  status="Good"
                  actualValue={soilHealth.phosphorus?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Potassium"
                  symbol="𝐊"
                  percent={soilHealth.potassium}
                  status="Good"
                  actualValue={soilHealth.potassium?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Salinity"
                  symbol="🧂"
                  percent={soilHealth.salinity * 15}
                  status="Low"
                  actualValue={soilHealth.salinity?.toString() ?? '0'}
                  unit=" dS/m"
                  maxValue="6.5"
                />
                <HealthCard
                  element="pH"
                  symbol="🧪"
                  percent={soilHealth.ph * 10}
                  status="Good"
                  actualValue={soilHealth.ph?.toString() ?? '0'}
                  unit=" pH"
                  maxValue="10"
                />
                <HealthCard
                  element="Moisture"
                  symbol="💧"
                  percent={soilHealth.moisture}
                  status="Good"
                  actualValue={soilHealth.moisture?.toString() ?? '0'}
                  unit="%"
                  maxValue="100"
                />
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryIcon}>💡</Text>
                <Text style={styles.summaryTitle}>Quick summary</Text>
                <Text style={styles.summaryText}>Good for vegetables. Soil holds water well.</Text>
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
            Choose a crop to see a fertilizer-style hint based on your latest soil test (N, P, K, pH,
            EC, temperature, and moisture).
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
                  ]}
                  onPress={() => setSelectedCrop(crop.crop_class)}
                  activeOpacity={0.7}
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
            The model suggests a fertilizer <Text style={styles.sectionDescriptionEm}>category</Text> from
            your current soil readings and the crop you selected—not exact bag rates. Use the timeline
            above for timing; always follow product labels and local extension advice.
          </Text>

          {selectedCrop && cropCycleMeta && cycleStartDate && cycleEndDate ? (
            <View style={styles.timelineWrap}>
              <FarmingTimeline
                cropName={selectedCrop}
                cycleStartDate={cycleStartDate}
                cycleEndDate={cycleEndDate}
                totalDays={cropCycleMeta.totalDays}
                currentDay={cycleDay}
                phases={cropCycleMeta.phases}
                plantingWindowNote={cropCycleMeta.plantingWindowNote}
              />
            </View>
          ) : null}

          {!selectedCrop ? (
            <View style={styles.fertilizerEmptyCard}>
              <FlaskConical size={28} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Select a crop first</Text>
              <Text style={styles.fertilizerEmptyBody}>
                Tap one of the top crop suggestions. We’ll pair that choice with your soil test to
                suggest a fertilizer type.
              </Text>
            </View>
          ) : !soilHealth ? (
            <View style={styles.fertilizerEmptyCard}>
              <FlaskConical size={28} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={styles.fertilizerEmptyTitle}>Soil data needed</Text>
              <Text style={styles.fertilizerEmptyBody}>
                Add or update a soil health test for this farm. The model needs N, P, K, pH, salinity,
                temperature, and moisture to suggest a fertilizer category.
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
              <View style={styles.fertilizerPredictionHero}>
                <View style={styles.fertilizerHeroBadge}>
                  <Text style={styles.fertilizerHeroBadgeText}>Best match</Text>
                </View>
                <Text style={styles.fertilizerPredictionValue}>
                  {formatFertilizerClassName(fertilizerData.prediction)}
                </Text>
                {(() => {
                  const conf = primaryFertilizerConfidence(fertilizerData);
                  if (conf == null) return null;
                  return (
                    <View style={styles.fertilizerConfidencePill}>
                      <Text style={styles.fertilizerConfidencePillText}>
                        Model confidence ~{Math.round(conf * 100)}%
                      </Text>
                    </View>
                  );
                })()}
                <Text style={styles.fertilizerPredictionHint}>
                  Suggested category for {selectedCrop} given your soil test—not a prescription for
                  application rate or timing alone.
                </Text>
              </View>
              {(fertilizerData.probabilities?.length ?? 0) > 0 ? (
                <>
                  <Text style={styles.fertilizerSubheading}>Other likely categories</Text>
                  <Text style={styles.fertilizerSubheadingHint}>
                    How strongly the model favors each option (top three).
                  </Text>
                </>
              ) : null}
              {fertilizerData.probabilities?.map((item, index) => {
                const pct = Math.round(Math.min(1, Math.max(0, item.probability)) * 100);
                return (
                  <View
                    key={`${item.fertilizer_class}-${index}`}
                    style={styles.fertilizerAltCard}
                  >
                    <View style={styles.fertilizerAltTop}>
                      <View style={styles.fertilizerAltLeft}>
                        <View style={styles.fertilizerAltRank}>
                          <Text style={styles.fertilizerAltRankText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.fertilizerAltName} numberOfLines={2}>
                          {formatFertilizerClassName(item.fertilizer_class)}
                        </Text>
                      </View>
                      <Text style={styles.fertilizerAltPct}>{pct}%</Text>
                    </View>
                    <View style={styles.fertilizerBarTrack}>
                      <View style={[styles.fertilizerBarFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                );
              })}
              <View style={styles.fertilizerDisclaimer}>
                <Info size={16} color={colors.mutedForeground} strokeWidth={2} />
                <Text style={styles.fertilizerDisclaimerText}>
                  This is a decision-support hint from machine learning. Confirm soil needs with a lab or
                  agronomist before buying or applying fertilizer.
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
  summaryBox: {
    backgroundColor: colors.primaryAlpha10,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  summaryIcon: {
    fontSize: 20,
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
  },
  summaryText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 22,
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
  fertilizerPredictionHero: {
    backgroundColor: colors.primaryAlpha10,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fertilizerHeroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  fertilizerHeroBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.primaryForeground,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  fertilizerPredictionValue: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.greenDark,
    letterSpacing: -0.3,
  },
  fertilizerConfidencePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fertilizerConfidencePillText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.foreground,
  },
  fertilizerPredictionHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  fertilizerSubheading: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  fertilizerSubheadingHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  fertilizerAltCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  fertilizerAltTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  fertilizerAltLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  fertilizerAltRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryAlpha10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fertilizerAltRankText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  fertilizerAltName: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    lineHeight: 22,
  },
  fertilizerAltPct: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.greenDark,
  },
  fertilizerBarTrack: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fertilizerBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
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
