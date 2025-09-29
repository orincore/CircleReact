import { http } from './http'

export interface UserStats {
  circle_points: number
  total_matches: number
  messages_sent: number
  messages_received: number
  profile_visits_received: number
  total_friends: number
  last_active: string
  stats_updated_at: string
}

export interface CircleStatsResponse {
  stats: UserStats
  performanceMessage: string
  improvementSuggestions: string[]
  lastUpdated: string
}

export interface UserActivity {
  id: string
  user_id: string
  activity_type: string
  points_change: number
  related_user_id?: string
  metadata?: Record<string, any>
  created_at: string
}

export const circleStatsApi = {
  // Get user's Circle statistics and performance message
  getStats: (token?: string | null) =>
    http.get<CircleStatsResponse>('/api/circle/stats', token),

  // Record a profile visit
  recordProfileVisit: (visitedUserId: string, token?: string | null) =>
    http.post<{ success: boolean; message: string }, { visitedUserId: string }>(
      '/api/circle/profile-visit',
      { visitedUserId },
      token
    ),

  // Update user's last active timestamp
  updateActivity: (token?: string | null) =>
    http.post<{ success: boolean; message: string }, {}>(
      '/api/circle/update-activity',
      {},
      token
    ),

  // Manually recalculate Circle points
  recalculatePoints: (token?: string | null) =>
    http.post<{ success: boolean; message: string; newPoints: number }, {}>(
      '/api/circle/recalculate-points',
      {},
      token
    ),

  // Get user's recent activities (for debugging)
  getActivities: (limit: number = 20, token?: string | null) =>
    http.get<{ activities: UserActivity[] }>(`/api/circle/activities?limit=${limit}`, token),

  // Initialize Circle points for new users
  initialize: (token?: string | null) =>
    http.post<{ success: boolean; message: string; activities_added: string[] }, {}>(
      '/api/circle/initialize',
      {},
      token
    ),
}

// Helper functions for Circle points
export const CirclePointsHelper = {
  /**
   * Get Circle score tier based on points
   */
  getScoreTier: (points: number): { tier: string; color: string; icon: string } => {
    if (points >= 150) {
      return { tier: 'Superstar', color: '#FFD700', icon: '🌟' }
    } else if (points >= 120) {
      return { tier: 'Rising Star', color: '#FF6B6B', icon: '🔥' }
    } else if (points >= 80) {
      return { tier: 'Growing', color: '#4ECDC4', icon: '📈' }
    } else if (points >= 50) {
      return { tier: 'Building', color: '#45B7D1', icon: '💪' }
    } else if (points >= 20) {
      return { tier: 'Starting', color: '#96CEB4', icon: '🚀' }
    } else {
      return { tier: 'New', color: '#FFEAA7', icon: '✨' }
    }
  },

  /**
   * Calculate progress to next tier
   */
  getProgressToNextTier: (points: number): { current: number; next: number; progress: number } => {
    const tiers = [0, 20, 50, 80, 120, 150, 200]
    
    for (let i = 0; i < tiers.length - 1; i++) {
      if (points >= tiers[i] && points < tiers[i + 1]) {
        const current = tiers[i]
        const next = tiers[i + 1]
        const progress = ((points - current) / (next - current)) * 100
        return { current, next, progress }
      }
    }
    
    // If at max tier
    return { current: 150, next: 200, progress: Math.min(((points - 150) / 50) * 100, 100) }
  },

  /**
   * Format stats for display
   */
  formatStats: (stats: UserStats) => ({
    circlePoints: stats.circle_points.toLocaleString(),
    totalMatches: stats.total_matches.toLocaleString(),
    messagesSent: stats.messages_sent.toLocaleString(),
    messagesReceived: stats.messages_received.toLocaleString(),
    profileVisits: stats.profile_visits_received.toLocaleString(),
    totalFriends: stats.total_friends.toLocaleString(),
    lastActive: new Date(stats.last_active).toLocaleDateString(),
    engagement: stats.messages_sent + stats.messages_received,
    popularity: stats.profile_visits_received + stats.total_friends
  })
}
