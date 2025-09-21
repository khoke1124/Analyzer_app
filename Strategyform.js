import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const StrategyForm = ({ route, navigation }) => {
  const { option, onConfirm } = route.params;
  
  const [formData, setFormData] = useState({
    strike: option.strike,
    type: 'call', // call or put
    action: 'buy', // buy or sell
    quantity: 1,
    premium: option.callBid || 0,
    expiration: option.expiration || '2024-01-19',
    volatility: option.iv || 0.2,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.strike || formData.strike <= 0) {
      newErrors.strike = 'Strike price must be greater than 0';
    }
    
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    if (!formData.premium || formData.premium < 0) {
      newErrors.premium = 'Premium must be 0 or greater';
    }
    
    if (!formData.volatility || formData.volatility < 0 || formData.volatility > 5) {
      newErrors.volatility = 'Volatility must be between 0 and 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    const strategyOption = {
      ...formData,
      id: Date.now(), // Simple ID generation
      strike: parseFloat(formData.strike),
      quantity: parseInt(formData.quantity),
      premium: parseFloat(formData.premium),
      volatility: parseFloat(formData.volatility),
    };

    onConfirm(strategyOption);
    navigation.goBack();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const updatePremium = () => {
    // Auto-update premium based on type and action
    let newPremium = 0;
    
    if (formData.type === 'call') {
      newPremium = formData.action === 'buy' ? option.callAsk : option.callBid;
    } else {
      newPremium = formData.action === 'buy' ? option.putAsk : option.putBid;
    }
    
    setFormData(prev => ({
      ...prev,
      premium: newPremium || 0
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configure Option</Text>
        <Text style={styles.subtitle}>
          ${formData.strike} Strike - {formData.expiration}
        </Text>
      </View>

      <View style={styles.form}>
        {/* Option Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Option Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.type}
              onValueChange={(value) => {
                handleInputChange('type', value);
                updatePremium();
              }}
              style={styles.picker}
            >
              <Picker.Item label="Call" value="call" />
              <Picker.Item label="Put" value="put" />
            </Picker>
          </View>
        </View>

        {/* Action */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Action</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.action}
              onValueChange={(value) => {
                handleInputChange('action', value);
                updatePremium();
              }}
              style={styles.picker}
            >
              <Picker.Item label="Buy" value="buy" />
              <Picker.Item label="Sell" value="sell" />
            </Picker>
          </View>
        </View>

        {/* Strike Price */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Strike Price</Text>
          <TextInput
            style={[styles.input, errors.strike && styles.inputError]}
            value={formData.strike.toString()}
            onChangeText={(value) => handleInputChange('strike', value)}
            keyboardType="numeric"
            placeholder="0.00"
          />
          {errors.strike && <Text style={styles.errorText}>{errors.strike}</Text>}
        </View>

        {/* Quantity */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={[styles.input, errors.quantity && styles.inputError]}
            value={formData.quantity.toString()}
            onChangeText={(value) => handleInputChange('quantity', value)}
            keyboardType="numeric"
            placeholder="1"
          />
          {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
        </View>

        {/* Premium */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Premium</Text>
          <TextInput
            style={[styles.input, errors.premium && styles.inputError]}
            value={formData.premium.toString()}
            onChangeText={(value) => handleInputChange('premium', value)}
            keyboardType="numeric"
            placeholder="0.00"
          />
          {errors.premium && <Text style={styles.errorText}>{errors.premium}</Text>}
        </View>

        {/* Advanced Options Toggle */}
        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Advanced Options</Text>
            <Switch
              value={showAdvanced}
              onValueChange={setShowAdvanced}
              trackColor={{ false: '#767577', true: '#2563eb' }}
              thumbColor={showAdvanced ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Advanced Options */}
        {showAdvanced && (
          <View style={styles.advancedSection}>
            <Text style={styles.sectionTitle}>Advanced Settings</Text>
            
            {/* Implied Volatility */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Implied Volatility</Text>
              <TextInput
                style={[styles.input, errors.volatility && styles.inputError]}
                value={formData.volatility.toString()}
                onChangeText={(value) => handleInputChange('volatility', value)}
                keyboardType="numeric"
                placeholder="0.20"
              />
              {errors.volatility && <Text style={styles.errorText}>{errors.volatility}</Text>}
            </View>

            {/* Expiration Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Expiration Date</Text>
              <TextInput
                style={styles.input}
                value={formData.expiration}
                onChangeText={(value) => handleInputChange('expiration', value)}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        )}

        {/* Strategy Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Strategy Summary</Text>
          <Text style={styles.summaryText}>
            {formData.action.toUpperCase()} {formData.quantity}x {formData.type.toUpperCase()} 
            ${formData.strike} @ ${formData.premium.toFixed(2)}
          </Text>
          <Text style={styles.summaryDetail}>
            Total Cost: ${(formData.premium * formData.quantity * (formData.action === 'buy' ? 1 : -1)).toFixed(2)}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.confirmButtonText}>Add to Strategy</Text>
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
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advancedSection: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  summarySection: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  summaryDetail: {
    fontSize: 14,
    color: '#3730a3',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
});

export default StrategyForm;