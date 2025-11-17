import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import Analysis from '../components/Analysis';
import { PayoffChart } from '../components/ChartComponents';
import { getSavedStrategies, deleteStrategy } from '../services/api';

const AnalysisScreen = ({ route, navigation }) => {
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [savedStrategies, setSavedStrategies] = useState([]);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPrice, setCurrentPrice] = useState(150);

  useEffect(() => {
    loadSavedStrategies();
    
    // Check if strategy was passed from navigation
    if (route.params?.strategy) {
      setSelectedStrategy(route.params.strategy);
    }
  }, [route.params]);

  const loadSavedStrategies = async () => {
    try {
      setLoading(true);
      const strategies = await getSavedStrategies();
      setSavedStrategies(strategies);
    } catch (error) {
      console.error('Load strategies error:', error);
      // Use mock data if API fails
      setSavedStrategies(getMockStrategies());
    } finally {
      setLoading(false);
    }
  };

  const getMockStrategies = () => [
    {
      id: 1,
      name: 'AAPL Iron Condor',
      ticker: 'AAPL',
      type: 'Iron Condor',
      createdAt: new Date().toISOString(),
      options: [
        { type: 'call', action: 'sell', strike: 155, premium: 2.5, quantity: 1 },
        { type: 'call', action: 'buy', strike: 160, premium: 1.2, quantity: 1 },
        { type: 'put', action: 'sell', strike: 145, premium: 2.3, quantity: 1 },
        { type: 'put', action: 'buy', strike: 140, premium: 1.1, quantity: 1 },
      ],
      maxProfit: 230,
      maxLoss: -270,
    },
    {
      id: 2,
      name: 'GOOGL Bull Call Spread',
      ticker: 'GOOGL',
      type: 'Bull Call Spread',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      options: [
        { type: 'call', action: 'buy', strike: 2750, premium: 25, quantity: 1 },
        { type: 'call', action: 'sell', strike: 2800, premium: 12, quantity: 1 },
      ],
      maxProfit: 370,
      maxLoss: -130,
    },
    {
      id: 3,
      name: 'MSFT Straddle',
      ticker: 'MSFT',
      type: 'Long Straddle',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      options: [
        { type: 'call', action: 'buy', strike: 310, premium: 8.5, quantity: 1 },
        { type: 'put', action: 'buy', strike: 310, premium: 7.2, quantity: 1 },
      ],
      maxProfit: 'Unlimited',
      maxLoss: -157,
    },
  ];

  const handleStrategySelect = (strategy) => {
    setSelectedStrategy(strategy);
    setCurrentPrice(getStockPrice(strategy.ticker));
    setShowStrategyModal(false);
  };

  const getStockPrice = (ticker) => {
    const prices = {
      'AAPL': 150.25,
      'GOOGL': 2750.80,
      'MSFT': 310.45,
      'TSLA': 225.60,
      'NVDA': 480.30,
    };
    return prices[ticker] || 150;
  };

  const handleDeleteStrategy = async (strategyId) => {
    Alert.alert(
      'Delete Strategy',
      'Are you sure you want to delete this strategy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStrategy(strategyId);
              setSavedStrategies(prev => prev.filter(s => s.id !== strategyId));
              if (selectedStrategy?.id === strategyId) {