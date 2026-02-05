import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getStrategies, analyzeAdjustmentScenarios } from '../services/api';

const screenWidth = Dimensions.get('window').width;

const AnalysisScreen = ({ navigation, route }) => {
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(route?.params?.strategy || null);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);

  useEffect(() => {
    loadStrategies();
  }, []);

  useEffect(() => {
    if (selectedStrategy && selectedStrategy.options?.length > 0) {
      calculateAnalysis();
    }
  }, [selectedStrategy]);

  const loadStrategies = async () => {
    try {
      const data = await getStrategies();
      setStrategies(data);
      if (!selectedStrategy && data.length > 0) {
        setSelectedStrategy(data[0]);
      }
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  };

  const calculateAnalysis = () => {
    if (!selectedStrategy?.options) return;
    
    const options = selectedStrategy.options;
    const currentPrice = 185; // Assume current price
    
    // Calculate Greeks (simplified)
    let totalDelta = 0, totalGamma = 0, totalTheta = 0, totalVega = 0;
    options.forEach(opt => {
      const moneyness = opt.type === 'call' 
        ? (currentPrice - opt.strike) / currentPrice 
        : (opt.strike - currentPrice) / currentPrice;
      const multiplier = opt.action === 'buy' ? 1 : -1;
      
      totalDelta += (opt.type === 'call' ? 0.5 + moneyness : -0.5 + moneyness) * multiplier * opt.quantity;
      totalGamma += 0.05 * multiplier * opt.quantity;
      totalTheta += -0.1 * multiplier * opt.quantity;
      totalVega += 0.15 * multiplier * opt.quantity;
    });
    
    // Calculate payoff curve
    const payoffData = [];
    let maxProfit = -Infinity, maxLoss = Infinity;
    const breakevenPoints = [];
    
    for (let price = currentPrice * 0.7; price <= currentPrice * 1.3; price += 2) {
      let totalPnL = 0;
      options.forEach(opt => {
        const intrinsic = opt.type === 'call' 
          ? Math.max(0, price - opt.strike) 
          : Math.max(0, opt.strike - price);
        const pnl = opt.action === 'buy' 
          ? (intrinsic - opt.premium) * opt.quantity * 100
          : (opt.premium - intrinsic) * opt.quantity * 100;
        totalPnL += pnl;
      });
      
      payoffData.push({ price: price.toFixed(0), payoff: totalPnL });
      maxProfit = Math.max(maxProfit, totalPnL);
      maxLoss = Math.min(maxLoss, totalPnL);
      
      // Check for breakeven
      if (Math.abs(totalPnL) < 50) {
        breakevenPoints.push(price.toFixed(2));
      }
    }
    
    // Probability of profit (simplified Monte Carlo)
    let profitCount = 0;
    for (let i = 0; i < 100; i++) {
      const randomPrice = currentPrice * (0.8 + Math.random() * 0.4);
      let pnl = 0;
      options.forEach(opt => {
        const intrinsic = opt.type === 'call' 
          ? Math.max(0, randomPrice - opt.strike) 
          : Math.max(0, opt.strike - randomPrice);
        pnl += opt.action === 'buy' 
          ? (intrinsic - opt.premium) * opt.quantity * 100
          : (opt.premium - intrinsic) * opt.quantity * 100;
      });
      if (pnl > 0) profitCount++;
    }
    
    setAnalysisData({
      greeks: { delta: totalDelta, gamma: totalGamma, theta: totalTheta, vega: totalVega },
      maxProfit,
      maxLoss,
      probabilityOfProfit: profitCount,
      riskReward: maxProfit / Math.abs(maxLoss),
      breakevenPoints: [...new Set(breakevenPoints)].slice(0, 2),
      payoffData,
      currentPrice,
    });
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Max Profit</Text>
          <Text style={[styles.metricValue, styles.positive]}>
            ${analysisData?.maxProfit?.toFixed(0) || '0'}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Max Loss</Text>
          <Text style={[styles.metricValue, styles.negative]}>
            ${analysisData?.maxLoss?.toFixed(0) || '0'}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Risk/Reward</Text>
          <Text style={styles.metricValue}>
            {analysisData?.riskReward?.toFixed(2) || '0'}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Prob. of Profit</Text>
          <Text style={styles.metricValue}>
            {analysisData?.probabilityOfProfit || 0}%
          </Text>
        </View>
      </View>

      {/* Breakeven Points */}
      {analysisData?.breakevenPoints?.length > 0 && (
        <View style={styles.breakevenCard}>
          <Text style={styles.cardTitle}>Breakeven Points</Text>
          <View style={styles.breakevenList}>
            {analysisData.breakevenPoints.map((point, i) => (
              <View key={i} style={styles.breakevenItem}>
                <Text style={styles.breakevenValue}>${point}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Payoff Chart */}
      {analysisData?.payoffData && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Payoff at Expiration</Text>
          <LineChart
            data={{
              labels: analysisData.payoffData.filter((_, i) => i % 5 === 0).map(d => d.price),
              datasets: [{ data: analysisData.payoffData.map(d => d.payoff) }],
            }}
            width={screenWidth - 64}
            height={200}
            chartConfig={{
              backgroundColor: '#0f172a',
              backgroundGradientFrom: '#0f172a',
              backgroundGradientTo: '#0f172a',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
              propsForDots: { r: '0' },
            }}
            bezier={false}
            style={styles.chart}
            withDots={false}
          />
        </View>
      )}
    </View>
  );

  const renderGreeks = () => (
    <View style={styles.tabContent}>
      <View style={styles.greeksGrid}>
        {[
          { name: 'Delta', value: analysisData?.greeks?.delta, desc: 'Price sensitivity' },
          { name: 'Gamma', value: analysisData?.greeks?.gamma, desc: 'Delta change rate' },
          { name: 'Theta', value: analysisData?.greeks?.theta, desc: 'Time decay/day' },
          { name: 'Vega', value: analysisData?.greeks?.vega, desc: 'Volatility sensitivity' },
        ].map((greek, i) => (
          <View key={i} style={styles.greekCard}>
            <Text style={styles.greekName}>{greek.name}</Text>
            <Text style={styles.greekValue}>{greek.value?.toFixed(4) || '0.0000'}</Text>
            <Text style={styles.greekDesc}>{greek.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'greeks', label: 'Greeks' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Strategy Selector */}
      <TouchableOpacity
        style={styles.strategySelector}
        onPress={() => setShowStrategyPicker(true)}
      >
        <View>
          <Text style={styles.selectorLabel}>Selected Strategy</Text>
          <Text style={styles.selectorValue}>
            {selectedStrategy?.name || 'Select a strategy'}
          </Text>
        </View>
        <Text style={styles.selectorArrow}>▼</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Adjustment', { strategy: selectedStrategy })}
        >
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Adjustments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('WhatIf', { strategy: selectedStrategy })}
        >
          <Text style={styles.actionIcon}>❓</Text>
          <Text style={styles.actionText}>What-If</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, selectedTab === tab.id && styles.activeTab]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text style={[styles.tabText, selectedTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {selectedStrategy && analysisData ? (
        selectedTab === 'overview' ? renderOverview() : renderGreeks()
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>Select a strategy to analyze</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('Strategy')}
          >
            <Text style={styles.createBtnText}>Create Strategy</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Strategy Picker Modal */}
      <Modal visible={showStrategyPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Strategy</Text>
              <TouchableOpacity onPress={() => setShowStrategyPicker(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={strategies}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.strategyOption}
                  onPress={() => {
                    setSelectedStrategy(item);
                    setShowStrategyPicker(false);
                  }}
                >
                  <Text style={styles.strategyOptionName}>{item.name}</Text>
                  <Text style={styles.strategyOptionTicker}>{item.ticker}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyList}>No strategies found</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  strategySelector: {
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  selectorValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 4,
  },
  selectorArrow: {
    color: '#60a5fa',
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#1e40af',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  breakevenCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  breakevenList: {
    flexDirection: 'row',
    gap: 12,
  },
  breakevenItem: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  breakevenValue: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  chart: {
    borderRadius: 8,
    marginTop: 8,
  },
  greeksGrid: {
    gap: 12,
  },
  greekCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greekName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    width: 80,
  },
  greekValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  greekDesc: {
    fontSize: 12,
    color: '#94a3b8',
    width: 100,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  createBtn: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  closeBtn: {
    color: '#94a3b8',
    fontSize: 20,
  },
  strategyOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  strategyOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  strategyOptionTicker: {
    fontSize: 14,
    color: '#60a5fa',
    marginTop: 4,
  },
  emptyList: {
    textAlign: 'center',
    color: '#64748b',
    padding: 32,
  },
});

export default AnalysisScreen;
