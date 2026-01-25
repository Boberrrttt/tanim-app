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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sprout, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const LoginScreen = () => {
  const router = useRouter()
  const [idInput, setIdInput] = useState('');
  const [pwInput, setPwInput] = useState('');
  const [showPw, setShowPw] = useState(false);

  const DEMO_ID_FARMER = 'farmer';
  const DEMO_PW_FARMER = 'farmer123';
  const DEMO_ID_ADMIN = 'admin';
  const DEMO_PW_ADMIN = 'admin123';

  const handleLogin = () => {
    if (idInput === DEMO_ID_FARMER && pwInput === DEMO_PW_FARMER) {
      Alert.alert('Success', 'Login successful!');
      router.push('/(tabs)/farmer');
    } else if (idInput === DEMO_ID_ADMIN && pwInput === DEMO_PW_ADMIN) {
      Alert.alert('Success', 'Login successful!');
    //   router.push('/admin');
    } else {
      Alert.alert('Error', 'Invalid ID or password. Please try again.');
    }
  };

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
              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Continue</Text>
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
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
});

export default LoginScreen;
