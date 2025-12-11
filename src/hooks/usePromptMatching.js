import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/src/api/socket';
import { promptMatchingApi } from '@/src/api/promptMatching';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for managing prompt matching socket events and state
 * Handles real-time AI-powered matching with status updates
 */
export const usePromptMatching = () => {
  const router = useRouter();
  const { token } = useAuth();
  const [giverProfile, setGiverProfile] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null); // New: real-time search status

  // Load initial data
  useEffect(() => {
    if (token) {
      loadGiverProfile();
      loadActiveRequest();
    }
  }, [token]);

  // Socket listeners
  useEffect(() => {
    if (!token) {
      console.warn('[usePromptMatching] No token available for socket connection');
      return;
    }
    
    const socket = getSocket(token);
    
    if (!socket) {
      console.error('[usePromptMatching] Failed to get socket instance');
      return;
    }
    
    console.log('[usePromptMatching] Setting up socket listeners for prompt matching');

    // Real-time search status updates (AI-powered matching progress)
    const handleSearchStatus = (data) => {
      console.log('🔍 Search status update:', data);
      setSearchStatus(data);
      
      // If status is 'found', update the active request with matched giver info
      if (data.status === 'found' && data.matchedGiver) {
        setActiveRequest(prev => prev ? {
          ...prev,
          matchedGiver: data.matchedGiver,
          status: 'matched'
        } : null);
      }
      
      // Clear status after error or completion
      if (data.status === 'error') {
        setTimeout(() => setSearchStatus(null), 3000);
      }
    };

    // Giver receives help request (now targeted to specific giver)
    const handleIncomingRequest = (data) => {
      console.log('📥 Incoming targeted help request:', data);
      if (data.isTargetedMatch) {
        console.log('🎯 This is a targeted match - you are the perfect helper!');
      }
      setIncomingRequest(data);
    };

    // Receiver gets notification that giver accepted
    const handleRequestAccepted = (data) => {
      console.log('✅ Help request accepted:', data);
      setActiveRequest(null);
      setSearchStatus({
        status: 'connected',
        message: 'Connected! Opening chat...',
        progress: 100
      });
      // Navigate to chat with blind date flag for masked chat
      if (data.chatId) {
        setTimeout(() => {
          setSearchStatus(null);
          router.replace({
            pathname: '/secure/chat-conversation',
            params: { id: data.chatId, isBlindDate: 'true' },
          });
        }, 1000);
      }
    };

    // Receiver gets notification that giver declined
    const handleRequestDeclined = (data) => {
      console.log('❌ Help request declined:', data);
      // Status update will come from help_search_status event
    };

    // Giver response success
    const handleGiverResponseSuccess = (data) => {
      console.log('✅ Giver response success:', data);
      setIncomingRequest(null);
      if (data.accepted && data.chatId) {
        // Navigate to chat with blind date flag for masked chat
        router.replace({
          pathname: '/secure/chat-conversation',
          params: { id: data.chatId, isBlindDate: 'true' },
        });
      }
    };

    // Giver chat ready - navigate giver to chat after accepting
    const handleChatReady = (data) => {
      console.log('💬 Chat ready for giver:', data);
      setIncomingRequest(null);
      if (data.chatId) {
        router.replace({
          pathname: '/secure/chat-conversation',
          params: { id: data.chatId, isBlindDate: 'true' },
        });
      }
    };

    // Giver response error
    const handleGiverResponseError = (data) => {
      console.error('❌ Giver response error:', data);
      alert(data.error || 'Failed to respond to request');
    };

    // Active help request snapshot from server (via socket)
    const handleActiveHelpRequestData = (data) => {
      console.log('📡 Active help request data:', data);
      if (data?.hasActiveRequest) {
        setActiveRequest(data.request);
      } else {
        setActiveRequest(null);
      }
    };

    socket.on('help_search_status', handleSearchStatus);
    socket.on('incoming_help_request', handleIncomingRequest);
    socket.on('help_request_accepted', handleRequestAccepted);
    socket.on('help_request_declined', handleRequestDeclined);
    socket.on('giver_response_success', handleGiverResponseSuccess);
    socket.on('help_request_chat_ready', handleChatReady);
    socket.on('giver_response_error', handleGiverResponseError);
    socket.on('active_help_request_data', handleActiveHelpRequestData);

    return () => {
      console.log('[usePromptMatching] Cleaning up socket listeners');
      socket.off('help_search_status', handleSearchStatus);
      socket.off('incoming_help_request', handleIncomingRequest);
      socket.off('help_request_accepted', handleRequestAccepted);
      socket.off('help_request_declined', handleRequestDeclined);
      socket.off('giver_response_success', handleGiverResponseSuccess);
      socket.off('help_request_chat_ready', handleChatReady);
      socket.off('giver_response_error', handleGiverResponseError);
      socket.off('active_help_request_data', handleActiveHelpRequestData);
    };
  }, [router, token]);

  // On mount, ask the server (over socket) for the current active help request
  useEffect(() => {
    if (!token) return;
    
    const socket = getSocket(token);
    if (!socket) return;
    
    try {
      socket.emit('get_active_help_request');
      socket.emit('get_giver_profile');
    } catch (error) {
      console.error('Error requesting active help request over socket:', error);
    }
  }, [token]);

  const loadGiverProfile = async () => {
    try {
      const data = await promptMatchingApi.getGiverProfile(token);
      setGiverProfile(data.exists ? data.profile : null);
    } catch (error) {
      console.error('Error loading giver profile:', error);
    }
  };

  const loadActiveRequest = async () => {
    try {
      const data = await promptMatchingApi.getActiveHelpRequest(token);
      setActiveRequest(data.hasActiveRequest ? data.request : null);
    } catch (error) {
      console.error('Error loading active request:', error);
    }
  };

  const toggleGiverAvailability = async (isAvailable) => {
    try {
      setLoading(true);
      await promptMatchingApi.toggleGiverAvailability(isAvailable, token);
      await loadGiverProfile();
    } catch (error) {
      console.error('Error toggling availability:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId, accepted) => {
    try {
      setLoading(true);
      const socket = getSocket();
      socket.emit('giver_response', { requestId, accepted });
    } catch (error) {
      console.error('Error responding to request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const dismissIncomingRequest = () => {
    setIncomingRequest(null);
  };

  // Clear search status
  const clearSearchStatus = useCallback(() => {
    setSearchStatus(null);
  }, []);

  return {
    giverProfile,
    activeRequest,
    incomingRequest,
    searchStatus, // New: real-time search status
    loading,
    toggleGiverAvailability,
    respondToRequest,
    dismissIncomingRequest,
    clearSearchStatus, // New: clear search status
    refreshGiverProfile: loadGiverProfile,
    refreshActiveRequest: loadActiveRequest,
  };
};
