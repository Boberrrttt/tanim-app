import React, { useState, useEffect } from 'react';
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
  Umbrella,
  Droplet,
  Wind,
  Clover,
  BrainCircuit,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GetWeatherToday } from '@/services/weather.service';
import { getSoilHealth } from '@/services/soil-health.service';
import { getFarms } from '@/services/farm.service';
import { predict } from '@/services/ml.service';
import { fontFamily, radius, colors } from '@/constants/design-tokens';
import { IFarm } from '@/types/farm.types';
import { ISoilHealth } from '@/types/soil-health.types';

interface WeatherData {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  temperature: number;
  feels_like?: number;
  humidity: number;
  pressure?: number;
  description: string;
  wind_speed: number;
  wind_direction?: number;
  visibility?: number;
  timestamp?: number;
}

interface CropProbability {
  crop_class: string;
  probability: number;
}

const getFertilizerRecommendation = (crop: string) => {
  const cropLower = crop.toLowerCase();
  const recommendations: Record<string, { name: string; amount: string; timing: string; note: string }[]> = {
    corn: [
      { name: 'NPK 14-14-14', amount: '200 kg per hectare', timing: 'At planting', note: 'Starter fertilizer for early growth' },
      { name: 'Urea (46-0-0)', amount: '100 kg per hectare', timing: '40 days after planting', note: 'Top-dressing for grain fill' },
      { name: 'Organic compost', amount: '5 tons per hectare', timing: '2 weeks before planting', note: 'Improves soil structure' },
    ],
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

const HealthCard = ({
  element,
  symbol,
  percent,
  status,
  statusColor,
  actualValue,
  unit,
  maxValue,
}: {
  element: string;
  symbol: string;
  percent: number;
  status: string;
  statusColor: string;
  actualValue: string;
  unit: string;
  maxValue: string;
}) => (
  <View style={styles.healthCard}>
    <View style={styles.healthCardHeader}>
      <View style={styles.healthCardTitle}>
        <Text style={styles.healthSymbol}>{symbol}</Text>
        <Text style={styles.healthElement}>{element}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{status}</Text>
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

export default function FarmDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [farm, setFarm] = useState<IFarm | null>(null);
  const [soilHealth, setSoilHealth] = useState<ISoilHealth | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [topCrops, setTopCrops] = useState<CropProbability[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const todayIs = `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      setSelectedCrop(null);
      try {
        const [farmsRes, soilRes] = await Promise.all([
          getFarms(),
          getSoilHealth({ farm_id: id }).catch(() => ({ data: [] })),
        ]);

        const farms = farmsRes?.data || [];
        const foundFarm = farms.find((f: IFarm) => f.farm_id === id);
        setFarm(foundFarm || null);

        const soilData = soilRes?.data?.[0] ?? null;
        setSoilHealth(soilData);

        if (foundFarm?.farm_location) {
          try {
            const weatherRes = await GetWeatherToday(
              foundFarm.farm_location.latitude,
              foundFarm.farm_location.longitude
            );
            setWeather(weatherRes?.data ?? weatherRes ?? null);
          } catch {
            setWeather(null);
          }
        }

        if (soilData) {
          try {
            const features = [
              soilData.nitrogen,
              soilData.phosphorus,
              soilData.potassium,
              soilData.ph,
              soilData.salinity,
              soilData.temperature,
              soilData.moisture,
            ];
            const predRes = await predict(features, id);
            const data = predRes?.data ?? predRes;
            const probs = data?.probabilities ?? [];
            const sorted = [...probs].sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
            const top3 = sorted.slice(0, 3);
            setTopCrops(top3);
          } catch (err) {
            console.error('Error fetching crop prediction:', err);
            setTopCrops([]);
          }
        } else {
          setTopCrops([]);
        }
      } catch (error) {
        console.error('Error loading farm details:', error);
        Alert.alert(
          'Error',
          'Could not load farm details. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#84c059" />
          <Text style={styles.loadingText}>Loading farm details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasCropSuggestion = topCrops.length > 0;
  const fertilizerAdvice = selectedCrop ? getFertilizerRecommendation(selectedCrop) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{farm?.farm_name ?? 'Farm Details'}</Text>
        <Text style={styles.headerSubtitle}>{farm?.farm_measurement} hectares</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Soil Health */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ChartLine size={28} color="#84c059" />
              <Text style={styles.sectionTitle}>Soil Health</Text>
          </View>

          {soilHealth ? (
            <>
              <View style={styles.healthGrid}>
                <HealthCard
                  element="Nitrogen"
                  symbol="𝐍"
                  percent={soilHealth.nitrogen}
                  status="Good"
                  statusColor="#d1fae5"
                  actualValue={soilHealth.nitrogen?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Phosphorus"
                  symbol="𝐏"
                  percent={soilHealth.phosphorus}
                  status="Good"
                  statusColor="#d1fae5"
                  actualValue={soilHealth.phosphorus?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Potassium"
                  symbol="𝐊"
                  percent={soilHealth.potassium}
                  status="Good"
                  statusColor="#d1fae5"
                  actualValue={soilHealth.potassium?.toString() ?? '0'}
                  unit="mg/kg"
                  maxValue="100"
                />
                <HealthCard
                  element="Salinity"
                  symbol="🧂"
                  percent={soilHealth.salinity * 15}
                  status="Low"
                  statusColor="#dbeafe"
                  actualValue={soilHealth.salinity?.toString() ?? '0'}
                  unit=" dS/m"
                  maxValue="6.5"
                />
                <HealthCard
                  element="pH"
                  symbol="🧪"
                  percent={soilHealth.ph * 10}
                  status="Good"
                  statusColor="#d1fae5"
                  actualValue={soilHealth.ph?.toString() ?? '0'}
                  unit=" pH"
                  maxValue="10"
                />
                <HealthCard
                  element="Moisture"
                  symbol="💧"
                  percent={soilHealth.moisture}
                  status="Good"
                  statusColor="#d1fae5"
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
            <Umbrella size={28} color="#84c059" />
            <Text style={styles.sectionTitle}>Weather Today</Text>
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
                    <Droplet size={16} color="#6b7280" />
                    <Text style={styles.weatherDetailText}>{weather.humidity}% Humidity</Text>
                  </View>
                  <View style={styles.weatherDetailItem}>
                    <Wind size={16} color="#6b7280" />
                    <Text style={styles.weatherDetailText}>{weather.wind_speed} km/h Wind</Text>
                  </View>
                </View>
              </View>
              <View style={styles.weatherRecommendation}>
                <View style={styles.recommendationHeader}>
                  <BrainCircuit size={22} color="#84c059" />
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
            <ChartLine size={28} color="#84c059" />
            <Text style={styles.sectionTitle}>Top Crop Suggestions</Text>
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
            <Clover size={28} color="#84c059" />
            <Text style={styles.sectionTitle}>
              Fertilizer Advice {selectedCrop ? `for ${selectedCrop}` : ''}
            </Text>
          </View>

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
    backgroundColor: '#f3eee6',
  },
  headerContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: fontFamily.bold,
    color: '#000',
  },
  sectionDescription: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#4a5568',
    lineHeight: 22,
  },
  healthGrid: {
    gap: 12,
  },
  healthCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: '#065f46',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#84c059',
    borderRadius: 5,
  },
  healthCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthValue: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: '#6b7280',
  },
  healthValueMain: {
    fontSize: 14,
    fontFamily: fontFamily.semibold,
    color: '#84c059',
  },
  summaryBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#84c059',
    gap: 8,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryIcon: {
    fontSize: 20,
  },
  summaryTitle: {
    fontSize: 17,
    fontFamily: fontFamily.semibold,
    color: '#000',
  },
  summaryText: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#4a5568',
    lineHeight: 22,
  },
  emptyCard: {
    padding: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#6b7280',
    textAlign: 'center',
  },
  weatherDate: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: '#4a5568',
  },
  weatherCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
    fontSize: 24,
    fontFamily: fontFamily.semibold,
    color: '#000',
  },
  weatherCondition: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: '#6b7280',
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
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#6b7280',
  },
  weatherRecommendation: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#84c059',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendationTitle: {
    fontSize: 17,
    fontFamily: fontFamily.semibold,
    color: '#166534',
  },
  recommendationText: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#15803d',
    lineHeight: 22,
  },
  suggestionHero: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#fafaf9',
  },
  suggestionHeroActive: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f7fee7',
  },
  suggestionHeroEmpty: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  suggestionHeroTopBar: {
    height: 5,
    backgroundColor: '#84c059',
  },
  suggestionHeroTopBarMuted: {
    backgroundColor: '#d1d5db',
  },
  suggestionHeroInner: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 6,
  },
  suggestionKicker: {
    fontSize: 10,
    fontFamily: fontFamily.semibold,
    color: '#4d7c0f',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  suggestionKickerMuted: {
    color: '#9ca3af',
  },
  suggestionTitle: {
    fontSize: 24,
    fontFamily: fontFamily.bold,
    color: '#14532d',
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  suggestionTitleEmpty: {
    fontSize: 19,
    fontFamily: fontFamily.semibold,
    color: '#9ca3af',
    letterSpacing: 0,
    lineHeight: 28,
  },
  suggestionFootnote: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#4b5563',
    lineHeight: 22,
    marginTop: 6,
  },
  suggestionFootnoteWithRule: {
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(132, 192, 89, 0.35)',
  },
  suggestionFootnoteMuted: {
    color: '#9ca3af',
  },
  cropSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cropSuggestionCardSelected: {
    borderColor: '#84c059',
    backgroundColor: '#f7fee7',
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
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropRankBadgeSelected: {
    backgroundColor: '#84c059',
  },
  cropRankText: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: '#374151',
  },
  cropRankTextSelected: {
    color: '#ffffff',
  },
  cropSuggestionName: {
    fontSize: 17,
    fontFamily: fontFamily.semibold,
    color: '#1f2937',
  },
  cropSuggestionNameSelected: {
    color: '#14532d',
  },
  cropProbability: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: '#6b7280',
  },
  fertilizerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#84c059',
  },
  fertilizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  fertilizerName: {
    fontSize: 17,
    fontFamily: fontFamily.semibold,
    color: '#000',
  },
  fertilizerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  fertilizerDetail: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#4a5568',
  },
  fertilizerLabel: {
    fontFamily: fontFamily.semibold,
    color: '#374151',
  },
  fertilizerNote: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#6b7280',
    lineHeight: 20,
  },
});
