import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Sprout, LogOut } from 'lucide-react-native';
import { colors, spacing, fontFamily, fontSize, radius } from '@/constants/design-tokens';

interface AppHeaderProps {
  title: string;
  subtitle: string;
  onLogout: () => void;
  logoutLabel?: string;
}

/** CropWise PageHeader pattern: sticky bar, border-b-2, card background, brand + ghost actions */
export function AppHeader({ title, subtitle, onLogout, logoutLabel = 'Logout' }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.left}>
          <Sprout size={28} color={colors.primary} strokeWidth={2.5} />
          <View style={styles.textWrapper}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onLogout}
          activeOpacity={0.75}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityLabel={logoutLabel}
          accessibilityRole="button"
        >
          <LogOut size={22} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  inner: {
    maxWidth: 672,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  textWrapper: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
