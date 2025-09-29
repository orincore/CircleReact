import { http } from "./http";

export interface LinkedAccount {
  id: string;
  platform: 'instagram';
  platform_username: string;
  platform_display_name: string;
  platform_profile_url?: string;
  platform_avatar_url?: string;
  is_verified: boolean;
  is_public: boolean;
  linked_at: string;
  platform_data?: {
    // Instagram specific
    account_type?: string;
    media_count?: number;
    verification_method?: string;
    verified_at?: string;
  };
}


export interface InstagramVerificationResponse {
  success: boolean;
  message: string;
  account: {
    platform: string;
    username: string;
    profile_url: string;
    verification_method: string;
    is_reactivation?: boolean;
  };
}

export interface UnlinkAccountResponse {
  success: boolean;
  message: string;
  unlinked_account: {
    platform: string;
    username: string;
    can_reactivate: boolean;
  };
}

export const socialAccountsApi = {
  // Get current user's linked accounts
  getLinkedAccounts: (token?: string | null) =>
    http.get<{ accounts: LinkedAccount[] }>('/api/social/linked-accounts', token),

  // Get linked accounts for a specific user (public view)
  getUserLinkedAccounts: (userId: string, token?: string | null) =>
    http.get<{ accounts: LinkedAccount[] }>(`/api/social/user/${userId}/linked-accounts`, token),


  // Verify Instagram account via manual input
  verifyInstagram: (username: string, token?: string | null) =>
    http.post<InstagramVerificationResponse>('/api/social/verify/instagram', { username }, token),


  // Unlink a social account
  unlinkAccount: (platform: 'instagram', token?: string | null) =>
    http.delete<UnlinkAccountResponse>(`/api/social/unlink/${platform}`, token),

  // Update account visibility
  updateAccountVisibility: (accountId: string, isPublic: boolean, token?: string | null) =>
    http.patch<{ success: boolean; message: string }>(`/api/social/account/${accountId}/visibility`, { isPublic }, token),
};
