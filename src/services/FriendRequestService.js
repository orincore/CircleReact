import { getSocket } from '@/src/api/socket';

export class FriendRequestService {
  static sendFriendRequest(receiverId, token) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      if (!socket) {
        reject(new Error('Socket connection not available'));
        return;
      }
      
      // Set up listeners for response
      const handleSent = (data) => {
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        reject(new Error(error.error || 'Failed to send friend request'));
      };
      
      // Listen for responses
      socket.on('friend:request:sent', handleSent);
      socket.on('friend:request:error', handleError);
      
      // Send the request
      socket.emit('friend:request:send', { receiverId });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }
  
  static acceptFriendRequest(requestId, token) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      if (!socket) {
        reject(new Error('Socket connection not available'));
        return;
      }
      
      // Set up listeners for response
      const handleAccepted = (data) => {
        socket.off('friend:request:accept:confirmed', handleAccepted);
        socket.off('friend:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        socket.off('friend:request:accept:confirmed', handleAccepted);
        socket.off('friend:request:error', handleError);
        reject(new Error(error.error || 'Failed to accept friend request'));
      };
      
      // Listen for responses
      socket.on('friend:request:accept:confirmed', handleAccepted);
      socket.on('friend:request:error', handleError);
      
      // Send the acceptance
      socket.emit('friend:request:accept', { requestId });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('friend:request:accept:confirmed', handleAccepted);
        socket.off('friend:request:error', handleError);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }
  static declineFriendRequest(requestId, token) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      // Set up listeners for response
      const handleDeclined = (data) => {
        socket.off('friend:request:decline:confirmed', handleDeclined);
        socket.off('friend:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        socket.off('friend:request:decline:confirmed', handleDeclined);
        socket.off('friend:request:error', handleError);
        reject(new Error(error.error || 'Failed to decline friend request'));
      };
      
      // Listen for responses
      socket.on('friend:request:decline:confirmed', handleDeclined);
      socket.on('friend:request:error', handleError);
      
      // Send the decline
      socket.emit('friend:request:decline', { requestId });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('friend:request:decline:confirmed', handleDeclined);
        socket.off('friend:request:error', handleError);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }
  
  static cancelFriendRequest(receiverId, token) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      // Set up listeners for response
      const handleCancelled = (data) => {
        socket.off('friend:request:cancel:confirmed', handleCancelled);
        socket.off('friend:request:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        socket.off('friend:request:cancel:confirmed', handleCancelled);
        socket.off('friend:request:error', handleError);
        reject(new Error(error.error || 'Failed to cancel friend request'));
      };
      
      // Listen for responses
      socket.on('friend:request:cancel:confirmed', handleCancelled);
      socket.on('friend:request:error', handleError);
      
      // Send the cancel request
      socket.emit('friend:request:cancel', { receiverId });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('friend:request:cancel:confirmed', handleCancelled);
        socket.off('friend:request:error', handleError);
        reject(new Error('Request timeout'));
      }, 10000);
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
  
  static unfriendUser(userId, token) {
    return new Promise((resolve, reject) => {
      const socket = getSocket(token);
      
      // Set up listeners for response
      const handleUnfriendConfirmed = (data) => {
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleError);
        reject(new Error(error.error || 'Failed to unfriend user'));
      };
      
      // Listen for responses
      socket.on('friend:unfriend:confirmed', handleUnfriendConfirmed);
      socket.on('friend:unfriend:error', handleError);
      
      // Send the unfriend request
      socket.emit('friend:unfriend', { userId });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleError);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }
}
