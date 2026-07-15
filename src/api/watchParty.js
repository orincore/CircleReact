import { http } from "./http";

export const watchPartyApi = {
  start: (memeIds, token) => http.post("/api/watch-party/start", { memeIds }, token),

  getActive: (token) => http.get("/api/watch-party/active", token),

  getSession: (sessionId, token) => http.get(`/api/watch-party/${sessionId}`, token),

  extend: (sessionId, memeIds, token) =>
    http.post(`/api/watch-party/${sessionId}/extend`, { memeIds }, token),

  advance: (sessionId, index, token) =>
    http.post(`/api/watch-party/${sessionId}/advance`, { index }, token),

  join: (sessionId, token) => http.post(`/api/watch-party/${sessionId}/join`, {}, token),

  leave: (sessionId, token) => http.post(`/api/watch-party/${sessionId}/leave`, {}, token),

  end: (sessionId, token) => http.post(`/api/watch-party/${sessionId}/end`, {}, token),

  invite: (sessionId, userIds, token) =>
    http.post(`/api/watch-party/${sessionId}/invite`, { userIds }, token),

  react: (sessionId, emoji, token) =>
    http.post(`/api/watch-party/${sessionId}/react`, { emoji }, token),
};
