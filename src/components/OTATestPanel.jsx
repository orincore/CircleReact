/**
 * OTA Test Panel Component
 * Simple component for testing OTA update functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { runComprehensiveOTATests, testCompleteUpdateFlow, testUpdateNotificationSystem } from '@/src/utils/otaTestHelper';

const OTATestPanel = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const runTest = async (testFunction, testName) => {
    try {
      setLoading(true);
      console.log(`🧪 Running ${testName}...`);
      
      const result = await testFunction();
      
      if (result.success) {
        Alert.alert('Test Passed', `${testName} completed successfully!`);
      } else {
        Alert.alert('Test Failed', `${testName} failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      Alert.alert('Test Error', `${testName} encountered an error: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    try {
      setLoading(true);
      setTestResults(null);
      
      const results = await runComprehensiveOTATests();
      setTestResults(results);
      
      if (results.summary?.allTestsPassed) {
        Alert.alert(
          '🎉 All Tests Passed!',
          `All ${results.summary.totalTests} OTA update tests completed successfully.`
        );
      } else {
        Alert.alert(
          '⚠️ Some Tests Failed',
          `${results.summary?.failedTests || 0} out of ${results.summary?.totalTests || 0} tests failed. Check the console for details.`
        );
      }
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      Alert.alert('Test Suite Error', `Failed to run test suite: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      margin: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    icon: {
      marginRight: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    description: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16,
    },
    buttonContainer: {
      gap: 12,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonSecondary: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonDisabled: {
      backgroundColor: theme.colors.border,
    },
    buttonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 8,
    },
    buttonTextSecondary: {
      color: theme.colors.text,
    },
    buttonTextDisabled: {
      color: theme.colors.textSecondary,
    },
    resultsContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
    },
    resultsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    resultItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    resultLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    resultValue: {
      fontSize: 14,
      fontWeight: '500',
    },
    resultSuccess: {
      color: '#34C759',
    },
    resultError: {
      color: '#FF3B30',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name="flask-outline" 
          size={24} 
          color={theme.colors.primary}
          style={styles.icon}
        />
        <Text style={styles.title}>OTA Update Tests</Text>
      </View>
      
      <Text style={styles.description}>
        Test the complete OTA update system to verify everything is working correctly.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={runAllTests}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="play" size={16} color="white" />
          )}
          <Text style={[styles.buttonText, loading && styles.buttonTextDisabled]}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={() => runTest(testCompleteUpdateFlow, 'Complete Update Flow Test')}
          disabled={loading}
        >
          <Ionicons name="refresh" size={16} color={theme.colors.text} />
          <Text style={[styles.buttonText, styles.buttonTextSecondary, loading && styles.buttonTextDisabled]}>
            Test Update Flow
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={() => runTest(testUpdateNotificationSystem, 'Notification System Test')}
          disabled={loading}
        >
          <Ionicons name="notifications" size={16} color={theme.colors.text} />
          <Text style={[styles.buttonText, styles.buttonTextSecondary, loading && styles.buttonTextDisabled]}>
            Test Notifications
          </Text>
        </TouchableOpacity>
      </View>
      
      {testResults && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results</Text>
          
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Overall Status:</Text>
            <Text style={[
              styles.resultValue,
              testResults.summary?.allTestsPassed ? styles.resultSuccess : styles.resultError
            ]}>
              {testResults.summary?.allTestsPassed ? 'PASSED' : 'FAILED'}
            </Text>
          </View>
          
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Tests Passed:</Text>
            <Text style={[styles.resultValue, styles.resultSuccess]}>
              {testResults.summary?.passedTests || 0}
            </Text>
          </View>
          
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Tests Failed:</Text>
            <Text style={[styles.resultValue, styles.resultError]}>
              {testResults.summary?.failedTests || 0}
            </Text>
          </View>
          
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>OTA Available:</Text>
            <Text style={[
              styles.resultValue,
              testResults.tests?.completeFlow?.summary?.otaAvailable ? styles.resultSuccess : styles.resultError
            ]}>
              {testResults.tests?.completeFlow?.summary?.otaAvailable ? 'YES' : 'NO'}
            </Text>
          </View>
          
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Network Connected:</Text>
            <Text style={[
              styles.resultValue,
              testResults.tests?.completeFlow?.summary?.networkConnected ? styles.resultSuccess : styles.resultError
            ]}>
              {testResults.tests?.completeFlow?.summary?.networkConnected ? 'YES' : 'NO'}
            </Text>
          </View>
          
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>System Healthy:</Text>
            <Text style={[
              styles.resultValue,
              testResults.tests?.completeFlow?.summary?.systemHealthy ? styles.resultSuccess : styles.resultError
            ]}>
              {testResults.tests?.completeFlow?.summary?.systemHealthy ? 'YES' : 'NO'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default OTATestPanel;