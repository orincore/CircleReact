import { API_BASE_URL } from './config';

// Test function to check if the API is accessible
const testConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friends/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    //console.log('Friends API connection test:', data);
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
  getFriendStatus: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/status/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get friend status');
    }

    return response.json();
  },

  // Send friend request
  sendFriendRequest: async (receiverId, message, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiverId,
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send friend request');
    }

    return response.json();
  },

  // Accept friend request
  acceptFriendRequest: async (requestId, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/accept/${requestId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to accept friend request');
    }

    return response.json();
  },

  // Reject friend request
  rejectFriendRequest: async (requestId, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/reject/${requestId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to reject friend request');
    }

    return response.json();
  },

  // Get pending friend requests
  getPendingRequests: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/requests/pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get pending requests');
    }

    return response.json();
  },

  // Get friends list
  getFriendsList: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get friends list');
    }

    return response.json();
  },

  // Remove friend
  removeFriend: async (friendId, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/${friendId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove friend');
    }

    return response.json();
  },

  // Check if user can message another user
  canMessage: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/can-message/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check message permission');
    }

    return response.json();
  },

  // Debug endpoint to check friend requests table
  debugRequests: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/debug/requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to debug requests');
    }

    return response.json();
  },

  // Create a test friend request for current user (for testing)
  createTestRequest: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/debug/create-test-request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create test request');
    }

    return response.json();
  },

  // Block user
  blockUser: async (userId, reason, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/block/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to block user');
    }

    return response.json();
  },

  // Unblock user
  unblockUser: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/block/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to unblock user');
    }

    return response.json();
  },

  // Check block status
  getBlockStatus: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/block-status/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get block status');
    }

    return response.json();
  },

  // Get blocked users list
  getBlockedUsers: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/friends/blocked`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get blocked users');
    }

    return response.json();
  },
};
