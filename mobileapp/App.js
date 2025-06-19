import React, { useState, useEffect, Component } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Home from './pages/Home';
import AuthForm from './pages/AuthForm';
import Register from './pages/Register';
import SeekerProfile from './pages/SeekerProfile';
import ProviderProfile from './pages/ProviderProfile';
import SeekerDashboard from './pages/SeekerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import JobsList from './pages/JobsList';
import { JobsProvider } from './components/context';

const Stack = createStackNavigator();

// ✅ Custom Themes
const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f5f5f5',
    card: '#fff',
    text: '#333',
    primary: '#007AFF',
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1a1a1a',
    card: '#2a2a2a',
    text: '#fff',
    primary: '#00cc99',
  },
};

// ✅ Error Boundary for safe rendering
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    console.log('Error caught:', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error details:', error, errorInfo);
  }

  render() {
    const { isDarkMode } = this.props;
    if (this.state.hasError) {
      return (
        <View
          style={[
            styles.errorContainer,
            isDarkMode ? styles.darkErrorContainer : styles.lightErrorContainer,
          ]}
        >
          <Text
            style={[
              styles.errorText,
              isDarkMode ? styles.darkErrorText : styles.lightErrorText,
            ]}
          >
            Oops! Something went wrong: {this.state.error?.message}
          </Text>
          <Text
            style={[
              styles.errorSubText,
              isDarkMode ? styles.darkErrorText : styles.lightErrorText,
            ]}
          >
            Please try refreshing the app.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [initialRoute, setInitialRoute] = useState('JobsList');
  const [loading, setLoading] = useState(true);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  useEffect(() => {
  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('role');
      // console.log("token", token);
      // console.log("role", role);

      if (token && role) {
        if (role === 'seeker') {
          setInitialRoute('SeekerDashboard');
        } else if (role === 'provider') {
          setInitialRoute('ProviderDashboard');
        } else if (role === 'admin') {
          setInitialRoute('AdminDashboard');
        } else {
          setInitialRoute('JobsList');
        }
      } else {
        setInitialRoute('JobsList');
      }
    } catch (err) {
      console.error('Error reading token:', err);
      setInitialRoute('JobsList');
    } finally {
      setLoading(false);
    }
  };

  checkToken();
}, []);

  // if (loading) {
  //   // Optional: Replace with your custom splash screen
  //   return (
  //     <View style={styles.splashContainer}>
  //       <Text style={styles.splashText}>Loading...</Text>
  //     </View>
  //   );
  // }
  

  return (
    <JobsProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer
          theme={isDarkMode ? CustomDarkTheme : CustomLightTheme}
        >
          <ErrorBoundary isDarkMode={isDarkMode}>
            <View
              style={[
                styles.container,
                isDarkMode ? styles.darkContainer : styles.lightContainer,
              ]}
            >
              <Stack.Navigator initialRouteName={initialRoute}>
                <Stack.Screen
                  name="JobsList"
                  options={{ headerShown: false }}
                  children={props => (
                    <JobsList
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
                <Stack.Screen
                  name="Home"
                  options={{ headerShown: false, headerLeft: () => null }}
                  children={props => (
                    <Home
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
                <Stack.Screen
                  name="AuthForm"
                  options={{ headerShown: false }}
                  children={props => (
                    <AuthForm
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
                <Stack.Screen
                  name="Register"
                  options={{ headerShown: false }}
                  children={props => (
                    <Register
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
                <Stack.Screen
                  name="SeekerProfile"
                  options={{ headerShown: false }}
                  children={props => (
                    <SeekerProfile
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
                <Stack.Screen
                  name="ProviderProfile"
                  options={{ headerShown: false }}
                  children={props => (
                    <ProviderProfile
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
                <Stack.Screen
                  name="SeekerDashboard"
                  options={{ headerShown: false }}
                  children={props => (
                    <SeekerDashboard
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
                <Stack.Screen
                  name="ProviderDashboard"
                  options={{ headerShown: false }}
                  children={props => (
                    <ProviderDashboard
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
                <Stack.Screen
                  name="AdminDashboard"
                  options={{ headerShown: false }}
                  children={props => (
                    <AdminDashboard
                      {...props}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  )}
                />
              </Stack.Navigator>
            </View>
          </ErrorBoundary>
        </NavigationContainer>
      </GestureHandlerRootView>
    </JobsProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#f5f5f5' },
  darkContainer: { backgroundColor: '#1a1a1a' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lightErrorContainer: { backgroundColor: '#fff' },
  darkErrorContainer: { backgroundColor: '#000' },
  errorText: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  errorSubText: { fontSize: 16 },
  lightErrorText: { color: '#333' },
  darkErrorText: { color: '#fff' },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  splashText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
