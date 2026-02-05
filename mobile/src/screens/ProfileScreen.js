import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/AuthContext';
import { getStrategies } from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: true,
    riskWarnings: true,
    autoSave: true,
  });
  const [stats, setStats] = useState({
    totalStrategies: 0,
    activeStrategies: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load settings
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }

      // Load stats
      const strategies = await getStrategies();
      setStats({
        totalStrategies: strategies.length,
        activeStrategies: strategies.filter(s => s.status === 'active').length,
      });
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const menuItems = [
    { title: 'All Strategies', icon: '📊', screen: 'Strategy' },
    { title: 'Analysis Tools', icon: '🔍', screen: 'Analysis' },
    { title: 'Help & Support', icon: '❓', action: () => Alert.alert('Support', 'Contact: support@optionsanalyzer.com') },
    { title: 'Privacy Policy', icon: '🔒', action: () => Alert.alert('Privacy', 'Privacy policy coming soon') },
    { title: 'Terms of Service', icon: '📋', action: () => Alert.alert('Terms', 'Terms of service coming soon') },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalStrategies}</Text>
          <Text style={styles.statLabel}>Total Strategies</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeStrategies}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingDesc}>Receive alerts and updates</Text>
          </View>
          <Switch
            value={settings.notifications}
            onValueChange={(v) => handleSettingChange('notifications', v)}
            trackColor={{ false: '#334155', true: '#1e40af' }}
            thumbColor="#f8fafc"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Risk Warnings</Text>
            <Text style={styles.settingDesc}>Show risk alerts for trades</Text>
          </View>
          <Switch
            value={settings.riskWarnings}
            onValueChange={(v) => handleSettingChange('riskWarnings', v)}
            trackColor={{ false: '#334155', true: '#1e40af' }}
            thumbColor="#f8fafc"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto-save Strategies</Text>
            <Text style={styles.settingDesc}>Automatically save your work</Text>
          </View>
          <Switch
            value={settings.autoSave}
            onValueChange={(v) => handleSettingChange('autoSave', v)}
            trackColor={{ false: '#334155', true: '#1e40af' }}
            thumbColor="#f8fafc"
          />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => {
              if (item.action) {
                item.action();
              } else if (item.screen) {
                navigation.navigate(item.screen);
              }
            }}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Options Analyzer v1.0.0</Text>
        <Text style={styles.footerText}>© 2025 All rights reserved</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: '#f8fafc',
  },
  menuArrow: {
    fontSize: 20,
    color: '#64748b',
  },
  logoutBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
});

export default ProfileScreen;
