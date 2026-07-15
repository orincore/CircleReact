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
    mediaUrl?: string;
    mediaType?: string;
    thumbnail?: string;
    sharedMemeId?: string;
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
  isMemeConnectOngoing?: boolean;
  isGroup?: boolean;
  groupName?: string | null;
  groupAvatarUrl?: string | null;
  memberCount?: number | null;
}

export const chatApi = {
  // Backed by new /api/chat-list but mapped to old shape { inbox: ChatInboxItem[] }
  getInbox: async (token?: string | null): Promise<{ inbox: ChatInboxItem[] }> => {
    // Use new chat list endpoint and map to legacy shape for UI compatibility
    const params = new URLSearchParams()
    // Include archived so user can unarchive from list. Request unread counts so
    // badges are accurate on launch instead of 0 until the first realtime event.
    params.set('includeCounts', 'true')
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
            mediaUrl: it.lastMessage.mediaUrl ?? it.lastMessage.media_url,
            mediaType: it.lastMessage.mediaType ?? it.lastMessage.media_type,
            thumbnail: it.lastMessage.thumbnail ?? it.lastMessage.thumb_url ?? it.lastMessage.thumbnail_url,
            sharedMemeId: it.lastMessage.sharedMemeId ?? it.lastMessage.shared_meme_id,
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
      isMemeConnectOngoing: !!it.isMemeConnectOngoing,
      isGroup: !!it.isGroup,
      groupName: it.groupName ?? null,
      groupAvatarUrl: it.groupAvatarUrl ?? null,
      memberCount: it.memberCount ?? null,
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
      messages: Array<{
        id: string;
        chat_id: string;
        sender_id: string;
        text: string;
        media_url?: string;
        media_type?: string;
        thumbnail?: string;
        reply_to_id?: string;
        created_at: string;
        updated_at?: string;
        is_edited?: boolean;
        is_deleted?: boolean;
        is_view_once?: boolean;
        view_once_viewed_at?: string;
        shared_meme_id?: string;
        reactions?: Array<{ id: string; message_id: string; user_id: string; emoji: string; created_at: string }>;
        receipts?: Array<{ user_id: string; status: string }>;
      }>;
    }>(`/chat/${encodeURIComponent(chatId)}/messages?${params.toString()}`, token);
    // Previously this dropped everything but id/chatId/senderId/text/createdAt,
    // so any message loaded via scroll-back pagination silently lost its
    // reactions, edited/deleted flags, media, and receipts -- reactions in
    // particular would just vanish once a message scrolled into an
    // older, paginated-in page.
    const mapped = resp.messages.map((r) => ({
      id: r.id,
      chatId: r.chat_id,
      senderId: r.sender_id,
      text: r.text,
      mediaUrl: r.media_url,
      mediaType: r.media_type,
      thumbnail: r.thumbnail,
      reply_to_id: r.reply_to_id,
      createdAt: new Date(r.created_at).getTime(),
      updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : undefined,
      isEdited: r.is_edited,
      isDeleted: r.is_deleted,
      is_deleted: r.is_deleted,
      isViewOnce: r.is_view_once,
      view_once_viewed_at: r.view_once_viewed_at,
      sharedMemeId: r.shared_meme_id,
      reactions: (r.reactions || []).map((rx) => ({
        id: rx.id,
        messageId: rx.message_id,
        userId: rx.user_id,
        emoji: rx.emoji,
        createdAt: rx.created_at,
      })),
      receipts: r.receipts,
    }));
    return { messages: mapped };
  },
  // Full-history text search within a chat -- unlike filtering the client's
  // already-loaded `messages` array, this reaches messages that scrolled out
  // of the ~30-50 message pagination window long ago.
  searchMessages: async (
    chatId: string,
    query: string,
    token?: string | null,
  ): Promise<{ messages: Array<{ id: string; chatId: string; senderId: string; text: string; createdAt: number }> }> => {
    const params = new URLSearchParams({ q: query });
    const resp = await http.get<{
      messages: Array<{ id: string; chat_id: string; sender_id: string; text: string; created_at: string }>;
    }>(`/chat/${encodeURIComponent(chatId)}/messages/search?${params.toString()}`, token);
    return {
      messages: resp.messages.map((r) => ({
        id: r.id,
        chatId: r.chat_id,
        senderId: r.sender_id,
        text: r.text,
        createdAt: new Date(r.created_at).getTime(),
      })),
    };
  },
  // A window of messages around a specific one (reactions/media included, same
  // shape as getMessagesPaginated), for hydrating a search result that has
  // scrolled outside the currently-loaded pagination window before scrolling to it.
  getMessagesAround: async (
    chatId: string,
    messageId: string,
    token?: string | null,
  ): Promise<{ messages: ChatMessage[] }> => {
    const resp = await http.get<{
      messages: Array<{
        id: string;
        chat_id: string;
        sender_id: string;
        text: string;
        media_url?: string;
        media_type?: string;
        thumbnail?: string;
        reply_to_id?: string;
        created_at: string;
        updated_at?: string;
        is_edited?: boolean;
        is_deleted?: boolean;
        is_view_once?: boolean;
        view_once_viewed_at?: string;
        shared_meme_id?: string;
        reactions?: Array<{ id: string; message_id: string; user_id: string; emoji: string; created_at: string }>;
        receipts?: Array<{ user_id: string; status: string }>;
      }>;
    }>(`/chat/${encodeURIComponent(chatId)}/messages/around/${encodeURIComponent(messageId)}`, token);
    const mapped = resp.messages.map((r) => ({
      id: r.id,
      chatId: r.chat_id,
      senderId: r.sender_id,
      text: r.text,
      mediaUrl: r.media_url,
      mediaType: r.media_type,
      thumbnail: r.thumbnail,
      reply_to_id: r.reply_to_id,
      createdAt: new Date(r.created_at).getTime(),
      updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : undefined,
      isEdited: r.is_edited,
      isDeleted: r.is_deleted,
      is_deleted: r.is_deleted,
      isViewOnce: r.is_view_once,
      view_once_viewed_at: r.view_once_viewed_at,
      sharedMemeId: r.shared_meme_id,
      reactions: (r.reactions || []).map((rx) => ({
        id: rx.id,
        messageId: rx.message_id,
        userId: rx.user_id,
        emoji: rx.emoji,
        createdAt: rx.created_at,
      })),
      receipts: r.receipts,
    }));
    return { messages: mapped };
  },
  deleteChat: (chatId: string, token?: string | null) =>
    http.delete<{ success: boolean }>(`/chat/${encodeURIComponent(chatId)}`, token),
  // Used to hydrate the chat header (name/avatar/otherUserId) when a screen
  // navigates in with only a chatId and no other params -- e.g. a
  // notification tap, which only ever carries chatId/senderId, not the
  // other member's current name/photo.
  getMembers: (chatId: string, token?: string | null) =>
    http.get<{ members: Array<{ user_id: string; role?: string; first_name?: string; last_name?: string; profile_photo_url?: string; username?: string }> }>(
      `/chat/${encodeURIComponent(chatId)}/members`,
      token
    ),
  createGroup: (name: string, memberIds: string[], token?: string | null) =>
    http.post<{ chat: any; members: Array<{ id: string; firstName?: string; lastName?: string; profilePhotoUrl?: string }> }, { name: string; memberIds: string[] }>(
      `/chat/group`,
      { name, memberIds },
      token
    ),
  renameGroup: (chatId: string, name: string, token?: string | null) =>
    http.put<{ success: boolean; groupName: string }, { name: string }>(`/chat/${encodeURIComponent(chatId)}/group`, { name }, token),
  addGroupMembers: (chatId: string, memberIds: string[], token?: string | null) =>
    http.post<{ success: boolean; members: any[] }, { memberIds: string[] }>(`/chat/${encodeURIComponent(chatId)}/group/members`, { memberIds }, token),
  removeGroupMember: (chatId: string, userId: string, token?: string | null) =>
    http.delete<{ success: boolean }>(`/chat/${encodeURIComponent(chatId)}/group/members/${encodeURIComponent(userId)}`, token),
  leaveGroup: (chatId: string, token?: string | null) =>
    http.post<{ success: boolean }>(`/chat/${encodeURIComponent(chatId)}/leave`, {}, token),
  getChat: (chatId: string, token?: string | null) =>
    http.get<{ chat: { id: string; is_group: boolean; group_name: string | null; group_avatar_url: string | null; created_by: string | null } }>(
      `/chat/${encodeURIComponent(chatId)}`,
      token
    ),
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
