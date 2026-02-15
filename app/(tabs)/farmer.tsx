import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout,
  MapPin,
  ChartLine,
  Umbrella,
  Leaf,
  Droplet,
  Wind,
  Clover,
  Pickaxe,
  BrainCircuit,
  Globe,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getFarms } from '../../services/farm.service';
import { GetWeatherToday } from '../../services/weather.service';
import { getSoilHealth } from '@/services/soil-health.service';
import { predict } from '@/services/ml.service';
import { IFarm } from '../../types/farm.types';
import { ISoilHealth } from '@/types/soil-health.types';

// ... rest of the code remains the same ...
interface WeatherData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  description: string;
  wind_speed: number;
  wind_direction: number;
  visibility: number;
  timestamp: number;
}

const FarmerScreen = () => {
  const router = useRouter();
  const [language, setLanguage] = useState<'English' | 'Filipino'>('English');
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [showSoilWeather, setShowSoilWeather] = useState(false);
  const [showCrops, setShowCrops] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [soilHealth, setSoilHealth] = useState<ISoilHealth | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [farms, setFarms] = useState<IFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{
    prediction: string;
    probabilities?: { crop_class: string; probability: number }[];
  } | null>(null);

  useEffect(() => {
    const getDetails = async () => {
      try {
        setLoading(true);
        const farmsResponse = await getFarms();
        const farmsData = farmsResponse?.data || [];
        setFarms(farmsData);
        
        if (farmsData.length > 0) {
          // Get weather for first farm
          const firstFarm = farmsData[0];
          if (firstFarm?.farm_location) {
            const weather = await GetWeatherToday(
              firstFarm.farm_location.latitude, 
              firstFarm.farm_location.longitude
            );
            setWeather(weather);
          }
          
          // Get soil health for first farm
          if (firstFarm?.farm_id) {
            const soilHealthResponse = await getSoilHealth({farm_id: firstFarm.farm_id});
            setSoilHealth(soilHealthResponse?.data?.[0] || null);
          }
        }
      } catch (error) {
        console.error('Error fetching farm details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getDetails();
  }, [])


  
  const translations = {
    English: {
      welcome: 'Hello, Farmer!',
      logout: 'Logout',
      step1: 'Step 1',
      step2: 'Step 2',
      step3: 'Step 3',
      myFarms: 'My Farms',
      selectFarmDetails: 'Tap your farm to see recommendations.',
      selectFarmButton: 'Continue',
      soilHealth: 'Soil Health',
      summary: 'Quick summary',
      lowSalinity: 'Good for vegetables. Soil holds water well.',
      weatherForecast: 'Weather Today',
      todayIs: `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
      generateAIPlan: 'Get Crop Suggestions',
      generatingPlan: 'Getting suggestions...',
      recommendedCrops: 'Best Crops for Your Land',
      selectStartingCrop: 'Tap one crop to see fertilizer advice.',
      selectCropButton: 'Continue',
      fertilizerSuggestions: 'Fertilizer Advice',
      startFarming: 'Done',
      loadingFarms: 'Loading...',
      noFarms: 'No farms yet. Add a farm to start.',
      good: 'Good',
      moderate: 'Moderate',
      excellent: 'Excellent',
      low: 'Low',
      optimal: 'Optimal',
    },
    Filipino: {
      welcome: 'Kumusta, Magsasaka!',
      logout: 'Logout',
      step1: 'Hakbang 1',
      step2: 'Hakbang 2',
      step3: 'Hakbang 3',
      myFarms: 'Aking mga Bukid',
      selectFarmDetails: 'Pindutin ang iyong bukid para makita ang mungkahi.',
      selectFarmButton: 'Magpatuloy',
      soilHealth: 'Kalusugan ng Lupa',
      summary: 'Buod',
      lowSalinity: 'Maganda para sa gulay. Maganda ang lupa.',
      weatherForecast: 'Panahon Ngayon',
      todayIs: `Ngayon: ${new Date().toLocaleDateString('fil-PH', { weekday: 'long', month: 'short', day: 'numeric' })}`,
      generateAIPlan: 'Kumuha ng Mungkahing Pananim',
      generatingPlan: 'Kumukuha ng mungkahi...',
      recommendedCrops: 'Pinakamagandang Pananim sa Iyong Lupa',
      selectStartingCrop: 'Pindutin ang isang pananim para makita ang pataba.',
      selectCropButton: 'Magpatuloy',
      fertilizerSuggestions: 'Payo sa Pataba',
      startFarming: 'Tapos',
      loadingFarms: 'Naglo-load...',
      noFarms: 'Walang bukid. Magdagdag ng bukid para magsimula.',
      good: 'Maganda',
      moderate: 'Katamtaman',
      excellent: 'Mahusay',
      low: 'Mababa',
      optimal: 'Optimal',
    },
  };

  const t = translations[language];

  // Helper function to convert Kelvin to Celsius
  const kelvinToCelsius = (kelvin: number) => Math.round(kelvin - 273.15);

  // Helper function to get weather emoji based on description
  const getWeatherEmoji = (description: string) => {
    const desc = description?.toLowerCase();
    if (desc?.includes('clear')) return '☀️';
    if (desc?.includes('cloud')) return '⛅';
    if (desc?.includes('rain')) return '🌧️';
    if (desc?.includes('snow')) return '❄️';
    if (desc?.includes('thunder')) return '⛈️';
    if (desc?.includes('mist') || desc?.includes('fog')) return '🌫️';
    return '☀️'; // default
  };

  // Helper function to get weather recommendation
  const getWeatherRecommendation = (description: string, tempCelsius: number, humidity: number) => {
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

  const crops = [
    {
      id: 'tomato',
      name: 'Tomato',
      icon: '🍅',
      category: 'Fruit Vegetable',
      description: 'Thrives in clay-loam soil with good drainage. High potassium supports fruit development.',
    },
    {
      id: 'eggplant',
      name: 'Eggplant',
      icon: '🍆',
      category: 'Fruit Vegetable',
      description: 'Excellent nitrogen uptake matches your soil profile. Heat-tolerant variety perfect for current season.',
    },
  ];

  const CROP_LOOKUP: Record<string, { icon: string; description: string }> = {
    tomato: { icon: '🍅', description: 'Thrives in clay-loam soil with good drainage. High potassium supports fruit development.' },
    eggplant: { icon: '🍆', description: 'Excellent nitrogen uptake matches your soil profile. Heat-tolerant variety perfect for current season.' },
    chickpea: { icon: '🫘', description: 'Drought-tolerant legume. Fixes nitrogen in soil. Ideal for warm, dry conditions.' },
    kidneybeans: { icon: '🫘', description: 'Protein-rich legume. Prefers well-drained soil and moderate temperatures.' },
    pigeonpeas: { icon: '🫘', description: 'Drought-resistant pulse crop. Good for intercropping and soil improvement.' },
    mothbeans: { icon: '🫘', description: 'Hardy legume for arid regions. Grows well in sandy loam soils.' },
    mungbean: { icon: '🫘', description: 'Quick-growing legume. Fixes nitrogen and improves soil fertility.' },
    blackgram: { icon: '🫘', description: 'Nutritious pulse. Suited to warm climates and well-drained soils.' },
    lentil: { icon: '🫘', description: 'Cool-season legume. High protein, good for crop rotation.' },
    rice: { icon: '🍚', description: 'Staple grain. Requires flooded or irrigated conditions. Tropical to subtropical.' },
    wheat: { icon: '🌾', description: 'Cool-season cereal. Prefers temperate climate and fertile soil.' },
    cotton: { icon: '🌾', description: 'Fiber crop. Needs long warm season and adequate moisture.' },
    jute: { icon: '🌿', description: 'Fiber crop. Thrives in hot, humid conditions with plenty of water.' },
    coffee: { icon: '☕', description: 'Perennial crop. Prefers tropical highlands, shade, and well-drained soil.' },
    coconut: { icon: '🥥', description: 'Tropical palm. Needs coastal or humid tropical conditions.' },
    papaya: { icon: '🍈', description: 'Tropical fruit. Fast-growing, needs warm weather and good drainage.' },
    orange: { icon: '🍊', description: 'Citrus fruit. Prefers subtropical climate and well-drained soil.' },
    apple: { icon: '🍎', description: 'Temperate fruit. Requires cool winters and moderate summers.' },
    muskmelon: { icon: '🍈', description: 'Warm-season melon. Needs plenty of sun and well-drained soil.' },
    watermelon: { icon: '🍉', description: 'Heat-loving vine crop. Requires long warm season and sandy soil.' },
    grapes: { icon: '🍇', description: 'Vine crop. Prefers sunny slopes and well-drained soil.' },
    mango: { icon: '🥭', description: 'Tropical fruit tree. Needs warm climate and deep, fertile soil.' },
    banana: { icon: '🍌', description: 'Tropical herb. Requires warm, humid conditions and rich soil.' },
    pomegranate: { icon: '🍎', description: 'Drought-tolerant fruit. Suited to arid and semi-arid regions.' },
  };

  const handleLogout = () => {
    router.push('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'English' ? 'Filipino' : 'English');
  };

  // Generate random weather data
  const generateWeather = (): WeatherData => {
    const weatherConditions = [
      { description: 'clear sky', tempRange: { min: 28, max: 35 } },
      { description: 'partly cloudy', tempRange: { min: 25, max: 32 } },
      { description: 'cloudy', tempRange: { min: 24, max: 30 } },
      { description: 'light rain', tempRange: { min: 22, max: 28 } },
      { description: 'rain', tempRange: { min: 20, max: 26 } },
      { description: 'overcast', tempRange: { min: 23, max: 29 } },
    ];

    const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const tempCelsius = Math.floor(Math.random() * (randomCondition.tempRange.max - randomCondition.tempRange.min + 1)) + randomCondition.tempRange.min;
    const tempKelvin = tempCelsius + 273.15;
    const humidity = Math.floor(Math.random() * (90 - 50 + 1)) + 50;
    const windSpeed = Math.floor(Math.random() * (25 - 5 + 1)) + 5;

    return {
      city: 'Sample City',
      country: 'PH',
      latitude: 14.5995,
      longitude: 120.9842,
      temperature: tempKelvin,
      feels_like: tempKelvin - 5,
      humidity,
      pressure: 1013,
      description: randomCondition.description,
      wind_speed: windSpeed,
      wind_direction: Math.floor(Math.random() * 360),
      visibility: 10.0,
      timestamp: Date.now(),
    };
  };

  // Generate random soil health data
  const generateSoilHealth = (farmId: string): ISoilHealth => {
    // Different seed ranges for different farms to create variety
    const farmSeeds = {
      kalinawan: { min: 65, max: 90 },
      malasag: { min: 55, max: 85 },
    };

    const seed = farmSeeds[farmId as keyof typeof farmSeeds] || { min: 60, max: 85 };
    
    const getRandomInRange = (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const nitrogen = getRandomInRange(seed.min, seed.max);
    const phosphorus = getRandomInRange(seed.min - 10, seed.max - 10);
    const potassium = getRandomInRange(seed.min, seed.max + 5);
    const salinity = getRandomInRange(10, 30);
    const ph = parseFloat((6.0 + (getRandomInRange(60, 75) / 100 * 2.0)).toFixed(1));
    const temperature = getRandomInRange(20, 30);
    const moisture = getRandomInRange(seed.min + 5, seed.max);

    return {
      nitrogen,
      phosphorus,
      potassium,
      ph,
      salinity: parseFloat((salinity / 100 * 6.5).toFixed(1)),
      temperature,
      moisture,
      farm_id: farmId,
      classification: 'Good'
    };
  };

  const selectFarm = (farmId: string) => {
    if (selectedFarm === farmId) {
      setSelectedFarm(null);
      setShowSoilWeather(false);
      setShowCrops(false);
      setSelectedCrop(null);
      setShowSuggestions(false);
      setSoilHealth(null);
    } else {
      setSelectedFarm(farmId);
      // Generate new soil health data for the selected farm
      setSoilHealth(generateSoilHealth(farmId));
    }
  };

  const confirmFarmSelection = async () => {
    if (selectedFarm) {
      setShowSoilWeather(true);
      try {
        const selectedFarmData = farms.find(farm => farm.farm_id === selectedFarm);
        if (selectedFarmData?.farm_location) {
          const weatherData = await GetWeatherToday(
            selectedFarmData.farm_location.latitude,
            selectedFarmData.farm_location.longitude
          );
          setWeather(weatherData.data);
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        // Fallback to mock data if API fails
        setWeather(generateWeather());
      }
    }
  };

  const generateAIPlan = async () => {
    if (!soilHealth) {
      Alert.alert('Wait', 'Please tap a farm first.');
      return;
    }

    setGeneratingPlan(true);
    setPredictionResult(null);

    try {
      // Build features: [N, P, K, ph, temperature, humidity] per API schema
      const tempCelsius = weather
        ? kelvinToCelsius(weather.temperature)
        : soilHealth.temperature;
      const humidity = weather?.humidity ?? soilHealth.moisture;

      const features = [
        soilHealth.nitrogen,
        soilHealth.phosphorus,
        soilHealth.potassium,
        soilHealth.ph,
        tempCelsius,
        humidity,
      ];


      const result = await predict(features);
      const data = result.data ?? result;
      setPredictionResult({
        prediction: data.prediction ?? '',
        probabilities: data.probabilities ?? undefined,
      });
      setShowCrops(true);
    } catch (error) {
      console.error('Prediction error:', error);
      Alert.alert(
        'Try Again',
        'Could not get suggestions. Showing common crops instead.'
      );
      setShowCrops(true);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const selectCrop = (cropId: string) => {
    if (selectedCrop === cropId) {
      setSelectedCrop(null);
      setShowSuggestions(false);
    } else {
      setSelectedCrop(cropId);
    }
  };

  const confirmCropSelection = () => {
    if (selectedCrop) {
      setShowSuggestions(true);
    }
  };

  const startFarming = () => {
    Alert.alert('Saved', 'Your plan has been saved.');
  };

  const HealthCard = ({ element, symbol, percent, status, statusColor, actualValue, unit, maxValue }: any) => (
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

  const renderHomeTab = () => (
      <>
        {/* Language toggle */}
        <View style={styles.pillsContainer}>
          <TouchableOpacity style={styles.pill} onPress={toggleLanguage} activeOpacity={0.7}>
            <Globe size={20} color="#000" />
            <Text style={styles.pillText}>{language}</Text>
          </TouchableOpacity>
        </View>

        {/* Step 1: My Farms */}
        <View style={styles.section}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{t.step1}</Text>
          </View>
          <View style={styles.sectionHeader}>
            <MapPin size={28} color="#84c059" />
            <Text style={styles.sectionTitle}>{t.myFarms}</Text>
          </View>
          <Text style={styles.sectionDescription}>{t.selectFarmDetails}</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#84c059" />
              <Text style={styles.loadingText}>{t.loadingFarms}</Text>
            </View>
          ) : farms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t.noFarms}</Text>
            </View>
          ) : (
            farms?.map((farm: IFarm) => (
              <TouchableOpacity
                key={farm.farm_id}
                style={[
                  styles.farmCard,
                  selectedFarm === farm.farm_id && styles.farmCardSelected,
                ]}
                onPress={() => selectFarm(farm.farm_id)}
                activeOpacity={0.7}
              >
                <View style={styles.farmInfo}>
                  <Text style={styles.farmName}>{farm.farm_name}</Text>
                  <Text style={styles.farmDetails}>{farm.farm_measurement} hectares</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {selectedFarm && !showSoilWeather && (
          <TouchableOpacity style={styles.actionButton} onPress={confirmFarmSelection} activeOpacity={0.8}>
            <MapPin size={26} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t.selectFarmButton}</Text>
          </TouchableOpacity>
        )}

        {showSoilWeather && (
          <>
            <View style={styles.divider} />

            {/* Step 2: Soil & Weather */}
            <View style={styles.section}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{t.step2}</Text>
              </View>
              <View style={styles.sectionHeader}>
                <ChartLine size={28} color="#84c059" />
                <Text style={styles.sectionTitle}>{t.soilHealth}</Text>
              </View>
              
              <View style={styles.healthGrid}>
                {soilHealth && (
                  <>
                    <HealthCard 
                      element="Nitrogen" 
                      symbol="𝐍" 
                      percent={soilHealth.nitrogen} 
                      status="Good" 
                      statusColor="#d1fae5" 
                      actualValue={soilHealth.nitrogen?.toString()} 
                      unit="mg/kg" 
                      maxValue="100" 
                    />
                    <HealthCard 
                      element="Phosphorus" 
                      symbol="𝐏" 
                      percent={soilHealth.phosphorus} 
                      status="Good" 
                      statusColor="#d1fae5" 
                      actualValue={soilHealth.phosphorus?.toString()} 
                      unit="mg/kg" 
                      maxValue="100" 
                    />
                    <HealthCard 
                      element="Potassium" 
                      symbol="𝐊" 
                      percent={soilHealth.potassium} 
                      status="Good" 
                      statusColor="#d1fae5" 
                      actualValue={soilHealth.potassium?.toString()} 
                      unit="mg/kg" 
                      maxValue="100" 
                    />
                    <HealthCard 
                      element="Salinity" 
                      symbol="🧂" 
                      percent={soilHealth.salinity * 15} 
                      status="Low" 
                      statusColor="#dbeafe" 
                      actualValue={soilHealth.salinity?.toString()} 
                      unit=" dS/m" 
                      maxValue="6.5" 
                    />
                    <HealthCard 
                      element="pH" 
                      symbol="🧪" 
                      percent={soilHealth.ph * 10} 
                      status="Good" 
                      statusColor="#d1fae5" 
                      actualValue={soilHealth.ph?.toString()} 
                      unit=" pH" 
                      maxValue="10" 
                    />
                    <HealthCard 
                      element="Moisture" 
                      symbol="💧" 
                      percent={soilHealth.moisture} 
                      status="Good" 
                      statusColor="#d1fae5" 
                      actualValue={soilHealth.moisture?.toString()} 
                      unit="%" 
                      maxValue="100" 
                    />
                  </>
                )}
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryIcon}>💡</Text>
                <Text style={styles.summaryTitle}>{t.summary}</Text>
                <Text style={styles.summaryText}>{t.lowSalinity}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Umbrella size={28} color="#84c059" />
                <Text style={styles.sectionTitle}>{t.weatherForecast}</Text>
              </View>
              <Text style={styles.weatherDate}>{t.todayIs}</Text>

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
                      {getWeatherRecommendation(weather.description, kelvinToCelsius(weather.temperature), weather.humidity)}
                    </Text>
                  </View>

                </>
              ) : (
                <View style={styles.weatherCard}>
                  <Text style={styles.weatherEmoji}>⛅</Text>
                  <View style={styles.weatherTemp}>
                    <View style={styles.tempRow}>
                      <Text style={styles.tempIcon}>☀️</Text>
                      <Text style={styles.tempValue}>32°C</Text>
                    </View>
                    <Text style={styles.weatherCondition}>Partly Cloudy</Text>
                  </View>
                </View>
              )}
            </View>

            {!showCrops && (
              <TouchableOpacity
                style={[styles.actionButton, generatingPlan && styles.actionButtonDisabled]}
                onPress={generateAIPlan}
                disabled={generatingPlan}
                activeOpacity={0.8}
              >
                {generatingPlan ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.actionButtonText}>{t.generatingPlan}</Text>
                  </>
                ) : (
                  <>
                    <BrainCircuit size={26} color="#ffffff" />
                    <Text style={styles.actionButtonText}>{t.generateAIPlan}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {showCrops && (
          <>
            <View style={styles.divider} />

            {/* Step 3: Crops & Fertilizer */}
            <View style={styles.section}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{t.step3}</Text>
              </View>
              <View style={styles.sectionHeader}>
                <Leaf size={28} color="#84c059" />
                <Text style={styles.sectionTitle}>{t.recommendedCrops}</Text>
              </View>
              <Text style={styles.sectionDescription}>{t.selectStartingCrop}</Text>

              {(predictionResult?.probabilities && predictionResult.probabilities.length > 0
                ? predictionResult.probabilities.map((item) => {
                    const id = item.crop_class?.toLowerCase().replace(/\s/g, '') ?? '';
                    const lookup = CROP_LOOKUP[id] ?? CROP_LOOKUP[item.crop_class?.toLowerCase() ?? ''];
                    const icon = lookup?.icon ?? '🌱';
                    const description = lookup?.description ?? `AI-recommended based on your soil and weather conditions.`;
                    const prob = item.probability != null ? (item.probability * 100).toFixed(0) : '—';
                    const isPrediction = item.crop_class?.toLowerCase() === predictionResult.prediction?.toLowerCase();
                    const displayName = item.crop_class
                      ? item.crop_class.charAt(0).toUpperCase() + item.crop_class.slice(1).toLowerCase()
                      : '';
                    return (
                      <TouchableOpacity
                        key={item.crop_class}
                        style={[
                          styles.cropCard,
                          selectedCrop === id && styles.cropCardSelected,
                          isPrediction && styles.cropCardPrediction,
                        ]}
                        onPress={() => selectCrop(id)}
                      >
                        <View style={styles.cropHeader}>
                          <Text style={styles.cropIcon}>{icon}</Text>
                          <View style={styles.cropTitleContainer}>
                            <Text style={styles.cropName}>
                              {displayName}
                              {isPrediction && ' ★'}
                            </Text>
                            <View style={styles.cropConfidence}>
                              <Text style={[styles.cropConfidenceText, isPrediction && styles.cropConfidenceHighlight]}>
                                {prob}% match
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Text style={styles.cropDescription}>{description}</Text>
                      </TouchableOpacity>
                    );
                  })
                : crops.map((crop) => (
                    <TouchableOpacity
                      key={crop.id}
                      style={[
                        styles.cropCard,
                        selectedCrop === crop.id && styles.cropCardSelected,
                      ]}
                      onPress={() => selectCrop(crop.id)}
                    >
                      <View style={styles.cropHeader}>
                        <Text style={styles.cropIcon}>{crop.icon}</Text>
                        <View style={styles.cropTitleContainer}>
                          <Text style={styles.cropName}>{crop.name}</Text>
                        </View>
                      </View>
                      <Text style={styles.cropDescription}>{crop.description}</Text>
                    </TouchableOpacity>
                  ))
              )}
            </View>

            {selectedCrop && !showSuggestions && (
              <TouchableOpacity style={styles.actionButton} onPress={confirmCropSelection} activeOpacity={0.8}>
                <Clover size={26} color="#ffffff" />
                <Text style={styles.actionButtonText}>{t.selectCropButton}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {showSuggestions && (
          <>
            <View style={styles.divider} />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clover size={28} color="#84c059" />
                <Text style={styles.sectionTitle}>{t.fertilizerSuggestions}</Text>
              </View>

              {[
                { icon: '🧪', name: 'NPK 14-14-14', amount: '50 kg per hectare', timing: 'Use when planting', note: 'Good for plant growth' },
                { icon: '🍃', name: 'Organic compost', amount: '2 tons per hectare', timing: '2 weeks before planting', note: 'Makes soil better' },
                { icon: '⚗️', name: 'Urea', amount: '25 kg per hectare', timing: '4 weeks after planting', note: 'Adds nitrogen for fruits' },
              ].map((fert) => (
                <View key={fert.name} style={styles.fertilizerCard}>
                  <View style={styles.fertilizerHeader}>
                    <Text style={styles.fertilizerIcon}>{fert.icon}</Text>
                    <Text style={styles.fertilizerName}>{fert.name}</Text>
                  </View>
                  <View style={styles.fertilizerDetails}>
                    <Text style={styles.fertilizerDetail}><Text style={styles.fertilizerLabel}>Amount: </Text>{fert.amount}</Text>
                    <Text style={styles.fertilizerDetail}><Text style={styles.fertilizerLabel}>When: </Text>{fert.timing}</Text>
                  </View>
                  <Text style={styles.fertilizerNote}>{fert.note}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={startFarming} activeOpacity={0.8}>
              <Pickaxe size={26} color="#ffffff" />
              <Text style={styles.actionButtonText}>{t.startFarming}</Text>
            </TouchableOpacity>
          </>
        )}
      </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Sprout size={40} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.title}>CropWise</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{t.welcome}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.logoutText}>{t.logout}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHomeTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3eee6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 24,
  },
  headerContainer: {
    backgroundColor: '#84c059',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#84c059',
  },
  pillText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#84c059',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
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
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  sectionDescription: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#4a5568',
    lineHeight: 24,
  },
  farmCard: {
    flexDirection: 'row',
    padding: 18,
    minHeight: 72,
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  farmCardSelected: {
    shadowColor: '#84c059',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#84c059',
  },
  farmIcon: {
    fontSize: 48,
  },
  farmInfo: {
    flex: 1,
    gap: 4,
  },
  farmName: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  farmDetails: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#4a5568',
  },
  actionButton: {
    backgroundColor: '#84c059',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 56,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
  divider: {
    height: 2,
    backgroundColor: '#e8e3d9',
    marginVertical: 8,
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
    fontSize: 18,
  },
  healthElement: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
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
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
  },
  healthValueMain: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
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
    fontSize: 24,
  },
  summaryTitle: {
    fontSize: 19,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  summaryText: {
    fontSize: 17,
    fontFamily: 'Inter_400Regular',
    color: '#4a5568',
    lineHeight: 24,
  },
  weatherDate: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
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
    fontSize: 60,
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
    fontSize: 14,
  },
  tempValue: {
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  weatherCondition: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
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
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
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
    fontSize: 19,
    fontFamily: 'Inter_600SemiBold',
    color: '#166534',
  },
  recommendationText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#15803d',
    lineHeight: 22,
  },
  cropCard: {
    padding: 18,
    minHeight: 80,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cropCardSelected: {
    borderWidth: 2,
    borderColor: '#84c059',
    shadowColor: '#84c059',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cropCardPrediction: {
    borderLeftWidth: 4,
    borderLeftColor: '#84c059',
  },
  cropConfidence: {
    marginTop: 4,
  },
  cropConfidenceText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#15803d',
  },
  cropConfidenceHighlight: {
    color: '#166534',
    fontFamily: 'Inter_700Bold',
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cropIcon: {
    fontSize: 56,
  },
  cropTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cropName: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    flex: 1,
    flexShrink: 1,
  },
  categoryBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#fff',
  },
  cropDescription: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#4a5568',
    lineHeight: 20,
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
  fertilizerIcon: {
    fontSize: 28,
  },
  fertilizerName: {
    fontSize: 19,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  fertilizerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  fertilizerDetail: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#4a5568',
  },
  fertilizerLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: '#374151',
  },
  fertilizerNote: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    lineHeight: 20,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  taskIconContainer: {
    padding: 10,
  },
  taskInfo: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
  },
  taskDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 8,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#84c059',
  },
  navText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#9ca3af',
  },
  navTextActive: {
    color: '#84c059',
    fontFamily: 'Inter_600SemiBold',
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  emptyContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default FarmerScreen;
