import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/src/api/socket';
import { promptMatchingApi } from '@/src/api/promptMatching';
import { useRouter } from 'expo-router';

/**
 * Hook for managing prompt matching socket events and state
 */
export const usePromptMatching = () => {
  const router = useRouter();
  const [giverProfile, setGiverProfile] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadGiverProfile();
    loadActiveRequest();
  }, []);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();

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
      // Navigate to chat
      if (data.chatId) {
        router.push({
          pathname: '/secure/chat-conversation',
          params: { chatId: data.chatId },
        });
      }
    };

    // Receiver gets notification that giver declined
    const handleRequestDeclined = (data) => {
      console.log('❌ Help request declined:', data);
      // Continue searching
    };

    // Giver response success
    const handleGiverResponseSuccess = (data) => {
      console.log('✅ Giver response success:', data);
      setIncomingRequest(null);
      if (data.accepted && data.chatId) {
        // Navigate to chat
        router.push({
          pathname: '/secure/chat-conversation',
          params: { chatId: data.chatId },
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

    socket.on('incoming_help_request', handleIncomingRequest);
    socket.on('help_request_accepted', handleRequestAccepted);
    socket.on('help_request_declined', handleRequestDeclined);
    socket.on('giver_response_success', handleGiverResponseSuccess);
    socket.on('giver_response_error', handleGiverResponseError);
    socket.on('active_help_request_data', handleActiveHelpRequestData);

    return () => {
      socket.off('incoming_help_request', handleIncomingRequest);
      socket.off('help_request_accepted', handleRequestAccepted);
      socket.off('help_request_declined', handleRequestDeclined);
      socket.off('giver_response_success', handleGiverResponseSuccess);
      socket.off('giver_response_error', handleGiverResponseError);
      socket.off('active_help_request_data', handleActiveHelpRequestData);
    };
  }, [router]);

  // On mount, ask the server (over socket) for the current active help request
  useEffect(() => {
    const socket = getSocket();
    try {
      socket.emit('get_active_help_request');
    } catch (error) {
      console.error('Error requesting active help request over socket:', error);
    }
  }, []);

  const loadGiverProfile = async () => {
    try {
      const data = await promptMatchingApi.getGiverProfile();
      setGiverProfile(data.exists ? data.profile : null);
    } catch (error) {
      console.error('Error loading giver profile:', error);
    }
  };

  const loadActiveRequest = async () => {
    try {
      const data = await promptMatchingApi.getActiveHelpRequest();
      setActiveRequest(data.hasActiveRequest ? data.request : null);
    } catch (error) {
      console.error('Error loading active request:', error);
    }
  };

  const toggleGiverAvailability = async (isAvailable) => {
    try {
      setLoading(true);
      await promptMatchingApi.toggleGiverAvailability(isAvailable);
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

  return {
    giverProfile,
    activeRequest,
    incomingRequest,
    loading,
    toggleGiverAvailability,
    respondToRequest,
    dismissIncomingRequest,
    refreshGiverProfile: loadGiverProfile,
    refreshActiveRequest: loadActiveRequest,
  };
};
