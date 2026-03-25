/**
 * Design tokens aligned with CropWise (remix-of-cropwise-mobile-48 / DESIGN.md).
 * HSL semantic palette converted to hex for React Native.
 */

import { Platform } from 'react-native';

/** Spacing scale (px) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

/** Border radius — base 12px (--radius 0.75rem); md/sm follow shadcn calc */
export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

/** Typography — Inter (DESIGN.md) */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 22,
  '3xl': 28,
  '4xl': 32,
  '5xl': 48,
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.75,
} as const;

export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
    default: {},
  }),
  nav: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: { elevation: 12 },
    default: {},
  }),
  accent: Platform.select({
    ios: {
      shadowColor: '#7ebc5c',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }),
} as const;

/** CropWise semantic colors (from DESIGN.md :root) */
export const colors = {
  background: '#f3eee7',
  foreground: '#2f241d',
  card: '#ffffff',
  cardForeground: '#2f241d',

  primary: '#7ebc5c',
  primaryForeground: '#ffffff',
  primaryDisabled: 'rgba(126, 188, 92, 0.45)',

  primaryAlpha10: 'rgba(126, 188, 92, 0.1)',
  primaryAlpha15: 'rgba(126, 188, 92, 0.15)',
  primaryAlpha20: 'rgba(126, 188, 92, 0.2)',
  primaryAlpha30: 'rgba(126, 188, 92, 0.3)',
  primaryAlpha40: 'rgba(126, 188, 92, 0.4)',

  secondary: '#f3eee7',
  secondaryForeground: '#2f241d',

  muted: '#e7e1da',
  mutedForeground: '#816e65',

  accent: '#7ebc5c',
  accentForeground: '#ffffff',

  destructive: '#ef4343',
  destructiveForeground: '#ffffff',

  border: '#dad2c8',
  input: '#dad2c8',
  ring: '#7ebc5c',

  success: '#16a249',
  successLight: '#e4fbed',
  warning: '#f59f0a',
  warningLight: '#fef3c8',
  info: '#3c83f6',
  infoLight: '#dcebfe',
  dangerLight: '#fee1e1',

  black: '#000000',
  white: '#ffffff',

  /** Legacy aliases used across screens — map to semantic tokens */
  textPrimary: '#2f241d',
  textSecondary: '#816e65',
  textMuted: '#816e65',
  textTertiary: '#816e65',
  textPlaceholder: '#816e65',

  statusSuccess: '#e4fbed',
  statusSuccessText: '#16a249',
  statusInfo: '#dcebfe',
  statusWarning: '#f59f0a',

  greenLight: '#e4fbed',
  greenMuted: '#f3eee7',
  greenBorder: 'rgba(126, 188, 92, 0.35)',
  greenAccent: '#16a249',
  greenDark: '#14532d',
  greenText: '#16a249',
  greenTextBold: '#166534',

  borderLight: '#dad2c8',
  borderMuted: '#e7e1da',
  divider: '#dad2c8',

  overlayLight: 'rgba(255, 255, 255, 0.1)',
  overlayMedium: 'rgba(255, 255, 255, 0.2)',
  overlayStrong: 'rgba(255, 255, 255, 0.6)',
  overlayGreen: 'rgba(126, 188, 92, 0.35)',
} as const;
