import { http } from './http';

/**
 * Prompt Matching API
 * Handles giver/receiver matching requests
 * Uses the centralized http utility for consistent token handling
 */
export const promptMatchingApi = {
  /**
   * Create a help request (receiver)
   */
  async createHelpRequest(prompt) {
    return http.post('/api/match/request', {
      prompt,
      role: 'receiver',
    });
  },

  /**
   * Get help request status
   */
  async getHelpRequestStatus(requestId) {
    return http.get(`/api/match/status/${requestId}`);
  },

  /**
   * Cancel help request
   */
  async cancelHelpRequest(requestId) {
    return http.post(`/api/match/cancel/${requestId}`);
  },

  /**
   * Setup or update giver profile
   */
  async setupGiverProfile(skills = [], categories = []) {
    return http.post('/api/match/giver/setup', {
      skills,
      categories,
    });
  },

  /**
   * Toggle giver availability
   */
  async toggleGiverAvailability(isAvailable) {
    console.log('🔄 Toggling giver availability:', { isAvailable });
    const result = await http.post('/api/match/giver/toggle', {
      isAvailable,
    });
    console.log('✅ Toggle successful:', result);
    return result;
  },

  /**
   * Get giver profile
   */
  async getGiverProfile() {
    return http.get('/api/match/giver/profile');
  },

  /**
   * Get active help request
   */
  async getActiveHelpRequest() {
    return http.get('/api/match/receiver/active');
  },

  /**
   * Respond to help request (giver)
   */
  async respondToHelpRequest(requestId, accepted) {
    return http.post('/api/match/giver/respond', {
      requestId,
      accepted,
    });
  },

  /**
   * Get help requests (for match page)
   */
  async getHelpRequests(limit = 20, offset = 0, status = 'searching') {
    return http.get(`/api/match/requests?limit=${limit}&offset=${offset}&status=${status}`);
  },
};
