import { http } from './http';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get token from AsyncStorage
 */
async function getToken() {
  try {
    return await AsyncStorage.getItem('@circle:access_token');
  } catch {
    return null;
  }
}

/**
 * Prompt Matching API
 * Handles giver/receiver matching requests
 * Uses the centralized http utility for consistent token handling
 */
export const promptMatchingApi = {
  /**
   * Create a help request (receiver)
   */
  async createHelpRequest(prompt, token = null) {
    const authToken = token || await getToken();
    return http.post('/api/match/request', {
      prompt,
      role: 'receiver',
    }, authToken);
  },

  /**
   * Get help request status
   */
  async getHelpRequestStatus(requestId, token = null) {
    const authToken = token || await getToken();
    return http.get(`/api/match/status/${requestId}`, authToken);
  },

  /**
   * Cancel help request
   */
  async cancelHelpRequest(requestId, token = null) {
    const authToken = token || await getToken();
    return http.post(`/api/match/cancel/${requestId}`, null, authToken);
  },

  /**
   * Setup or update giver profile
   */
  async setupGiverProfile(skills = [], categories = [], token = null) {
    const authToken = token || await getToken();
    return http.post('/api/match/giver/setup', {
      skills,
      categories,
    }, authToken);
  },

  /**
   * Toggle giver availability
   */
  async toggleGiverAvailability(isAvailable, token = null) {
    const authToken = token || await getToken();
    console.log('🔄 Toggling giver availability:', { isAvailable });
    const result = await http.post('/api/match/giver/toggle', {
      isAvailable,
    }, authToken);
    console.log('✅ Toggle successful:', result);
    return result;
  },

  /**
   * Get giver profile
   */
  async getGiverProfile(token = null) {
    const authToken = token || await getToken();
    return http.get('/api/match/giver/profile', authToken);
  },

  /**
   * Get active help request
   */
  async getActiveHelpRequest(token = null) {
    const authToken = token || await getToken();
    return http.get('/api/match/receiver/active', authToken);
  },

  /**
   * Respond to help request (giver)
   */
  async respondToHelpRequest(requestId, accepted, token = null) {
    const authToken = token || await getToken();
    return http.post('/api/match/giver/respond', {
      requestId,
      accepted,
    }, authToken);
  },

  /**
   * Get help requests (for match page)
   */
  async getHelpRequests(limit = 20, offset = 0, status = 'searching', token = null) {
    const authToken = token || await getToken();
    return http.get(`/api/match/requests?limit=${limit}&offset=${offset}&status=${status}`, authToken);
  },
};
