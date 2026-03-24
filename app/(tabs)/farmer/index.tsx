import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sprout, MapPin, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getFarms } from '../../../services/farm.service';
import { fontFamily, spacing, radius, colors } from '@/constants/design-tokens';
import { IFarm } from '../../../types/farm.types';

const FarmerScreen = () => {
  const router = useRouter();
  const [farms, setFarms] = useState<IFarm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDetails = async () => {
      try {
        setLoading(true);
        const farmsResponse = await getFarms();
        const farmsData = farmsResponse?.data || [];
        setFarms(farmsData);
      } catch (error) {
        console.error('Error fetching farm details:', error);
      } finally {
        setLoading(false);
      }
    };

    getDetails();
  }, []);
  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Sprout size={36} color="#ffffff" strokeWidth={2} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Tanim</Text>
              <Text style={styles.subtitle} numberOfLines={1}>Hello, Farmer!</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <LogOut size={18} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={28} color="#84c059" />
            <Text style={styles.sectionTitle}>My Farms</Text>
          </View>
          <Text style={styles.sectionDescription}>Tap your farm to see soil health and crop suggestions.</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#84c059" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : farms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No farms yet. Add a farm to start.</Text>
            </View>
          ) : (
            farms.map((farm: IFarm) => (
              <TouchableOpacity
                key={farm.farm_id}
                style={styles.farmCard}
                onPress={() => router.push(`/farmer/${farm.farm_id}` as import('expo-router').Href)}
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerText: {
    gap: 2,
  },
  iconContainer: {
    backgroundColor: colors.overlayLight,
    borderRadius: radius.full,
    padding: spacing.md,
  },
  title: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.overlayMedium,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutText: {
    fontSize: 14,
    fontFamily: fontFamily.semibold,
    color: colors.white,
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
  farmInfo: {
    flex: 1,
    gap: 4,
  },
  farmName: {
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    color: '#000',
  },
  farmDetails: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#4a5568',
  },
  loadingContainer: {
    flexDirection: 'column',
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
  emptyContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default FarmerScreen;
