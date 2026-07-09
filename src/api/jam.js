import { http } from './http';

export const jamApi = {
  search: (query, token) => http.get(`/api/jam/search?q=${encodeURIComponent(query)}`, token),

  getActiveSession: (chatId, token) => http.get(`/api/jam/sessions/active?chatId=${encodeURIComponent(chatId)}`, token),

  startSession: (chatId, token) => http.post('/api/jam/sessions', { chatId }, token),

  joinSession: (sessionId, token) => http.post(`/api/jam/sessions/${sessionId}/join`, undefined, token),

  leaveSession: (sessionId, token) => http.post(`/api/jam/sessions/${sessionId}/leave`, undefined, token),

  endSession: (sessionId, token) => http.post(`/api/jam/sessions/${sessionId}/end`, undefined, token),

  addToQueue: (sessionId, track, token) => http.post(`/api/jam/sessions/${sessionId}/queue`, track, token),

  removeFromQueue: (sessionId, queueItemId, token) =>
    http.delete(`/api/jam/sessions/${sessionId}/queue/${queueItemId}`, token),
};
