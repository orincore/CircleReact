import { API_BASE_URL } from './config';

export interface DeletionSummary {
  messages: number;
  chats: number;
  friendships: number;
  friendRequests: number;
  notifications: number;
  activities: number;
  matchmaking: number;
  photos: number;
  profileVisits: number;
  reports: number;
  subscriptions: number;
  locations: number;
  socialAccounts: number;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deletionSummary: DeletionSummary;
  note: string;
}

export interface DeletionStatusResponse {
  isDeleted: boolean;
  deletedAt: string | null;
}

export const accountDeletionApi = {
  /**
   * Delete user account and all associated data
   * This is irreversible and will remove all user data except the profile (which is anonymized)
   */
  deleteAccount: async (token: string): Promise<DeleteAccountResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/account/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to delete account');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },

  /**
   * Check if account is deleted
   */
  getDeletionStatus: async (token: string): Promise<DeletionStatusResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/account/deletion-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check deletion status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking deletion status:', error);
      throw error;
    }
  },
};
