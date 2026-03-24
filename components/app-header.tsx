import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Sprout, LogOut } from 'lucide-react-native';
import { colors, spacing, fontFamily, fontSize, radius, shadow } from '@/constants/design-tokens';

interface AppHeaderProps {
  title: string;
  subtitle: string;
  onLogout: () => void;
  logoutLabel?: string;
}

export function AppHeader({ title, subtitle, onLogout, logoutLabel = 'Logout' }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.left}>
          <View style={styles.iconWrapper}>
            <Sprout size={28} color={colors.white} strokeWidth={2.5} />
          </View>
          <View style={styles.textWrapper}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.75}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityLabel={logoutLabel}
          accessibilityRole="button"
        >
          <LogOut size={18} color={colors.white} strokeWidth={2} />
          <Text style={styles.logoutText}>{logoutLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md + 4,
    paddingBottom: spacing.lg + 4,
    ...(shadow.md ?? {}),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  iconWrapper: {
    backgroundColor: colors.overlayLight,
    borderRadius: radius.full,
    padding: spacing.sm + 2,
    ...Platform.select({
      ios: { overflow: 'hidden' },
      default: {},
    }),
  },
  textWrapper: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.white,
    opacity: 0.92,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.overlayMedium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
    minWidth: 44,
    borderRadius: radius.lg,
  },
  logoutText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.white,
  },
});
