import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure your backend URL here
const API_URL = 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const register = async (email, password, name) => {
  const response = await api.post('/api/auth/register', { email, password, name });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// Stocks
export const getStockQuote = async (symbol) => {
  const response = await api.get(`/api/stocks/${symbol}/quote`);
  return response.data;
};

export const getStockHistory = async (symbol, interval = 'daily') => {
  const response = await api.get(`/api/stocks/${symbol}/history`, { params: { interval } });
  return response.data;
};

// Options
export const getOptionChain = async (symbol, expiration) => {
  const response = await api.get(`/api/options/${symbol}/chain`, { params: { expiration } });
  return response.data;
};

// Strategies
export const createStrategy = async (strategy) => {
  const response = await api.post('/api/strategies', strategy);
  return response.data;
};

export const getStrategies = async (status) => {
  const params = status ? { status } : {};
  const response = await api.get('/api/strategies', { params });
  return response.data;
};

export const getStrategy = async (id) => {
  const response = await api.get(`/api/strategies/${id}`);
  return response.data;
};

export const updateStrategy = async (id, data) => {
  const response = await api.put(`/api/strategies/${id}`, data);
  return response.data;
};

export const deleteStrategy = async (id) => {
  const response = await api.delete(`/api/strategies/${id}`);
  return response.data;
};

// Analysis & Adjustments
export const analyzeAdjustmentScenarios = async (scenario) => {
  const response = await api.post('/api/analysis/adjustment-scenarios', scenario);
  return response.data;
};

export const getRollSuggestions = async (strategyId) => {
  const response = await api.post(`/api/analysis/roll-options?strategy_id=${strategyId}`);
  return response.data;
};

// Watchlist
export const getWatchlist = async () => {
  const response = await api.get('/api/watchlist');
  return response.data;
};

export const addToWatchlist = async (symbol) => {
  const response = await api.post('/api/watchlist', { symbol });
  return response.data;
};

export const removeFromWatchlist = async (symbol) => {
  const response = await api.delete(`/api/watchlist/${symbol}`);
  return response.data;
};

export default api;
