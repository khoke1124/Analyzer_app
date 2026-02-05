import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LineChart } from 'react-native-chart-kit';
import { analyzeAdjustmentScenarios } from '../services/api';

const screenWidth = Dimensions.get('window').width;

const WhatIfScreen = ({ route, navigation }) => {
  const { strategy } = route.params || {};
  const [loading, setLoading] = useState(false);
  
  // Scenario parameters
  const [priceChange, setPriceChange] = useState(0); // -30% to +30%
  const [volatilityChange, setVolatilityChange] = useState(0); // -50% to +50%
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  
  // Results
  const [scenarioResults, setScenarioResults] = useState(null);
  const [payoffCurve, setPayoffCurve] = useState([]);

  const currentPrice = 185; // Would come from live data

  useEffect(() => {
    if (strategy?.options?.length > 0) {
      calculateScenario();
    }
  }, [priceChange, volatilityChange, daysToExpiry, strategy]);

  const calculateScenario = async () => {
    if (!strategy?.options) return;
    
    const options = strategy.options;
    const scenarioPrice = currentPrice * (1 + priceChange / 100);
    const scenarioIV = 0.25 * (1 + volatilityChange / 100);
    const timeToExpiry = daysToExpiry / 365;

    // Calculate P&L at scenario price
    let scenarioPnL = 0;
    let currentPnL = 0;
    
    options.forEach(opt => {
      // Current P&L
      const currentIntrinsic = opt.type === 'call' 
        ? Math.max(0, currentPrice - opt.strike) 
        : Math.max(0, opt.strike - currentPrice);
      currentPnL += opt.action === 'buy' 
        ? (currentIntrinsic - opt.premium) * opt.quantity * 100
        : (opt.premium - currentIntrinsic) * opt.quantity * 100;
      
      // Scenario P&L with time value adjustment
      const scenarioIntrinsic = opt.type === 'call' 
        ? Math.max(0, scenarioPrice - opt.strike) 
        : Math.max(0, opt.strike - scenarioPrice);
      
      // Simplified time value calculation
      const timeValue = opt.premium * Math.sqrt(timeToExpiry / (30/365)) * (1 + (scenarioIV - 0.25) * 2);
      const scenarioValue = scenarioIntrinsic + (timeToExpiry > 0 ? timeValue * 0.3 : 0);
      
      scenarioPnL += opt.action === 'buy' 
        ? (scenarioValue - opt.premium) * opt.quantity * 100
        : (opt.premium - scenarioValue) * opt.quantity * 100;
    });

    // Calculate payoff curve
    const curve = [];
    for (let price = currentPrice * 0.7; price <= currentPrice * 1.3; price += 3) {
      let pnl = 0;
      options.forEach(opt => {
        const intrinsic = opt.type === 'call' 
          ? Math.max(0, price - opt.strike) 
          : Math.max(0, opt.strike - price);
        pnl += opt.action === 'buy' 
          ? (intrinsic - opt.premium) * opt.quantity * 100
          : (opt.premium - intrinsic) * opt.quantity * 100;
      });
      curve.push({ price: price.toFixed(0), pnl });
    }
    setPayoffCurve(curve);

    // Calculate Greeks impact
    const deltaImpact = (scenarioPrice - currentPrice) * 0.5 * 100; // Simplified
    const vegaImpact = (scenarioIV - 0.25) * 100 * 15; // Simplified
    const thetaImpact = -(30 - daysToExpiry) * 5; // Simplified daily decay

    setScenarioResults({
      currentPrice,
      scenarioPrice,
      currentPnL,
      scenarioPnL,
      pnlChange: scenarioPnL - currentPnL,
      deltaImpact,
      vegaImpact,
      thetaImpact,
      scenarioIV: scenarioIV * 100,
    });
  };

  const resetScenario = () => {
    setPriceChange(0);
    setVolatilityChange(0);
    setDaysToExpiry(30);
  };

  const presetScenarios = [
    { name: 'Price +10%', price: 10, vol: 0, days: 30 },
    { name: 'Price -10%', price: -10, vol: 0, days: 30 },
    { name: 'Vol Spike', price: 0, vol: 50, days: 30 },
    { name: 'Near Expiry', price: 0, vol: 0, days: 7 },
  ];

  if (!strategy) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>❓</Text>
        <Text style={styles.emptyText}>No strategy selected</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => navigation.navigate('AnalysisMain')}
        >
          <Text style={styles.selectBtnText}>Select Strategy</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Strategy Header */}
      <View style={styles.header}>
        <Text style={styles.strategyName}>{strategy.name}</Text>
        <Text style={styles.strategyTicker}>{strategy.ticker} @ ${currentPrice}</Text>
      </View>

      {/* Preset Scenarios */}
      <View style={styles.presetsContainer}>
        <Text style={styles.presetsTitle}>Quick Scenarios</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {presetScenarios.map((preset, i) => (
            <TouchableOpacity
              key={i}
              style={styles.presetBtn}
              onPress={() => {
                setPriceChange(preset.price);
                setVolatilityChange(preset.vol);
                setDaysToExpiry(preset.days);
              }}
            >
              <Text style={styles.presetText}>{preset.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.presetBtn, styles.resetBtn]} onPress={resetScenario}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Scenario Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adjust Scenario Parameters</Text>
        
        {/* Price Change */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Price Change</Text>
            <Text style={[styles.sliderValue, priceChange >= 0 ? styles.positive : styles.negative]}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderMin}>-30%</Text>
            <View style={styles.sliderWrapper}>
              <View 
                style={[
                  styles.sliderTrack,
                  { 
                    width: `${((priceChange + 30) / 60) * 100}%`,
                    backgroundColor: priceChange >= 0 ? '#22c55e' : '#ef4444'
                  }
                ]} 
              />
              <TouchableOpacity
                style={[
                  styles.sliderThumb,
                  { left: `${((priceChange + 30) / 60) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.sliderMax}>+30%</Text>
          </View>
          <View style={styles.sliderButtons}>
            {[-20, -10, 0, 10, 20].map(val => (
              <TouchableOpacity
                key={val}
                style={[styles.sliderBtn, priceChange === val && styles.sliderBtnActive]}
                onPress={() => setPriceChange(val)}
              >
                <Text style={[styles.sliderBtnText, priceChange === val && styles.sliderBtnTextActive]}>
                  {val >= 0 ? '+' : ''}{val}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Volatility Change */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Volatility Change</Text>
            <Text style={[styles.sliderValue, volatilityChange >= 0 ? styles.positive : styles.negative]}>
              {volatilityChange >= 0 ? '+' : ''}{volatilityChange.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.sliderButtons}>
            {[-50, -25, 0, 25, 50].map(val => (
              <TouchableOpacity
                key={val}
                style={[styles.sliderBtn, volatilityChange === val && styles.sliderBtnActive]}
                onPress={() => setVolatilityChange(val)}
              >
                <Text style={[styles.sliderBtnText, volatilityChange === val && styles.sliderBtnTextActive]}>
                  {val >= 0 ? '+' : ''}{val}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Days to Expiry */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Days to Expiry</Text>
            <Text style={styles.sliderValue}>{daysToExpiry} days</Text>
          </View>
          <View style={styles.sliderButtons}>
            {[30, 21, 14, 7, 1].map(val => (
              <TouchableOpacity
                key={val}
                style={[styles.sliderBtn, daysToExpiry === val && styles.sliderBtnActive]}
                onPress={() => setDaysToExpiry(val)}
              >
                <Text style={[styles.sliderBtnText, daysToExpiry === val && styles.sliderBtnTextActive]}>
                  {val}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Results */}
      {scenarioResults && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenario Results</Text>
          
          {/* Price Comparison */}
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Current</Text>
                <Text style={styles.comparisonPrice}>${scenarioResults.currentPrice.toFixed(2)}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Scenario</Text>
                <Text style={[styles.comparisonPrice, styles.highlight]}>
                  ${scenarioResults.scenarioPrice.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* P&L Results */}
          <View style={styles.pnlGrid}>
            <View style={styles.pnlCard}>
              <Text style={styles.pnlLabel}>Current P&L</Text>
              <Text style={[styles.pnlValue, scenarioResults.currentPnL >= 0 ? styles.positive : styles.negative]}>
                ${scenarioResults.currentPnL.toFixed(0)}
              </Text>
            </View>
            <View style={styles.pnlCard}>
              <Text style={styles.pnlLabel}>Scenario P&L</Text>
              <Text style={[styles.pnlValue, scenarioResults.scenarioPnL >= 0 ? styles.positive : styles.negative]}>
                ${scenarioResults.scenarioPnL.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.pnlCard, styles.changeCard]}>
              <Text style={styles.pnlLabel}>P&L Change</Text>
              <Text style={[styles.pnlValue, scenarioResults.pnlChange >= 0 ? styles.positive : styles.negative]}>
                {scenarioResults.pnlChange >= 0 ? '+' : ''}${scenarioResults.pnlChange.toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Greeks Impact */}
          <View style={styles.greeksCard}>
            <Text style={styles.cardTitle}>Greeks Impact Breakdown</Text>
            <View style={styles.greekRow}>
              <Text style={styles.greekName}>Delta (Price)</Text>
              <Text style={[styles.greekValue, scenarioResults.deltaImpact >= 0 ? styles.positive : styles.negative]}>
                {scenarioResults.deltaImpact >= 0 ? '+' : ''}${scenarioResults.deltaImpact.toFixed(0)}
              </Text>
            </View>
            <View style={styles.greekRow}>
              <Text style={styles.greekName}>Vega (Volatility)</Text>
              <Text style={[styles.greekValue, scenarioResults.vegaImpact >= 0 ? styles.positive : styles.negative]}>
                {scenarioResults.vegaImpact >= 0 ? '+' : ''}${scenarioResults.vegaImpact.toFixed(0)}
              </Text>
            </View>
            <View style={styles.greekRow}>
              <Text style={styles.greekName}>Theta (Time)</Text>
              <Text style={[styles.greekValue, styles.negative]}>
                ${scenarioResults.thetaImpact.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Payoff Chart */}
      {payoffCurve.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payoff Diagram</Text>
          <LineChart
            data={{
              labels: payoffCurve.filter((_, i) => i % 5 === 0).map(d => d.price),
              datasets: [{ data: payoffCurve.map(d => d.pnl) }],
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
          {scenarioResults && (
            <View style={styles.chartMarker}>
              <Text style={styles.markerText}>
                Scenario: ${scenarioResults.scenarioPrice.toFixed(0)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.adjustBtn}
          onPress={() => navigation.navigate('Adjustment', { strategy })}
        >
          <Text style={styles.adjustBtnText}>View Adjustment Recommendations</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 24,
  },
  selectBtn: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 20,
    marginBottom: 8,
  },
  strategyName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  strategyTicker: {
    fontSize: 16,
    color: '#60a5fa',
    marginTop: 4,
  },
  presetsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  presetsTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  presetBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  presetText: {
    color: '#f8fafc',
    fontWeight: '500',
  },
  resetBtn: {
    backgroundColor: '#334155',
  },
  resetText: {
    color: '#94a3b8',
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
  sliderContainer: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderMin: {
    color: '#ef4444',
    fontSize: 12,
    width: 40,
  },
  sliderMax: {
    color: '#22c55e',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  sliderWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginHorizontal: 8,
    position: 'relative',
  },
  sliderTrack: {
    height: '100%',
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginLeft: -10,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  sliderBtnActive: {
    backgroundColor: '#1e40af',
  },
  sliderBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  sliderBtnTextActive: {
    color: '#fff',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  comparisonCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  comparisonPrice: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  highlight: {
    color: '#60a5fa',
  },
  arrow: {
    color: '#64748b',
    fontSize: 24,
  },
  pnlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pnlCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  changeCard: {
    minWidth: '100%',
    backgroundColor: '#1e3a5f',
  },
  pnlLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  pnlValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  greeksCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  greekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  greekName: {
    color: '#94a3b8',
    fontSize: 14,
  },
  greekValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 8,
  },
  chartMarker: {
    alignItems: 'center',
    marginTop: 8,
  },
  markerText: {
    color: '#60a5fa',
    fontSize: 12,
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  adjustBtn: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  adjustBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WhatIfScreen;
