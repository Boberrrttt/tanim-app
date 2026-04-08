import { Stack } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import FarmingActiveBanner from '@/components/FarmingActiveBanner';

export default function FarmerLayout() {
  return (
    <View style={styles.root}>
      <View style={styles.stackWrap}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="[id]" />
        </Stack>
      </View>
      <FarmingActiveBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stackWrap: { flex: 1 },
});
