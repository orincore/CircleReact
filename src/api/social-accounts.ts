import { http } from "./http";

export interface LinkedAccount {
  id: string;
  platform: 'spotify' | 'instagram';
  platform_username: string;
  platform_display_name: string;
  platform_profile_url?: string;
  platform_avatar_url?: string;
  is_verified: boolean;
  is_public: boolean;
  linked_at: string;
  platform_data?: {
    // Spotify specific
    followers?: number;
    country?: string;
    subscription?: string;
    top_artists?: Array<{
      name: string;
      genres: string[];
      popularity: number;
      image?: string;
      external_url?: string;
    }>;
    top_tracks?: Array<{
      name: string;
      artist: string;
      album: string;
      popularity: number;
      preview_url?: string;
      image?: string;
      external_url?: string;
    }>;
    top_genres?: string[];
    playlists_count?: number;
    public_playlists?: Array<{
      name: string;
      description?: string;
      tracks: number;
      image?: string;
      external_url?: string;
    }>;
    recently_played?: Array<{
      track: string;
      artist: string;
      played_at: string;
      image?: string;
    }>;
    last_updated?: string;
    
    // Instagram specific
    account_type?: string;
    media_count?: number;
  };
}

export interface LinkAccountResponse {
  authUrl: string;
  state: string;
}

export interface CallbackResponse {
  success: boolean;
  message: string;
  account?: {
    platform: string;
    username: string;
    profile_url?: string;
    avatar_url?: string;
    verification_method?: string;
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

  // Start Spotify OAuth flow
  linkSpotify: (platform?: string, token?: string | null) =>
    http.post<LinkAccountResponse>('/api/social/link/spotify', { platform }, token),

  // Start Instagram OAuth flow (legacy)
  linkInstagram: (token?: string | null) =>
    http.post<LinkAccountResponse>('/api/social/link/instagram', {}, token),

  // Verify Instagram account via WebView (legacy - manual input)
  verifyInstagram: (username: string, token?: string | null) =>
    http.post<InstagramVerificationResponse>('/api/social/verify/instagram', { username }, token),

  // Verify Instagram account via session detection (automatic)
  verifyInstagramSession: (sessionData: { username: string; [key: string]: any }, token?: string | null) =>
    http.post<InstagramVerificationResponse>('/api/social/verify/instagram-session', { sessionData }, token),

  // Handle OAuth callbacks
  handleSpotifyCallback: (code: string, state: string, error?: string) =>
    http.post<CallbackResponse>('/api/social/callback/spotify', { code, state, error }),

  handleInstagramCallback: (code: string, state: string, error?: string) =>
    http.post<CallbackResponse>('/api/social/callback/instagram', { code, state, error }),

  // Unlink a social account
  unlinkAccount: (platform: 'spotify' | 'instagram', token?: string | null) =>
    http.delete<UnlinkAccountResponse>(`/api/social/unlink/${platform}`, token),

  // Update account visibility
  updateAccountVisibility: (accountId: string, isPublic: boolean, token?: string | null) =>
    http.patch<{ success: boolean; message: string }>(`/api/social/account/${accountId}/visibility`, { isPublic }, token),
};
