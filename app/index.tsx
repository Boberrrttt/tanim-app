import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/design-tokens';

export type RootStackParamList = {
  Login: undefined;
  Farmer: undefined;
  Admin: undefined;
  History: undefined;
  AI: undefined;
};

const Index = () => {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        router.replace('/login');
      });
    }, 2200);

    return () => clearTimeout(timer);
  }, [router, fadeAnim, translateY]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.heroIcon}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.heroLogoImage}
            resizeMode="contain"
            accessibilityLabel="Tanim logo"
          />
        </View>

        <Text style={styles.appName}>Tanim</Text>
        <Text style={styles.tagline}>Smart Farming Solutions</Text>

        <View style={styles.decorativeBar} />
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.footerText}>Empowering Filipino Farmers</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroLogoImage: {
    width: 48,
    height: 48,
  },
  appName: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  decorativeBar: {
    width: 48,
    height: 3,
    backgroundColor: colors.primaryAlpha30,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: spacing['4xl'],
  },
  footerText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
  },
});

export default Index;
