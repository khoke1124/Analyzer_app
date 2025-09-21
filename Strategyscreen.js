import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { PayoffChart } from '../components/ChartComponents';
import OptionChain from '../components/OptionChain';
import StrategyForm from '../components/StrategyForm';
import { getOptionChain, createStrategy } from '../services/api';

const StrategyScreen = ({ navigation }) => {
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [selectedExpiration, setSelectedExpiration] = useState('2024-01-19');
  const [optionChainData, setOptionChainData] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [payoffData, setPayoffData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(150);

  useEffect(() => {
    loadOptionChain();
  }, [selectedTicker, selectedExpiration]);

  useEffect(() => {
    if (selectedOptions.length > 0) {
      calculatePayoff();
    }
  }, [selectedOptions, currentPrice]);

  const loadOptionChain = async () => {
    try {
      setLoading(true);
      const data = await getOptionChain(selectedTicker, selectedExpiration);
      setOptionChainData(data.options || []);
      setCurrentPrice(data.currentPrice || 150);
    } catch (error) {
      Alert.alert('Error', 'Failed to load option chain data');
      console.error('Option chain error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOptionChain();
    setRefreshing(false);
  };

  const handleOptionSelect = (option) => {
    const existingIndex = selectedOptions.findIndex(
      opt => opt.strike === option.strike && opt.type === option.type
    );
    
    if (existingIndex >= 0) {
      // Remove if already selected
      setSelectedOptions(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // Add new option
      navigation.navigate('StrategyForm', {
        option,
        onConfirm: (strategyOption) => {
          setSelectedOptions(prev => [...prev, strategyOption]);
        }
      });
    }
  };

  const calculatePayoff = () => {
    const priceRange = [];
    const minPrice = currentPrice * 0.7;
    const maxPrice = currentPrice * 1.3;
    const steps = 50;
    
    for (let i = 0; i <= steps; i++) {
      const price = minPrice + (maxPrice - minPrice) * (i / steps);
      priceRange.push(price);
    }

    const payoffPoints = priceRange.map(price => {
      let totalPayoff = 0;
      
      selectedOptions.forEach(option => {
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
        
        totalPayoff += optionPayoff * option.quantity;
      });
      
      return {
        price: price.toFixed(2),
        payoff: totalPayoff.toFixed(2)
      };
    });

    setPayoffData(payoffPoints);
  };

  const saveStrategy = async () => {
    if (selectedOptions.length === 0) {
      Alert.alert('Error', 'Please select at least one option');
      return;
    }

    try {
      const strategyData = {
        ticker: selectedTicker,
        expiration: selectedExpiration,
        options: selectedOptions,
        createdAt: new Date().toISOString()
      };

      await createStrategy(strategyData);
      Alert.alert('Success', 'Strategy saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save strategy');
      console.error('Save strategy error:', error);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Options Strategy Builder</Text>
        <Text style={styles.subtitle}>
          {selectedTicker} - ${currentPrice.toFixed(2)}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loading} />
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Option Chain</Text>
            <OptionChain 
              data={optionChainData} 
              onSelect={handleOptionSelect}
              selectedOptions={selectedOptions}
            />
          </View>

          {selectedOptions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selected Options</Text>
              {selectedOptions.map((option, index) => (
                <View key={index} style={styles.selectedOption}>
                  <Text style={styles.optionText}>
                    {option.action.toUpperCase()} {option.quantity}x {option.type.toUpperCase()} 
                    ${option.strike} @ ${option.premium.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {payoffData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payoff Diagram</Text>
              <PayoffChart data={payoffData} />
            </View>
          )}
        </>
      )}
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  loading: {
    marginTop: 50,
  },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  selectedOption: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});

export default StrategyScreen;
