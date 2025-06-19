// O:\JobConnector\mobileapp\pages\AuthForm.js
import React, { useContext, useEffect, useState } from 'react'; // React core
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native'; // RN components
import { useNavigation } from '@react-navigation/native'; // Navigation hook
import { requestOTP, verifyOTP } from '../utils/api'; // API functions
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobsContext } from '../components/context';
import Header from '../components/Header';
import Footer from '../components/Footer';

// AuthForm component with email OTP support
export default function AuthForm({ isDarkMode, toggleDarkMode, route }) {
  const [contact, setContact] = useState(''); // WhatsApp or email input
  const [otp, setOtp] = useState(''); // OTP input
  const [otpSent, setOtpSent] = useState(false); // Tracks OTP request
  const [message, setMessage] = useState(''); // Message display
  const [serverOtp, setServerOtp] = useState(''); // Server OTP (unused in live mode)
  const navigation = useNavigation(); // Navigation instance
  const { role } = route.params || {}; // Role from Home.js
  const [requestScale] = useState(new Animated.Value(1)); // Animation for request button
  const [verifyScale] = useState(new Animated.Value(1)); // Animation for verify button
  const [bypassScale] = useState(new Animated.Value(1)); // Animation for bypass button
  const { userState, setUserState, globalState, setGlobalHandle, isAuthenticated, setIsAuthenticated } = useContext(JobsContext)

  // Handle requesting OTP
  const handleRequestOTP = async () => {
    if (!contact) {
      setMessage('Please enter a WhatsApp number or email');
      return;
    }
    if (!role) {
      setMessage('Role not specified');
      return;
    }
    try {
      const isEmail = contact.includes('@');
      const payload = isEmail ? { email: contact, role, loginRequest: true } : { whatsappNumber: contact, role, loginRequest: true };
      const response = await requestOTP(payload); // Live backend call
      setMessage(response.data.message); // Show message
      setOtpSent(true); // Mark OTP sent
      setServerOtp(response.data.serverOtp);
      // console.log("request otp respone", response);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error requesting OTP');
    }
  };

  // Handle verifying OTP
  const handleVerifyOTP = async () => {
    if (!otp) {
      setMessage('Please enter the OTP');
      return;
    }
    try {
      const isEmail = contact.includes('@');
      const payload = {
        ...(isEmail ? { email: contact } : { whatsappNumber: contact }),
        otp,
        role,
        bypass: false,
        serverOtp: serverOtp,
      };
      const response = await verifyOTP(payload); // Live backend call
      setMessage(response.data.message); // Show message
      if (response.data.success) {
        navigation.navigate(role === 'seeker' ? 'SeekerDashboard' : role === 'provider' ? 'ProviderDashboard' : 'AdminDashboard', { user: response.data.user, contact });
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error verifying OTP');
    }
  };

  // Handle bypass for testing (optional, can remove in production)

  const handleBypassOTP = async () => {
    if (!contact) {
      setMessage('Please enter a WhatsApp number or email');
      return;
    }

    try {
      const isEmail = contact.includes('@');
      const payload = {
        ...(isEmail ? { email: contact } : { whatsappNumber: contact }),
        otp: 'bypass',
        role,
        bypass: true,
      };

      const response = await verifyOTP(payload); // Live backend call
      setMessage(response.data.message); // Show message

      if (response.data.success) {

        // Save user details in AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

        await AsyncStorage.setItem('token', response.data.token);
        setUserState(response.data.user);

        setIsAuthenticated(true)  // ✅ 1) Update state immediately!
        // Now read it back:

        const savedToken = await AsyncStorage.getItem('token');
        // console.log("Token from AsyncStorage:", savedToken);

        // Navigate to the correct screen
        navigation.navigate(
          response.data.isNewUser ? 'Register' :
            role === 'seeker' ? 'SeekerDashboard' :
              role === 'provider' ? 'ProviderDashboard' : 'AdminDashboard',
          { user: response.data.user, contact }
        );
      }
    } catch (error) {
      setMessage('Error bypassing OTP: ' + error.message);
    }
  };

  // Animation handlers
  const handlePressIn = (scale) => { Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start(); };
  const handlePressOut = (scale) => { Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start(); };

  // Render UI
  return (

    <>
      <Header title="Login" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
        <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
          Login as {role === 'seeker' ? 'Job Seeker' : role === 'provider' ? 'Job Provider' : 'Admin'}
        </Text>
        <TextInput
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
          value={contact}
          onChangeText={setContact}
          placeholder="WhatsApp number or email"
          placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
          editable={!otpSent}
        />
        {otpSent ? (
          <>
            <TextInput
              style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={handleVerifyOTP}
              onPressIn={() => handlePressIn(verifyScale)}
              onPressOut={() => handlePressOut(verifyScale)}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.buttonInner, { transform: [{ scale: verifyScale }] }]}>
                <Text style={styles.buttonText}>Verify OTP</Text>
              </Animated.View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={handleRequestOTP}
              onPressIn={() => handlePressIn(requestScale)}
              onPressOut={() => handlePressOut(requestScale)}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.buttonInner, { transform: [{ scale: requestScale }] }]}>
                <Text style={styles.buttonText}>Request OTP</Text>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={handleBypassOTP}
              onPressIn={() => handlePressIn(bypassScale)}
              onPressOut={() => handlePressOut(bypassScale)}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.buttonInner, { transform: [{ scale: bypassScale }] }]}>
                <Text style={styles.buttonText}>Bypass OTP (Test)</Text>
              </Animated.View>
            </TouchableOpacity>
          </>
        )}
        {message && <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>{message}</Text>}
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.link, isDarkMode ? styles.darkText : styles.lightText]}>
            New user? Register here
          </Text>
        </TouchableOpacity>
      </View>
      <Footer isDarkMode={isDarkMode} />
    </>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#111' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 },
  lightInput: { borderColor: '#ccc', color: '#000' },
  darkInput: { borderColor: '#555', color: '#ddd', backgroundColor: '#333' },
  button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
  lightButton: { backgroundColor: '#007AFF' },
  darkButton: { backgroundColor: '#005BB5' },
  buttonInner: { padding: 5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  message: { marginVertical: 10, textAlign: 'center' },
  link: { textAlign: 'center', marginTop: 20 },
  lightText: { color: '#000' },
  darkText: { color: '#ddd' }
});