import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Sprout, Droplet, Sun, Flower, Package } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadow } from '@/constants/design-tokens';

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
        return colors.primary;
      case 'current':
        return colors.warning;
      case 'upcoming':
        return colors.muted;
      default:
        return colors.muted;
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
                      color={phase.status === 'upcoming' ? colors.mutedForeground : colors.primaryForeground}
                    />
                  </View>
                  <Text style={styles.phaseName}>{phase.name}</Text>
                  <Text style={styles.phaseDays}>{phase.days}</Text>
                  <Text style={styles.phaseDescription}>{phase.description}</Text>
                </View>

                {index < phases.length - 1 && (
                  <View
                    style={[
                      styles.connector,
                      {
                        backgroundColor:
                          phase.status === 'completed' ? colors.primary : colors.muted,
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

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
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    gap: spacing.md,
    ...(shadow.sm ?? {}),
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
  },
  progressContainer: {
    gap: 6,
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
    borderRadius: 6,
  },
  progressText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
    textAlign: 'right',
  },
  phasesScroll: {
    marginHorizontal: -spacing.lg,
    marginTop: spacing.sm,
  },
  phasesContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  phaseWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseCard: {
    width: 130,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    ...(shadow.sm ?? {}),
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 2,
    borderColor: colors.border,
  },
  phaseName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    textAlign: 'center',
  },
  phaseDays: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  phaseDescription: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 13,
  },
  connector: {
    width: 32,
    height: 3,
    marginHorizontal: 4,
  },
  currentPhaseCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    gap: 2,
    marginTop: spacing.lg,
    ...(shadow.sm ?? {}),
  },
  currentPhaseLabel: {
    fontSize: 10,
    fontFamily: fontFamily.semibold,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  currentPhaseName: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  currentPhaseDesc: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
});

export default FarmingTimeline;
