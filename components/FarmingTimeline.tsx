import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Sprout, Droplet, Sun, Flower, Package } from 'lucide-react-native';

interface TimelinePhase {
  id: number;
  name: string;
  days: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: any;
  description: string;
}

interface FarmingTimelineProps {
  cropName: string;
  startDate: string;
  totalDays: number;
  currentDay: number;
}

const FarmingTimeline: React.FC<FarmingTimelineProps> = ({
  cropName,
  startDate,
  totalDays,
  currentDay,
}) => {
  const phases: TimelinePhase[] = [
    {
      id: 1,
      name: 'Planting',
      days: 'Days 1-7',
      status: currentDay > 7 ? 'completed' : currentDay >= 1 ? 'current' : 'upcoming',
      icon: Sprout,
      description: 'Seed germination and initial growth',
    },
    {
      id: 2,
      name: 'Vegetative',
      days: 'Days 8-30',
      status: currentDay > 30 ? 'completed' : currentDay >= 8 ? 'current' : 'upcoming',
      icon: Droplet,
      description: 'Leaf and stem development',
    },
    {
      id: 3,
      name: 'Flowering',
      days: 'Days 31-55',
      status: currentDay > 55 ? 'completed' : currentDay >= 31 ? 'current' : 'upcoming',
      icon: Flower,
      description: 'Bloom and pollination phase',
    },
    {
      id: 4,
      name: 'Fruiting',
      days: 'Days 56-75',
      status: currentDay > 75 ? 'completed' : currentDay >= 56 ? 'current' : 'upcoming',
      icon: Sun,
      description: 'Fruit formation and growth',
    },
    {
      id: 5,
      name: 'Harvest',
      days: 'Days 76-85',
      status: currentDay > 85 ? 'completed' : currentDay >= 76 ? 'current' : 'upcoming',
      icon: Package,
      description: 'Ready for harvesting',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#84c059';
      case 'current':
        return '#f59e0b';
      case 'upcoming':
        return '#d1d5db';
      default:
        return '#d1d5db';
    }
  };

  const getProgressPercentage = () => {
    return Math.min((currentDay / totalDays) * 100, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{cropName} Growth Timeline</Text>
        <Text style={styles.subtitle}>
          Day {currentDay} of {totalDays} • Started {startDate}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${getProgressPercentage()}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(getProgressPercentage())}% Complete</Text>
      </View>

      {/* Timeline Phases */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phasesScroll}>
        <View style={styles.phasesContainer}>
          {phases.map((phase, index) => {
            const PhaseIcon = phase.icon;
            const statusColor = getStatusColor(phase.status);

            return (
              <View key={phase.id} style={styles.phaseWrapper}>
                <View style={styles.phaseCard}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: statusColor },
                    ]}
                  >
                    <PhaseIcon
                      size={24}
                      color={phase.status === 'upcoming' ? '#6b7280' : '#ffffff'}
                    />
                  </View>
                  <Text style={styles.phaseName}>{phase.name}</Text>
                  <Text style={styles.phaseDays}>{phase.days}</Text>
                  <Text style={styles.phaseDescription}>{phase.description}</Text>
                </View>

                {/* Connector Line */}
                {index < phases.length - 1 && (
                  <View
                    style={[
                      styles.connector,
                      {
                        backgroundColor:
                          phase.status === 'completed' ? '#84c059' : '#e5e7eb',
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Current Phase Highlight */}
      <View style={styles.currentPhaseCard}>
        <Text style={styles.currentPhaseLabel}>CURRENT PHASE</Text>
        <Text style={styles.currentPhaseName}>
          {phases.find((p) => p.status === 'current')?.name || 'Completed'}
        </Text>
        <Text style={styles.currentPhaseDesc}>
          {phases.find((p) => p.status === 'current')?.description || 'All phases completed'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
  },
  progressContainer: {
    gap: 6,
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
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#84c059',
    textAlign: 'right',
  },
  phasesScroll: {
    marginHorizontal: -16,
    marginTop: 8,
  },
  phasesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  phaseWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseCard: {
    width: 130,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  phaseName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
    textAlign: 'center',
  },
  phaseDays: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    textAlign: 'center',
  },
  phaseDescription: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 13,
  },
  connector: {
    width: 32,
    height: 3,
    marginHorizontal: 4,
  },
  currentPhaseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    gap: 2,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  currentPhaseLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  currentPhaseName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1f2937',
  },
  currentPhaseDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    lineHeight: 16,
  },
});

export default FarmingTimeline;
