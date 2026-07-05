import { http } from './http';
import { API_BASE_URL } from './config';

// Test function to check if the API is accessible (no auth required)
const testConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friends/test`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error('Friends API connection failed:', error);
    return false;
  }
};

export const friendsApi = {
  // Test API connection
  testConnection,

  // Get friend status between current user and another user
  getFriendStatus: (userId, token) => http.get(`/api/friends/status/${userId}`, token),

  // Send friend request
  sendFriendRequest: (receiverId, message, token) =>
    http.post('/api/friends/request', { receiverId, message }, token),

  // Accept friend request
  acceptFriendRequest: (requestId, token) => http.post(`/api/friends/accept/${requestId}`, undefined, token),

  // Reject friend request
  rejectFriendRequest: (requestId, token) => http.post(`/api/friends/reject/${requestId}`, undefined, token),

  // Get pending friend requests
  getPendingRequests: (token) => http.get('/api/friends/requests/pending', token),

  // Get friends list
  getFriendsList: (token) => http.get('/api/friends/list', token),

  // Remove friend
  removeFriend: (friendId, token) => http.delete(`/api/friends/${friendId}`, token),

  // Check if user can message another user
  canMessage: (userId, token) => http.get(`/api/friends/can-message/${userId}`, token),

  // Debug endpoint to check friend requests table
  debugRequests: (token) => http.get('/api/friends/debug/requests', token),

  // Create a test friend request for current user (for testing)
  createTestRequest: (token) => http.post('/api/friends/debug/create-test-request', undefined, token),

  // Block user
  blockUser: (userId, reason, token) => http.post(`/api/friends/block/${userId}`, { reason }, token),

  // Unblock user
  unblockUser: (userId, token) => http.delete(`/api/friends/block/${userId}`, token),

  // Check block status
  getBlockStatus: (userId, token) => http.get(`/api/friends/block-status/${userId}`, token),

  // Get blocked users list
  getBlockedUsers: (token) => http.get('/api/friends/blocked', token),
};
