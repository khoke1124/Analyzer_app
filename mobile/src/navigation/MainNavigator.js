import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import StrategyScreen from '../screens/StrategyScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StrategyFormScreen from '../screens/StrategyFormScreen';
import AdjustmentScreen from '../screens/AdjustmentScreen';
import WhatIfScreen from '../screens/WhatIfScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: '#1e40af',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
};

// Tab Icon Component
const TabIcon = ({ name, focused }) => {
  const icons = {
    Home: '📊',
    Strategy: '📈',
    Analysis: '🔍',
    Profile: '👤',
  };
  
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icons[name]}
      </Text>
    </View>
  );
};

// Stack Navigators
const HomeStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Dashboard' }} />
  </Stack.Navigator>
);

const StrategyStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="StrategyMain" component={StrategyScreen} options={{ title: 'Strategy Builder' }} />
    <Stack.Screen name="StrategyForm" component={StrategyFormScreen} options={{ title: 'Configure Option', presentation: 'modal' }} />
  </Stack.Navigator>
);

const AnalysisStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="AnalysisMain" component={AnalysisScreen} options={{ title: 'Analysis' }} />
    <Stack.Screen name="Adjustment" component={AdjustmentScreen} options={{ title: 'Trade Adjustments' }} />
    <Stack.Screen name="WhatIf" component={WhatIfScreen} options={{ title: 'What-If Scenarios' }} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
  </Stack.Navigator>
);

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Strategy" component={StrategyStack} options={{ title: 'Strategy' }} />
      <Tab.Screen name="Analysis" component={AnalysisStack} options={{ title: 'Analysis' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
  },
  tabIconFocused: {
    transform: [{ scale: 1.15 }],
  },
});

export default MainNavigator;
