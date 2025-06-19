import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';

const Header = ({ title, toggleDarkMode, isDarkMode }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const canGoBack = navigation.canGoBack();
  const shineAnim = useRef(new Animated.Value(1)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // Dark Mode Toggle Animation
  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(shineAnim, {
        toValue: 1.5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shineAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    toggleDarkMode();
  };

  // Logout Function
  const handleLogout = async () => {
    try {
      // await AsyncStorage.removeItem('token');
      // await AsyncStorage.removeItem('userRole');
      navigation.reset({
        index: 0,
        routes: [{ name: 'JobsList' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  // Edit Profile Function
  const handleEditProfile = () => {
    setModalVisible(false);
    if (route.name === 'SeekerDashboard') {
      navigation.navigate('SeekerProfile', { user: route.params?.user });
    } else if (route.name === 'ProviderDashboard') {
      navigation.navigate('ProviderProfile', { user: route.params?.user });
    }
  };

  // Handle Settings Click
  const handleSettingsPress = () => {
    if (route.name === 'SeekerDashboard' || route.name === 'ProviderDashboard') {
      setModalVisible(true);
    } else {
      navigation.navigate('AuthForm', { role: 'admin' });
    }
  };

  return (
    <View style={[styles.header, isDarkMode ? styles.darkHeader : styles.lightHeader]}>
      {canGoBack && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={isDarkMode ? '#ddd' : '#fff'} />
        </TouchableOpacity>
      )}
      <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
        {title || 'JobConnector'}
      </Text>
      <View style={styles.rightContainer}>
        {/* Dark Mode Toggle */}
        <TouchableOpacity 
          onPress={handleToggle} 
          style={[
            styles.modeButton, 
            isDarkMode ? styles.darkModeButton : styles.lightModeButton,
          ]}
        >
          <Animated.View style={{ transform: [{ scale: shineAnim }] }}>
            <View style={styles.bulbContainer}>
              <Icon 
                name={isDarkMode ? 'lightbulb-outline' : 'lightbulb'} 
                size={24} 
                color={isDarkMode ? '#ddd' : '#ffd700'}
              />
              {!isDarkMode && (
                <Icon 
                  name="flare" 
                  size={30} 
                  color="rgba(255, 215, 0, 0.5)"
                  style={styles.rays}
                />
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Settings Icon */}
        <TouchableOpacity 
          onPress={handleSettingsPress}
          style={styles.settingsButton}
        >
          <Icon name="settings" size={24} color={isDarkMode ? '#ddd' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Settings Dropdown (Only in SeekerDashboard & ProviderDashboard) */}
      {(route.name === 'SeekerDashboard' || route.name === 'ProviderDashboard') && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.option} onPress={handleEditProfile}>
                <Text style={styles.optionText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.option} onPress={handleLogout}>
                <Text style={styles.optionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    paddingTop: 40,
    borderBottomWidth: 1,
  },
  lightHeader: { 
    backgroundColor: '#007AFF', 
    borderBottomColor: '#005BB5' 
  },
  darkHeader: { 
    backgroundColor: '#333', 
    borderBottomColor: '#555' 
  },
  backButton: { 
    padding: 10 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  rightContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  modeButton: { 
    padding: 8, 
    borderWidth: 2, 
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightModeButton: { 
    borderColor: '#fff',
  },
  darkModeButton: { 
    borderColor: '#ffd700',
  },
  settingsButton: { 
    padding: 10,
    marginLeft: 5 
  },
  lightText: { 
    color: '#fff' 
  },
  darkText: { 
    color: '#ddd' 
  },
  bulbContainer: {
    position: 'relative',
  },
  rays: {
    position: 'absolute',
    top: -3,
    left: -3,
    zIndex: -1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: 200,
  },
  option: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default Header;
