import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { socketService, forceReconnect } from '../api/socket';
import { useAuth } from '@/contexts/AuthContext';

export default function ConnectionStatus() {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [showDetails, setShowDetails] = useState(false);
  const { token } = useAuth();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Listen to connection state changes
    const handleConnectionChange = (state) => {
      setConnectionState(state);
      console.log('🔌 Connection state changed:', state);
    };

    socketService.addConnectionListener(handleConnectionChange);
    
    // Get initial state
    setConnectionState(socketService.getConnectionState());

    return () => {
      socketService.removeConnectionListener(handleConnectionChange);
    };
  }, []);

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

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
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

  // Don't show if connected (to avoid clutter)
  if (connectionState === 'connected' && !showDetails) {
    return null;
  }

  return (
    <View style={styles.container}>
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
    </View>
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
