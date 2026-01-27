import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
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
  Calendar,
  Pickaxe,
  BrainCircuit,
  Globe,
  History,
  Home,
  BarChart3,
} from 'lucide-react-native';
import FarmingTimeline from '../../components/FarmingTimeline';
import { useRouter } from 'expo-router';
import { getFarms } from '../../services/farm.service';
import { IFarm } from '../../types/farm.types';
import { ISoilHealth } from '@/types/soil-health.types';
import { getSoilHealth } from '@/services/soil-health.service';


interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  emoji: string;
  recommendation: string;
}

const FarmerScreen = () => {
  const router = useRouter();
  const [language, setLanguage] = useState<'English' | 'Filipino'>('English');
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [showSoilWeather, setShowSoilWeather] = useState(false);
  const [showCrops, setShowCrops] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'history'>('home');
  const [soilHealth, setSoilHealth] = useState<ISoilHealth | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [farms, setFarms] = useState<IFarm[]>([]);

  useEffect(() => {
    const getDetails = async () => {
      const response = await Promise.all([
        getFarms(),
        getSoilHealth({farm_id: farms[0]?.farm_id}),
      ])
      setFarms(response[0].data);
      setSoilHealth(response[1].data[0]);
    }
    getDetails();
  }, [])

  
  const translations = {
    English: {
      welcome: 'Welcome, Juan Carlos Santos',
      logout: 'Logout',
      history: 'History',
      myFarms: 'My Farms',
      selectFarmDetails: "Select your farm and we'll show you details.",
      selectFarmButton: 'Select Farm',
      soilHealth: 'Soil Health',
      summary: 'Summary',
      lowSalinity: 'Low salinity is ideal for most vegetable crops. Good moisture retention suitable for current season planting.',
      weatherForecast: 'Weather Forecast',
      todayIs: 'Today is August 27, 2025 • Wet Season (Southwest Monsoon)',
      generateAIPlan: 'Generate AI Plan',
      recommendedCrops: 'Recommended Crops',
      selectStartingCrop: "Select your starting crop and we'll plan your crop rotation.",
      selectCropButton: 'Select Crop',
      multiCroppingSuggestions: 'Multi-Cropping Suggestions',
      startFarming: 'Start Farming',
      good: 'Good',
      moderate: 'Moderate',
      excellent: 'Excellent',
      low: 'Low',
      optimal: 'Optimal',
    },
    Filipino: {
      welcome: 'Maligayang Pagdating, Juan Carlos Santos',
      logout: 'Mag-logout',
      history: 'Kasaysayan',
      myFarms: 'Aking mga Bukirin',
      selectFarmDetails: 'Pumili ng iyong bukirin at ipapakita namin ang mga detalye.',
      selectFarmButton: 'Pumili ng Bukirin',
      soilHealth: 'Kalusugan ng Lupa',
      summary: 'Buod',
      lowSalinity: 'Ang mababang kaasinan ay mainam para sa karamihan ng mga gulay.',
      weatherForecast: 'Pagtataya ng Panahon',
      todayIs: 'Ngayon ay Agosto 27, 2025 • Tag-ulan (Habagat)',
      generateAIPlan: 'Bumuo ng Plano mula sa AI',
      recommendedCrops: 'Mga Inirerekomendang Pananim',
      selectStartingCrop: 'Pumili ng panimulang pananim at gagawa kami ng plano para sa iyong crop rotation.',
      selectCropButton: 'Pumili ng Pananim',
      multiCroppingSuggestions: 'Mga Mungkahi sa Sabayang Pagtatanim',
      startFarming: 'Simulan ang Pagsasaka',
      good: 'Maganda',
      moderate: 'Katamtaman',
      excellent: 'Mahusay',
      low: 'Mababa',
      optimal: 'Pinakamainam',
    },
  };

  const t = translations[language];

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

  const handleLogout = () => {
    router.push('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'English' ? 'Filipino' : 'English');
  };

  const goToHistory = () => {
    router.push('/(tabs)/history');
  };

  // Generate random weather data
  const generateWeather = (): WeatherData => {
    const weatherConditions = [
      { condition: 'Clear', emoji: '☀️', tempRange: { min: 28, max: 35 } },
      { condition: 'Partly Cloudy', emoji: '⛅', tempRange: { min: 25, max: 32 } },
      { condition: 'Cloudy', emoji: '☁️', tempRange: { min: 24, max: 30 } },
      { condition: 'Light Rain', emoji: '🌦️', tempRange: { min: 22, max: 28 } },
      { condition: 'Rain', emoji: '🌧️', tempRange: { min: 20, max: 26 } },
      { condition: 'Overcast', emoji: '⛅', tempRange: { min: 23, max: 29 } },
    ];

    const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const temp = Math.floor(Math.random() * (randomCondition.tempRange.max - randomCondition.tempRange.min + 1)) + randomCondition.tempRange.min;
    const humidity = Math.floor(Math.random() * (90 - 50 + 1)) + 50;
    const windSpeed = Math.floor(Math.random() * (25 - 5 + 1)) + 5;

    // Generate recommendation based on weather
    const getRecommendation = (condition: string, temp: number, humidity: number) => {
      if (condition.includes('Rain')) {
        return 'Rain expected. Postpone irrigation and fertilizer application. Good time for transplanting seedlings.';
      } else if (temp > 35) {
        return 'High temperature warning. Increase irrigation frequency and provide shade for sensitive crops.';
      } else if (temp < 20) {
        return 'Cool weather. Ideal for leafy vegetables. Reduce watering and watch for frost.';
      } else if (humidity > 80) {
        return 'High humidity. Monitor crops for fungal diseases. Ensure good air circulation.';
      } else if (condition === 'Clear' && temp >= 25 && temp <= 32) {
        return 'Perfect farming conditions! Ideal for planting, weeding, and harvesting activities.';
      } else {
        return 'Moderate conditions. Continue regular farm maintenance and monitoring.';
      }
    };

    return {
      temp,
      condition: randomCondition.condition,
      humidity,
      windSpeed,
      emoji: randomCondition.emoji,
      recommendation: getRecommendation(randomCondition.condition, temp, humidity),
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

  const confirmFarmSelection = () => {
    if (selectedFarm) {
      setShowSoilWeather(true);
      // Generate random weather data
      setWeather(generateWeather());
    }
  };

  const generateAIPlan = () => {
    setShowCrops(true);
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
    Alert.alert('Success', '🎉 Multi-crop suggestion successful! Your farming plan has been created and saved.');
    router.push('/(tabs)/history');
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
        {/* Pills for history and language */}
        <View style={styles.pillsContainer}>
          <TouchableOpacity style={styles.pill} onPress={toggleLanguage}>
            <Globe size={18} color="#000" />
            <Text style={styles.pillText}>{language}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill} onPress={goToHistory}>
            <History size={18} color="#000" />
            <Text style={styles.pillText}>{t.history}</Text>
          </TouchableOpacity>
        </View>

        {/* My Farms Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={24} color="#84c059" />
            <Text style={styles.sectionTitle}>{t.myFarms}</Text>
          </View>
          <Text style={styles.sectionDescription}>{t.selectFarmDetails}</Text>
          
          {farms?.map((farm: IFarm) => (
            <TouchableOpacity
              key={farm.farm_id}
              style={[
                styles.farmCard,
                selectedFarm === farm.farm_id && styles.farmCardSelected,
              ]}
              onPress={() => selectFarm(farm.farm_id)}
            >
              <View style={styles.farmInfo}>
                <Text style={styles.farmName}>{farm.farm_name}</Text>
                <Text style={styles.farmDetails}>{farm.farm_measurement} hectares</Text>
                <Text style={styles.farmLocation}>Lat: {farm.farm_location.latitude}, Lon: {farm.farm_location.longitude}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selectedFarm && !showSoilWeather && (
          <TouchableOpacity style={styles.actionButton} onPress={confirmFarmSelection}>
            <MapPin size={24} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t.selectFarmButton}</Text>
          </TouchableOpacity>
        )}

        {showSoilWeather && (
          <>
            <View style={styles.divider} />

            {/* Soil Health Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ChartLine size={24} color="#84c059" />
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

            {/* Weather Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Umbrella size={24} color="#84c059" />
                <Text style={styles.sectionTitle}>{t.weatherForecast}</Text>
              </View>
              <Text style={styles.weatherDate}>{t.todayIs}</Text>

              {weather ? (
                <>
                  <View style={styles.weatherCard}>
                    <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
                    <View style={styles.weatherTemp}>
                      <View style={styles.tempRow}>
                        <Text style={styles.tempIcon}>🌡️</Text>
                        <Text style={styles.tempValue}>{weather.temp}°C</Text>
                      </View>
                      <Text style={styles.weatherCondition}>{weather.condition}</Text>
                    </View>
                    <View style={styles.weatherDetails}>
                      <View style={styles.weatherDetailItem}>
                        <Droplet size={16} color="#6b7280" />
                        <Text style={styles.weatherDetailText}>{weather.humidity}% Humidity</Text>
                      </View>
                      <View style={styles.weatherDetailItem}>
                        <Wind size={16} color="#6b7280" />
                        <Text style={styles.weatherDetailText}>{weather.windSpeed} km/h Wind</Text>
                      </View>
                    </View>
                  </View>

                  {/* Weather-based Recommendation */}
                  <View style={styles.weatherRecommendation}>
                    <View style={styles.recommendationHeader}>
                      <BrainCircuit size={20} color="#84c059" />
                      <Text style={styles.recommendationTitle}>AI Weather Recommendation</Text>
                    </View>
                    <Text style={styles.recommendationText}>{weather.recommendation}</Text>
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
              <TouchableOpacity style={styles.actionButton} onPress={generateAIPlan}>
                <BrainCircuit size={24} color="#ffffff" />
                <Text style={styles.actionButtonText}>{t.generateAIPlan}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {showCrops && (
          <>
            <View style={styles.divider} />

            {/* Recommended Crops Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Leaf size={24} color="#84c059" />
                <Text style={styles.sectionTitle}>{t.recommendedCrops}</Text>
              </View>
              <Text style={styles.sectionDescription}>{t.selectStartingCrop}</Text>

              {crops.map((crop) => (
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
              ))}
            </View>

            {selectedCrop && !showSuggestions && (
              <TouchableOpacity style={styles.actionButton} onPress={confirmCropSelection}>
                <Clover size={24} color="#ffffff" />
                <Text style={styles.actionButtonText}>{t.selectCropButton}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {showSuggestions && (
          <>
            <View style={styles.divider} />

            {/* Multi-Cropping Suggestions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clover size={24} color="#84c059" />
                <Text style={styles.sectionTitle}>{t.multiCroppingSuggestions}</Text>
              </View>

              {/* Good Companions */}
              <View style={styles.companionCard}>
                <Text style={styles.companionTitle}>🤝 Good Companions</Text>
                <View style={styles.companionItem}>
                  <Text style={styles.companionIcon}>🌿</Text>
                  <Text style={styles.companionName}>Basil - Repels pests, improves tomato flavor</Text>
                </View>
                <View style={styles.companionItem}>
                  <Text style={styles.companionIcon}>🥕</Text>
                  <Text style={styles.companionName}>Carrots - Aerates soil, different root depth</Text>
                </View>
              </View>

              {/* Bad Companions */}
              <View style={styles.badCompanionCard}>
                <Text style={styles.badCompanionTitle}>⚠️ Avoid Planting Together</Text>
                <View style={styles.badCompanionItem}>
                  <Text style={styles.companionIcon}>🌽</Text>
                  <Text style={styles.badCompanionName}>Corn - Competes for nutrients and attracts pests</Text>
                </View>
                <View style={styles.badCompanionItem}>
                  <Text style={styles.companionIcon}>🥔</Text>
                  <Text style={styles.badCompanionName}>Potatoes - Risk of blight spreading between plants</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={startFarming}>
              <Pickaxe size={24} color="#ffffff" />
              <Text style={styles.actionButtonText}>{t.startFarming}</Text>
            </TouchableOpacity>
          </>
        )}
      </>
  );

  const renderTimelineTab = () => (
    <>
      {/* Active Crops Timeline */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={24} color="#84c059" />
          <Text style={styles.sectionTitle}>Active Crops</Text>
        </View>
        <FarmingTimeline
          cropName="Tomato"
          startDate="Aug 15, 2025"
          totalDays={85}
          currentDay={42}
        />
      </View>

      <View style={styles.section}>
        <FarmingTimeline
          cropName="Eggplant"
          startDate="Jul 1, 2025"
          totalDays={80}
          currentDay={65}
        />
      </View>

      {/* Upcoming Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Pickaxe size={24} color="#84c059" />
          <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
        </View>
        <View style={styles.taskCard}>
          <View style={styles.taskIconContainer}>
            <Droplet size={20} color="#84c059" />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>Irrigation Tomatoes</Text>
            <Text style={styles.taskDate}>Tomorrow, 6:00 AM</Text>
          </View>
        </View>
        <View style={styles.taskCard}>
          <View style={styles.taskIconContainer}>
            <Leaf size={20} color="#f59e0b" />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>Fertilize Eggplant</Text>
            <Text style={styles.taskDate}>In 3 days</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderHistoryTab = () => {
    router.push('/(tabs)/history');
    return null;
  };

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
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>{t.logout}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'timeline' && renderTimelineTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <Home
            size={24}
            color={activeTab === 'home' ? '#84c059' : '#9ca3af'}
            strokeWidth={activeTab === 'home' ? 2.5 : 2}
            fill={activeTab === 'home' ? '#84c059' : 'none'}
          />
          <Text
            style={[
              styles.navText,
              activeTab === 'home' && styles.navTextActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'timeline' && styles.navItemActive]}
          onPress={() => setActiveTab('timeline')}
        >
          <BarChart3
            size={24}
            color={activeTab === 'timeline' ? '#84c059' : '#9ca3af'}
            strokeWidth={activeTab === 'timeline' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.navText,
              activeTab === 'timeline' && styles.navTextActive,
            ]}
          >
            Timeline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/ai')}
        >
          <BrainCircuit size={24} color="#9ca3af" strokeWidth={2} />
          <Text style={styles.navText}>AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'history' && styles.navItemActive]}
          onPress={() => router.push('/(tabs)/history')}
        >
          <History
            size={24}
            color={activeTab === 'history' ? '#84c059' : '#9ca3af'}
            strokeWidth={activeTab === 'history' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.navText,
              activeTab === 'history' && styles.navTextActive,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 120,
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
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 14,
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#84c059',
  },
  pillText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
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
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#4a5568',
  },
  farmCard: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
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
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  farmDetails: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#4a5568',
  },
  farmLocation: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#718096',
  },
  actionButton: {
    backgroundColor: '#84c059',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonText: {
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  summaryText: {
    fontSize: 16,
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
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  weatherCondition: {
    fontSize: 16,
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
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#166534',
  },
  recommendationText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#15803d',
    lineHeight: 22,
  },
  cropCard: {
    padding: 14,
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
    fontSize: 20,
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
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#4a5568',
    lineHeight: 20,
  },
  companionCard: {
    backgroundColor: '#f3eee6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  companionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  companionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  companionIcon: {
    fontSize: 32,
  },
  companionName: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#065f46',
    flex: 1,
  },
  badCompanionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  badCompanionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#991b1b',
  },
  badCompanionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  badCompanionName: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#991b1b',
    flex: 1,
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
});

export default FarmerScreen;
