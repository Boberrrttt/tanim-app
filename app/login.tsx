import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginFarmer, loginAdmin } from '@/services/auth.service';
import { setUserData } from '@/services/token.service';
import { Eye, EyeOff, Sprout } from 'lucide-react-native';

const LoginScreen = () => {
  const router = useRouter()
  const [idInput, setIdInput] = useState('');
  const [pwInput, setPwInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!idInput.trim() || !pwInput.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      const farmerResponse = await loginFarmer({
        username: idInput,
        password: pwInput,
      });

      if (farmerResponse.status === 'success') {
        if (farmerResponse.data) {
          await setUserData({
            ...farmerResponse.data,
            role: 'farmer',
          });
        }
        
        Alert.alert('Success', 'Login successful!');
        router.push('/(tabs)/farmer');
        return;
      }
    } catch (error: any) {
      console.log('Farmer login failed:', error.message);
    } finally {
      setIsLoading(false);
    }

    Alert.alert('Error', 'Invalid username or password. Please try again.');
  } 

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Sprout size={60} color="#ffffff" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>CropWise</Text>
                <Text style={styles.subtitle}>Multi-Cropping Assistant</Text>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Welcome Text */}
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeTitle}>Welcome to CropWise</Text>
                <Text style={styles.welcomeSubtitle}>
                  Your partner for sustainable multicropping
                </Text>
              </View>

              {/* Input Fields */}
              <View style={styles.inputsContainer}>
                {/* User ID Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>User ID</Text>
                  <View style={[styles.inputWrapper, idInput && styles.inputFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your identification"
                      placeholderTextColor="#847062"
                      value={idInput}
                      onChangeText={setIdInput}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputWrapper, pwInput && styles.inputFocused]}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter your password"
                      placeholderTextColor="#847062"
                      value={pwInput}
                      onChangeText={setPwInput}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                      {showPw ? (
                        <Eye size={18} color="#847062" />
                      ) : (
                        <EyeOff size={18} color="#847062" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleLogin}
                disabled={isLoading}
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
    backgroundColor: '#f3eee6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    backgroundColor: '#84c059',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    padding: 8,
    marginRight: 16,
  },
  headerText: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  formSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 24,
    gap: 24,
  },
  welcomeContainer: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#2e251f',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#847062',
  },
  inputsContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#2e251f',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8e3d9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  inputFocused: {
    borderColor: '#84c059',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#2e251f',
  },
  passwordInput: {
    marginRight: 8,
  },
  button: {
    backgroundColor: '#84c059',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a5c78a',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
});

export default LoginScreen;
