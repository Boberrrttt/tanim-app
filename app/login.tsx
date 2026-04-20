import { colors, fontFamily, fontSize, radius, shadow, spacing } from "@/constants/design-tokens";
import { loginFarmer } from "@/services/auth.service";
import { setUserData } from "@/services/token.service";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Sprout } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppDialog } from "@/contexts/app-dialog-context";

const LoginScreen = () => {
  const router = useRouter();
  const { showDialog } = useAppDialog();
  const [idInput, setIdInput] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!idInput.trim() || !pwInput.trim()) {
      showDialog({
        title: "Missing fields",
        message: "Please enter both username and password.",
        variant: "warning",
      });
      return;
    }

    setIsLoading(true);

    try {
      const farmerResponse = await loginFarmer({
        username: idInput,
        password: pwInput,
      });

      if (farmerResponse.status === "success") {
        if (farmerResponse.data) {
          await setUserData({
            ...farmerResponse.data,
            role: "farmer",
          });
        }

        router.replace("/(tabs)/farmer" as any);
        return;
      }
    } catch (error: any) {
      console.log("Farmer login failed:", error.message);
    } finally {
      setIsLoading(false);
    }

    showDialog({
      title: "Sign-in failed",
      message: "Invalid username or password. Please try again.",
      variant: "error",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <View style={styles.heroBlock}>
              <View style={styles.heroIcon}>
                <Sprout size={32} color={colors.primaryForeground} strokeWidth={2} />
              </View>
              <Text style={styles.appTitle}>Tanim</Text>
              <Text style={styles.appTagline}>Smart Agricultural Management</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.formSection}>
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcomeTitle}>Welcome to Tanim</Text>
                </View>

                <View style={styles.inputsContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Username</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        idInput ? styles.inputFocused : null,
                      ]}
                    >
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your identification"
                        placeholderTextColor={colors.mutedForeground}
                        value={idInput}
                        onChangeText={setIdInput}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        pwInput ? styles.inputFocused : null,
                      ]}
                    >
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.mutedForeground}
                        value={pwInput}
                        onChangeText={setPwInput}
                        secureTextEntry={!showPw}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPw(!showPw)}
                        hitSlop={12}
                      >
                        {showPw ? (
                          <Eye size={20} color={colors.mutedForeground} />
                        ) : (
                          <EyeOff size={20} color={colors.mutedForeground} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.92}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={styles.buttonText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    paddingBottom: spacing["4xl"],
  },
  column: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  heroBlock: {
    alignItems: "center",
    marginBottom: spacing["2xl"],
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  appTitle: {
    fontSize: fontSize["3xl"],
    fontFamily: fontFamily.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  appTagline: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: spacing["2xl"],
    ...(shadow.sm ?? {}),
  },
  formSection: {
    gap: 0,
  },
  welcomeContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  inputsContainer: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.foreground,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  inputFocused: {
    borderColor: colors.ring,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.foreground,
  },
  passwordInput: {
    marginRight: 10,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing["2xl"],
    borderRadius: radius.md,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
    width: "100%",
  },
  buttonDisabled: {
    backgroundColor: colors.primary,
    opacity: 0.55,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primaryForeground,
  },
});

export default LoginScreen;
