import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getOptionChain, createStrategy, getStockQuote } from '../services/api';

const StrategyScreen = ({ navigation, route }) => {
  const [ticker, setTicker] = useState(route?.params?.ticker || 'AAPL');
  const [searchTicker, setSearchTicker] = useState(route?.params?.ticker || 'AAPL');
  const [optionChain, setOptionChain] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOptionChain();
  }, [ticker]);

  const loadOptionChain = async () => {
    setLoading(true);
    try {
      const data = await getOptionChain(ticker);
      setOptionChain(data.options || []);
      setCurrentPrice(data.currentPrice || 150);
    } catch (error) {
      console.error('Error loading option chain:', error);
      Alert.alert('Error', 'Failed to load option chain. Using demo data.');
      // Use demo data
      setCurrentPrice(185);
      setOptionChain(generateDemoChain(185));
    } finally {
      setLoading(false);
    }
  };

  const generateDemoChain = (price) => {
    const chain = [];
    const baseStrike = Math.round(price / 5) * 5;
    for (let i = -5; i <= 5; i++) {
      const strike = baseStrike + i * 5;
      chain.push({
        strike,
        callBid: Math.max(0.1, (price - strike) * 0.5 + 3).toFixed(2),
        callAsk: Math.max(0.2, (price - strike) * 0.5 + 3.5).toFixed(2),
        putBid: Math.max(0.1, (strike - price) * 0.5 + 3).toFixed(2),
        putAsk: Math.max(0.2, (strike - price) * 0.5 + 3.5).toFixed(2),
        iv: (0.2 + Math.abs(i) * 0.02).toFixed(3),
        isAtTheMoney: Math.abs(strike - price) < 3,
      });
    }
    return chain;
  };

  const handleSearch = () => {
    if (searchTicker.trim()) {
      setTicker(searchTicker.toUpperCase());
    }
  };

  const handleSelectOption = (option, type) => {
    navigation.navigate('StrategyForm', {
      option: { ...option, type },
      ticker,
      currentPrice,
      onConfirm: (configuredOption) => {
        setSelectedOptions(prev => [...prev, configuredOption]);
      },
    });
  };

  const removeOption = (index) => {
    setSelectedOptions(prev => prev.filter((_, i) => i !== index));
  };

  const calculatePayoff = () => {
    if (selectedOptions.length === 0) return { maxProfit: 0, maxLoss: 0 };
    
    let maxProfit = -Infinity;
    let maxLoss = Infinity;
    
    for (let price = currentPrice * 0.5; price <= currentPrice * 1.5; price += 1) {
      let totalPnL = 0;
      selectedOptions.forEach(opt => {
        let intrinsic = opt.type === 'call' 
          ? Math.max(0, price - opt.strike)
          : Math.max(0, opt.strike - price);
        
        let pnl = opt.action === 'buy'
          ? (intrinsic - opt.premium) * opt.quantity * 100
          : (opt.premium - intrinsic) * opt.quantity * 100;
        
        totalPnL += pnl;
      });
      maxProfit = Math.max(maxProfit, totalPnL);
      maxLoss = Math.min(maxLoss, totalPnL);
    }
    
    return { maxProfit, maxLoss };
  };

  const saveStrategy = async () => {
    if (selectedOptions.length === 0) {
      Alert.alert('Error', 'Please select at least one option');
      return;
    }
    if (!strategyName.trim()) {
      Alert.alert('Error', 'Please enter a strategy name');
      return;
    }

    try {
      await createStrategy({
        name: strategyName,
        ticker,
        options: selectedOptions,
      });
      Alert.alert('Success', 'Strategy saved successfully!', [
        { text: 'OK', onPress: () => {
          setSelectedOptions([]);
          setStrategyName('');
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save strategy');
    }
  };

  const { maxProfit, maxLoss } = calculatePayoff();

  const renderOptionRow = ({ item }) => (
    <View style={[styles.optionRow, item.isAtTheMoney && styles.atmRow]}>
      {/* Call Side */}
      <TouchableOpacity
        style={styles.optionCell}
        onPress={() => handleSelectOption(item, 'call')}
      >
        <Text style={styles.callText}>${item.callBid}</Text>
        <Text style={styles.callText}>${item.callAsk}</Text>
      </TouchableOpacity>
      
      {/* Strike */}
      <View style={[styles.strikeCell, item.isAtTheMoney && styles.atmStrike]}>
        <Text style={styles.strikeText}>${item.strike}</Text>
        <Text style={styles.ivText}>{(item.iv * 100).toFixed(1)}%</Text>
      </View>
      
      {/* Put Side */}
      <TouchableOpacity
        style={styles.optionCell}
        onPress={() => handleSelectOption(item, 'put')}
      >
        <Text style={styles.putText}>${item.putBid}</Text>
        <Text style={styles.putText}>${item.putAsk}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadOptionChain} tintColor="#60a5fa" />}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchTicker}
          onChangeText={setSearchTicker}
          placeholder="Enter symbol (e.g., AAPL)"
          placeholderTextColor="#64748b"
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Current Price */}
      <View style={styles.priceCard}>
        <Text style={styles.tickerText}>{ticker}</Text>
        <Text style={styles.priceText}>${currentPrice.toFixed(2)}</Text>
      </View>

      {/* Option Chain */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Option Chain</Text>
        
        {/* Header */}
        <View style={styles.chainHeader}>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>CALLS</Text>
            <Text style={styles.subHeaderText}>Bid / Ask</Text>
          </View>
          <View style={styles.strikeHeader}>
            <Text style={styles.headerText}>STRIKE</Text>
          </View>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>PUTS</Text>
            <Text style={styles.subHeaderText}>Bid / Ask</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#60a5fa" style={styles.loader} />
        ) : (
          <FlatList
            data={optionChain}
            renderItem={renderOptionRow}
            keyExtractor={(item) => item.strike.toString()}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Selected Options */}
      {selectedOptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Options</Text>
          {selectedOptions.map((opt, index) => (
            <View key={index} style={styles.selectedOption}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionAction}>
                  {opt.action.toUpperCase()} {opt.quantity}x
                </Text>
                <Text style={styles.optionType}>
                  {opt.type.toUpperCase()} ${opt.strike} @ ${opt.premium}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeOption(index)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {/* P&L Summary */}
          <View style={styles.pnlSummary}>
            <View style={styles.pnlItem}>
              <Text style={styles.pnlLabel}>Max Profit</Text>
              <Text style={[styles.pnlValue, styles.positive]}>${maxProfit.toFixed(0)}</Text>
            </View>
            <View style={styles.pnlItem}>
              <Text style={styles.pnlLabel}>Max Loss</Text>
              <Text style={[styles.pnlValue, styles.negative]}>${maxLoss.toFixed(0)}</Text>
            </View>
          </View>

          {/* Strategy Name & Save */}
          <TextInput
            style={styles.nameInput}
            value={strategyName}
            onChangeText={setStrategyName}
            placeholder="Enter strategy name"
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveStrategy}>
            <Text style={styles.saveBtnText}>Save Strategy</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  searchContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tickerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  priceText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  section: {
    margin: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  chainHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 12,
    marginBottom: 8,
  },
  headerCell: {
    flex: 2,
    alignItems: 'center',
  },
  strikeHeader: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  subHeaderText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  atmRow: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    marginVertical: 2,
  },
  optionCell: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  strikeCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atmStrike: {
    backgroundColor: '#fbbf24',
    borderRadius: 6,
    paddingVertical: 4,
  },
  callText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '500',
  },
  putText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
  },
  strikeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  ivText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  loader: {
    marginVertical: 32,
  },
  selectedOption: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionAction: {
    color: '#60a5fa',
    fontWeight: 'bold',
    fontSize: 14,
  },
  optionType: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 4,
  },
  removeBtn: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 8,
  },
  pnlSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  pnlItem: {
    alignItems: 'center',
  },
  pnlLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  pnlValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  nameInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StrategyScreen;
