import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout,
  BrainCircuit,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Droplet,
  Sun,
  Leaf,
  Target,
  Zap,
  Home,
  BarChart3,
  History,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';


const AIScreen = () => {
  const router = useRouter();
  // Sample data - in real app, this would come from context/state
  const soilData = {
    nitrogen: 75,
    phosphorus: 65,
    potassium: 85,
    overall: 'Good',
  };

  const weatherData = {
    condition: 'Partly Cloudy',
    temperature: 28,
    humidity: 65,
    rainfall: 'Low',
  };

  const seasonData = {
    current: 'Wet Season',
    phase: 'Southwest Monsoon',
    optimal: true,
  };

  const recommendations = [
    {
      category: 'Soil Health',
      priority: 'Medium',
      icon: Leaf,
      color: '#f59e0b',
      items: [
        'Phosphorus levels are moderate (65%). Consider applying phosphate fertilizer before next planting.',
        'Nitrogen and Potassium levels are excellent. Maintain current fertilization schedule.',
        'Soil pH is optimal for most vegetables. Continue monitoring monthly.',
      ],
    },
    {
      category: 'Weather Conditions',
      priority: 'High',
      icon: Sun,
      color: '#84c059',
      items: [
        'Current weather is ideal for planting and field work.',
        'Moderate humidity reduces fungal disease risk. Continue regular monitoring.',
        'Temperature range (25-30°C) is perfect for tomato and eggplant cultivation.',
      ],
    },
    {
      category: 'Planting Season',
      priority: 'High',
      icon: Calendar,
      color: '#84c059',
      items: [
        'Wet season is optimal for water-intensive crops like rice and vegetables.',
        'Consider succession planting every 2 weeks for continuous harvest.',
        'Plan for dry season transition (Nov-Dec) by selecting drought-resistant varieties.',
      ],
    },
    {
      category: 'Multi-Cropping Strategy',
      priority: 'Medium',
      icon: Sprout,
      color: '#f59e0b',
      items: [
        'Tomato + Basil companion planting recommended for pest control.',
        'Intercrop with carrots to maximize space and improve soil structure.',
        'Avoid planting corn or potatoes near tomatoes to prevent disease spread.',
        'Rotate with legumes next season to naturally replenish soil nitrogen.',
      ],
    },
    {
      category: 'Irrigation Management',
      priority: 'Low',
      icon: Droplet,
      color: '#3b82f6',
      items: [
        'Current soil moisture (80%) is adequate. Reduce watering frequency.',
        'Implement drip irrigation for water efficiency during dry periods.',
        'Monitor soil moisture daily; adjust based on rainfall predictions.',
      ],
    },
    {
      category: 'Pest & Disease Prevention',
      priority: 'Medium',
      icon: AlertCircle,
      color: '#f59e0b',
      items: [
        'High humidity periods increase fungal disease risk. Ensure good air circulation.',
        'Apply organic neem oil spray preventively every 10 days.',
        'Scout crops weekly for early pest detection and intervention.',
      ],
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return '#84c059';
      case 'Medium':
        return '#f59e0b';
      case 'Low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'High':
        return CheckCircle;
      case 'Medium':
        return AlertCircle;
      case 'Low':
        return TrendingUp;
      default:
        return Target;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <BrainCircuit size={40} color="#ffffff" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>AI Insights</Text>
              <Text style={styles.subtitle} numberOfLines={1}>Personalized Farm Recommendations</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Farm Overview Cards */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Current Farm Status</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIconContainer}>
                <Leaf size={24} color="#84c059" />
              </View>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewLabel}>Soil Health</Text>
                <Text style={styles.overviewValue}>{soilData.overall}</Text>
                <View style={styles.overviewDetails}>
                  <Text style={styles.detailText}>N: {soilData.nitrogen}%</Text>
                  <Text style={styles.detailText}>P: {soilData.phosphorus}%</Text>
                  <Text style={styles.detailText}>K: {soilData.potassium}%</Text>
                </View>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={styles.overviewIconContainer}>
                <Sun size={24} color="#f59e0b" />
              </View>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewLabel}>Weather</Text>
                <Text style={styles.overviewValue}>{weatherData.condition}</Text>
                <View style={styles.overviewDetails}>
                  <Text style={styles.detailText}>{weatherData.temperature}°C</Text>
                  <Text style={styles.detailText}>{weatherData.humidity}% Humid</Text>
                </View>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={styles.overviewIconContainer}>
                <Calendar size={24} color="#3b82f6" />
              </View>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewLabel}>Season</Text>
                <Text style={styles.overviewValue}>{seasonData.current}</Text>
                <View style={styles.overviewDetails}>
                  <Text style={styles.detailText}>{seasonData.phase}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* AI Recommendations */}
        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Zap size={24} color="#84c059" />
            <Text style={styles.sectionTitle}>AI-Powered Recommendations</Text>
          </View>

          {recommendations.map((rec, index) => {
            const CategoryIcon = rec.icon;
            const PriorityIcon = getPriorityIcon(rec.priority);
            const priorityColor = getPriorityColor(rec.priority);

            return (
              <View key={index} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryIcon, { backgroundColor: `${rec.color}20` }]}>
                      <CategoryIcon size={20} color={rec.color} />
                    </View>
                    <Text style={styles.categoryTitle}>{rec.category}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}20` }]}>
                    <PriorityIcon size={14} color={priorityColor} />
                    <Text style={[styles.priorityText, { color: priorityColor }]}>
                      {rec.priority}
                    </Text>
                  </View>
                </View>

                <View style={styles.recommendationItems}>
                  {rec.items.map((item, idx) => (
                    <View key={idx} style={styles.recommendationItem}>
                      <View style={styles.bulletPoint} />
                      <Text style={styles.recommendationText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Summary */}
        <View style={styles.actionSummary}>
          <View style={styles.summaryHeader}>
            <Target size={20} color="#84c059" />
            <Text style={styles.summaryTitle}>Immediate Actions Required</Text>
          </View>
          <View style={styles.actionItem}>
            <CheckCircle size={16} color="#84c059" />
            <Text style={styles.actionText}>Begin planting tomatoes this week</Text>
          </View>
          <View style={styles.actionItem}>
            <CheckCircle size={16} color="#84c059" />
            <Text style={styles.actionText}>Apply phosphate fertilizer within 3 days</Text>
          </View>
          <View style={styles.actionItem}>
            <CheckCircle size={16} color="#84c059" />
            <Text style={styles.actionText}>Set up drip irrigation system</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/farmer')}
        >
          <Home size={24} color="#9ca3af" strokeWidth={2} />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/farmer')}
        >
          <BarChart3 size={24} color="#9ca3af" strokeWidth={2} />
          <Text style={styles.navText}>Timeline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, styles.navItemActive]}
          onPress={() => {}}
        >
          <BrainCircuit size={24} color="#84c059" strokeWidth={2.5} />
          <Text style={[styles.navText, styles.navTextActive]}>AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/history')}
        >
          <History size={24} color="#9ca3af" strokeWidth={2} />
          <Text style={styles.navText}>History</Text>
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
    paddingVertical: 12,
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
  headerTextContainer: {
    flex: 1,
    flexShrink: 1,
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
  overviewSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1f2937',
  },
  overviewGrid: {
    gap: 12,
  },
  overviewCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  overviewContent: {
    flex: 1,
  },
  overviewIconContainer: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 50,
  },
  overviewLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  overviewValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1f2937',
  },
  overviewDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
  },
  recommendationsSection: {
    gap: 16,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexShrink: 1,
  },
  categoryIcon: {
    padding: 8,
    borderRadius: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
    flex: 1,
    flexShrink: 1,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexShrink: 0,
  },
  priorityText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  recommendationItems: {
    gap: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#84c059',
    marginTop: 6,
  },
  recommendationText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#4b5563',
    lineHeight: 24,
  },
  actionSummary: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#84c059',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#166534',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#15803d',
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

export default AIScreen;
