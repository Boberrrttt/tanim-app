import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#84c059',
        tabBarInactiveTintColor: '#718096',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#f3eee6',
          borderTopColor: '#e2e8f0',
        },
      }}>
      <Tabs.Screen
        name="farmer"
        options={{
          title: 'Farms',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'leaf.fill' : 'leaf'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'clock.fill' : 'clock'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
