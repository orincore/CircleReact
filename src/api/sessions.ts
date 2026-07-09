import { http } from "./http";

export interface SessionDTO {
  id: string;
  deviceType: string | null;
  deviceName: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface SessionsResponse {
  sessions: SessionDTO[];
}

export interface TerminateSessionResponse {
  success: boolean;
  message: string;
}

export const sessionsApi = {
  getSessions: (token?: string | null) => http.get<SessionsResponse>("/api/sessions", token),
  terminateSession: (sessionId: string, token?: string | null) =>
    http.post<TerminateSessionResponse>(`/api/sessions/${encodeURIComponent(sessionId)}/terminate`, undefined, token),
};
