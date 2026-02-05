import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getWatchlist, getStrategies, getStockQuote } from '../services/api';

const screenWidth = Dimensions.get('window').width;

const HomeScreen = ({ navigation }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [watchlistData, strategiesData] = await Promise.all([
        getWatchlist().catch(() => []),
        getStrategies('active').catch(() => []),
      ]);
      setWatchlist(watchlistData.length > 0 ? watchlistData : getMockWatchlist());
      setStrategies(strategiesData.length > 0 ? strategiesData : getMockStrategies());
    } catch (error) {
      console.error('Load error:', error);
      setWatchlist(getMockWatchlist());
      setStrategies(getMockStrategies());
    }
  };

  const getMockWatchlist = () => [
    { symbol: 'AAPL', price: 185.50, change: 2.35, change_percent: '1.28' },
    { symbol: 'MSFT', price: 378.90, change: -1.20, change_percent: '-0.32' },
    { symbol: 'NVDA', price: 495.20, change: 12.80, change_percent: '2.65' },
    { symbol: 'TSLA', price: 248.50, change: -5.40, change_percent: '-2.13' },
    { symbol: 'SPY', price: 475.30, change: 3.20, change_percent: '0.68' },
  ];

  const getMockStrategies = () => [
    { id: '1', name: 'AAPL Iron Condor', ticker: 'AAPL', status: 'active', created_at: new Date().toISOString() },
    { id: '2', name: 'NVDA Bull Call', ticker: 'NVDA', status: 'active', created_at: new Date().toISOString() },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const chartData = {
    labels: ['9:30', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00'],
    datasets: [{ data: [475, 476, 474, 477, 476, 478, 477, 479], strokeWidth: 2 }],
  };

  const renderWatchlistItem = ({ item }) => {
    const isPositive = parseFloat(item.change_percent || item.change) >= 0;
    return (
      <TouchableOpacity
        style={styles.watchlistItem}
        onPress={() => navigation.navigate('Strategy', { ticker: item.symbol })}
      >
        <Text style={styles.watchlistSymbol}>{item.symbol}</Text>
        <Text style={styles.watchlistPrice}>${item.price?.toFixed(2)}</Text>
        <Text style={[styles.watchlistChange, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}{item.change_percent || item.change}%
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStrategyItem = ({ item }) => (
    <TouchableOpacity
      style={styles.strategyItem}
      onPress={() => navigation.navigate('Analysis', { strategy: item })}
    >
      <View style={styles.strategyHeader}>
        <Text style={styles.strategyName}>{item.name}</Text>
        <View style={[styles.statusBadge, item.status === 'active' && styles.activeBadge]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.strategyTicker}>{item.ticker}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}
    >
      {/* Market Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Market Overview</Text>
          <View style={styles.timeframes}>
            {['1D', '1W', '1M'].map(tf => (
              <TouchableOpacity
                key={tf}
                style={[styles.timeframeBtn, selectedTimeframe === tf && styles.timeframeActive]}
                onPress={() => setSelectedTimeframe(tf)}
              >
                <Text style={[styles.timeframeText, selectedTimeframe === tf && styles.timeframeTextActive]}>
                  {tf}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <LineChart
          data={chartData}
          width={screenWidth - 48}
          height={180}
          chartConfig={{
            backgroundColor: '#1e293b',
            backgroundGradientFrom: '#1e293b',
            backgroundGradientTo: '#1e293b',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
            propsForDots: { r: '0' },
          }}
          bezier
          style={styles.chart}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          withDots={false}
        />
      </View>

      {/* Watchlist */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Watchlist</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={watchlist}
          renderItem={renderWatchlistItem}
          keyExtractor={item => item.symbol}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Active Strategies */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Strategies</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Strategy')}>
            <Text style={styles.seeAll}>+ New</Text>
          </TouchableOpacity>
        </View>
        {strategies.length > 0 ? (
          <FlatList
            data={strategies}
            renderItem={renderStrategyItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active strategies</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('Strategy')}>
              <Text style={styles.createBtnText}>Create Strategy</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Strategy')}>
            <Text style={styles.actionIcon}>📈</Text>
            <Text style={styles.actionText}>New Strategy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Analysis')}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionText}>Analyze</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Analysis', { screen: 'WhatIf' })}>
            <Text style={styles.actionIcon}>❓</Text>
            <Text style={styles.actionText}>What-If</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  section: {
    margin: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  seeAll: {
    fontSize: 14,
    color: '#60a5fa',
    fontWeight: '600',
  },
  timeframes: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 2,
  },
  timeframeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeframeActive: {
    backgroundColor: '#1e40af',
  },
  timeframeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#fff',
  },
  chart: {
    borderRadius: 12,
    marginTop: 8,
  },
  watchlistItem: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  watchlistSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  watchlistPrice: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  watchlistChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  strategyItem: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  activeBadge: {
    backgroundColor: '#166534',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  strategyTicker: {
    fontSize: 14,
    color: '#60a5fa',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  createBtn: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
});

export default HomeScreen;
