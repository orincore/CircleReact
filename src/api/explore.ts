import { http } from "./http";

export interface ExploreUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  profilePhoto?: string;
  age?: number;
  gender?: string;
  about?: string;
  interests: string[];
  needs: string[];
  isOnline: boolean;
  isFriend?: boolean;
  compatibilityScore?: number;
  joinedDate?: string;
  verification_status?: string;
}

export interface ExploreResponse {
  users: ExploreUser[];
}

export interface SearchResponse {
  users: ExploreUser[];
  query: string;
}

export interface AllSectionsResponse {
  topUsers: ExploreUser[];
  newUsers: ExploreUser[];
  compatibleUsers: ExploreUser[];
}

export interface UserProfileResponse {
  user: ExploreUser;
}

export const exploreApi = {
  // Get all explore sections with smart user distribution (no duplicates)
  getAllSections: (token?: string | null) =>
    http.get<AllSectionsResponse>('/api/explore/all-sections', token),

  // Get top users based on profile completeness and activity
  getTopUsers: (token?: string | null) =>
    http.get<ExploreResponse>('/api/explore/top-users', token),

  // Get newly registered users (last 7 days)
  getNewUsers: (token?: string | null) =>
    http.get<ExploreResponse>('/api/explore/new-users', token),

  // Get users with high compatibility scores
  getCompatibleUsers: (token?: string | null) =>
    http.get<ExploreResponse>('/api/explore/compatible-users', token),

  // Get user profile by ID
  getUserProfile: async (userId: string, token?: string | null) => {
    try {
       
      return await http.get<UserProfileResponse>(`/api/explore/user/${userId}`, token);
    } catch (error: any) {
      // Gracefully handle 404 - user might have been deleted
      if (error.status === 404) {
        console.warn(`⚠️ User profile not found: ${userId} - This user may have been deleted`);
        console.warn('💡 Tip: Clear app data or check your chat/friend lists for stale records');
        return null;
      }
      throw error;
    }
  },

  // Search users by name, username, or email
  searchUsers: (query: string, limit = 20, token?: string | null) =>
    http.get<SearchResponse>(`/api/explore/search?q=${encodeURIComponent(query)}&limit=${limit}`, token),
};
