import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { History, MapPin, Sprout } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getFarms } from '@/services/farm.service';
import { getSoilHealth } from '@/services/soil-health.service';
import { IFarm } from '@/types/farm.types';
import { ISoilHealth } from '@/types/soil-health.types';

function sortTestsByCreatedAtDesc(tests: ISoilHealth[]): ISoilHealth[] {
  return [...tests].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
}

function formatTestDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<IFarm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [tests, setTests] = useState<ISoilHealth[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingTests, setLoadingTests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadFarms = useCallback(async () => {
    setLoadingFarms(true);
    try {
      const res = await getFarms();
      const list: IFarm[] = res?.data ?? [];
      setFarms(list);
      setSelectedFarmId((current) => {
        if (current && list.some((f) => f.farm_id === current)) return current;
        return list[0]?.farm_id ?? null;
      });
    } catch {
      setFarms([]);
    } finally {
      setLoadingFarms(false);
    }
  }, []);

  const loadTests = useCallback(async (farmId: string) => {
    setLoadingTests(true);
    try {
      const res = await getSoilHealth({ farm_id: farmId });
      const raw = res?.data;
      const rows = Array.isArray(raw) ? raw : [];
      setTests(sortTestsByCreatedAtDesc(rows as ISoilHealth[]));
    } catch {
      setTests([]);
    } finally {
      setLoadingTests(false);
    }
  }, []);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  useEffect(() => {
    if (selectedFarmId) {
      loadTests(selectedFarmId);
    } else {
      setTests([]);
    }
  }, [selectedFarmId, loadTests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFarms();
      if (selectedFarmId) await loadTests(selectedFarmId);
    } finally {
      setRefreshing(false);
    }
  }, [loadFarms, loadTests, selectedFarmId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Sprout size={40} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.title}>CropWise</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Soil test history
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => router.push('/login')}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={24} color="#84c059" />
            <Text style={styles.sectionTitle}>Farm</Text>
          </View>
          {loadingFarms ? (
            <ActivityIndicator color="#84c059" style={styles.loader} />
          ) : farms.length === 0 ? (
            <Text style={styles.muted}>No farms yet. Add a farm to see history.</Text>
          ) : (
            farms.map((farm) => {
              const selected = farm.farm_id === selectedFarmId;
              return (
                <TouchableOpacity
                  key={farm.farm_id}
                  style={[styles.farmRow, selected && styles.farmRowSelected]}
                  onPress={() => setSelectedFarmId(farm.farm_id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.farmName}>{farm.farm_name}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <History size={24} color="#84c059" />
            <Text style={styles.sectionTitle}>Tests</Text>
          </View>
          {!selectedFarmId ? (
            <Text style={styles.muted}>Select a farm to load tests.</Text>
          ) : loadingTests ? (
            <ActivityIndicator color="#84c059" style={styles.loader} />
          ) : tests.length === 0 ? (
            <Text style={styles.muted}>No soil health tests for this farm yet.</Text>
          ) : (
            tests.map((row) => (
              <View key={row.test_id ?? `${row.farm_id}-${row.created_at}`} style={styles.testCard}>
                <Text style={styles.testDate}>{formatTestDate(row.created_at)}</Text>
                <Text style={styles.classification}>
                  Classification:{' '}
                  <Text style={styles.classificationValue}>
                    {row.classification != null ? String(row.classification) : '—'}
                  </Text>
                </Text>
                <View style={styles.metrics}>
                  <Text style={styles.metric}>N: {row.nitrogen}</Text>
                  <Text style={styles.metric}>P: {row.phosphorus}</Text>
                  <Text style={styles.metric}>K: {row.potassium}</Text>
                  <Text style={styles.metric}>pH: {row.ph}</Text>
                  <Text style={styles.metric}>Salinity: {row.salinity}</Text>
                  <Text style={styles.metric}>Temp: {row.temperature}</Text>
                  <Text style={styles.metric}>Moisture: {row.moisture}</Text>
                </View>
              </View>
            ))
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
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
  muted: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#718096',
    lineHeight: 22,
  },
  loader: {
    marginVertical: 12,
  },
  farmRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f7faf5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  farmRowSelected: {
    borderColor: '#84c059',
    backgroundColor: '#eef7e4',
  },
  farmName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1a202c',
  },
  testCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f7faf5',
    marginBottom: 10,
    gap: 8,
  },
  testDate: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#4a5568',
  },
  classification: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#2d3748',
  },
  classificationValue: {
    fontFamily: 'Inter_700Bold',
    color: '#84c059',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metric: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#4a5568',
    backgroundColor: '#edf2f7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
