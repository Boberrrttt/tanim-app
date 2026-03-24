import { colors } from "@/constants/design-tokens";
import { loginFarmer } from "@/services/auth.service";
import { setUserData } from "@/services/token.service";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Sprout } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const LoginScreen = () => {
  const router = useRouter();
  const [idInput, setIdInput] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!idInput.trim() || !pwInput.trim()) {
      Alert.alert("Error", "Please enter both username and password");
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

        Alert.alert("Success", "Login successful!");
        router.push("/(tabs)/farmer" as any);
        return;
      }
    } catch (error: any) {
      console.log("Farmer login failed:", error.message);
    } finally {
      setIsLoading(false);
    }

    Alert.alert("Error", "Invalid username or password. Please try again.");
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
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.iconWrapper}>
                <Sprout size={48} color="#ffffff" strokeWidth={2} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Tanim</Text>
                <Text style={styles.subtitle}>Multi-Cropping Assistant</Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeTitle}>Welcome to Tanim</Text>
              </View>

              <View style={styles.inputsContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>User ID</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      idInput && styles.inputFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your identification"
                      placeholderTextColor={colors.textPlaceholder}
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
                      pwInput && styles.inputFocused,
                    ]}
                  >
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textPlaceholder}
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
                        <Eye size={20} color={colors.textPlaceholder} />
                      ) : (
                        <EyeOff size={20} color={colors.textPlaceholder} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: "#f3eee6",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    backgroundColor: "#84c059",
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 9999,
    padding: 12,
    marginRight: 16,
  },
  headerText: {
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#ffffff",
    opacity: 0.95,
    marginTop: 2,
  },
  formSection: {
    backgroundColor: "#ffffff",
    padding: 28,
  },
  welcomeContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#2e251f",
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#847062",
    lineHeight: 22,
  },
  inputsContainer: {
    gap: 20,
    marginBottom: 28,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#2e251f",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e8e3d9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fafaf9",
  },
  inputFocused: {
    borderColor: "#84c059",
    backgroundColor: "#ffffff",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#2e251f",
  },
  passwordInput: {
    marginRight: 10,
  },
  button: {
    backgroundColor: "#84c059",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#a5c78a",
  },
  buttonText: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#ffffff",
  },
});

export default LoginScreen;
