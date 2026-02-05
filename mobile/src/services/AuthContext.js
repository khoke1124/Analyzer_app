import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const userData = await api.getMe();
        setUserToken(token);
        setUser(userData);
      }
    } catch (error) {
      console.log('Token check failed:', error);
      await AsyncStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);
      await AsyncStorage.setItem('token', response.token);
      setUserToken(response.token);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await api.register(email, password, name);
      await AsyncStorage.setItem('token', response.token);
      setUserToken(response.token);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUserToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      isLoading,
      userToken,
      user,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
