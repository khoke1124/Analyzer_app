import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const StrategyFormScreen = ({ route, navigation }) => {
  const { option, ticker, currentPrice, onConfirm } = route.params;

  const [formData, setFormData] = useState({
    type: option.type || 'call',
    action: 'buy',
    strike: option.strike,
    premium: option.type === 'call' ? parseFloat(option.callAsk) : parseFloat(option.putAsk),
    quantity: 1,
    expiration: '2025-02-21',
    volatility: parseFloat(option.iv) || 0.25,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-update premium based on action
    if (field === 'action' || field === 'type') {
      const type = field === 'type' ? value : formData.type;
      const action = field === 'action' ? value : formData.action;
      let newPremium;
      if (type === 'call') {
        newPremium = action === 'buy' ? option.callAsk : option.callBid;
      } else {
        newPremium = action === 'buy' ? option.putAsk : option.putBid;
      }
      setFormData(prev => ({ ...prev, premium: parseFloat(newPremium) }));
    }
  };

  const handleConfirm = () => {
    if (formData.quantity < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }
    if (formData.premium <= 0) {
      Alert.alert('Error', 'Premium must be greater than 0');
      return;
    }

    onConfirm({
      ...formData,
      strike: parseFloat(formData.strike),
      premium: parseFloat(formData.premium),
      quantity: parseInt(formData.quantity),
      volatility: parseFloat(formData.volatility),
    });
    navigation.goBack();
  };

  const totalCost = formData.premium * formData.quantity * 100 * (formData.action === 'buy' ? 1 : -1);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.ticker}>{ticker}</Text>
        <Text style={styles.strike}>${formData.strike} Strike</Text>
        <Text style={styles.currentPrice}>Current: ${currentPrice?.toFixed(2)}</Text>
      </View>

      <View style={styles.form}>
        {/* Option Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Option Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.type}
              onValueChange={(value) => updateField('type', value)}
              style={styles.picker}
              dropdownIconColor="#94a3b8"
            >
              <Picker.Item label="Call" value="call" color="#22c55e" />
              <Picker.Item label="Put" value="put" color="#ef4444" />
            </Picker>
          </View>
        </View>

        {/* Action */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Action</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.action}
              onValueChange={(value) => updateField('action', value)}
              style={styles.picker}
              dropdownIconColor="#94a3b8"
            >
              <Picker.Item label="Buy (Long)" value="buy" color="#60a5fa" />
              <Picker.Item label="Sell (Short)" value="sell" color="#f97316" />
            </Picker>
          </View>
        </View>

        {/* Strike Price */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Strike Price</Text>
          <TextInput
            style={styles.input}
            value={formData.strike.toString()}
            onChangeText={(value) => updateField('strike', value)}
            keyboardType="decimal-pad"
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Premium */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Premium</Text>
          <TextInput
            style={styles.input}
            value={formData.premium.toString()}
            onChangeText={(value) => updateField('premium', value)}
            keyboardType="decimal-pad"
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Quantity */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Quantity (Contracts)</Text>
          <TextInput
            style={styles.input}
            value={formData.quantity.toString()}
            onChangeText={(value) => updateField('quantity', value)}
            keyboardType="number-pad"
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Advanced Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.label}>Advanced Options</Text>
          <Switch
            value={showAdvanced}
            onValueChange={setShowAdvanced}
            trackColor={{ false: '#334155', true: '#1e40af' }}
            thumbColor="#f8fafc"
          />
        </View>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            {/* Expiration */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Expiration</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.expiration}
                  onValueChange={(value) => updateField('expiration', value)}
                  style={styles.picker}
                  dropdownIconColor="#94a3b8"
                >
                  <Picker.Item label="Jan 17, 2025" value="2025-01-17" />
                  <Picker.Item label="Jan 24, 2025" value="2025-01-24" />
                  <Picker.Item label="Jan 31, 2025" value="2025-01-31" />
                  <Picker.Item label="Feb 21, 2025" value="2025-02-21" />
                  <Picker.Item label="Mar 21, 2025" value="2025-03-21" />
                </Picker>
              </View>
            </View>

            {/* Implied Volatility */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Implied Volatility</Text>
              <TextInput
                style={styles.input}
                value={formData.volatility.toString()}
                onChangeText={(value) => updateField('volatility', value)}
                keyboardType="decimal-pad"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {formData.action.toUpperCase()} {formData.quantity}x {formData.type.toUpperCase()}
            </Text>
            <Text style={styles.summaryValue}>${formData.strike} Strike</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Premium</Text>
            <Text style={styles.summaryValue}>${formData.premium.toFixed(2)} per contract</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total {formData.action === 'buy' ? 'Cost' : 'Credit'}</Text>
            <Text style={[styles.totalValue, totalCost < 0 ? styles.credit : styles.debit]}>
              ${Math.abs(totalCost).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Add to Strategy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  ticker: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  strike: {
    fontSize: 18,
    color: '#60a5fa',
    marginTop: 4,
  },
  currentPrice: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerWrapper: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  picker: {
    color: '#f8fafc',
    height: 50,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  advancedSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summary: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  debit: {
    color: '#ef4444',
  },
  credit: {
    color: '#22c55e',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StrategyFormScreen;
