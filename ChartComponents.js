import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

// This is our main payoff chart component - the heart of options strategy visualization
export const PayoffChart = ({ data, currentPrice }) => {
  // Transform our payoff data into the format that react-native-chart-kit expects
  // We need to separate the price points (x-axis) from the payoff values (y-axis)
  const chartData = {
    labels: data.map((point, index) => {
      // Only show every 5th label to avoid overcrowding the x-axis
      return index % 5 === 0 ? `$${point.price}` : '';
    }),
    datasets: [{
      data: data.map(point => parseFloat(point.payoff)),
      color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Blue line
      strokeWidth: 2
    }]
  };

  // Chart configuration - this controls how our chart looks and behaves
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0, // No decimal places for cleaner look
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 8,
    },
    propsForDots: {
      r: '0', // Hide the dots on the line for cleaner appearance
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5', // Dashed grid lines
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Strategy Payoff at Expiration</Text>
      <Text style={styles.chartSubtitle}>
        Current Price: ${currentPrice?.toFixed(2) || 'N/A'}
      </Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={chartData}
          width={Math.max(screenWidth - 40, data.length * 15)} // Dynamic width based on data points
          height={220}
          chartConfig={chartConfig}
          bezier={false} // Straight lines for accurate payoff representation
          style={styles.chart}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          withDots={false}
          withShadow={false}
        />
      </ScrollView>
      
      {/* Add a break-even line indicator */}
      <View style={styles.breakEvenIndicator}>
        <View style={styles.breakEvenLine} />
        <Text style={styles.breakEvenText}>Break-even Line</Text>
      </View>
    </View>
  );
};

// Portfolio performance chart - shows profit/loss over time
export const PortfolioChart = ({ performanceData }) => {
  // Handle empty data gracefully
  if (!performanceData || performanceData.length === 0) {
    return (
      <View style={styles.emptyChartContainer}>
        <Text style={styles.emptyChartText}>No performance data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: performanceData.map(point => point.date),
    datasets: [{
      data: performanceData.map(point => parseFloat(point.value)),
      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green for profits
      strokeWidth: 2
    }]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 8,
    },
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Portfolio Performance</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={200}
        chartConfig={chartConfig}
        bezier={true} // Smooth curves for performance data
        style={styles.chart}
      />
    </View>
  );
};

// Greeks visualization - shows how option values change with various factors
export const GreeksChart = ({ greeksData }) => {
  if (!greeksData || greeksData.length === 0) {
    return (
      <View style={styles.emptyChartContainer}>
        <Text style={styles.emptyChartText}>No Greeks data available</Text>
      </View>
    );
  }

  // Create a bar chart for Greeks - each Greek gets its own bar
  const chartData = {
    labels: ['Delta', 'Gamma', 'Theta', 'Vega', 'Rho'],
    datasets: [{
      data: [
        greeksData.delta || 0,
        greeksData.gamma || 0,
        greeksData.theta || 0,
        greeksData.vega || 0,
        greeksData.rho || 0
      ]
    }]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 3, // Greeks need more precision
    color: (opacity = 1) => `rgba(147, 51, 234, ${opacity})`, // Purple bars
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 8,
    },
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Option Greeks</Text>
      <Text style={styles.chartSubtitle}>Risk Sensitivities</Text>
      <BarChart
        data={chartData}
        width={screenWidth - 40}
        height={200}
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={true}
      />
    </View>
  );
};

// Position allocation pie chart - shows how your portfolio is distributed
export const AllocationChart = ({ allocationData }) => {
  if (!allocationData || allocationData.length === 0) {
    return (
      <View style={styles.emptyChartContainer}>
        <Text style={styles.emptyChartText}>No allocation data available</Text>
      </View>
    );
  }

  // Transform allocation data for pie chart
  const pieData = allocationData.map((item, index) => ({
    name: item.name,
    population: item.value,
    color: getColorForIndex(index), // We'll define this helper function
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  const chartConfig = {
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Portfolio Allocation</Text>
      <PieChart
        data={pieData}
        width={screenWidth - 40}
        height={200}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[10, 10]}
        absolute={false} // Show percentages instead of absolute values
        style={styles.chart}
      />
    </View>
  );
};

// Volatility surface chart - 3D-like representation of implied volatility
export const VolatilitySurfaceChart = ({ volatilityData }) => {
  if (!volatilityData || volatilityData.length === 0) {
    return (
      <View style={styles.emptyChartContainer}>
        <Text style={styles.emptyChartText}>No volatility data available</Text>
      </View>
    );
  }

  // For this example, we'll create a simplified 2D representation
  // In a real app, you might use a more sophisticated 3D library
  const chartData = {
    labels: volatilityData.map(point => `${point.strike}`),
    datasets: [{
      data: volatilityData.map(point => parseFloat(point.impliedVol)),
      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red for volatility
      strokeWidth: 2
    }]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 8,
    },
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Implied Volatility Surface</Text>
      <Text style={styles.chartSubtitle}>IV across strike prices</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={200}
        chartConfig={chartConfig}
        bezier={true}
        style={styles.chart}
      />
    </View>
  );
};

// Helper function to generate colors for pie chart segments
const getColorForIndex = (index) => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  emptyChartContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  emptyChartText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  breakEvenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  breakEvenLine: {
    width: 20,
    height: 1,
    backgroundColor: '#6B7280',
    marginRight: 8,
  },
  breakEvenText: {
    fontSize: 12,
    color: '#6B7280',
  },
});