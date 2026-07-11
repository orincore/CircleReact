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

  // Playlists: shared per-chat (both members mutually create/edit/reorder/delete),
  // reusable across sessions -- survive ending the session they were built or played in.
  getPlaylists: (chatId, token) => http.get(`/api/jam/playlists?chatId=${encodeURIComponent(chatId)}`, token),

  createPlaylist: (chatId, name, token) => http.post('/api/jam/playlists', { chatId, name }, token),

  getPlaylist: (playlistId, token) => http.get(`/api/jam/playlists/${playlistId}`, token),

  renamePlaylist: (playlistId, name, token) => http.put(`/api/jam/playlists/${playlistId}`, { name }, token),

  deletePlaylist: (playlistId, token) => http.delete(`/api/jam/playlists/${playlistId}`, token),

  addPlaylistTrack: (playlistId, track, token) =>
    http.post(`/api/jam/playlists/${playlistId}/tracks`, track, token),

  removePlaylistTrack: (playlistId, trackId, token) =>
    http.delete(`/api/jam/playlists/${playlistId}/tracks/${trackId}`, token),

  reorderPlaylistTracks: (playlistId, trackIds, token) =>
    http.put(`/api/jam/playlists/${playlistId}/tracks/order`, { trackIds }, token),

  loadPlaylistIntoSession: (sessionId, playlistId, mode, token) =>
    http.post(`/api/jam/sessions/${sessionId}/playlist/${playlistId}/load`, { mode }, token),
};
