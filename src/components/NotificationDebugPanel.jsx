import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import browserNotificationService from '../services/browserNotificationService';
import { forceReconnect, socketService } from '../api/socket';
import { useAuth } from '@/contexts/AuthContext';

export default function NotificationDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [screenData, setScreenData] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });
  const { token } = useAuth();

  // Only show on web platform
  if (Platform.OS !== 'web') return null;

  // Listen for screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  // Listen for connection state changes
  useEffect(() => {
    const handleConnectionChange = (state) => {
      setConnectionState(state);
    };

    socketService.addConnectionListener(handleConnectionChange);
    setConnectionState(socketService.getConnectionState());

    return () => {
      socketService.removeConnectionListener(handleConnectionChange);
    };
  }, []);

  const updateDebugInfo = () => {
    const status = browserNotificationService.getStatus();
    const info = {
      // Browser support
      browserSupported: 'Notification' in window,
      notificationAPI: typeof Notification,
      
      // Permission status
      permission: Notification.permission,
      serviceEnabled: status.enabled,
      
      // Page visibility
      pageVisible: document.visibilityState === 'visible',
      pageHidden: document.visibilityState === 'hidden',
      
      // Service status
      activeNotifications: status.activeCount,
      canShow: browserNotificationService.canShowNotifications(),
      
      // Environment
      userAgent: navigator.userAgent.substring(0, 100) + '...',
      protocol: window.location.protocol,
      host: window.location.host,
      
      // Timestamps
      timestamp: new Date().toLocaleString(),
    };
    
    setDebugInfo(info);
  };

  useEffect(() => {
    if (isVisible) {
      updateDebugInfo();
      const interval = setInterval(updateDebugInfo, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const addTestResult = (test, result, details = '') => {
    const newResult = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID with timestamp + random
      test,
      result,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [newResult, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const runBasicTests = async () => {
    addTestResult('Starting Basic Tests', 'info', 'Running comprehensive notification tests...');
    
    // Test 1: Browser Support
    if ('Notification' in window) {
      addTestResult('Browser Support', 'success', 'Notification API is available');
    } else {
      addTestResult('Browser Support', 'error', 'Notification API not supported');
      return;
    }
    
    // Test 2: Permission Status
    const permission = Notification.permission;
    addTestResult('Permission Status', permission === 'granted' ? 'success' : 'warning', `Permission: ${permission}`);
    
    // Test 3: Service Initialization
    const status = browserNotificationService.getStatus();
    addTestResult('Service Status', status.supported ? 'success' : 'error', 
      `Supported: ${status.supported}, Enabled: ${status.enabled}`);
    
    // Test 4: Page Visibility
    const visibility = document.visibilityState;
    addTestResult('Page Visibility', 'info', `Current state: ${visibility}`);
    
    // Test 5: Can Show Notifications
    const canShow = browserNotificationService.canShowNotifications();
    addTestResult('Can Show Notifications', canShow ? 'success' : 'warning', 
      `Can show: ${canShow} (requires hidden page + granted permission)`);
  };

  const testPermissionRequest = async () => {
    addTestResult('Permission Request', 'info', 'Requesting notification permission...');
    
    try {
      const granted = await browserNotificationService.requestPermission();
      addTestResult('Permission Request', granted ? 'success' : 'error', 
        `Result: ${granted ? 'Granted' : 'Denied/Blocked'}`);
      updateDebugInfo();
    } catch (error) {
      addTestResult('Permission Request', 'error', `Error: ${error.message}`);
    }
  };

  const testNotificationDisplay = () => {
    addTestResult('Test Notification', 'info', 'Attempting to show test notification...');
    
    try {
      // Use force show method to bypass page visibility check
      const notification = browserNotificationService.forceShowNotification({
        title: '🔔 Circle Debug Test',
        body: 'This is a test notification from Circle app (forced)',
        icon: '/favicon.ico',
        tag: 'debug_test',
        onClick: () => {
          addTestResult('Notification Click', 'success', 'Test notification was clicked');
        }
      });
      
      if (notification) {
        addTestResult('Test Notification', 'success', 'Test notification created successfully (forced)');
      } else {
        addTestResult('Test Notification', 'error', 'Failed to create test notification');
      }
      
    } catch (error) {
      addTestResult('Test Notification', 'error', `Failed to create notification: ${error.message}`);
    }
  };

  const testServiceNotification = () => {
    addTestResult('Service Test', 'info', 'Testing notification service...');
    
    // First try normal service method
    const result = browserNotificationService.showGenericNotification({
      title: '🧪 Service Test',
      body: 'Testing browserNotificationService functionality',
      type: 'debug_test',
      onClick: () => {
        addTestResult('Service Click', 'success', 'Service notification was clicked');
      }
    });
    
    if (result) {
      addTestResult('Service Test', 'success', 'Service notification created successfully');
    } else {
      addTestResult('Service Test', 'warning', 'Service notification was blocked (page visible or no permission)');
      
      // Try force method as fallback
      const forceResult = browserNotificationService.forceShowNotification({
        title: '🧪 Service Test (Forced)',
        body: 'Testing browserNotificationService functionality (forced)',
        onClick: () => {
          addTestResult('Service Click', 'success', 'Forced service notification was clicked');
        }
      });
      
      if (forceResult) {
        addTestResult('Service Test', 'success', 'Forced service notification created successfully');
      } else {
        addTestResult('Service Test', 'error', 'Both normal and forced service notifications failed');
      }
    }
  };

  const simulateSocketEvent = () => {
    addTestResult('Socket Simulation', 'info', 'Simulating friend request notification...');
    
    // First try normal method
    const normalResult = browserNotificationService.showFriendRequestNotification({
      senderName: 'Debug User',
      senderId: 'debug_123',
      requestId: 'debug_request_' + Date.now()
    });
    
    if (normalResult) {
      addTestResult('Socket Simulation', 'success', 'Friend request notification shown (normal method)');
    } else {
      addTestResult('Socket Simulation', 'warning', 'Normal method blocked - trying forced method...');
      
      // Try forced method
      const forcedResult = browserNotificationService.forceShowNotification({
        title: '👥 New Friend Request (Debug)',
        body: 'Debug User wants to be your friend (forced)',
        onClick: () => {
          addTestResult('Socket Click', 'success', 'Forced friend request notification clicked');
        }
      });
      
      if (forcedResult) {
        addTestResult('Socket Simulation', 'success', 'Friend request notification shown (forced method)');
      } else {
        addTestResult('Socket Simulation', 'error', 'Both normal and forced methods failed');
      }
    }
  };

  const testVisibilityCheck = () => {
    addTestResult('Visibility Check', 'info', 'Testing page visibility requirements...');
    
    const status = browserNotificationService.getStatus();
    const visibility = document.visibilityState;
    const canShow = browserNotificationService.canShowNotifications();
    
    addTestResult('Visibility Check', 'info', `Page visibility: ${visibility}`);
    addTestResult('Visibility Check', 'info', `Permission: ${status.permission}`);
    addTestResult('Visibility Check', 'info', `Browser supported: ${status.supported}`);
    addTestResult('Visibility Check', canShow ? 'success' : 'warning', 
      `Can show notifications: ${canShow}`);
    
    if (!canShow) {
      let reason = 'Unknown reason';
      if (!status.supported) reason = 'Browser not supported';
      else if (status.permission !== 'granted') reason = 'Permission not granted';
      else if (visibility === 'visible') reason = 'Page is visible (notifications only show when page is hidden)';
      
      addTestResult('Visibility Check', 'warning', `Blocked reason: ${reason}`);
      addTestResult('Visibility Check', 'info', 'Tip: Switch to another tab or minimize browser to test real notifications');
    }
  };

  const testRealNotification = () => {
    addTestResult('Real Notification Test', 'info', 'Setting up real notification test...');
    
    const status = browserNotificationService.getStatus();
    
    if (!status.supported) {
      addTestResult('Real Notification Test', 'error', 'Browser does not support notifications');
      return;
    }
    
    if (status.permission !== 'granted') {
      addTestResult('Real Notification Test', 'error', 'Permission not granted. Click "Request Permission" first.');
      return;
    }
    
    // Schedule a notification to show when page becomes hidden
    addTestResult('Real Notification Test', 'info', 'Notification scheduled! Switch to another tab or minimize browser in next 5 seconds...');
    
    let countdown = 5;
    const countdownInterval = setInterval(() => {
      if (countdown > 0) {
        addTestResult('Real Notification Test', 'info', `Switch tabs now! ${countdown} seconds remaining...`);
        countdown--;
      } else {
        clearInterval(countdownInterval);
        
        // Try to show notification
        const result = browserNotificationService.showGenericNotification({
          title: '🎉 Real Notification Test',
          body: 'Success! This notification appeared because the page was hidden.',
          type: 'real_test',
          onClick: () => {
            addTestResult('Real Notification Test', 'success', 'Real notification was clicked!');
          }
        });
        
        if (result) {
          addTestResult('Real Notification Test', 'success', 'Real notification shown successfully!');
        } else {
          addTestResult('Real Notification Test', 'warning', 'Page is still visible. Try again and switch tabs faster.');
        }
      }
    }, 1000);
  };

  const testSocketReconnection = () => {
    addTestResult('Socket Reconnection', 'info', 'Testing socket reconnection...');
    
    if (!token) {
      addTestResult('Socket Reconnection', 'error', 'No auth token available');
      return;
    }

    try {
      forceReconnect(token);
      addTestResult('Socket Reconnection', 'success', 'Reconnection initiated - check connection status');
    } catch (error) {
      addTestResult('Socket Reconnection', 'error', `Failed to reconnect: ${error.message}`);
    }
  };

  const testRealSocketEvents = () => {
    addTestResult('Real Socket Events', 'info', 'Testing real socket event handlers...');
    
    try {
      // Import the socket to test event emission
      import('../api/socket').then(({ getSocket }) => {
        const socket = getSocket(token);
        
        if (!socket || !socket.connected) {
          addTestResult('Real Socket Events', 'error', 'Socket not connected');
          return;
        }

        // Test message notification
        const testMessageData = {
          message: {
            id: 'test_' + Date.now(),
            content: 'This is a test message for notifications',
            created_at: new Date().toISOString()
          },
          sender: {
            id: 'test_sender_123',
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
          },
          chatId: 'test_chat_different_from_current' // Different from current chat to trigger notification
        };

        // Emit the actual socket event that should trigger notification
        console.log('🧪 Manually emitting chat:message:received event:', testMessageData);
        
        // Simulate the server sending this event
        socket.emit('chat:message:received', testMessageData);
        
        // Also trigger the event handler directly to test
        setTimeout(() => {
          console.log('🧪 Triggering event handler directly...');
          
          // This simulates what happens when the server sends the event
          const eventHandlers = socket.listeners('chat:message:received');
          console.log('🔍 Found event handlers:', eventHandlers.length);
          
          if (eventHandlers.length > 0) {
            eventHandlers.forEach(handler => {
              try {
                handler(testMessageData);
                addTestResult('Real Socket Events', 'success', 'Event handler executed - check for notification');
              } catch (error) {
                addTestResult('Real Socket Events', 'error', `Handler error: ${error.message}`);
              }
            });
          } else {
            addTestResult('Real Socket Events', 'error', 'No event handlers found for chat:message:received');
          }
        }, 1000);

        addTestResult('Real Socket Events', 'info', 'Socket event test initiated - check console logs');
        
      }).catch(error => {
        addTestResult('Real Socket Events', 'error', `Import error: ${error.message}`);
      });
      
    } catch (error) {
      addTestResult('Real Socket Events', 'error', `Failed to test socket events: ${error.message}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Calculate dynamic positioning
  const getDebugButtonStyle = () => {
    const isSmallScreen = screenData.width < 768;
    const bottomOffset = isSmallScreen ? 120 : 100; // More space on mobile for tab bar
    
    return [
      styles.debugButton,
      {
        bottom: bottomOffset,
        right: isSmallScreen ? 16 : 20,
      }
    ];
  };

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={getDebugButtonStyle()} 
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name="bug" size={20} color="#FFFFFF" />
        <Text style={styles.debugButtonText}>Debug Notifications</Text>
      </TouchableOpacity>
    );
  }

  // Calculate dynamic panel positioning
  const getDebugPanelStyle = () => {
    const isSmallScreen = screenData.width < 768;
    
    return [
      styles.debugPanel,
      {
        width: isSmallScreen ? '95vw' : 400,
        right: isSmallScreen ? '2.5vw' : 20,
        top: isSmallScreen ? 60 : 20, // Account for mobile status bar
      }
    ];
  };

  return (
    <View style={getDebugPanelStyle()}>
      <View style={styles.debugHeader}>
        <Text style={styles.debugTitle}>🔔 Notification Debug Panel</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Ionicons name="close" size={24} color="#1F1147" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.debugContent} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Summary</Text>
          <View style={styles.summaryContainer}>
            {debugInfo.browserSupported && debugInfo.permission === 'granted' && debugInfo.pageVisible ? (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryIcon}>✅</Text>
                <Text style={styles.summaryText}>
                  Notifications are working! They're blocked because the page is visible. 
                  Switch tabs or minimize browser to see real notifications.
                </Text>
              </View>
            ) : !debugInfo.browserSupported ? (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryIcon}>❌</Text>
                <Text style={styles.summaryText}>
                  Browser doesn't support notifications. Try a modern browser like Chrome, Firefox, or Safari.
                </Text>
              </View>
            ) : debugInfo.permission !== 'granted' ? (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryIcon}>⚠️</Text>
                <Text style={styles.summaryText}>
                  Permission not granted. Click "Request Permission" to enable notifications.
                </Text>
              </View>
            ) : (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryIcon}>🔍</Text>
                <Text style={styles.summaryText}>
                  Run "Basic Tests" to diagnose the issue.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Status Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Current Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Browser Support</Text>
              <Text style={[styles.statusValue, debugInfo.browserSupported ? styles.success : styles.error]}>
                {debugInfo.browserSupported ? '✅ Yes' : '❌ No'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Permission</Text>
              <Text style={[styles.statusValue, 
                debugInfo.permission === 'granted' ? styles.success : 
                debugInfo.permission === 'denied' ? styles.error : styles.warning]}>
                {debugInfo.permission || 'Unknown'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Page Visibility</Text>
              <Text style={[styles.statusValue, debugInfo.pageVisible ? styles.warning : styles.success]}>
                {debugInfo.pageVisible ? '👁️ Visible' : '🙈 Hidden'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Can Show</Text>
              <Text style={[styles.statusValue, debugInfo.canShow ? styles.success : styles.warning]}>
                {debugInfo.canShow ? '✅ Yes' : '⚠️ No'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Socket Status</Text>
              <Text style={[styles.statusValue, 
                connectionState === 'connected' ? styles.success : 
                connectionState === 'connecting' || connectionState === 'reconnecting' ? styles.warning : styles.error]}>
                {connectionState === 'connected' ? '✅ Connected' :
                 connectionState === 'connecting' ? '🔄 Connecting' :
                 connectionState === 'reconnecting' ? '🔄 Reconnecting' :
                 connectionState === 'failed' ? '❌ Failed' : '⚠️ Disconnected'}
              </Text>
            </View>
          </View>
        </View>

        {/* Test Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Tests</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity style={styles.testButton} onPress={runBasicTests}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Basic Tests</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.testButton} onPress={testPermissionRequest}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Request Permission</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.testButton} onPress={testNotificationDisplay}>
              <Ionicons name="notifications" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Test Notification</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.testButton} onPress={testServiceNotification}>
              <Ionicons name="cog" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Test Service</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.testButton} onPress={simulateSocketEvent}>
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Simulate Event</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.testButton} onPress={testVisibilityCheck}>
              <Ionicons name="eye" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Check Visibility</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, { backgroundColor: '#4CAF50' }]} onPress={testRealNotification}>
              <Ionicons name="rocket" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Test Real</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, { backgroundColor: '#2196F3' }]} onPress={testSocketReconnection}>
              <Ionicons name="refresh-circle" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Reconnect</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, { backgroundColor: '#9C27B0' }]} onPress={testRealSocketEvents}>
              <Ionicons name="radio" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Test Events</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, styles.clearButton]} onPress={clearResults}>
              <Ionicons name="trash" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Clear Results</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test Results */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Test Results</Text>
            {testResults.map((result) => (
              <View key={result.id} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  <Text style={[styles.resultTest, 
                    result.result === 'success' ? styles.success :
                    result.result === 'error' ? styles.error :
                    result.result === 'warning' ? styles.warning : styles.info]}>
                    {result.result === 'success' ? '✅' :
                     result.result === 'error' ? '❌' :
                     result.result === 'warning' ? '⚠️' : 'ℹ️'} {result.test}
                  </Text>
                  <Text style={styles.resultTime}>{result.timestamp}</Text>
                </View>
                {result.details && (
                  <Text style={styles.resultDetails}>{result.details}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Debug Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Debug Info</Text>
          <Text style={styles.debugText}>
            Browser: {debugInfo.userAgent}{'\n'}
            Protocol: {debugInfo.protocol}{'\n'}
            Host: {debugInfo.host}{'\n'}
            Updated: {debugInfo.timestamp}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    position: 'fixed',
    // bottom and right are set dynamically
    backgroundColor: '#7C2B86',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999, // Higher z-index to ensure it's above everything
    gap: 8,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  debugPanel: {
    position: 'fixed',
    // top, right, and width are set dynamically
    maxHeight: '80vh',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 10000, // Higher than debug button
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.2)',
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 43, 134, 0.1)',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
  },
  debugContent: {
    maxHeight: 500,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 43, 134, 0.05)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    padding: 8,
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.7)',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C2B86',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    minWidth: '45%',
  },
  clearButton: {
    backgroundColor: '#FF4D67',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resultItem: {
    backgroundColor: 'rgba(124, 43, 134, 0.02)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7C2B86',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultTest: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  resultTime: {
    fontSize: 11,
    color: 'rgba(31, 17, 71, 0.5)',
  },
  resultDetails: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.7)',
    lineHeight: 16,
  },
  debugText: {
    fontSize: 11,
    color: 'rgba(31, 17, 71, 0.6)',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#FF4D67',
  },
  warning: {
    color: '#FF9800',
  },
  info: {
    color: '#2196F3',
  },
  summaryContainer: {
    backgroundColor: 'rgba(124, 43, 134, 0.02)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7C2B86',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: '#1F1147',
    lineHeight: 18,
    fontWeight: '500',
  },
});
