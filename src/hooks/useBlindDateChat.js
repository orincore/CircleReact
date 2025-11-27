import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { blindDatingApi } from '@/src/api/blindDating';
import { getSocket } from '@/src/api/socket';

/**
 * Custom hook for managing blind date chat functionality
 * Handles message filtering, reveal status, and socket events
 */
export const useBlindDateChat = (chatId) => {
  const { token, user } = useAuth();
  
  const [blindDateStatus, setBlindDateStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageBlocked, setMessageBlocked] = useState(null);
  
  // Load blind date status for this chat
  const loadStatus = useCallback(async () => {
    if (!chatId || !token) return;
    
    try {
      setLoading(true);
      const status = await blindDatingApi.getChatStatus(chatId, token);
      setBlindDateStatus(status);
    } catch (err) {
      console.error('Error loading blind date status:', err);
      setError(err);
      setBlindDateStatus({ isBlindDate: false, canReveal: false, messagesUntilReveal: 0 });
    } finally {
      setLoading(false);
    }
  }, [chatId, token]);
  
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);
  
  // Set up socket listeners for blind date events
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !blindDateStatus?.match?.id) return;
    
    // Listen for reveal events
    const handleRevealed = (data) => {
      if (data.matchId === blindDateStatus.match?.id) {
        loadStatus(); // Reload status when reveal happens
      }
    };
    
    const handleRevealRequested = (data) => {
      if (data.matchId === blindDateStatus.match?.id) {
        loadStatus();
      }
    };
    
    const handleEnded = (data) => {
      if (data.matchId === blindDateStatus.match?.id) {
        loadStatus();
      }
    };
    
    socket.on('blind_date:revealed', handleRevealed);
    socket.on('blind_date:reveal_requested', handleRevealRequested);
    socket.on('blind_date:ended', handleEnded);
    
    return () => {
      socket.off('blind_date:revealed', handleRevealed);
      socket.off('blind_date:reveal_requested', handleRevealRequested);
      socket.off('blind_date:ended', handleEnded);
    };
  }, [blindDateStatus?.match?.id, loadStatus]);
  
  // Filter message before sending (check for personal info)
  const filterMessage = useCallback(async (message) => {
    if (!blindDateStatus?.isBlindDate || blindDateStatus?.match?.status === 'revealed') {
      // Not a blind date or already revealed - allow all messages
      return { allowed: true, originalMessage: message };
    }
    
    try {
      const result = await blindDatingApi.filterMessage(
        message,
        blindDateStatus.match?.id,
        chatId,
        token
      );
      
      if (!result.allowed) {
        setMessageBlocked({
          reason: result.blockedReason,
          detectedTypes: result.analysis?.detectedTypes || [],
        });
      }
      
      return result;
    } catch (err) {
      console.error('Error filtering message:', err);
      // On error, allow the message (backend will also filter)
      return { allowed: true, originalMessage: message };
    }
  }, [blindDateStatus, chatId, token]);
  
  // Request identity reveal
  const requestReveal = useCallback(async () => {
    if (!blindDateStatus?.match?.id) return { success: false, message: 'No match found' };
    
    try {
      const result = await blindDatingApi.requestReveal(blindDateStatus.match.id, token);
      
      if (result.success) {
        await loadStatus(); // Reload status
      }
      
      return result;
    } catch (err) {
      console.error('Error requesting reveal:', err);
      return { success: false, message: 'Failed to request reveal' };
    }
  }, [blindDateStatus?.match?.id, token, loadStatus]);
  
  // End the blind date
  const endBlindDate = useCallback(async (reason) => {
    if (!blindDateStatus?.match?.id) return false;
    
    try {
      const result = await blindDatingApi.endMatch(blindDateStatus.match.id, reason, token);
      
      if (result.success) {
        await loadStatus();
      }
      
      return result.success;
    } catch (err) {
      console.error('Error ending blind date:', err);
      return false;
    }
  }, [blindDateStatus?.match?.id, token, loadStatus]);
  
  // Clear message blocked notification
  const clearBlockedMessage = useCallback(() => {
    setMessageBlocked(null);
  }, []);
  
  // Get anonymized other user profile
  const getOtherUserProfile = useCallback(() => {
    return blindDateStatus?.otherUserProfile || null;
  }, [blindDateStatus]);
  
  // Check if user should see anonymous or revealed UI
  const isAnonymous = useCallback(() => {
    return blindDateStatus?.isBlindDate && blindDateStatus?.match?.status !== 'revealed';
  }, [blindDateStatus]);
  
  // Check if reveal is possible
  const canReveal = useCallback(() => {
    return blindDateStatus?.canReveal || false;
  }, [blindDateStatus]);
  
  // Get messages until reveal
  const getMessagesUntilReveal = useCallback(() => {
    return blindDateStatus?.messagesUntilReveal || 0;
  }, [blindDateStatus]);
  
  return {
    // State
    blindDateStatus,
    loading,
    error,
    messageBlocked,
    
    // Status helpers
    isBlindDate: blindDateStatus?.isBlindDate || false,
    isRevealed: blindDateStatus?.match?.status === 'revealed',
    isAnonymous: isAnonymous(),
    canReveal: canReveal(),
    messagesUntilReveal: getMessagesUntilReveal(),
    
    // Match details
    match: blindDateStatus?.match || null,
    otherUserProfile: getOtherUserProfile(),
    
    // User reveal status
    hasRevealedSelf: blindDateStatus?.match 
      ? (blindDateStatus.match.user_a === user?.id 
          ? blindDateStatus.match.user_a_revealed 
          : blindDateStatus.match.user_b_revealed)
      : false,
    otherHasRevealed: blindDateStatus?.match
      ? (blindDateStatus.match.user_a === user?.id
          ? blindDateStatus.match.user_b_revealed
          : blindDateStatus.match.user_a_revealed)
      : false,
    
    // Actions
    filterMessage,
    requestReveal,
    endBlindDate,
    clearBlockedMessage,
    refreshStatus: loadStatus,
  };
};

export default useBlindDateChat;

