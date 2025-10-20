import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getWatchlist, getRecentStrategies, getMarketData } from '../services/api';

const HomeScreen = ({ navigation }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [recentStrategies, setRecentStrategies] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data in parallel
      const [watchlistData, strategiesData, marketDataResponse] = await Promise.all([
        getWatchlist().catch(() => []),
        getRecentStrategies().catch(() => []),
        getMarketData().catch(() => []),
      ]);

      setWatchlist(watchlistData);
      setRecentStrategies(strategiesData);
      setMarketData(marketDataResponse);
    } catch (error) {
      console.error('Dashboard load error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderWatchlistItem = ({ item }) => (
    <TouchableOpacity
      style={styles.watchlistItem}
      onPress={() => navigation.navigate('Strategy', { ticker: item.symbol })}
    >
      <View style={styles.watchlistHeader}>
        <Text style={styles.watchlistSymbol}>{item.symbol}</Text>
        <Text style={[
          styles.watchlistChange,
          { color: item.change >= 0 ? '#10b981' : '#ef4444' }
        ]}>
          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
        </Text>
      </View>
      <Text style={styles.watchlistPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
      <Text style={styles.watchlistVolume}>
        Vol: {item.volume ? (item.volume / 1000000).toFixed(1) : '0.0'}M
      </Text>
    </TouchableOpacity>
  );

  const renderRecentStrategy = ({ item }) => (
    <TouchableOpacity
      style={styles.strategyItem}
      onPress={() => navigation.navigate('Analysis', { strategy: item })}
    >
      <View style={styles.strategyHeader}>
        <Text style={styles.strategySymbol}>{item.ticker}</Text>
        <Text style={styles.strategyDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.strategyType}>{item.type || 'Custom Strategy'}</Text>
      <View style={styles.strategyMetrics}>
        <Text style={styles.strategyMetric}>
          Max Profit: ${item.maxProfit?.toFixed(2) || '0.00'}
        </Text>
        <Text style={styles.strategyMetric}>
          Max Loss: ${item.maxLoss?.toFixed(2) || '0.00'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const getMarketChartData = () => {
    if (!marketData || marketData.length === 0) {
      return {
        labels: ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
        datasets: [{
          data: [150, 152, 148, 151, 153, 150],
          strokeWidth: 2,
        }]
      };
    }

    return {
      labels: marketData.map(point => point.time),
      datasets: [{
        data: marketData.map(point => point.value),
        strokeWidth: 2,
      }]
    };
  };

  const timeframes = ['1D', '5D', '1M', '3M', '1Y'];

  // Mock data for demonstration
  const mockWatchlist = [
    { symbol: 'AAPL', price: 150.25, change: 2.1, volume: 45000000 },
    { symbol: 'GOOGL', price: 2750.80, change: -0.8, volume: 15000000 },
    { symbol: 'MSFT', price: 310.45, change: 1.5, volume: 25000000 },
    { symbol: 'TSLA', price: 225.60, change: -3.2, volume: 55000000 },
    { symbol: 'NVDA', price: 480.30, change: 4.7, volume: 35000000 },
  ];

  const mockRecentStrategies = [
    {
      id: 1,
      ticker: 'AAPL',
      type: 'Iron Condor',
      createdAt: new Date().toISOString(),
      maxProfit: 150,
      maxLoss: -350,
    },
    {
      id: 2,
      ticker: 'GOOGL',
      type: 'Bull Call Spread',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      maxProfit: 200,
      maxLoss: -100,
    },
    {
      id: 3,
      ticker: 'MSFT',
      type: 'Straddle',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      maxProfit: 500,
      maxLoss: -250,
    },
  ];

  const displayWatchlist = watchlist.length > 0 ? watchlist : mockWatchlist;
  const displayStrategies = recentStrategies.length > 0 ? recentStrategies : mockRecentStrategies;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Options Analyzer</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
      </View>

      {/* Market Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Market Overview</Text>
          <View style={styles.timeframeSelector}>
            {timeframes.map(tf => (
              <TouchableOpacity
                key={tf}
                style={[
                  styles.timeframeButton,
                  selectedTimeframe === tf && styles.activeTimeframe
                ]}
                onPress={() => setSelectedTimeframe(tf)}
              >
                <Text style={[
                  styles.timeframeText,
                  selectedTimeframe === tf && styles.activeTimeframeText
                ]}>
                  {tf}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <LineChart
          data={getMarketChartData()}
          width={screenWidth - 32}
          height={200}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Watchlist */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Watchlist</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Watchlist')}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={displayWatchlist}
          renderItem={renderWatchlistItem}
          keyExtractor={item => item.symbol}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.watchlistContainer}
        />
      </View>

      {/* Recent Strategies */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Strategies</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Portfolio')}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={displayStrategies}
          renderItem={renderRecentStrategy}
          keyExtractor={item => item.id.toString()}
          scrollEnabled={false}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Strategy')}
          >
            <Text style={styles.actionButtonText}>Create Strategy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Analysis')}
          >
            <Text style={styles.actionButtonText}>Risk Analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Text style={styles.actionButtonText}>Option Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: '#2563eb',
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#dbeafe',
    marginTop: 4,
  },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 2,
  },
  timeframeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeTimeframe: {
    backgroundColor: '#2563eb',
  },
  timeframeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTimeframeText: {
    color: '#fff',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  watchlistContainer: {
    paddingRight: 16,
  },
  watchlistItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    width: 120,
  },
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  watchlistSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  watchlistChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  watchlistPrice: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  watchlistVolume: {
    fontSize: 12,
    color: '#6b7280',
  },
  strategyItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  strategySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  strategyDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  strategyType: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 8,
  },
  strategyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  strategyMetric: {
    fontSize: 12,
    color: '#6b7280',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;