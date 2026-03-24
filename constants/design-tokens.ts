/**
 * Design tokens for consistent UI across the app.
 * Colors are preserved from the existing palette. Do not change.
 */

import { Platform } from 'react-native';

/** Spacing scale (px) - use for padding, margins, gaps */
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

/** Border radius */
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

/** Typography - font families (Plus Jakarta Sans) */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

/** Typography - font sizes */
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

/** Line heights */
export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.75,
} as const;

/** Shadows - cross-platform */
export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
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
    android: { elevation: 8 },
    default: {},
  }),
  accent: Platform.select({
    ios: {
      shadowColor: '#84c059',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }),
} as const;

/** App color palette - DO NOT CHANGE. Preserved from existing app. */
export const colors = {
  // Primary
  primary: '#84c059',
  primaryDisabled: '#a5c78a',

  // Backgrounds
  background: '#f3eee6',
  card: '#ffffff',

  // Text
  textPrimary: '#2e251f',
  textSecondary: '#4a5568',
  textMuted: '#6b7280',
  textTertiary: '#718096',
  textPlaceholder: '#847062',

  // Status
  statusSuccess: '#d1fae5',
  statusSuccessText: '#065f46',
  statusInfo: '#dbeafe',
  statusWarning: '#f59e0b',

  // Greens (soil/crop)
  greenLight: '#eef7e4',
  greenMuted: '#f7faf5',
  greenBorder: '#bbf7d0',
  greenAccent: '#4d7c0f',
  greenDark: '#14532d',
  greenText: '#15803d',
  greenTextBold: '#166534',

  // Neutrals
  border: '#e8e3d9',
  borderLight: '#e5e7eb',
  borderMuted: '#e7e5e4',
  divider: '#e2e8f0',

  // Overlays
  overlayLight: 'rgba(255, 255, 255, 0.1)',
  overlayMedium: 'rgba(255, 255, 255, 0.2)',
  overlayStrong: 'rgba(255, 255, 255, 0.6)',
  overlayGreen: 'rgba(132, 192, 89, 0.35)',

  // Misc
  black: '#000',
  white: '#ffffff',
} as const;
