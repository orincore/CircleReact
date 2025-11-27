import { http } from "./http";

// Types for Blind Dating feature
export interface BlindDateSettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  daily_match_time: string;
  max_active_matches: number;
  preferred_reveal_threshold: number;
  auto_match: boolean;
  notifications_enabled: boolean;
  last_match_at?: string;
}

export interface AnonymizedProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  age?: number;
  gender?: string;
  about?: string;
  interests?: string[];
  needs?: string[];
  profile_photo_url?: string;
  location_city?: string;
  is_revealed: boolean;
  anonymous_avatar?: string;
}

export interface BlindDateMatch {
  id: string;
  user_a: string;
  user_b: string;
  chat_id?: string;
  compatibility_score: number;
  status: 'active' | 'revealed' | 'ended' | 'expired' | 'blocked';
  message_count: number;
  reveal_threshold: number;
  user_a_revealed: boolean;
  user_b_revealed: boolean;
  revealed_at?: string;
  reveal_requested_by?: string;
  reveal_requested_at?: string;
  matched_at: string;
  ended_at?: string;
  ended_by?: string;
  end_reason?: string;
  // Enriched fields
  otherUser?: AnonymizedProfile;
  canReveal?: boolean;
  messagesUntilReveal?: number;
  hasRevealedSelf?: boolean;
  otherHasRevealed?: boolean;
}

export interface BlindDateStatus {
  isBlindDate: boolean;
  match?: BlindDateMatch;
  otherUserProfile?: AnonymizedProfile;
  canReveal: boolean;
  messagesUntilReveal: number;
}

export interface MessageFilterResult {
  allowed: boolean;
  originalMessage: string;
  filteredMessage?: string;
  blockedReason?: string;
  analysis?: {
    containsPersonalInfo: boolean;
    confidence: number;
    detectedTypes: string[];
  };
}

export interface BlindDateStats {
  totalMatches: number;
  activeMatches: number;
  revealedMatches: number;
  endedMatches: number;
  successRate: number;
}

// API functions
export const blindDatingApi = {
  // Settings
  getSettings: (token?: string | null) =>
    http.get<{ settings: BlindDateSettings }>("/api/blind-dating/settings", token),
  
  updateSettings: (settings: Partial<BlindDateSettings>, token?: string | null) =>
    http.put<{ settings: BlindDateSettings }>("/api/blind-dating/settings", settings, token),
  
  enable: (token?: string | null) =>
    http.post<{ success: boolean; message: string; settings: BlindDateSettings }>(
      "/api/blind-dating/enable", 
      undefined, 
      token
    ),
  
  disable: (token?: string | null) =>
    http.post<{ success: boolean; message: string; settings: BlindDateSettings }>(
      "/api/blind-dating/disable", 
      undefined, 
      token
    ),
  
  // Matches
  getMatches: (token?: string | null) =>
    http.get<{ matches: BlindDateMatch[] }>("/api/blind-dating/matches", token),
  
  getMatch: (matchId: string, token?: string | null) =>
    http.get<{
      match: BlindDateMatch;
      otherUser: AnonymizedProfile;
      canReveal: boolean;
      messagesUntilReveal: number;
      hasRevealedSelf: boolean;
      otherHasRevealed: boolean;
    }>(`/api/blind-dating/match/${matchId}`, token),
  
  findMatch: (token?: string | null) =>
    http.post<{
      success: boolean;
      message: string;
      match?: BlindDateMatch;
    }>("/api/blind-dating/find-match", undefined, token),
  
  // Reveal
  requestReveal: (matchId: string, token?: string | null) =>
    http.post<{
      success: boolean;
      bothRevealed: boolean;
      message: string;
    }>(`/api/blind-dating/reveal/${matchId}`, undefined, token),
  
  // End match
  endMatch: (matchId: string, reason?: string, token?: string | null) =>
    http.post<{ success: boolean; message: string }>(
      `/api/blind-dating/end/${matchId}`, 
      { reason }, 
      token
    ),
  
  // Chat status
  getChatStatus: (chatId: string, token?: string | null) =>
    http.get<BlindDateStatus>(`/api/blind-dating/chat/${chatId}/status`, token),
  
  // Message filtering
  filterMessage: (message: string, matchId?: string, chatId?: string, token?: string | null) =>
    http.post<MessageFilterResult>(
      "/api/blind-dating/filter-message",
      { message, matchId, chatId },
      token
    ),
  
  // Blocked messages (after reveal)
  getBlockedMessages: (matchId: string, token?: string | null) =>
    http.get<{ messages: any[] }>(`/api/blind-dating/blocked-messages/${matchId}`, token),
  
  // Stats
  getStats: (token?: string | null) =>
    http.get<{ stats: BlindDateStats }>("/api/blind-dating/stats", token),
  
  // Test filter (for debugging)
  testFilter: (message: string, token?: string | null) =>
    http.post<{
      quickCheckTriggered: boolean;
      analysis: MessageFilterResult['analysis'];
      sanitizedMessage: string;
      serviceInfo: {
        model: string;
        provider: string;
        endpoint: string;
        features: string[];
      };
    }>("/api/blind-dating/test-filter", { message }, token),
  
  // Run comprehensive tests
  runTests: (token?: string | null) =>
    http.post<{
      success: boolean;
      serviceInfo: {
        model: string;
        provider: string;
        endpoint: string;
        features: string[];
      };
      summary: {
        total: number;
        passed: number;
        failed: number;
        passRate: string;
      };
      results: Array<{
        message: string;
        expected: boolean;
        actual: boolean;
        passed: boolean;
        analysis: MessageFilterResult;
      }>;
    }>("/api/blind-dating/run-tests", undefined, token),
  
  // Test Together AI connection
  testConnection: (token?: string | null) =>
    http.get<{
      connected: boolean;
      serviceInfo: {
        model: string;
        provider: string;
        endpoint: string;
        features: string[];
      };
    }>("/api/blind-dating/test-connection", token),
  
  // ============ TEST MODE ENDPOINTS ============
  
  // Create a test match with AI bot
  createTestMatch: (token?: string | null) =>
    http.post<{
      success: boolean;
      message: string;
      match: BlindDateMatch;
      botUser: AnonymizedProfile;
      chatId: string;
      instructions: {
        step1: string;
        step2: string;
        step3: string;
        step4: string;
        step5: string;
      };
    }>("/api/blind-dating/test/create-test-match", undefined, token),
  
  // Get AI chat response for testing
  getAIChatResponse: (message: string, matchId?: string, chatId?: string, personality?: string, token?: string | null) =>
    http.post<{
      success: boolean;
      response: string;
      filtered: boolean;
      blockedInfo?: string[];
      personality: string;
    }>("/api/blind-dating/test/ai-chat", { message, matchId, chatId, personality }, token),
  
  // Debug eligibility - why no matches found
  debugEligibility: (token?: string | null) =>
    http.get<{
      debug: {
        yourUserId: string;
        yourSettings: {
          blindDatingEnabled: boolean;
          maxActiveMatches: number;
          revealThreshold: number;
        };
        eligibility: {
          totalUsersInApp: number;
          usersWithBlindDatingEnabled: number;
          eligibleUserIds: string[];
          usersYouAlreadyMatchedWith: string[];
          yourCurrentActiveMatches: number;
        };
        reason: string;
      };
    }>("/api/blind-dating/test/debug-eligibility", token),
};

export default blindDatingApi;

