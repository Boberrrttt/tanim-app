import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Sprout } from 'lucide-react-native';

export type RootStackParamList = {
  Login: undefined;
  Farmer: undefined;
  Admin: undefined;
  History: undefined;
  AI: undefined;
};

const Index = () => {
  const router = useRouter();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.3);

  useEffect(() => {
    // Fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-navigate to main app after 2.5 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        router.replace('/login');
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Sprout size={64} color="#ffffff" strokeWidth={2.5} />
          </View>
        </View>

        {/* App Name */}
        <Text style={styles.appName}>Tanim</Text>
        <Text style={styles.tagline}>Smart Farming Solutions</Text>

        {/* Decorative Elements */}
        <View style={styles.decorativeBar} />
      </Animated.View>

      {/* Bottom Text */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.footerText}>Empowering Filipino Farmers</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#84c059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  logoContainer: {
    marginBottom: 8,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  appName: {
    fontSize: 44,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.3,
  },
  decorativeBar: {
    width: 64,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default Index;
