import { http } from "./http";

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
  isEdited?: boolean;
  isDeleted?: boolean;
  deliveredBy?: string[];
  readBy?: string[];
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ChatInboxItem {
  chat: {
    id: string;
    created_at: string;
    last_message_at: string | null;
  };
  lastMessage: {
    id: string;
    chat_id: string;
    sender_id: string;
    text: string;
    created_at: string;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  } | null;
  unreadCount: number;
  otherId?: string;
  otherName?: string;
  otherProfilePhoto: string;
}

export const chatApi = {
  getInbox: (token?: string | null) => http.get<{ inbox: ChatInboxItem[] }>(`/chat/inbox`, token),
  createChatWithUser: (userId: string, token?: string | null) =>
    http.post<{ chat: { id: string; created_at: string; last_message_at: string | null }; otherUser: { id: string; name: string; profilePhoto: string } }>(`/chat/with-user/${encodeURIComponent(userId)}`, {}, token),
  getMessages: (chatId: string, token?: string | null) =>
    http.get<{ messages: ChatMessage[] }>(`/chat/${encodeURIComponent(chatId)}/messages`, token),
  sendMessage: (chatId: string, text: string, token?: string | null) =>
    http.post<{ message: ChatMessage }, { text: string }>(`/chat/${encodeURIComponent(chatId)}/messages`, { text }, token),
  editMessage: (messageId: string, text: string, token?: string | null) =>
    http.put<{ message: ChatMessage }, { text: string }>(`/chat/messages/${encodeURIComponent(messageId)}`, { text }, token),
  deleteMessage: (chatId: string, messageId: string, token?: string | null) =>
    http.delete<{ success: boolean }>(`/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`, token),
  addReaction: (messageId: string, emoji: string, token?: string | null) =>
    http.post<{ reaction: MessageReaction }, { emoji: string }>(`/chat/messages/${encodeURIComponent(messageId)}/reactions`, { emoji }, token),
  removeReaction: (messageId: string, emoji: string, token?: string | null) =>
    http.delete<{ success: boolean }>(`/chat/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}`, token),
  getReactions: (messageId: string, token?: string | null) =>
    http.get<{ reactions: MessageReaction[] }>(`/chat/messages/${encodeURIComponent(messageId)}/reactions`, token),
  getMuteStatus: (chatId: string, token?: string | null) =>
    http.get<{ isMuted: boolean; setting: any }>(`/chat/${encodeURIComponent(chatId)}/mute`, token),
  setMuteStatus: (chatId: string, isMuted: boolean, token?: string | null, mutedUntil?: string) =>
    http.post<{ setting: any }, { isMuted: boolean; mutedUntil?: string }>(`/chat/${encodeURIComponent(chatId)}/mute`, { isMuted, mutedUntil }, token),
  getMessagesPaginated: async (
    chatId: string,
    limit = 30,
    before?: string,
    token?: string | null,
  ): Promise<{ messages: ChatMessage[] }> => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (before) params.set("before", before);
    const resp = await http.get<{
      messages: Array<{ id: string; chat_id: string; sender_id: string; text: string; created_at: string }>;
    }>(`/chat/${encodeURIComponent(chatId)}/messages?${params.toString()}`, token);
    const mapped = resp.messages.map((r) => ({
      id: r.id,
      chatId: r.chat_id,
      senderId: r.sender_id,
      text: r.text,
      createdAt: new Date(r.created_at).getTime(),
    }));
    return { messages: mapped };
  },
};
