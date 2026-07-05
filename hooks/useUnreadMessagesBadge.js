import { useAuth } from "@/contexts/AuthContext";
import { getSocket, socketService } from "@/src/api/socket";
import { chatApi } from "@/src/api/chat";
import { unreadCountService } from "@/src/services/unreadCountService";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * Shared source of truth for the total unread-message badge.
 *
 * Loads the inbox counts, keeps them in sync via socket events + AppState, and
 * exposes the running total. Used by both the custom JS tab bar
 * (Android/web) and the iOS native (Liquid Glass) tab bar so the badge behaves
 * identically regardless of which tab bar is rendered.
 *
 * @returns {number} totalUnreadMessages
 */
export function useUnreadMessagesBadge() {
  const { token, user } = useAuth();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  // Subscribe to the unread count service for instant updates.
  useEffect(() => {
    if (!token) {
      setTotalUnreadMessages(0);
      return;
    }

    const unsubscribe = unreadCountService.subscribe(({ totalUnreadCount }) => {
      setTotalUnreadMessages(totalUnreadCount);
    });

    loadTotalUnreadMessages(token);
    const teardown = setupSocketListeners(token, user?.id != null ? String(user.id) : null);

    return () => {
      unsubscribe();
      teardown();
    };
  }, [token, user?.id]);

  // Refresh when the app returns to the foreground.
  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") loadTotalUnreadMessages(token);
    });
    return () => sub?.remove();
  }, [token]);

  // Periodic safety refresh while active.
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (AppState.currentState === "active") loadTotalUnreadMessages(token);
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  return totalUnreadMessages;
}

async function loadTotalUnreadMessages(token) {
  try {
    const response = await chatApi.getInbox(token);
    unreadCountService.initializeCounts(response.inbox);
  } catch (error) {
    console.error("Failed to load total unread messages:", error);
  }
}

function setupSocketListeners(token, currentUserId) {
  const socket = getSocket(token);

  // `chat:unread_count` from the server is the authoritative absolute count.
  const onUnreadCount = ({ chatId, unreadCount }) => {
    unreadCountService.setChatUnreadCount(chatId, unreadCount);
  };

  // Optimistic bump for snappy badges; the server's absolute count corrects it.
  // Only count messages from OTHER users — never your own sent messages.
  const onNewMessage = ({ message }) => {
    if (!message || !message.chatId) return;
    if (currentUserId && String(message.senderId) === currentUserId) return;
    unreadCountService.incrementChatUnreadCount(message.chatId);
  };

  const onLocalCleared = ({ chatId, clearedCount }) => {
    unreadCountService.reduceChatUnreadCount(chatId, clearedCount);
  };

  socket.on("chat:message", onNewMessage);
  socket.on("chat:unread_count", onUnreadCount);
  socket.on("chat:local:unread_cleared", onLocalCleared);

  const handleBackgroundMessage = ({ message }) => {
    if (!message || !message.chatId) return;
    if (currentUserId && String(message.senderId) === currentUserId) return;
    unreadCountService.incrementChatUnreadCount(message.chatId);
  };
  socketService.addMessageHandler("tab-bar-unread", handleBackgroundMessage);

  // Return a teardown that removes ONLY our own handlers. Using
  // socket.off(event) with no handler would nuke every other component's
  // listeners for these shared events and silently break realtime.
  return () => {
    socket.off("chat:message", onNewMessage);
    socket.off("chat:unread_count", onUnreadCount);
    socket.off("chat:local:unread_cleared", onLocalCleared);
    socketService.removeMessageHandler("tab-bar-unread");
  };
}
