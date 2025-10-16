import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { socketService, forceReconnect } from '../api/socket';
import { useAuth } from '@/contexts/AuthContext';

export default function ConnectionStatus() {
  const { token, user } = useAuth();
  const pathname = usePathname();
  const [connectionState, setConnectionState] = useState('disconnected');
  const [showDetails, setShowDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const retryTimeoutRef = React.useRef(null);

  useEffect(() => {
    // Only setup listeners if authenticated
    if (!token || !user) {
      return;
    }

    // Listen to connection state changes
    const handleConnectionChange = (state) => {
      setConnectionState(state);
      
      // Auto-retry when disconnected or failed
      if ((state === 'disconnected' || state === 'failed' || state === 'error') && token) {
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        // Increment retry count
        setRetryCount(prev => prev + 1);
        
        // Auto-retry immediately (no delay for first few attempts)
        retryTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Auto-retrying connection...');
          forceReconnect(token);
        }, 500); // Very short delay
      } else if (state === 'connected' || state === 'refreshed') {
        // Reset retry count on successful connection
        setRetryCount(0);
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      }
    };

    socketService.addConnectionListener(handleConnectionChange);
    
    // Get initial state and trigger auto-retry if needed
    const initialState = socketService.getConnectionState();
    setConnectionState(initialState);
    
    // If initially disconnected, trigger auto-retry
    if ((initialState === 'disconnected' || initialState === 'failed') && token) {
      setTimeout(() => {
        console.log('🔄 Initial auto-retry...');
        forceReconnect(token);
      }, 500);
    }

    return () => {
      socketService.removeConnectionListener(handleConnectionChange);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [token, user]);

  // Pulse animation for connecting/reconnecting states
  useEffect(() => {
    if (connectionState === 'connecting' || connectionState === 'reconnecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [connectionState, pulseAnim]);

  // Only show connection status for authenticated users
  if (!token || !user) {
    return null;
  }

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
      case 'refreshed': // Treat refreshed as connected
        return {
          icon: 'wifi',
          color: '#4CAF50',
          text: 'Connected',
          description: 'Real-time features active'
        };
      case 'connecting':
        return {
          icon: 'wifi',
          color: '#FF9800',
          text: 'Connecting...',
          description: 'Establishing connection'
        };
      case 'reconnecting':
        return {
          icon: 'refresh',
          color: '#FF9800',
          text: 'Reconnecting...',
          description: 'Attempting to restore connection'
        };
      case 'disconnected':
        return {
          icon: 'wifi-off',
          color: '#FF4D67',
          text: 'Disconnected',
          description: 'Real-time features unavailable'
        };
      case 'failed':
        return {
          icon: 'alert-circle',
          color: '#FF4D67',
          text: 'Connection Failed',
          description: 'Please refresh the page'
        };
      case 'auth_failed':
        return {
          icon: 'lock-closed',
          color: '#FF4D67',
          text: 'Auth Failed',
          description: 'Please log in again'
        };
      case 'error':
        return {
          icon: 'alert-circle',
          color: '#FF4D67',
          text: 'Connection Error',
          description: 'An error occurred'
        };
      default:
        return {
          icon: 'help-circle',
          color: '#9E9E9E',
          text: 'Unknown',
          description: 'Connection status unknown'
        };
    }
  };

  const handleReconnect = () => {
    if (token) {
      forceReconnect(token);
    }
  };

  const config = getStatusConfig();

  // Don't show on authentication pages (landing, login, signup)
  const authPages = ['/', '/login', '/signup'];
  const isAuthPage = authPages.includes(pathname);
  
  if (isAuthPage) {
    return null;
  }

  // Don't show if connected or refreshed (to avoid clutter)
  if ((connectionState === 'connected' || connectionState === 'refreshed') && !showDetails) {
    return null;
  }

  // Hide the bar during connecting/reconnecting states
  if (connectionState === 'connecting' || connectionState === 'reconnecting') {
    return null;
  }

  // Only show the bar if we've failed multiple times (after 3 retry attempts)
  // This gives auto-retry a chance to work without showing the UI
  if (retryCount < 3) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity 
        style={[styles.statusBar, { backgroundColor: config.color + '15' }]}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Animated.View style={[styles.iconContainer, { opacity: pulseAnim }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.text}
          </Text>
          {showDetails && (
            <Text style={styles.descriptionText}>
              {config.description}
            </Text>
          )}
        </View>

        {(connectionState === 'disconnected' || connectionState === 'failed') && (
          <TouchableOpacity 
            style={[styles.reconnectButton, { borderColor: config.color }]}
            onPress={handleReconnect}
          >
            <Ionicons name="refresh" size={14} color={config.color} />
            <Text style={[styles.reconnectText, { color: config.color }]}>
              Retry
            </Text>
          </TouchableOpacity>
        )}

        <Ionicons 
          name={showDetails ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={config.color} 
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  iconContainer: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
    marginRight: 8,
    gap: 4,
  },
  reconnectText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
