import { getSocket } from '@/src/api/socket';

export class FriendRequestService {
  static sendFriendRequest(receiverId, token, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      if (!socket) {
        reject(new Error('Socket connection not available'));
        return;
      }
      
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      let timeoutId;
      let isResolved = false;
      
      // Set up listeners for response
      const handleSent = (data) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        
        // Retry logic for network errors
        if (retryCount < 2 && (error.error?.includes('network') || error.error?.includes('timeout'))) {
          setTimeout(() => {
            FriendRequestService.sendFriendRequest(receiverId, token, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }
        
        reject(new Error(error.error || 'Failed to send friend request'));
      };
      
      // Listen for responses
      socket.on('friend:request:sent', handleSent);
      socket.on('friend:request:error', handleError);
      
      // Send the request
      socket.emit('friend:request:send', { receiverId });
      
      // Increased timeout for better reliability
      timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        
        // Retry on timeout
        if (retryCount < 2) {
          FriendRequestService.sendFriendRequest(receiverId, token, retryCount + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Request timeout - please check your connection'));
        }
      }, 15000);
    });
  }
  
  static acceptFriendRequest(requestId, token, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      if (!socket) {
        reject(new Error('Socket connection not available'));
        return;
      }
      
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      let timeoutId;
      let isResolved = false;
      
      // Set up listeners for response - FIXED: Listen for correct event
      const handleAccepted = (data) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:request:accepted', handleAccepted);
        socket.off('friend:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:request:accepted', handleAccepted);
        socket.off('friend:request:error', handleError);
        
        // Retry logic for network errors
        if (retryCount < 2 && (error.error?.includes('network') || error.error?.includes('timeout'))) {
          setTimeout(() => {
            FriendRequestService.acceptFriendRequest(requestId, token, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }
        
        reject(new Error(error.error || 'Failed to accept friend request'));
      };
      
      // Listen for responses - FIXED: Use correct event name
      socket.on('friend:request:accepted', handleAccepted);
      socket.on('friend:request:error', handleError);
      
      // Send the acceptance
      socket.emit('friend:request:accept', { requestId });
      
      // Increased timeout for better reliability
      timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        
        socket.off('friend:request:accepted', handleAccepted);
        socket.off('friend:request:error', handleError);
        
        // Retry on timeout
        if (retryCount < 2) {
          FriendRequestService.acceptFriendRequest(requestId, token, retryCount + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Request timeout - please check your connection'));
        }
      }, 15000);
    });
  }
  static declineFriendRequest(requestId, token, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      if (!socket) {
        reject(new Error('Socket connection not available'));
        return;
      }
      
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      let timeoutId;
      let isResolved = false;
      
      // Set up listeners for response - FIXED: Listen for correct event
      const handleDeclined = (data) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:request:declined', handleDeclined);
        socket.off('friend:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:request:declined', handleDeclined);
        socket.off('friend:request:error', handleError);
        
        // Retry logic for network errors
        if (retryCount < 2 && (error.error?.includes('network') || error.error?.includes('timeout'))) {
          setTimeout(() => {
            FriendRequestService.declineFriendRequest(requestId, token, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }
        
        reject(new Error(error.error || 'Failed to decline friend request'));
      };
      
      // Listen for responses - FIXED: Use correct event name
      socket.on('friend:request:declined', handleDeclined);
      socket.on('friend:request:error', handleError);
      
      // Send the decline
      socket.emit('friend:request:decline', { requestId });
      
      // Increased timeout for better reliability
      timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        
        socket.off('friend:request:declined', handleDeclined);
        socket.off('friend:request:error', handleError);
        
        // Retry on timeout
        if (retryCount < 2) {
          FriendRequestService.declineFriendRequest(requestId, token, retryCount + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Request timeout - please check your connection'));
        }
      }, 15000);
    });
  }
  
  static cancelFriendRequest(receiverId, token, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      if (!socket) {
        reject(new Error('Socket connection not available'));
        return;
      }
      
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      let timeoutId;
      let isResolved = false;
      
      // Set up listeners for response
      const handleCancelled = (data) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:request:cancel:confirmed', handleCancelled);
        socket.off('friend:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:request:cancel:confirmed', handleCancelled);
        socket.off('friend:request:error', handleError);
        
        // Retry logic for network errors
        if (retryCount < 2 && (error.error?.includes('network') || error.error?.includes('timeout'))) {
          setTimeout(() => {
            FriendRequestService.cancelFriendRequest(receiverId, token, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }
        
        reject(new Error(error.error || 'Failed to cancel friend request'));
      };
      
      // Listen for responses
      socket.on('friend:request:cancel:confirmed', handleCancelled);
      socket.on('friend:request:error', handleError);
      
      // Send the cancel request
      socket.emit('friend:request:cancel', { receiverId });
      
      // Increased timeout for better reliability
      timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        
        socket.off('friend:request:cancel:confirmed', handleCancelled);
        socket.off('friend:request:error', handleError);
        
        // Retry on timeout
        if (retryCount < 2) {
          FriendRequestService.cancelFriendRequest(receiverId, token, retryCount + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Request timeout - please check your connection'));
        }
      }, 15000);
    });
  }
  
  static cancelMessageRequest(receiverId, token) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      // Set up listeners for response
      const handleCancelled = (data) => {
        socket.off('message:request:cancel:confirmed', handleCancelled);
        socket.off('message:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        socket.off('message:request:cancel:confirmed', handleCancelled);
        socket.off('message:request:error', handleError);
        reject(new Error(error.error || 'Failed to cancel message request'));
      };
      
      // Listen for responses
      socket.on('message:request:cancel:confirmed', handleCancelled);
      socket.on('message:request:error', handleError);
      
      // Send the cancel request
      socket.emit('message:request:cancel', { receiverId });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('message:request:cancel:confirmed', handleCancelled);
        socket.off('message:request:error', handleError);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }
  
  static unfriendUser(userId, token, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      if (!socket) {
        reject(new Error('Socket connection not available'));
        return;
      }
      
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      let timeoutId;
      let isResolved = false;
      
      // Set up listeners for response
      const handleUnfriendConfirmed = (data) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        if (isResolved) return;
        isResolved = true;
        
        clearTimeout(timeoutId);
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleError);
        
        // Retry logic for network errors
        if (retryCount < 2 && (error.error?.includes('network') || error.error?.includes('timeout'))) {
          setTimeout(() => {
            FriendRequestService.unfriendUser(userId, token, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }
        
        reject(new Error(error.error || 'Failed to unfriend user'));
      };
      
      // Listen for responses
      socket.on('friend:unfriend:confirmed', handleUnfriendConfirmed);
      socket.on('friend:unfriend:error', handleError);
      
      // Send the unfriend request
      socket.emit('friend:unfriend', { friendId: userId });
      
      // Increased timeout for better reliability
      timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleError);
        
        // Retry on timeout
        if (retryCount < 2) {
          FriendRequestService.unfriendUser(userId, token, retryCount + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Request timeout - please check your connection'));
        }
      }, 15000);
    });
  }
}
