import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { RiskAnalysisChart } from './ChartComponents';

const Analysis = ({ strategy, currentPrice }) => {
  const [analysisData, setAnalysisData] = useState({
    greeks: {},
    breakeven: [],
    maxProfit: 0,
    maxLoss: 0,
    probabilityOfProfit: 0,
    riskReward: 0,
    timeDecay: [],
    volatilityImpact: [],
  });

  const [selectedTab, setSelectedTab] = useState('overview');
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (strategy && strategy.options && strategy.options.length > 0) {
      calculateAnalysis();
    }
  }, [strategy, currentPrice]);

  const calculateAnalysis = () => {
    const options = strategy.options;
    const analysis = {
      greeks: calculateGreeks(options, currentPrice),
      breakeven: calculateBreakeven(options),
      maxProfit: calculateMaxProfit(options),
      maxLoss: calculateMaxLoss(options),
      probabilityOfProfit: calculateProbabilityOfProfit(options, currentPrice),
      riskReward: 0,
      timeDecay: calculateTimeDecay(options),
      volatilityImpact: calculateVolatilityImpact(options, currentPrice),
    };

    analysis.riskReward = analysis.maxProfit / Math.abs(analysis.maxLoss);
    setAnalysisData(analysis);
  };

  const calculateGreeks = (options, spotPrice) => {
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    let totalRho = 0;

    options.forEach(option => {
      const { strike, type, action, quantity, volatility = 0.2 } = option;
      const timeToExpiry = 30 / 365; // Simplified - 30 days
      const riskFreeRate = 0.05; // 5% risk-free rate
      
      const greeks = calculateBlackScholesGreeks(
        spotPrice, 
        strike, 
        timeToExpiry, 
        riskFreeRate, 
        volatility, 
        type
      );

      const multiplier = (action === 'buy' ? 1 : -1) * quantity;
      
      totalDelta += greeks.delta * multiplier;
      totalGamma += greeks.gamma * multiplier;
      totalTheta += greeks.theta * multiplier;
      totalVega += greeks.vega * multiplier;
      totalRho += greeks.rho * multiplier;
    });

    return {
      delta: totalDelta,
      gamma: totalGamma,
      theta: totalTheta,
      vega: totalVega,
      rho: totalRho,
    };
  };

  const calculateBlackScholesGreeks = (S, K, T, r, sigma, optionType) => {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    const normCDF = (x) => {
      return 0.5 * (1 + erf(x / Math.sqrt(2)));
    };
    
    const normPDF = (x) => {
      return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    };
    
    const erf = (x) => {
      // Approximation of error function
      const a1 =  0.254829592;
      const a2 = -0.284496736;
      const a3 =  1.421413741;
      const a4 = -1.453152027;
      const a5 =  1.061405429;
      const p  =  0.3275911;
      
      const sign = x >= 0 ? 1 : -1;
      x = Math.abs(x);
      
      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      
      return sign * y;
    };

    let delta, gamma, theta, vega, rho;
    
    if (optionType === 'call') {
      delta = normCDF(d1);
      theta = -(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normCDF(d2);
      rho = K * T * Math.exp(-r * T) * normCDF(d2);
    } else {
      delta = normCDF(d1) - 1;
      theta = -(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normCDF(-d2);
      rho = -K * T * Math.exp(-r * T) * normCDF(-d2);
    }
    
    gamma = normPDF(d1) / (S * sigma * Math.sqrt(T));
    vega = S * normPDF(d1) * Math.sqrt(T);
    
    return { delta, gamma, theta: theta / 365, vega: vega / 100, rho: rho / 100 };
  };

  const calculateBreakeven = (options) => {
    const breakevens = [];
    
    // Simplified breakeven calculation
    const totalPremium = options.reduce((sum, option) => {
      return sum + (option.premium * option.quantity * (option.action === 'buy' ? 1 : -1));
    }, 0);

    // Find breakeven points by testing different prices
    for (let price = 50; price <= 250; price += 0.5) {
      let payoff = 0;
      
      options.forEach(option => {
        let optionPayoff = 0;
        
        if (option.type === 'call') {
          if (option.action === 'buy') {
            optionPayoff = Math.max(0, price - option.strike) - option.premium;
          } else {
            optionPayoff = option.premium - Math.max(0, price - option.strike);
          }
        } else {
          if (option.action === 'buy') {
            optionPayoff = Math.max(0, option.strike - price) - option.premium;
          } else {
            optionPayoff = option.premium - Math.max(0, option.strike - price);
          }
        }
        
        payoff += optionPayoff * option.quantity;
      });
      
      if (Math.abs(payoff) < 0.01) {
        breakevens.push(price);
      }
    }
    
    return breakevens;
  };

  const calculateMaxProfit = (options) => {
    let maxProfit = 0;
    
    // Test profit at various price points
    for (let price = 50; price <= 250; price += 1) {
      let profit = 0;
      
      options.forEach(option => {
        let optionProfit = 0;
        
        if (option.type === 'call') {
          if (option.action === 'buy') {
            optionProfit = Math.max(0, price - option.strike) - option.premium;
          } else {
            optionProfit = option.premium - Math.max(0, price - option.strike);
          }
        } else {
          if (option.action === 'buy') {
            optionProfit = Math.max(0, option.strike - price) - option.premium;
          } else {
            optionProfit = option.premium - Math.max(0, option.strike - price);
          }
        }
        
        profit += optionProfit * option.quantity;
      });
      
      maxProfit = Math.max(maxProfit, profit);
    }
    
    return maxProfit;
  };

  const calculateMaxLoss = (options) => {
    let maxLoss = 0;
    
    // Test loss at various price points
    for (let price = 50; price <= 250; price += 1) {
      let loss = 0;
      
      options.forEach(option => {
        let optionLoss = 0;
        
        if (option.type === 'call') {
          if (option.action === 'buy') {
            optionLoss = Math.max(0, price - option.strike) - option.premium;
          } else {
            optionLoss = option.premium - Math.max(0, price - option.strike);
          }
        } else {
          if (option.action === 'buy') {
            optionLoss = Math.max(0, option.strike - price) - option.premium;
          } else {
            optionLoss = option.premium - Math.max(0, option.strike - price);
          }
        }
        
        loss += optionLoss * option.quantity;
      });
      
      maxLoss = Math.min(maxLoss, loss);
    }
    
    return maxLoss;
  };

  const calculateProbabilityOfProfit = (options, currentPrice) => {
    const volatility = 0.2; // Assumed 20% volatility
    const timeToExpiry = 30 / 365; // 30 days
    
    // Monte Carlo simulation for probability of profit
    const numSimulations = 1000;
    let profitableOutcomes = 0;
    
    for (let i = 0; i < numSimulations; i++) {
      const randomPrice = currentPrice * Math.exp(
        (Math.random() - 0.5) * volatility * Math.sqrt(timeToExpiry) * 2
      );
      
      let totalPayoff = 0;
      options.forEach(option => {
        let optionPayoff = 0;
        
        if (option.type === 'call') {
          if (option.action === 'buy') {
            optionPayoff = Math.max(0, randomPrice - option.strike) - option.premium;
          } else {
            optionPayoff = option.premium - Math.max(0, randomPrice - option.strike);
          }
        } else {
          if (option.action === 'buy') {
            optionPayoff = Math.max(0, option.strike - randomPrice) - option.premium;
          } else {
            optionPayoff = option.premium - Math.max(0, option.strike - randomPrice);
          }
        }
        
        totalPayoff += optionPayoff * option.quantity;
      });
      
      if (totalPayoff > 0) {
        profitableOutcomes++;
      }
    }
    
    return (profitableOutcomes / numSimulations) * 100;
  };

  const calculateTimeDecay = (options) => {
    const timeDecayData = [];
    
    for (let days = 30; days >= 0; days--) {
      const timeToExpiry = days / 365;
      let totalTheta = 0;
      
      options.forEach(option => {
        const greeks = calculateBlackScholesGreeks(
          currentPrice,
          option.strike,
          timeToExpiry,
          0.05,
          option.volatility || 0.2,
          option.type
        );
        
        const multiplier = (option.action === 'buy' ? 1 : -1) * option.quantity;
        totalTheta += greeks.theta * multiplier;
      });
      
      timeDecayData.push({
        days: 30 - days,
        theta: totalTheta,
      });
    }
    
    return timeDecayData;
  };

  const calculateVolatilityImpact = (options, spotPrice) => {
    const volImpactData = [];
    
    for (let vol = 0.1; vol <= 0.5; vol += 0.05) {
      let totalVega = 0;
      
      options.forEach(option => {
        const greeks = calculateBlackScholesGreeks(
          spotPrice,
          option.strike,
          30 / 365,
          0.05,
          vol,
          option.type
        );
        
        const multiplier = (option.action === 'buy' ? 1 : -1) * option.quantity;
        totalVega += greeks.vega * multiplier;
      });
      
      volImpactData.push({
        volatility: vol * 100,
        vega: totalVega,
      });
    }
    
    return volImpactData;
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Max Profit</Text>
          <Text style={[styles.metricValue, { color: '#10b981' }]}>
            ${analysisData.maxProfit.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Max Loss</Text>
          <Text style={[styles.metricValue, { color: '#ef4444' }]}>
            ${analysisData.maxLoss.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Risk/Reward</Text>
          <Text style={styles.metricValue}>
            {analysisData.riskReward.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Profit Probability</Text>
          <Text style={styles.metricValue}>
            {analysisData.probabilityOfProfit.toFixed(1)}%
          </Text>
        </View>
      </View>
      
      {analysisData.breakeven.length > 0 && (
        <View style={styles.breakevenSection}>
          <Text style={styles.sectionTitle}>Breakeven Points</Text>
          {analysisData.breakeven.map((price, index) => (
            <Text key={index} style={styles.breakevenPrice}>
              ${price.toFixed(2)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderGreeks = () => (
    <View style={styles.tabContent}>
      <View style={styles.greeksContainer}>
        <View style={styles.greekCard}>
          <Text style={styles.greekLabel}>Delta</Text>
          <Text style={styles.greekValue}>
            {analysisData.greeks.delta?.toFixed(4) || '0.0000'}
          </Text>
          <Text style={styles.greekDescription}>
            Price sensitivity to underlying movement
          </Text>
        </View>
        
        <View style={styles.greekCard}>
          <Text style={styles.greekLabel}>Gamma</Text>
          <Text style={styles.greekValue}>
            {analysisData.greeks.gamma?.toFixed(4) || '0.0000'}
          </Text>
          <Text style={styles.greekDescription}>
            Rate of change of delta
          </Text>
        </View>
        
        <View style={styles.greekCard}>
          <Text style={styles.greekLabel}>Theta</Text>
          <Text style={styles.greekValue}>
            {analysisData.greeks.theta?.toFixed(4) || '0.0000'}
          </Text>
          <Text style={styles.greekDescription}>
            Time decay per day
          </Text>
        </View>
        
        <View style={styles.greekCard}>
          <Text style={styles.greekLabel}>Vega</Text>
          <Text style={styles.greekValue}>
            {analysisData.greeks.vega?.toFixed(4) || '0.0000'}
          </Text>
          <Text style={styles.greekDescription}>
            Volatility sensitivity
          </Text>
        </View>
        
        <View style={styles.greekCard}>
          <Text style={styles.greekLabel}>Rho</Text>
          <Text style={styles.greekValue}>
            {analysisData.greeks.rho?.toFixed(4) || '0.0000'}
          </Text>
          <Text style={styles.greekDescription}>
            Interest rate sensitivity
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTimeDecay = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Time Decay Analysis</Text>
      {analysisData.timeDecay.length > 0 && (
        <LineChart
          data={{
            labels: analysisData.timeDecay.map(point => point.days.toString()),
            datasets: [{
              data: analysisData.timeDecay.map(point => point.theta),
              strokeWidth: 2,
            }]
          }}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 4,
            color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          style={styles.chart}
        />
      )}
    </View>
  );

  const renderVolatilityImpact = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Volatility Impact</Text>
      {analysisData.volatilityImpact.length > 0 && (
        <LineChart
          data={{
            labels: analysisData.volatilityImpact.map(point => point.volatility.toString()),
            datasets: [{
              data: analysisData.volatilityImpact.map(point => point.vega),
              strokeWidth: 2,
            }]
          }}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          style={styles.chart}
        />
      )}
    </View>
  );

  const renderRiskAnalysis = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Risk Analysis</Text>
      <RiskAnalysisChart 
        data={{
          maxProfit: analysisData.maxProfit,
          maxLoss: Math.abs(analysisData.maxLoss),
          probabilityOfProfit: analysisData.probabilityOfProfit,
          riskReward: analysisData.riskReward,
          delta: Math.abs(analysisData.greeks.delta || 0),
          vega: Math.abs(analysisData.greeks.vega || 0),
        }}
      />
      
      <View style={styles.riskMetrics}>
        <View style={styles.riskMetric}>
          <Text style={styles.riskLabel}>Risk Score</Text>
          <Text style={styles.riskValue}>
            {calculateRiskScore().toFixed(1)}/10
          </Text>
        </View>
        
        <View style={styles.riskMetric}>
          <Text style={styles.riskLabel}>Strategy Type</Text>
          <Text style={styles.riskValue}>
            {determineStrategyType()}
          </Text>
        </View>
      </View>
    </View>
  );

  const calculateRiskScore = () => {
    const maxLossPercent = Math.abs(analysisData.maxLoss) / 1000; // Normalize to $1000
    const profitProbability = analysisData.probabilityOfProfit / 100;
    const riskReward = Math.min(analysisData.riskReward, 3); // Cap at 3
    
    // Higher score = higher risk
    const riskScore = Math.min(10, 
      (maxLossPercent * 3) + 
      ((1 - profitProbability) * 4) + 
      (Math.max(0, 2 - riskReward) * 2)
    );
    
    return riskScore;
  };

  const determineStrategyType = () => {
    if (!strategy || !strategy.options) return 'Unknown';
    
    const options = strategy.options;
    const callOptions = options.filter(opt => opt.type === 'call');
    const putOptions = options.filter(opt => opt.type === 'put');
    const buyOptions = options.filter(opt => opt.action === 'buy');
    const sellOptions = options.filter(opt => opt.action === 'sell');
    
    if (options.length === 1) {
      if (buyOptions.length === 1) {
        return callOptions.length === 1 ? 'Long Call' : 'Long Put';
      } else {
        return callOptions.length === 1 ? 'Short Call' : 'Short Put';
      }
    } else if (options.length === 2) {
      if (callOptions.length === 2) {
        return 'Call Spread';
      } else if (putOptions.length === 2) {
        return 'Put Spread';
      } else {
        return 'Straddle/Strangle';
      }
    } else {
      return 'Complex Strategy';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', render: renderOverview },
    { id: 'greeks', label: 'Greeks', render: renderGreeks },
    { id: 'timeDecay', label: 'Time Decay', render: renderTimeDecay },
    { id: 'volatility', label: 'Volatility', render: renderVolatilityImpact },
    { id: 'risk', label: 'Risk', render: renderRiskAnalysis },
  ];

  if (!strategy || !strategy.options || strategy.options.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No strategy selected for analysis</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab.id && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView style={styles.contentContainer}>
        {tabs.find(tab => tab.id === selectedTab)?.render()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  contentContaine