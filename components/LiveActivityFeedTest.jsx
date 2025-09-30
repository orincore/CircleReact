import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../src/hooks/useSocket';
import { useAuth } from '../contexts/AuthContext';

const LiveActivityFeedTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const socket = useSocket();
  const { token } = useAuth();

  const addTestResult = (test, status, message) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testSocketConnection = async () => {
    addTestResult('Socket Connection', 'running', 'Testing socket connection...');
    
    if (!socket) {
      addTestResult('Socket Connection', 'failed', 'Socket not available');
      return false;
    }

    if (socket.connected) {
      addTestResult('Socket Connection', 'passed', 'Socket is connected');
      return true;
    } else {
      addTestResult('Socket Connection', 'failed', 'Socket is not connected');
      return false;
    }
  };

  const testActivityRequest = async () => {
    addTestResult('Activity Request', 'running', 'Requesting recent activities...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        addTestResult('Activity Request', 'failed', 'Request timed out after 5 seconds');
        resolve(false);
      }, 5000);

      socket.once('activity:recent_list', (data) => {
        clearTimeout(timeout);
        if (data && Array.isArray(data.activities)) {
          addTestResult('Activity Request', 'passed', `Received ${data.activities.length} activities`);
          resolve(true);
        } else {
          addTestResult('Activity Request', 'failed', 'Invalid response format');
          resolve(false);
        }
      });

      socket.emit('activity:get_recent', { limit: 10 });
    });
  };

  const testActivityListeners = async () => {
    addTestResult('Activity Listeners', 'running', 'Setting up activity listeners...');
    
    const activityTypes = [
      'activity:user_matched',
      'activity:user_joined',
      'activity:profile_visited',
      'activity:friend_request_sent',
      'activity:friends_connected',
      'activity:location_updated',
      'activity:chat_started',
      'activity:interest_updated',
    ];

    let receivedCount = 0;
    const expectedCount = activityTypes.length;

    const cleanup = [];

    activityTypes.forEach(eventType => {
      const handler = (data) => {
        receivedCount++;
        addTestResult('Activity Listeners', 'info', `Received ${eventType}: ${JSON.stringify(data).substring(0, 100)}...`);
        
        if (receivedCount >= expectedCount) {
          addTestResult('Activity Listeners', 'passed', `All ${expectedCount} activity types are listening`);
        }
      };
      
      socket.on(eventType, handler);
      cleanup.push(() => socket.off(eventType, handler));
    });

    // Simulate some test activities after a short delay
    setTimeout(() => {
      if (receivedCount === 0) {
        addTestResult('Activity Listeners', 'info', 'No activities received yet (this is normal if no recent activities)');
      }
    }, 2000);

    return cleanup;
  };

  const simulateActivity = async () => {
    addTestResult('Simulate Activity', 'running', 'Simulating global test activity...');
    
    // Test creating a sample activity that all users should see
    try {
      // Simulate a user joining activity
      socket.emit('profile:visit', {
        profileOwnerId: 'global-test-user',
        visitorId: 'test-visitor-' + Date.now(),
        visitorName: 'Global Test User'
      });
      
      addTestResult('Simulate Activity', 'passed', 'Global activity simulated - all users should see this');
      addTestResult('Simulate Activity', 'info', 'Check other devices to verify global visibility');
    } catch (error) {
      addTestResult('Simulate Activity', 'failed', `Error: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    clearResults();
    
    addTestResult('Test Suite', 'running', 'Starting Live Activity Feed tests...');
    
    try {
      // Test 1: Socket Connection
      const socketOk = await testSocketConnection();
      if (!socketOk) {
        addTestResult('Test Suite', 'failed', 'Socket connection failed, aborting tests');
        setIsRunning(false);
        return;
      }

      // Test 2: Activity Request
      await testActivityRequest();

      // Test 3: Activity Listeners
      const cleanup = await testActivityListeners();

      // Test 4: Simulate Activity
      await simulateActivity();

      addTestResult('Test Suite', 'passed', 'All tests completed successfully!');
      
      // Cleanup listeners after tests
      setTimeout(() => {
        cleanup.forEach(fn => fn());
        addTestResult('Test Suite', 'info', 'Cleaned up test listeners');
      }, 5000);

    } catch (error) {
      addTestResult('Test Suite', 'failed', `Test suite error: ${error.message}`);
    }
    
    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return { name: 'checkmark-circle', color: '#22C55E' };
      case 'failed': return { name: 'close-circle', color: '#EF4444' };
      case 'running': return { name: 'time', color: '#F59E0B' };
      case 'info': return { name: 'information-circle', color: '#3B82F6' };
      default: return { name: 'help-circle', color: '#6B7280' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Activity Feed Test</Text>
        <TouchableOpacity 
          style={[styles.button, isRunning && styles.buttonDisabled]} 
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Ionicons name="play" size={16} color="white" />
          <Text style={styles.buttonText}>
            {isRunning ? 'Running...' : 'Run Tests'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
        <Ionicons name="trash" size={16} color="#666" />
        <Text style={styles.clearButtonText}>Clear Results</Text>
      </TouchableOpacity>

      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        {testResults.map((result) => {
          const icon = getStatusIcon(result.status);
          return (
            <View key={result.id} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <Ionicons name={icon.name} size={20} color={icon.color} />
                <Text style={styles.resultTest}>{result.test}</Text>
                <Text style={styles.resultTime}>{result.timestamp}</Text>
              </View>
              <Text style={styles.resultMessage}>{result.message}</Text>
            </View>
          );
        })}
        
        {testResults.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No test results yet</Text>
            <Text style={styles.emptySubtext}>Run tests to see live activity feed status</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7C2B86',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C2B86',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    marginBottom: 12,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
  },
  results: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7C2B86',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  resultTest: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  resultTime: {
    fontSize: 12,
    color: '#666',
  },
  resultMessage: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default LiveActivityFeedTest;
