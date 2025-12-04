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

export interface BlindDateInfo {
  matchReason?: string;
  gender?: string;
  age?: number;
  maskedName?: string;
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
  otherVerificationStatus?: string | boolean;
  pinned?: boolean;
  archived?: boolean;
  isBlindDateOngoing?: boolean;
  blindDateInfo?: BlindDateInfo | null;
}

export const chatApi = {
  // Backed by new /api/chat-list but mapped to old shape { inbox: ChatInboxItem[] }
  getInbox: async (token?: string | null): Promise<{ inbox: ChatInboxItem[] }> => {
    // Use new chat list endpoint and map to legacy shape for UI compatibility
    const params = new URLSearchParams()
    // Include archived so user can unarchive from list; counts not required
    params.set('includeCounts', 'false')
    params.set('includeArchived', 'true')
    const resp = await http.get<{ chats: any[] }>(`/api/chat-list?${params.toString()}`, token)
    const inbox: ChatInboxItem[] = (resp.chats || []).map((it: any) => ({
      chat: {
        id: it.chatId,
        created_at: new Date(it.lastMessage?.createdAt || Date.now()).toISOString(),
        last_message_at: it.lastMessageAt || null,
      },
      lastMessage: it.lastMessage
        ? {
            id: it.lastMessage.id,
            chat_id: it.chatId,
            sender_id: it.lastMessage.senderId,
            text: it.lastMessage.text,
            created_at: new Date(it.lastMessage.createdAt).toISOString(),
            status: it.lastMessage.status,
          }
        : null,
      unreadCount: typeof it.unreadCount === 'number' ? it.unreadCount : 0,
      otherId: it.otherUser?.id,
      otherName: it.otherUser?.name,
      otherProfilePhoto: it.otherUser?.profilePhoto || '',
      // Normalise verification flag from backend (string or boolean)
      otherVerificationStatus:
        it.otherUser?.verification_status ??
        it.otherUser?.verificationStatus ??
        (typeof it.otherUser?.isVerified === 'boolean'
          ? (it.otherUser.isVerified ? 'verified' : 'unverified')
          : ''),
      pinned: !!it.pinned,
      archived: !!it.archived,
      isBlindDateOngoing: !!it.isBlindDateOngoing,
      blindDateInfo: it.blindDateInfo || null,
    }))
    return { inbox }
  },
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
  deleteChat: (chatId: string, token?: string | null) =>
    http.delete<{ success: boolean }>(`/chat/${encodeURIComponent(chatId)}`, token),
  // New chat-list APIs
  getChatList: (
    opts: { includeCounts?: boolean; includeArchived?: boolean } = {},
    token?: string | null
  ) => {
    const params = new URLSearchParams()
    if (opts.includeCounts) params.set('includeCounts', 'true')
    if (opts.includeArchived) params.set('includeArchived', 'true')
    return http.get<{ chats: any[] }>(`/api/chat-list?${params.toString()}`, token)
  },
  setArchived: (chatId: string, archived: boolean, token?: string | null) =>
    http.post<{ setting: any }, { archived: boolean }>(`/api/chat-list/${encodeURIComponent(chatId)}/archive`, { archived }, token),
  setPinned: (chatId: string, pinned: boolean, token?: string | null) =>
    http.post<{ setting: any }, { pinned: boolean }>(`/api/chat-list/${encodeURIComponent(chatId)}/pin`, { pinned }, token),
};
