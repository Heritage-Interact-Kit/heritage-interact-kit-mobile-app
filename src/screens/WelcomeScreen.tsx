import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { AppConfig } from '../config/app';

const bannerImage = require('../../assets/banner.png');
const logoImage = require('../../assets/logo.png');

export const WelcomeScreen: React.FC = () => {
  const [formType, setFormType] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [logoAspectRatio, setLogoAspectRatio] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const { login, signup } = useAuth();

  useEffect(() => {
    const source = Image.resolveAssetSource(logoImage);
    if (source) {
      Image.getSize(
        source.uri,
        (width, height) => {
          if (height > 0) {
            setLogoAspectRatio(width / height);
          }
        },
        error => {
          console.error('Failed to get logo size:', error);
        },
      );
    }
  }, []);

  const handleSubmit = async () => {
    if (formType === 'login') {
      if (!formData.email || !formData.password) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    } else {
      // Signup
      if (!formData.email || !formData.password || !formData.name) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (formType === 'login') {
        await login(formData.email, formData.password);
      } else {
        const username = formData.email.split('@')[0];
        await signup(formData.email, formData.password, formData.name, username);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderLoginForm = () => (
    <View style={styles.container}>
      <ImageBackground source={bannerImage} style={styles.banner}>
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.bannerOverlay}
        />
        <View style={styles.bannerContent}>
          <Image source={logoImage} style={[styles.logo, { aspectRatio: logoAspectRatio }]} />
          <Text style={styles.title}>{AppConfig.appName}</Text>
          <Text style={styles.subtitle}>Discover Heritage in UCL</Text>
        </View>
      </ImageBackground>
      
      <View style={styles.formContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue your heritage journey</Text>
          </View>

          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            placeholderTextColor="#9ca3af"
            value={formData.email}
            onChangeText={text => updateFormData('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            value={formData.password}
            onChangeText={text => updateFormData('password', text)}
            secureTextEntry
          />
          
          <TouchableOpacity>
            <Text style={[styles.forgotPassword, { color: AppConfig.colors.accent }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.submitButton, 
              { backgroundColor: AppConfig.colors.primary },
              isLoading && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>SIGN IN</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.switchFormButton}
            onPress={() => setFormType('signup')}
          >
            <Text style={styles.switchFormText}>
              Don't have an account?{' '}
              <Text style={[styles.switchFormTextHighlight, { color: AppConfig.colors.accent }]}>
                CREATE ACCOUNT
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );

  const renderSignupForm = () => (
    <View style={[styles.container, styles.signupContainer]}>
      <LinearGradient
        colors={[AppConfig.colors.primary, AppConfig.colors.accent]}
        style={styles.signupHeader}
      >
        <View style={styles.signupHeaderContent}>
          <TouchableOpacity onPress={() => setFormType('login')} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.signupTitle}>Create Account</Text>
          <Text style={styles.signupSubtitle}>Join the heritage exploration community</Text>
        </View>
      </LinearGradient>
      
      <View style={[styles.formContainer, styles.signupFormContainer]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#9ca3af"
            value={formData.name}
            onChangeText={text => updateFormData('name', text)}
          />
          
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            placeholderTextColor="#9ca3af"
            value={formData.email}
            onChangeText={text => updateFormData('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a secure password"
            placeholderTextColor="#9ca3af"
            value={formData.password}
            onChangeText={text => updateFormData('password', text)}
            secureTextEntry
          />
          
          <TouchableOpacity
            style={[
              styles.submitButton, 
              { backgroundColor: AppConfig.colors.primary },
              isLoading && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>CREATE ACCOUNT</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.switchFormButton}
            onPress={() => setFormType('login')}
          >
            <Text style={styles.switchFormText}>
              Already have an account?{' '}
              <Text style={[styles.switchFormTextHighlight, { color: AppConfig.colors.accent }]}>
                SIGN IN
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {formType === 'login' ? renderLoginForm() : renderSignupForm()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  banner: {
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  logo: {
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    marginTop: -30,
  },
  formHeader: {
    marginBottom: 30,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  forgotPassword: {
    textAlign: 'right',
    marginBottom: 30,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  switchFormButton: {
    alignItems: 'center',
  },
  switchFormText: {
    color: '#6b7280',
    fontSize: 14,
  },
  switchFormTextHighlight: {
    fontWeight: 'bold',
  },
  signupContainer: {
    backgroundColor: '#f8fafc',
  },
  signupHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  signupHeaderContent: {
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  signupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  signupSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  signupFormContainer: {
    marginTop: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
}); 