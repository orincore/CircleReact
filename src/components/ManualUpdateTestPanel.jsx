/**
 * Manual Update Test Panel Component
 * Component for testing manual update controls and settings UI
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  runManualUpdateControlsTest, 
  quickManualUpdateVerification,
  testManualUpdateCheck,
  testUpdateConfiguration,
} from '@/src/utils/manualUpdateTest';
import { otaUpdateService } from '@/src/services/otaUpdateService';

const ManualUpdateTestPanel = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [config, setConfig] = useState(null);

  React.useEffect(() => {
    // Load current configuration
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    try {
      const currentConfig = otaUpdateService.getConfiguration();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const updateConfiguration = async (key, value) => {
    try {
      const newConfig = { ...config, [key]: value };
      await otaUpdateService.updateConfiguration({ [key]: value });
      setConfig(newConfig);
      
      Alert.alert('Success', `${key} updated to ${value}`);
    } catch (error) {
      console.error('Failed to update configuration:', error);
      Alert.alert('Error', `Failed to update ${key}: ${error.message}`);
    }
  };

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
      
      const results = await runManualUpdateControlsTest();
      setTestResults(results);
      
      if (results.summary?.allTestsPassed) {
        Alert.alert(
          '🎉 All Tests Passed!',
          `All ${results.summary.totalTests} manual update control tests completed successfully.`
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

  const performManualUpdateCheck = async () => {
    try {
      setLoading(true);
      await otaUpdateService.forceCheckForUpdates();
      Alert.alert('Update Check', 'Manual update check completed. Check console for details.');
    } catch (error) {
      Alert.alert('Error', `Manual update check failed: ${error.message}`);
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
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
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
    configItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    configLabel: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    configDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name="settings-outline" 
          size={24} 
          color={theme.colors.primary}
          style={styles.icon}
        />
        <Text style={styles.title}>Manual Update Controls</Text>
      </View>
      
      <Text style={styles.description}>
        Test manual update functionality including settings, user controls, and configuration management.
      </Text>
      
      {/* Configuration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Configuration</Text>
        
        {config && (
          <>
            <View style={styles.configItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.configLabel}>Auto Download</Text>
                <Text style={styles.configDescription}>
                  Automatically download updates in background
                </Text>
              </View>
              <Switch
                value={config.autoDownload}
                onValueChange={(value) => updateConfiguration('autoDownload', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
            
            <View style={styles.configItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.configLabel}>Auto Restart</Text>
                <Text style={styles.configDescription}>
                  Automatically restart app after update download
                </Text>
              </View>
              <Switch
                value={config.autoRestart}
                onValueChange={(value) => updateConfiguration('autoRestart', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
            
            <View style={styles.configItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.configLabel}>Show Notifications</Text>
                <Text style={styles.configDescription}>
                  Display update notifications to user
                </Text>
              </View>
              <Switch
                value={config.showNotifications}
                onValueChange={(value) => updateConfiguration('showNotifications', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
          </>
        )}
      </View>
      
      {/* Manual Controls Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Controls</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={performManualUpdateCheck}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="refresh" size={16} color="white" />
            )}
            <Text style={[styles.buttonText, loading && styles.buttonTextDisabled]}>
              {loading ? 'Checking...' : 'Check for Updates'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={() => runTest(quickManualUpdateVerification, 'Quick Verification')}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.text} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary, loading && styles.buttonTextDisabled]}>
              Quick Verification
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Control Tests</Text>
        
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
              {loading ? 'Running Tests...' : 'Run All Control Tests'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={() => runTest(testManualUpdateCheck, 'Manual Check Test')}
            disabled={loading}
          >
            <Ionicons name="refresh" size={16} color={theme.colors.text} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary, loading && styles.buttonTextDisabled]}>
              Test Manual Check
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={() => runTest(testUpdateConfiguration, 'Configuration Test')}
            disabled={loading}
          >
            <Ionicons name="settings" size={16} color={theme.colors.text} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary, loading && styles.buttonTextDisabled]}>
              Test Configuration
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Results Section */}
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
          
          {testResults.tests?.manualCheck && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Manual Check:</Text>
              <Text style={[
                styles.resultValue,
                testResults.tests.manualCheck.success ? styles.resultSuccess : styles.resultError
              ]}>
                {testResults.tests.manualCheck.success ? 'WORKING' : 'FAILED'}
              </Text>
            </View>
          )}
          
          {testResults.tests?.configuration && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Configuration:</Text>
              <Text style={[
                styles.resultValue,
                testResults.tests.configuration.success ? styles.resultSuccess : styles.resultError
              ]}>
                {testResults.tests.configuration.success ? 'WORKING' : 'FAILED'}
              </Text>
            </View>
          )}
          
          {testResults.tests?.notifications && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Notifications:</Text>
              <Text style={[
                styles.resultValue,
                testResults.tests.notifications.success ? styles.resultSuccess : styles.resultError
              ]}>
                {testResults.tests.notifications.success ? 'WORKING' : 'FAILED'}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default ManualUpdateTestPanel;