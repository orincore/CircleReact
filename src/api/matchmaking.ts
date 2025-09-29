import { http } from "./http";

export interface ProposalOther {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  interests: string[];
  needs: string[];
}

export type MatchmakingState =
  | { state: "idle" }
  | { state: "searching" }
  | { state: "proposal"; proposal: { id: string; other: ProposalOther; acceptedByOther?: boolean; message?: string } }
  | { state: "matched"; match: { otherName: string; chatId: string }; message?: string }
  | { state: "cancelled"; message?: string };

interface LocationData {
  latitude: number;
  longitude: number;
  maxDistance?: number;
  ageRange?: [number, number];
}

export const matchmakingApi = {
  start: (token?: string | null, location?: LocationData) => 
    http.post<{ ok: boolean }, { location?: LocationData }>("/matchmaking/start", { location }, token),
  cancel: (token?: string | null) => 
    http.post<{ ok: boolean }, undefined>("/matchmaking/cancel", undefined, token),
  status: (token?: string | null) => 
    http.get<MatchmakingState>("/matchmaking/status", token),
  decide: (decision: "accept" | "pass", token?: string | null) =>
    http.post<MatchmakingState, { decision: "accept" | "pass" }>("/matchmaking/decide", { decision }, token),
  sendMessageRequest: (receiverId: string, token?: string | null) =>
    http.post<{ success: boolean; message?: string }, { receiverId: string }>("/matchmaking/message-request", { receiverId }, token),
};
