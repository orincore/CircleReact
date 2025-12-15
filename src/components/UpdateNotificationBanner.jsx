/**
 * Update Notification Banner Component
 * Displays available updates with details and user options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { otaUpdateService } from '@/src/services/otaUpdateService';

const { width } = Dimensions.get('window');

const UpdateNotificationBanner = ({ 
  visible = false, 
  updateInfo = null,
  onAccept = null,
  onDecline = null,
  onDismiss = null,
}) => {
  const { theme } = useTheme();
  const [slideAnim] = useState(new Animated.Value(-100));
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (visible) {
      // Slide down animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible]);

  const handleAccept = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      if (onAccept) {
        await onAccept();
      }
      
      clearInterval(progressInterval);
      setDownloadProgress(100);
      
      // Brief delay to show completion
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Error accepting update:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDecline = () => {
    if (onDecline) {
      onDecline();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  const formatUpdateSize = (size) => {
    if (!size || size === 'unknown') return 'Size unknown';
    
    if (typeof size === 'number') {
      if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
      } else {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      }
    }
    
    return size;
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="download-outline" 
              size={24} 
              color={theme.colors.primary} 
            />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Update Available
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              A new version is ready to install
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close" 
              size={20} 
              color={theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Update Details */}
        {updateInfo && (
          <View style={styles.details}>
            {updateInfo.version && (
              <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                Version: {updateInfo.version}
              </Text>
            )}
            {updateInfo.size && (
              <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                Size: {formatUpdateSize(updateInfo.size)}
              </Text>
            )}
            {updateInfo.description && (
              <Text style={[styles.description, { color: theme.colors.text }]}>
                {updateInfo.description}
              </Text>
            )}
          </View>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${downloadProgress}%`,
                    backgroundColor: theme.colors.primary,
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              {downloadProgress}%
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {!isDownloading && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleDecline}
              style={[
                styles.button,
                styles.declineButton,
                { borderColor: theme.colors.border }
              ]}
            >
              <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
                Later
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleAccept}
              style={[
                styles.button,
                styles.acceptButton,
                { backgroundColor: theme.colors.primary }
              ]}
            >
              <Text style={[styles.buttonText, { color: theme.colors.white }]}>
                Update Now
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {isDownloading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              size="small" 
              color={theme.colors.primary} 
            />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Downloading update...
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    padding: 16,
    paddingTop: 50, // Account for status bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  dismissButton: {
    padding: 4,
  },
  details: {
    marginBottom: 16,
    paddingLeft: 36,
  },
  detailText: {
    fontSize: 13,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 36,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    minWidth: 35,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  declineButton: {
    borderWidth: 1,
  },
  acceptButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default UpdateNotificationBanner;