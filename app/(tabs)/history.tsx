import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout,
  Calendar,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  BrainCircuit,
  X,
  Leaf,
  Droplet as DropletIcon,
  Sun,
  Home,
  BarChart3,
  History as HistoryIcon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';


interface HistoryItem {
  id: number;
  date: string;
  farmName: string;
  farmIcon: string;
  crop: string;
  cropIcon: string;
  status: 'completed' | 'in-progress' | 'failed';
  duration: string;
  yield?: string;
  expectedYield?: string;
  revenue?: string;
  expectedRevenue?: string;
  loss?: string;
  companions: string[];
  notes: string;
}

const HistoryScreen = () => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<HistoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const farmingHistory: HistoryItem[] = [
    {
      id: 1,
      date: '2025-08-15',
      farmName: 'Kalinawan Farm',
      farmIcon: '🌾',
      crop: 'Tomato',
      cropIcon: '🍅',
      status: 'completed',
      duration: '85 days',
      yield: '2.3 kg/plant',
      revenue: '₱45,500',
      companions: ['Basil', 'Carrots', 'Lettuce'],
      notes: 'Excellent harvest despite heavy rains in week 16. Disease management was effective.',
    },
    {
      id: 2,
      date: '2025-07-01',
      farmName: 'Malasag Organic Farm',
      farmIcon: '🥕',
      crop: 'Eggplant',
      cropIcon: '🍆',
      status: 'in-progress',
      duration: '45/80 days',
      expectedYield: '1.8 kg/plant',
      expectedRevenue: '₱32,000',
      companions: ['Onions', 'Beans'],
      notes: 'Currently in flowering stage. Weather conditions favorable.',
    },
    {
      id: 3,
      date: '2025-06-10',
      farmName: 'Kalinawan Farm',
      farmIcon: '🌾',
      crop: 'Okra',
      cropIcon: '🌱',
      status: 'completed',
      duration: '62 days',
      yield: '1.1 kg/plant',
      revenue: '₱28,750',
      companions: ['Lettuce', 'Radish'],
      notes: 'Good drought resistance. Early harvest due to market demand.',
    },
    {
      id: 4,
      date: '2025-05-20',
      farmName: 'Malasag Organic Farm',
      farmIcon: '🥕',
      crop: 'Tomato',
      cropIcon: '🍅',
      status: 'failed',
      duration: '40 days (terminated)',
      loss: '₱15,200',
      companions: ['Basil'],
      notes: 'Bacterial wilt outbreak. Soil treatment needed before next planting.',
    },
  ];

  const goToTimeline = () => {
    router.push('/(tabs)/farmer');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#d1fae5';
      case 'in-progress':
        return '#dbeafe';
      case 'failed':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#065f46';
      case 'in-progress':
        return '#1e40af';
      case 'failed':
        return '#991b1b';
      default:
        return '#374151';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle2;
      case 'in-progress':
        return Clock;
      case 'failed':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const viewDetails = (planId: number) => {
    const plan = farmingHistory.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedPlan(null), 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Sprout size={40} color="#ffffff" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Farming History</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Track your agricultural journey</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={24} color="#84c059" />
            </View>
            <Text style={styles.statValue}>75%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
            <Text style={styles.statSubtext}>3 of 4 completed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Calendar size={24} color="#84c059" />
            </View>
            <Text style={styles.statValue}>{farmingHistory.length}</Text>
            <Text style={styles.statLabel}>Total Plans</Text>
            <Text style={styles.statSubtext}>Since May 2025</Text>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsIcon}>📊</Text>
            <Text style={styles.insightsTitle}>Agricultural Insights</Text>
          </View>
          <Text style={styles.insightsText}>
            Your farming performance shows consistent improvement. Consider rotating to nitrogen-fixing
            crops next season for soil health.
          </Text>
        </View>

        {/* Recent Activities */}
        <View style={styles.activitiesSection}>
          <View style={styles.activitiesHeader}>
            <Clock size={20} color="#84c059" />
            <Text style={styles.activitiesTitle}>Recent Activities</Text>
          </View>

          {farmingHistory.map((plan) => {
            const StatusIcon = getStatusIcon(plan.status);
            return (
              <View key={plan.id} style={styles.historyCard}>
                {/* Header Row */}
                <View style={styles.historyHeader}>
                  <View style={styles.historyTitleRow}>
                    <Text style={styles.cropIcon}>{plan.cropIcon}</Text>
                    <View style={styles.cropInfoContainer}>
                      <Text style={styles.cropTitle}>{plan.crop} Cultivation</Text>
                      <View style={styles.farmInfo}>
                        <MapPin size={14} color="#6b7280" />
                        <Text style={styles.farmText}>{plan.farmName}</Text>
                      </View>
                      <Text style={styles.dateText}>{formatDate(plan.date)}</Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(plan.status) },
                    ]}
                  >
                    <StatusIcon
                      size={12}
                      color={getStatusTextColor(plan.status)}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusTextColor(plan.status) },
                      ]}
                    >
                      {plan.status === 'in-progress'
                        ? 'Active'
                        : plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Metrics Row */}
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>DURATION</Text>
                    <Text style={styles.metricValue}>{plan.duration}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>
                      {plan.status === 'failed'
                        ? 'LOSS'
                        : plan.status === 'completed'
                        ? 'REVENUE'
                        : 'EXPECTED REVENUE'}
                    </Text>
                    <Text
                      style={[
                        styles.metricValue,
                        {
                          color: plan.status === 'failed' ? '#dc2626' : '#16a34a',
                        },
                      ]}
                    >
                      {plan.revenue || plan.expectedRevenue || plan.loss}
                    </Text>
                  </View>
                </View>

                {(plan.yield || plan.expectedYield) && (
                  <View style={styles.yieldSection}>
                    <Text style={styles.yieldLabel}>
                      {plan.status === 'completed' ? 'YIELD ACHIEVED' : 'EXPECTED YIELD'}
                    </Text>
                    <Text style={styles.yieldValue}>
                      {plan.yield || plan.expectedYield}
                    </Text>
                  </View>
                )}

                {/* Companions */}
                <View style={styles.companionsSection}>
                  <Text style={styles.companionsLabel}>COMPANION CROPS</Text>
                  <View style={styles.companionsList}>
                    {plan.companions.map((companion, index) => (
                      <View key={index} style={styles.companionTag}>
                        <Text style={styles.companionText}>{companion}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>NOTES</Text>
                  <Text style={styles.notesText}>{plan.notes}</Text>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => viewDetails(plan.id)}
                >
                  <Eye size={16} color="#ffffff" />
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {selectedPlan && (
                <>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleRow}>
                      <Text style={styles.modalCropIcon}>{selectedPlan.cropIcon}</Text>
                      <View style={styles.modalTitleInfo}>
                        <Text style={styles.modalTitle}>{selectedPlan.crop} Cultivation</Text>
                        <Text style={styles.modalSubtitle}>{selectedPlan.farmName}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                      <X size={24} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Status Banner */}
                  <View
                    style={[
                      styles.statusBanner,
                      { backgroundColor: getStatusColor(selectedPlan.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBannerText,
                        { color: getStatusTextColor(selectedPlan.status) },
                      ]}
                    >
                      {selectedPlan.status === 'in-progress'
                        ? 'CURRENTLY ACTIVE'
                        : selectedPlan.status === 'completed'
                        ? 'SUCCESSFULLY COMPLETED'
                        : 'CULTIVATION FAILED'}
                    </Text>
                  </View>

                  {/* Farm Details Section */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <MapPin size={20} color="#84c059" />
                      <Text style={styles.detailSectionTitle}>Farm Information</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Farm Name:</Text>
                      <Text style={styles.detailValue}>{selectedPlan.farmName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailValue}>{selectedPlan.farmName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Start Date:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedPlan.date)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration:</Text>
                      <Text style={styles.detailValue}>{selectedPlan.duration}</Text>
                    </View>
                  </View>

                  {/* Crop Details Section */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Leaf size={20} color="#84c059" />
                      <Text style={styles.detailSectionTitle}>Crop Details</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Crop Type:</Text>
                      <Text style={styles.detailValue}>{selectedPlan.crop}</Text>
                    </View>
                    {(selectedPlan.yield || selectedPlan.expectedYield) && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          {selectedPlan.status === 'completed' ? 'Yield:' : 'Expected Yield:'}
                        </Text>
                        <Text style={styles.detailValue}>
                          {selectedPlan.yield || selectedPlan.expectedYield}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Companion Crops:</Text>
                      <View style={styles.companionChips}>
                        {selectedPlan.companions.map((companion, index) => (
                          <View key={index} style={styles.companionChip}>
                            <Text style={styles.companionChipText}>{companion}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Financial Details Section */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <TrendingUp size={20} color="#84c059" />
                      <Text style={styles.detailSectionTitle}>Financial Summary</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {selectedPlan.status === 'failed'
                          ? 'Total Loss:'
                          : selectedPlan.status === 'completed'
                          ? 'Total Revenue:'
                          : 'Expected Revenue:'}
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          styles.financialValue,
                          {
                            color:
                              selectedPlan.status === 'failed' ? '#dc2626' : '#16a34a',
                          },
                        ]}
                      >
                        {selectedPlan.revenue || selectedPlan.expectedRevenue || selectedPlan.loss}
                      </Text>
                    </View>
                    {selectedPlan.status === 'completed' && (
                      <View style={styles.profitIndicator}>
                        <CheckCircle2 size={16} color="#16a34a" />
                        <Text style={styles.profitText}>Profitable Harvest</Text>
                      </View>
                    )}
                    {selectedPlan.status === 'failed' && (
                      <View style={styles.lossIndicator}>
                        <AlertTriangle size={16} color="#dc2626" />
                        <Text style={styles.lossText}>Financial Loss Incurred</Text>
                      </View>
                    )}
                  </View>

                  {/* Notes Section */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Calendar size={20} color="#84c059" />
                      <Text style={styles.detailSectionTitle}>Farming Notes</Text>
                    </View>
                    <Text style={styles.notesDetail}>{selectedPlan.notes}</Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.modalActions}>
                    {selectedPlan.status === 'completed' && (
                      <TouchableOpacity style={styles.actionButtonPrimary}>
                        <Text style={styles.actionButtonPrimaryText}>Repeat This Plan</Text>
                      </TouchableOpacity>
                    )}
                    {selectedPlan.status === 'failed' && (
                      <TouchableOpacity style={styles.actionButtonSecondary}>
                        <Text style={styles.actionButtonSecondaryText}>
                          Review & Improve
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
          onPress={goToTimeline}
        >
          <BarChart3 size={24} color="#9ca3af" strokeWidth={2} />
          <Text style={styles.navText}>Timeline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/ai')}
        >
          <BrainCircuit size={24} color="#9ca3af" strokeWidth={2} />
          <Text style={styles.navText}>AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, styles.navItemActive]}
          onPress={() => {}}
        >
          <HistoryIcon size={24} color="#84c059" strokeWidth={2.5} />
          <Text style={[styles.navText, styles.navTextActive]}>History</Text>
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
    gap: 12,
  },
  headerTextContainer: {
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
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    color: '#84c059',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
  },
  statSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    marginTop: 2,
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#84c059',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightsIcon: {
    fontSize: 24,
  },
  insightsTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
  },
  insightsText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#4b5563',
    lineHeight: 24,
  },
  activitiesSection: {
    gap: 16,
  },
  activitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activitiesTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1f2937',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  historyHeader: {
    gap: 12,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cropIcon: {
    fontSize: 40,
  },
  cropInfoContainer: {
    flex: 1,
    gap: 4,
  },
  cropTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#1f2937',
  },
  farmInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  farmText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metric: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
  },
  yieldSection: {
    gap: 4,
  },
  yieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  yieldValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
  },
  companionsSection: {
    gap: 8,
  },
  companionsLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  companionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  companionTag: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  companionText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#065f46',
  },
  notesSection: {
    gap: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#4b5563',
    lineHeight: 24,
  },
  viewButton: {
    backgroundColor: '#84c059',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f3eee6',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalScroll: {
    padding: 20,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalCropIcon: {
    fontSize: 48,
  },
  modalTitleInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  statusBanner: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  detailSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
  },
  financialValue: {
    fontSize: 18,
  },
  companionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  companionChip: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  companionChipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#065f46',
  },
  profitIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
  },
  profitText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#16a34a',
  },
  lossIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
  },
  lossText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#dc2626',
  },
  notesDetail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#4b5563',
    lineHeight: 20,
  },
  modalActions: {
    gap: 12,
  },
  actionButtonPrimary: {
    backgroundColor: '#84c059',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#84c059',
  },
  actionButtonSecondaryText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#84c059',
  },
});

export default HistoryScreen;
