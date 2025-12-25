import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import StrategyScreen from './src/screens/StrategyScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import components
import StrategyForm from './src/components/StrategyForm';

// Import services
import { isAuthenticated } from './src/services/auth';

// Tab and Stack navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack Navigator
const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
    </Stack.Navigator>
  );
};

// Strategy Stack Navigator
const StrategyStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="StrategyMain" 
        component={StrategyScreen}
        options={{ title: 'Strategy Builder' }}
      />
      <Stack.Screen 
        name="StrategyForm" 
        component={StrategyForm}
        options={{ 
          title: 'Configure Option',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

// Analysis Stack Navigator
const AnalysisStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="AnalysisMain" 
        component={AnalysisScreen}
        options={{ title: 'Analysis' }}
      />
    </Stack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};

// Tab Icons Component (using emoji for simplicity - replace with icon library)
const TabIcon = ({ name, focused }) => {
  const icons = {
    Home: focused ? '🏠' : '🏘️',
    Strategy: focused ? '📊' : '📈',
    Analysis: focused ? '🔍' : '🔎',
    Profile: focused ? '👤' : '👥',
  };
  
  return (
    <View style={styles.tabIcon}>
      <View style={[styles.iconText, focused && styles.iconTextFocused]}>
        {icons[name] && <View>{icons[name]}</View>}
      </View>
    </View>
  );
};

// Main Tab Navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Strategy" 
        component={StrategyStack}
        options={{ title: 'Strategy' }}
      />
      <Tab.Screen 
        name="Analysis" 
        component={AnalysisStack}
        options={{ title: 'Analysis' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Login Screen (Simple placeholder - replace with your actual login screen)
const LoginScreen = ({ navigation }) => {
  const handleLogin = async () => {
    // Mock login - replace with actual authentication
    await AsyncStorage.setItem('token', 'mock-token');
    navigation.replace('Main');
  };

  useEffect(() => {
    // Auto-login for development
    handleLogin();
  }, []);

  return (
    <View style={styles.loginContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// Main App Component
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await isAuthenticated();
      setUserToken(authenticated ? 'token' : null);
    } catch (error) {
      console.error('Auth check error:', error);
      setUserToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  iconTextFocused: {
    transform: [{ scale: 1.1 }],
  },
});

export default App;


