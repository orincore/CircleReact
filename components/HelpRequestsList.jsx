import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { promptMatchingApi } from '@/src/api/promptMatching';
import { getSocket } from '@/src/api/socket';
import HelpRequestCard from './HelpRequestCard';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * Component to display a list of help requests
 * Supports filtering by status and pagination
 */
const HelpRequestsList = ({ 
  status = 'searching', 
  title = 'Help Requests',
  showHelpButton = true,
  onHelpOffer,
  maxItems = null,
  onRefresh = null,
  externalRefreshing = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const { token } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadRequests = useCallback(async (isRefresh = false) => {
    if (!token) return;
    
    try {
      const currentOffset = isRefresh ? 0 : offset;
      const limit = maxItems || 20;
      
      const response = await promptMatchingApi.getHelpRequests(limit, currentOffset, status, token);
      
      if (response.success) {
        const newRequests = response.requests || [];
        
        if (isRefresh) {
          setRequests(newRequests);
          setOffset(newRequests.length);
        } else {
          setRequests(prev => [...prev, ...newRequests]);
          setOffset(prev => prev + newRequests.length);
        }
        
        setHasMore(response.hasMore && (!maxItems || newRequests.length < maxItems));
        setError(null);
      } else {
        throw new Error(response.message || 'Failed to load help requests');
      }
    } catch (err) {
      console.error('Error loading help requests:', err);
      setError(err.message || 'Failed to load help requests');
      
      if (isRefresh) {
        setRequests([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, status, offset, maxItems]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    loadRequests(true);
  }, [status, token]);

  // Socket listener for real-time updates when new requests come in
  useEffect(() => {
    if (!token) return;
    
    const socket = getSocket(token);
    if (!socket) return;

    const handleNewRequest = (data) => {
      console.log('📥 New help request received via socket:', data);
      // Refresh the list when a new request is targeted to this user
      if (data.isTargetedMatch) {
        loadRequests(true);
      }
    };

    const handleRequestUpdate = (data) => {
      console.log('🔄 Help request status update:', data);
      // Refresh list on any request status change
      loadRequests(true);
    };

    socket.on('incoming_help_request', handleNewRequest);
    socket.on('help_request_accepted', handleRequestUpdate);
    socket.on('help_request_declined', handleRequestUpdate);

    return () => {
      socket.off('incoming_help_request', handleNewRequest);
      socket.off('help_request_accepted', handleRequestUpdate);
      socket.off('help_request_declined', handleRequestUpdate);
    };
  }, [token, loadRequests]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setOffset(0);
    loadRequests(true);
    if (onRefresh) {
      onRefresh();
    }
  }, [loadRequests, onRefresh]);

  // Handle external refresh trigger
  useEffect(() => {
    if (externalRefreshing) {
      loadRequests(true);
    }
  }, [externalRefreshing, loadRequests]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !maxItems) {
      loadRequests(false);
    }
  }, [loading, hasMore, loadRequests, maxItems]);

  const handleHelpOffer = useCallback(async (request) => {
    try {
      if (onHelpOffer) {
        await onHelpOffer(request);
      } else {
        // Default behavior - show confirmation
        Alert.alert(
          'Offer Help',
          `Do you want to help ${request.user.firstName} with: "${request.prompt}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Yes, Help!', 
              onPress: async () => {
                try {
                  await promptMatchingApi.respondToHelpRequest(request.id, true, token);
                  Alert.alert('Success', 'Your help offer has been sent!');
                  handleRefresh();
                } catch (error) {
                  Alert.alert('Error', 'Failed to send help offer. Please try again.');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error offering help:', error);
      Alert.alert('Error', 'Failed to offer help. Please try again.');
    }
  }, [onHelpOffer, handleRefresh]);

  const renderRequest = useCallback(({ item }) => (
    <HelpRequestCard
      request={item}
      onHelp={handleHelpOffer}
      showHelpButton={showHelpButton}
    />
  ), [handleHelpOffer, showHelpButton]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={status === 'searching' ? 'search' : 'checkmark-circle'} 
        size={48} 
        color={theme.textTertiary} 
      />
      <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
        {status === 'searching' ? 'No Active Requests' : 'No Requests Found'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
        {status === 'searching' 
          ? 'No one is currently looking for help. Check back later!'
          : `No help requests with status "${status}" found.`
        }
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle" size={48} color="#FF6B35" />
      <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
        Failed to Load
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
        {error}
      </Text>
    </View>
  );

  if (loading && requests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="refresh" size={24} color={theme.textTertiary} />
        <Text style={[styles.loadingText, { color: theme.textTertiary }]}>
          Loading help requests...
        </Text>
      </View>
    );
  }

  // Use simple View when maxItems is set to avoid nested VirtualizedList warning
  // FlatList is only needed for infinite scroll with many items
  if (maxItems) {
    return (
      <View style={styles.container}>
        {title && (
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {title}
            </Text>
            {requests.length > 0 && (
              <Text style={[styles.count, { color: theme.textSecondary }]}>
                {requests.length} request{requests.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
        
        {error ? renderError() : requests.length === 0 ? renderEmpty() : (
          <View>
            {requests.map((item) => (
              <View key={item.id}>
                {renderRequest({ item })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {title}
          </Text>
          {requests.length > 0 && (
            <Text style={[styles.count, { color: theme.textSecondary }]}>
              {requests.length} request{requests.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}
      
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={error ? renderError : renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={requests.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  count: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HelpRequestsList;
