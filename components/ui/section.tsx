import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Card } from './card';
import { colors, spacing, fontFamily, fontSize } from '@/constants/design-tokens';

interface SectionProps {
  title: string;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Section({ title, icon: Icon, description, badge, children, style }: SectionProps) {
  return (
    <Card style={[styles.card, style]}>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <View style={styles.header}>
        {Icon && (
          <View style={styles.iconWrapper}>
            <Icon size={24} color={colors.primary} strokeWidth={2} />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      <View style={styles.content}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.primaryForeground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrapper: {
    marginRight: 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
    flex: 1,
  },
  description: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  content: {
    gap: spacing.md,
  },
});
