import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react-native';
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  shadow,
  spacing,
} from '@/constants/design-tokens';

export type AppDialogVariant = 'default' | 'success' | 'error' | 'warning';

export type AppDialogButton = {
  label: string;
  variant?: 'default' | 'primary' | 'destructive' | 'ghost';
  /** Called first; use `dismiss` to close the dialog (call when your async work finishes if needed). */
  onPress: (dismiss: () => void) => void;
};

export type ShowAppDialogOptions = {
  title: string;
  message?: string;
  variant?: AppDialogVariant;
  /** Omit for a single primary “OK” that dismisses. */
  buttons?: AppDialogButton[];
};

type DialogState = ShowAppDialogOptions | null;

type AppDialogContextValue = {
  showDialog: (options: ShowAppDialogOptions) => void;
  dismissDialog: () => void;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function useAppDialog(): AppDialogContextValue {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }
  return ctx;
}

function VariantIcon({ variant }: { variant: AppDialogVariant }) {
  const common = { size: 28, strokeWidth: 2.2 } as const;
  switch (variant) {
    case 'success':
      return <CheckCircle2 {...common} color={colors.success} />;
    case 'error':
      return <AlertCircle {...common} color={colors.destructive} />;
    case 'warning':
      return <AlertTriangle {...common} color={colors.warning} />;
    default:
      return <Info {...common} color={colors.primary} />;
  }
}

function AppDialogShell({
  visible,
  state,
  onDismiss,
}: {
  visible: boolean;
  state: DialogState;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxCardWidth = Math.min(400, width - spacing.lg * 2);

  if (!state) return null;

  const variant = state.variant ?? 'default';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.scrim}
        onPress={state.buttons.length === 1 ? onDismiss : undefined}
        accessibilityLabel="Dismiss dialog backdrop"
      >
        <Pressable
          style={[styles.cardWrap, { maxWidth: maxCardWidth }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.card,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) },
              shadow.lg ?? {},
            ]}
          >
            <View style={[styles.accentBar, accentBarStyle[variant]]} />
            <View style={styles.cardInner}>
              <View style={styles.headerRow}>
                <View style={[styles.iconCircle, iconCircleStyle[variant]]}>
                  <VariantIcon variant={variant} />
                </View>
                <View style={styles.titleBlock}>
                  <Text style={styles.title} numberOfLines={3}>
                    {state.title}
                  </Text>
                </View>
              </View>
              {state.message ? (
                <ScrollView
                  style={styles.messageScroll}
                  contentContainerStyle={styles.messageScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.message}>{state.message}</Text>
                </ScrollView>
              ) : null}
              <View style={styles.actions}>
                {state.buttons.map((btn, i) => (
                  <Pressable
                    key={`${btn.label}-${i}`}
                    onPress={() => btn.onPress(onDismiss)}
                    style={({ pressed }) => [
                      styles.btn,
                      btn.variant === 'destructive' && styles.btnDestructive,
                      btn.variant === 'primary' && styles.btnPrimary,
                      btn.variant === 'ghost' && styles.btnGhost,
                      (btn.variant === 'default' || !btn.variant) && styles.btnDefault,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={btn.label}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        btn.variant === 'destructive' && styles.btnTextOnColor,
                        btn.variant === 'primary' && styles.btnTextOnColor,
                        btn.variant === 'ghost' && styles.btnTextGhost,
                      ]}
                      numberOfLines={2}
                    >
                      {btn.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const accentBarStyle: Record<AppDialogVariant, { backgroundColor: string }> = {
  default: { backgroundColor: colors.primary },
  success: { backgroundColor: colors.success },
  error: { backgroundColor: colors.destructive },
  warning: { backgroundColor: colors.warning },
};

const iconCircleStyle: Record<AppDialogVariant, { backgroundColor: string }> = {
  default: { backgroundColor: colors.primaryAlpha15 },
  success: { backgroundColor: colors.successLight },
  error: { backgroundColor: colors.dangerLight },
  warning: { backgroundColor: colors.warningLight },
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(47, 36, 29, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  cardWrap: {
    width: '100%',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  cardInner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
    lineHeight: fontSize.xl * 1.25,
  },
  messageScroll: {
    maxHeight: 220,
  },
  messageScrollContent: {
    paddingBottom: spacing.xs,
  },
  message: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: fontSize.md * 1.45,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  btnDefault: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  btnDestructive: {
    backgroundColor: colors.destructive,
    borderColor: colors.destructive,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    textAlign: 'center',
  },
  btnTextOnColor: {
    color: colors.primaryForeground,
  },
  btnTextGhost: {
    color: colors.mutedForeground,
    fontFamily: fontFamily.medium,
  },
});

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(null);

  const dismissDialog = useCallback(() => {
    setState(null);
  }, []);

  const showDialog = useCallback((options: ShowAppDialogOptions) => {
    const buttons =
      options.buttons && options.buttons.length > 0
        ? options.buttons
        : [{ label: 'OK', variant: 'primary' as const, onPress: (d: () => void) => d() }];
    setState({ ...options, buttons });
  }, []);

  const value = useMemo(
    () => ({ showDialog, dismissDialog }),
    [showDialog, dismissDialog]
  );

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <AppDialogShell visible={!!state} state={state} onDismiss={dismissDialog} />
    </AppDialogContext.Provider>
  );
}
