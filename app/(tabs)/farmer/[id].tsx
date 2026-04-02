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
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isAbortLikeError } from '@/services/api';
import { useFarmDetailData } from '@/hooks/use-farm-detail-data';
import { fontFamily, fontSize, radius, colors, spacing, shadow } from '@/constants/design-tokens';
import FarmingTimeline from '@/components/FarmingTimeline';
import {
  getCropCycleMeta,
  getCurrentCycleDay,
  getCycleEndDate,
  getDefaultPlannedPlantingDate,
} from '@/constants/crop-cycle';

const getFertilizerRecommendation = (crop: string) => {
  const cropLower = crop.toLowerCase();
  const cornAdvice = [
    { name: 'NPK 14-14-14', amount: '200 kg per hectare', timing: 'At planting', note: 'Starter fertilizer for early growth' },
    { name: 'Urea (46-0-0)', amount: '100 kg per hectare', timing: '40 days after planting', note: 'Top-dressing for grain fill' },
    { name: 'Organic compost', amount: '5 tons per hectare', timing: '2 weeks before planting', note: 'Improves soil structure' },
  ];
  const recommendations: Record<string, { name: string; amount: string; timing: string; note: string }[]> = {
    corn: cornAdvice,
    maize: cornAdvice,
    eggplant: [
      { name: 'NPK 14-14-14', amount: '150 kg per hectare', timing: 'At transplanting', note: 'Balanced nutrition for fruiting' },
      { name: 'Organic compost', amount: '3 tons per hectare', timing: 'Before planting', note: 'Adds organic matter' },
      { name: 'Potassium sulfate', amount: '50 kg per hectare', timing: 'At flowering', note: 'Improves fruit quality' },
    ],
    tobacco: [
      { name: 'NPK 12-12-17', amount: '250 kg per hectare', timing: 'At transplanting', note: 'Tobacco-specific blend' },
      { name: 'Urea', amount: '50 kg per hectare', timing: '4 weeks after transplanting', note: 'Nitrogen for leaf growth' },
      { name: 'Potassium chloride', amount: '75 kg per hectare', timing: '6 weeks after transplanting', note: 'Enhances leaf quality' },
    ],
    rice: [
      { name: 'Urea', amount: '90 kg per hectare', timing: 'At transplanting', note: 'Nitrogen for tillering' },
      { name: 'NPK 14-14-14', amount: '100 kg per hectare', timing: '15 days after transplanting', note: 'Complete nutrition' },
      { name: 'Ammonium phosphate', amount: '50 kg per hectare', timing: 'At flowering', note: 'Boosts grain yield' },
    ],
    tomato: [
      { name: 'NPK 14-14-14', amount: '150 kg per hectare', timing: 'At transplanting', note: 'Balanced starter' },
      { name: 'Calcium nitrate', amount: '30 kg per hectare', timing: 'At fruiting', note: 'Prevents blossom end rot' },
      { name: 'Organic compost', amount: '4 tons per hectare', timing: 'Before planting', note: 'Improves moisture retention' },
    ],
    sugarcane: [
      { name: 'NPK 15-15-15', amount: '300 kg per hectare', timing: 'At planting', note: 'Heavy feeder crop' },
      { name: 'Urea', amount: '150 kg per hectare', timing: '60 days after planting', note: 'Nitrogen for stalk growth' },
      { name: 'Potassium chloride', amount: '100 kg per hectare', timing: '90 days after planting', note: 'Sugar accumulation' },
    ],
    cabbage: [
      { name: 'NPK 14-14-14', amount: '120 kg per hectare', timing: 'At transplanting', note: 'Balanced nutrition' },
      { name: 'Organic compost', amount: '4 tons per hectare', timing: 'Before planting', note: 'Improves soil' },
      { name: 'Urea', amount: '40 kg per hectare', timing: '3 weeks after transplanting', note: 'Leaf development' },
    ],
    cotton: [
      { name: 'NPK 20-20-0', amount: '150 kg per hectare', timing: 'At planting', note: 'Starter fertilizer' },
      { name: 'Urea', amount: '100 kg per hectare', timing: '45 days after planting', note: 'Boll development' },
      { name: 'Potassium sulfate', amount: '60 kg per hectare', timing: 'At flowering', note: 'Fiber quality' },
    ],
    potato: [
      { name: 'NPK 14-14-14', amount: '200 kg per hectare', timing: 'At planting', note: 'Tuber initiation' },
      { name: 'Organic compost', amount: '5 tons per hectare', timing: '2 weeks before planting', note: 'Soil conditioning' },
      { name: 'Potassium chloride', amount: '80 kg per hectare', timing: 'At tuber bulking', note: 'Yield boost' },
    ],
    wheat: [
      { name: 'NPK 15-15-15', amount: '100 kg per hectare', timing: 'At planting or basal', note: 'Balanced starter for cereals' },
      { name: 'Urea', amount: '80 kg per hectare', timing: 'Tillering stage', note: 'Nitrogen for tiller development' },
      { name: 'Urea', amount: '60 kg per hectare', timing: 'Heading / boot', note: 'Top-dress if recommended locally' },
    ],
    default: [
      { name: 'NPK 14-14-14', amount: '50 kg per hectare', timing: 'Use when planting', note: 'Good for plant growth' },
      { name: 'Organic compost', amount: '2 tons per hectare', timing: '2 weeks before planting', note: 'Makes soil better' },
      { name: 'Urea', amount: '25 kg per hectare', timing: '4 weeks after planting', note: 'Adds nitrogen for fruits' },
    ],
  };
  const key = Object.keys(recommendations).find((k) => cropLower.includes(k)) ?? 'default';
  return recommendations[key];
};

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

  const { farm, soilHealth, weather, topCrops, farmsError, isInitialLoading } = useFarmDetailData(id);

  const todayIs = `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;

  useEffect(() => {
    setSelectedCrop(null);
  }, [id]);

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
  const fertilizerAdvice = selectedCrop ? getFertilizerRecommendation(selectedCrop) : null;

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
            Tap a crop to see fertilizer recommendations.
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

        {/* Fertilizer Advice - Generated per selected crop */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clover size={26} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>
              Fertilizer Advice {selectedCrop ? `for ${selectedCrop}` : ''}
            </Text>
          </View>

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

          {fertilizerAdvice ? (
            fertilizerAdvice.map((fert) => (
              <View key={fert.name} style={styles.fertilizerCard}>
                <View style={styles.fertilizerHeader}>
                  <Text style={styles.fertilizerName}>{fert.name}</Text>
                </View>
                <View style={styles.fertilizerDetails}>
                  <Text style={styles.fertilizerDetail}>
                    <Text style={styles.fertilizerLabel}>Amount: </Text>{fert.amount}
                  </Text>
                  <Text style={styles.fertilizerDetail}>
                    <Text style={styles.fertilizerLabel}>When: </Text>{fert.timing}
                  </Text>
                </View>
                <Text style={styles.fertilizerNote}>{fert.note}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Tap a crop above to see fertilizer recommendations.
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
  fertilizerCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  fertilizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  fertilizerName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
  },
  fertilizerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  fertilizerDetail: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
  },
  fertilizerLabel: {
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
  },
  fertilizerNote: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});
