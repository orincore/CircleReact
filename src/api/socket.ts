import io from "socket.io-client";
import { API_BASE_URL } from "./config";

let socket: any | null = null;

// Socket service for managing chat state and message handlers
class SocketService {
  private currentChatId: string | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  setCurrentChatId(chatId: string | null) {
    this.currentChatId = chatId;
  }

  getCurrentChatId() {
    return this.currentChatId;
  }

  clearCurrentChatId() {
    this.currentChatId = null;
  }

  addMessageHandler(key: string, handler: (data: any) => void) {
    this.messageHandlers.set(key, handler);
  }

  removeMessageHandler(key: string) {
    this.messageHandlers.delete(key);
  }

  getMessageHandler(key: string) {
    return this.messageHandlers.get(key);
  }

  clearAllHandlers() {
    this.messageHandlers.clear();
  }
}

export const socketService = new SocketService();

export function getSocket(token?: string | null): any {
  if (socket && socket.connected) return socket;
  socket = io(API_BASE_URL, {
    path: "/ws",
    transports: ["websocket"],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    autoConnect: true,
  });
  return socket;
}

export function closeSocket() {
  try { socket?.disconnect(); } catch {}
  socket = null;
}
