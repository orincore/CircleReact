import { http } from './http';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getToken() {
  try {
    return await AsyncStorage.getItem('@circle:access_token');
  } catch {
    return null;
  }
}

/**
 * Meme feed API: feed/view/like/comments/alias, connect-requests, and share-to-chat.
 * Uses the centralized http utility for consistent token handling.
 */
export const feedApi = {
  async getFeed(limit = 20, token = null) {
    const authToken = token || await getToken();
    return http.get(`/api/feed/memes?limit=${limit}`, authToken);
  },

  async getMeme(memeId, token = null) {
    const authToken = token || await getToken();
    return http.get(`/api/feed/memes/${memeId}`, authToken);
  },

  async recordView(memeId, token = null) {
    const authToken = token || await getToken();
    return http.post(`/api/feed/memes/${memeId}/view`, null, authToken);
  },

  // How long a card was actually focused on screen -- feeds the ranking
  // algorithm's "time spent" signal (see memeRanking.service.ts).
  async recordViewDuration(memeId, durationMs, token = null) {
    const authToken = token || await getToken();
    return http.post(`/api/feed/memes/${memeId}/view-duration`, { duration_ms: durationMs }, authToken);
  },

  async like(memeId, token = null) {
    const authToken = token || await getToken();
    return http.post(`/api/feed/memes/${memeId}/like`, null, authToken);
  },

  async unlike(memeId, token = null) {
    const authToken = token || await getToken();
    return http.delete(`/api/feed/memes/${memeId}/like`, authToken);
  },

  async getComments(memeId, limit = 30, offset = 0, token = null) {
    const authToken = token || await getToken();
    return http.get(`/api/feed/memes/${memeId}/comments?limit=${limit}&offset=${offset}`, authToken);
  },

  // parentCommentId nests the reply under its top-level ancestor (Instagram-style,
  // one level deep) -- pass the comment being replied to; the server resolves it
  // to the top-level ancestor itself if that comment is already a reply.
  async postComment(memeId, text, parentCommentId = null, token = null) {
    const authToken = token || await getToken();
    return http.post(`/api/feed/memes/${memeId}/comments`, {
      text,
      parent_comment_id: parentCommentId,
    }, authToken);
  },

  async deleteComment(memeId, commentId, token = null) {
    const authToken = token || await getToken();
    return http.delete(`/api/feed/memes/${memeId}/comments/${commentId}`, authToken);
  },

  async getMyAlias(token = null) {
    const authToken = token || await getToken();
    return http.get('/api/feed/me/alias', authToken);
  },

  // Targets whoever wrote `commentId` -- the API never exposes a commenter's real
  // user id (only their alias), so the target is always resolved server-side from
  // the comment, never passed directly.
  async createConnectRequest(commentId, token = null) {
    const authToken = token || await getToken();
    return http.post('/api/feed/connect-requests', {
      comment_id: commentId,
    }, authToken);
  },

  async getConnectRequests(token = null) {
    const authToken = token || await getToken();
    return http.get('/api/feed/connect-requests', authToken);
  },

  async respondToConnectRequest(requestId, accept, token = null) {
    const authToken = token || await getToken();
    return http.post(`/api/feed/connect-requests/${requestId}/respond`, { accept }, authToken);
  },

  async requestReveal(requestId, token = null) {
    const authToken = token || await getToken();
    return http.post(`/api/feed/connect-requests/${requestId}/reveal`, null, authToken);
  },

  async shareMeme(memeId, chatId, token = null) {
    const authToken = token || await getToken();
    return http.post(`/api/feed/memes/${memeId}/share`, { chat_id: chatId }, authToken);
  },

  // How many memes have been shared (either direction) in each chat -- used
  // to sort the share modal's target list by "shared the most with".
  async getShareCounts(chatIds, token = null) {
    const authToken = token || await getToken();
    if (!chatIds || chatIds.length === 0) return { counts: {} };
    return http.get(`/api/feed/share-counts?chat_ids=${chatIds.join(',')}`, authToken);
  },
};
