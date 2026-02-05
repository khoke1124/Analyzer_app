import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { analyzeAdjustmentScenarios, getRollSuggestions } from '../services/api';

const AdjustmentScreen = ({ route, navigation }) => {
  const { strategy } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [rollSuggestions, setRollSuggestions] = useState([]);
  const [currentPnL, setCurrentPnL] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    if (strategy?.options?.length > 0) {
      analyzePosition();
    }
  }, [strategy]);

  const analyzePosition = async () => {
    if (!strategy?.options) return;
    setLoading(true);
    
    try {
      // Call backend for adjustment analysis
      const result = await analyzeAdjustmentScenarios({
        ticker: strategy.ticker,
        current_price: 185, // Would come from live data
        options: strategy.options,
        scenario_type: 'price_down',
        scenario_value: 0.05,
      });
      
      setAnalysisResult(result);
      setCurrentPnL(result.current_pnl);
      setRecommendations(result.recommendations || []);
    } catch (error) {
      console.error('Analysis error:', error);
      // Use fallback analysis
      generateLocalRecommendations();
    } finally {
      setLoading(false);
    }
  };

  const generateLocalRecommendations = () => {
    const options = strategy?.options || [];
    const recs = [];
    const currentPrice = 185;
    
    // Calculate current P&L
    let pnl = 0;
    options.forEach(opt => {
      const intrinsic = opt.type === 'call' 
        ? Math.max(0, currentPrice - opt.strike) 
        : Math.max(0, opt.strike - currentPrice);
      pnl += opt.action === 'buy' 
        ? (intrinsic - opt.premium) * opt.quantity * 100
        : (opt.premium - intrinsic) * opt.quantity * 100;
    });
    setCurrentPnL(pnl);

    // Generate recommendations based on position
    if (pnl < -100) {
      recs.push({
        type: 'close',
        urgency: 'high',
        reason: `Position is down $${Math.abs(pnl).toFixed(0)}. Consider closing to prevent further losses.`,
        action: 'Close entire position to limit losses',
      });
      
      recs.push({
        type: 'roll',
        urgency: 'medium',
        reason: 'Rolling to a later expiration can give the trade more time to work.',
        action: 'Roll to next month\'s expiration',
      });
    } else if (pnl < 0) {
      recs.push({
        type: 'adjust',
        urgency: 'medium',
        reason: 'Small loss - consider adjusting strikes to improve breakeven.',
        action: 'Roll tested side to reduce risk',
      });
    } else if (pnl > 200) {
      recs.push({
        type: 'take_profit',
        urgency: 'low',
        reason: `Position is up $${pnl.toFixed(0)}. Consider taking profits.`,
        action: 'Close position to lock in gains',
      });
    } else if (pnl > 0) {
      recs.push({
        type: 'partial_close',
        urgency: 'low',
        reason: 'In profit - consider closing half to secure gains.',
        action: 'Close 50% of position',
      });
    }

    // Time decay warning
    recs.push({
      type: 'info',
      urgency: 'info',
      reason: 'Time decay accelerates in the final 2 weeks before expiration.',
      action: 'Monitor theta daily as expiration approaches',
    });

    // Specific adjustments based on strategy type
    const calls = options.filter(o => o.type === 'call');
    const puts = options.filter(o => o.type === 'put');
    
    if (calls.length === 2 && puts.length === 0) {
      // Call spread
      recs.push({
        type: 'adjust',
        urgency: 'medium',
        reason: 'For call spreads, consider rolling up if underlying rallies significantly.',
        action: `Roll to ${Math.round(currentPrice / 5) * 5 + 5}/${Math.round(currentPrice / 5) * 5 + 10} spread`,
      });
    } else if (calls.length === 2 && puts.length === 2) {
      // Iron condor
      recs.push({
        type: 'adjust',
        urgency: 'medium',
        reason: 'For iron condors, adjust the tested side when price approaches a short strike.',
        action: 'Roll threatened wing further OTM or close that side',
      });
    }

    setRecommendations(recs);
    
    // Generate roll suggestions
    const rolls = options.map(opt => ({
      original: `${opt.action.toUpperCase()} ${opt.type.toUpperCase()} $${opt.strike}`,
      suggested: `${opt.action.toUpperCase()} ${opt.type.toUpperCase()} $${opt.type === 'call' ? opt.strike + 5 : opt.strike - 5}`,
      reason: 'Adjust strike based on current price movement',
      estimated_credit_debit: opt.action === 'sell' ? '+0.50' : '-0.50',
    }));
    setRollSuggestions(rolls);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#60a5fa';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'close': return '⛔';
      case 'roll': return '🔄';
      case 'adjust': return '⚙️';
      case 'take_profit': return '💰';
      case 'partial_close': return '✂️';
      default: return 'ℹ️';
    }
  };

  if (!strategy) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⚙️</Text>
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
      {/* Strategy Info */}
      <View style={styles.strategyCard}>
        <Text style={styles.strategyName}>{strategy.name}</Text>
        <Text style={styles.strategyTicker}>{strategy.ticker}</Text>
        <View style={styles.pnlContainer}>
          <Text style={styles.pnlLabel}>Current P&L</Text>
          <Text style={[styles.pnlValue, currentPnL >= 0 ? styles.positive : styles.negative]}>
            ${currentPnL.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Position Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Position</Text>
        {strategy.options?.map((opt, i) => (
          <View key={i} style={styles.positionRow}>
            <View style={styles.positionInfo}>
              <Text style={styles.positionAction}>
                {opt.action.toUpperCase()} {opt.quantity}x
              </Text>
              <Text style={styles.positionType}>
                {opt.type.toUpperCase()} ${opt.strike}
              </Text>
            </View>
            <Text style={styles.positionPremium}>@ ${opt.premium}</Text>
          </View>
        ))}
      </View>

      {/* Recommendations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adjustment Recommendations</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#60a5fa" />
        ) : (
          recommendations.map((rec, i) => (
            <View key={i} style={styles.recommendationCard}>
              <View style={styles.recHeader}>
                <Text style={styles.recIcon}>{getTypeIcon(rec.type)}</Text>
                <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(rec.urgency) }]}>
                  <Text style={styles.urgencyText}>{rec.urgency.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.recReason}>{rec.reason}</Text>
              <View style={styles.recActionContainer}>
                <Text style={styles.recActionLabel}>Suggested Action:</Text>
                <Text style={styles.recAction}>{rec.action}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Roll Suggestions */}
      {rollSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roll Options</Text>
          <Text style={styles.rollSubtitle}>
            Rolling can extend time or adjust strikes to improve position
          </Text>
          {rollSuggestions.map((roll, i) => (
            <View key={i} style={styles.rollCard}>
              <View style={styles.rollRow}>
                <Text style={styles.rollLabel}>Current:</Text>
                <Text style={styles.rollValue}>{roll.original}</Text>
              </View>
              <View style={styles.rollArrow}>
                <Text style={styles.arrowText}>↓</Text>
              </View>
              <View style={styles.rollRow}>
                <Text style={styles.rollLabel}>Roll to:</Text>
                <Text style={[styles.rollValue, styles.highlight]}>{roll.suggested}</Text>
              </View>
              <View style={styles.rollFooter}>
                <Text style={styles.rollReason}>{roll.reason}</Text>
                <Text style={[styles.rollCost, roll.estimated_credit_debit?.includes('+') ? styles.positive : styles.negative]}>
                  {roll.estimated_credit_debit}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.whatIfBtn}
          onPress={() => navigation.navigate('WhatIf', { strategy })}
        >
          <Text style={styles.whatIfBtnText}>Run What-If Scenarios</Text>
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
  strategyCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 16,
    padding: 20,
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
  pnlContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnlLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  pnlValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
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
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  positionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionAction: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  positionType: {
    color: '#f8fafc',
  },
  positionPremium: {
    color: '#94a3b8',
  },
  recommendationCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recIcon: {
    fontSize: 28,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recReason: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  recActionContainer: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
  },
  recActionLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  recAction: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
  rollSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
    marginTop: -8,
  },
  rollCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rollRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rollLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  rollValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  highlight: {
    color: '#22c55e',
  },
  rollArrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  arrowText: {
    color: '#60a5fa',
    fontSize: 20,
  },
  rollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  rollReason: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
  },
  rollCost: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtons: {
    padding: 16,
  },
  whatIfBtn: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  whatIfBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdjustmentScreen;
