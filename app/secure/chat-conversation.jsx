import React, { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getSocket, socketService } from "@/src/api/socket";
import { chatApi } from "@/src/api/chat";
import { exploreApi } from "@/src/api/explore";
import { reportsApi, REPORT_REASONS } from "@/src/api/reports";
import { blindDatingApi } from "@/src/api/blindDating";
import ReactionPicker from "@/src/components/ReactionPicker";
import VerifiedBadge from "@/components/VerifiedBadge";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function MessageBubble({
  message,
  isMine,
  onReact,
  onDoubleTap,
  onLongPress,
  isSelected,
  isEditing,
  selectionMode,
  onToggleSelect,
}) {
  // Determine tick style based on message status
  let tickIconName = null;
  let tickColor = "#808080"; // default grey

  if (isMine) {
    if (message.status === "read") {
      tickIconName = "checkmark-done"; // double tick
      tickColor = "#34B7F1"; // blue
    } else if (message.status === "delivered") {
      tickIconName = "checkmark-done"; // double tick
    } else if (message.status === "sent") {
      tickIconName = "checkmark"; // single tick
    }
  }

  // Group reactions by emoji for display
  const reactionCounts = {};
  (message.reactions || []).forEach((r) => {
    if (!r || !r.emoji) return;
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  const lastTapRef = useRef(0);

  const handlePress = () => {
    // In selection mode, tapping toggles selection instead of reacting
    if (selectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      if (onDoubleTap) onDoubleTap();
    }
    lastTapRef.current = now;
  };

  const formatTime = () => {
    if (!message.createdAt) return "";
    try {
      const d =
        typeof message.createdAt === "number"
          ? new Date(message.createdAt)
          : new Date(message.createdAt);
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const hoursStr = hours.toString().padStart(2, "0");
      return `${hoursStr}:${minutes} ${ampm}`;
    } catch {
      return "";
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.messageRow,
        isMine ? styles.messageRowMine : styles.messageRowTheirs,
        pressed && { opacity: 0.8 },
      ]}
      onPress={handlePress}
      delayLongPress={300}
      onLongPress={() => {
        console.log('LONG_PRESS_MESSAGE', message.id);
        if (onLongPress) onLongPress();
      }}
    >
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.myMessageBubble : styles.theirMessageBubble,
          isSelected && styles.messageBubbleSelected,
          isEditing && styles.messageBubbleEditing,
        ]}
      >
        <Text style={isMine ? styles.myMessageText : styles.theirMessageText}>
          {message.text}
        </Text>
        {Object.keys(reactionCounts).length > 0 && (
          <View style={styles.reactionSummaryRow}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <View key={emoji} style={styles.reactionBubble}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 && (
                  <Text style={styles.reactionCount}>{count}</Text>
                )}
              </View>
            ))}
          </View>
        )}
        <View style={styles.statusRow}>
          <Text style={styles.timeText}>{formatTime()}</Text>
          {message.isEdited && (
            <Text style={styles.editedLabel}> (edited)</Text>
          )}
          {isMine && tickIconName ? (
            <Ionicons
              name={tickIconName}
              size={14}
              color={tickColor}
              style={{ marginLeft: 4 }}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ChatConversationScreen() {
  const router = useRouter();
  const { 
    id, 
    name, 
    avatar, 
    otherUserId: paramOtherUserId,
    isBlindDate: paramIsBlindDate,
    blindDateMatchReason,
    blindDateGender,
    blindDateAge,
  } = useLocalSearchParams();
  const { token, user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const conversationId = typeof id === "string" ? id : "chat";
  const conversationName =
    typeof name === "string" ? name : "Conversation";
  const avatarUrl =
    typeof avatar === "string" && avatar.trim() ? avatar.trim() : null;
  
  // Blind date info
  const isBlindDate = paramIsBlindDate === 'true';
  const blindDateInfo = isBlindDate ? {
    matchReason: blindDateMatchReason || '',
    gender: blindDateGender || '',
    age: blindDateAge ? parseInt(blindDateAge, 10) : null,
  } : null;

  const [messages, setMessages] = useState([]);
  const [composer, setComposer] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [showAllReactions, setShowAllReactions] = useState(false);

  const [oldestAt, setOldestAt] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Normalize my user ID to string for consistent comparisons
  const myUserId = user?.id != null ? String(user.id) : null;
  const typingTimeoutRef = useRef(null);
  const processedMessageIdsRef = useRef(new Set());
  const listRef = useRef(null);
  const typingIndicatorTimeoutRef = useRef(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [actionMessage, setActionMessage] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [friendStatus, setFriendStatus] = useState('unknown');
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMessage, setReportMessage] = useState(null);
  const [selectedReportReason, setSelectedReportReason] = useState(null);
  
  // Blind date reveal state
  const [showRevealPrompt, setShowRevealPrompt] = useState(false);
  const [blindDateMessageCount, setBlindDateMessageCount] = useState(0);
  const [isRevealSubmitting, setIsRevealSubmitting] = useState(false);
  const [hasRevealedSelf, setHasRevealedSelf] = useState(false);
  const [otherHasRevealed, setOtherHasRevealed] = useState(false);
  const [bothRevealed, setBothRevealed] = useState(false);
  const [blindDateMatch, setBlindDateMatch] = useState(null);
  const [lastPromptDismissedAt, setLastPromptDismissedAt] = useState(0);
  const [showBlockedInfoModal, setShowBlockedInfoModal] = useState(false);
  const [blockedInfoMessage, setBlockedInfoMessage] = useState(null);
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const REVEAL_THRESHOLD = 30;
  const REVEAL_INTERVAL = 10; // Show prompt every 10 messages after dismissal
  const [reportAdditionalDetails, setReportAdditionalDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [canMessage, setCanMessage] = useState(() => {
    if (isBlindDate) return true;
    if (!paramOtherUserId) return true;
    if (user?.id != null && String(paramOtherUserId) === String(user.id)) return true;
    return false;
  });
  const [otherUserVerified, setOtherUserVerified] = useState(false);

  const backgroundSource = isDarkMode
    ? require("../../assets/images/dark-mode-bg.png")
    : require("../../assets/images/light-mode-bg.png");

  const keyboardBehavior = Platform.select({ ios: "padding", android: "height" });
  const keyboardOffset = Platform.select({
    ios: insets.top + 60,
    android: 80 + insets.bottom,
    default: 0,
  });

  // Monotonic message status helper: sent -> delivered -> read
  const statusPriority = {
    sent: 1,
    delivered: 2,
    read: 3,
  };

  const mergeStatus = (current, next) => {
    if (!next) return current || null;
    const c = statusPriority[current] || 0;
    const n = statusPriority[next] || 0;
    return n > c ? next : current;
  };

  const deduplicateMessages = (messageArray) => {
    const seen = new Set();
    return messageArray.filter((msg) => {
      if (!msg.id) return true;
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  };

  // Socket setup: join room, history, messages, typing, presence
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    if (!socket || !conversationId) return;

    socket.emit("chat:join", { chatId: conversationId });
    socketService.setCurrentChatId(conversationId);

    const handleHistory = (data) => {
      if (!data || !Array.isArray(data.messages)) return;
      const sorted = [...data.messages].sort((a, b) => {
        const at = new Date(a.createdAt || 0).getTime();
        const bt = new Date(b.createdAt || 0).getTime();
        return at - bt;
      });
      const deduplicated = deduplicateMessages(sorted).map((msg) => {
        // Ensure we always have a stable status value from history
        let status = msg.status;
        if (!status && msg.senderId === myUserId) {
          status = "sent";
        }
        return { ...msg, status };
      });

      setMessages(deduplicated);
      deduplicated.forEach((msg) => {
        if (msg.id) {
          processedMessageIdsRef.current.add(msg.id);
        }
      });

      if (deduplicated.length > 0) {
        setOldestAt(deduplicated[0].createdAt || null);
      }
    };

    const handleMessage = (data) => {
      if (!data || !data.message) return;
      const raw = data.message;
      const msg = {
        ...raw,
        // Ensure own messages have at least 'sent' as initial status
        status:
          raw.status ||
          (raw.senderId != null && String(raw.senderId) === myUserId
            ? "sent"
            : raw.status),
      };
      if (msg.chatId !== conversationId) return;
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === msg.id ||
            (m.id === msg.id && m.text === msg.text && m.createdAt === msg.createdAt)
        );
        if (exists) return prev;
        return [...prev, msg];
      });
    };

    const handleTyping = (data) => {
      if (!data || data.chatId !== conversationId) return;
      const users = Array.isArray(data.users) ? data.users : [];

      // Normalize to userId strings and exclude myself
      const otherIds = users
        .map((u) => {
          if (!u) return null;
          if (typeof u === "string") return u;
          if (typeof u === "object") {
            return (
              (u.userId != null && String(u.userId)) ||
              (u.id != null && String(u.id)) ||
              null
            );
          }
          return null;
        })
        .filter((id) => id && id !== myUserId);

      setTypingUsers(otherIds);
    };

    const handlePresence = (data) => {
      if (!data || data.chatId !== conversationId) return;

      let online = false;
      if (typeof data.isOnline === "boolean") {
        online = data.isOnline;
      } else if (typeof data.online === "boolean") {
        online = data.online;
      } else if (typeof data.online === "string") {
        // Treat explicit status strings
        online = data.online.toLowerCase() === "online";
      }

      setIsOnline(online);
    };

    const handleActivePresence = (data) => {
      if (!data || data.chatId !== conversationId) return;
      setIsActive(!!data.isActive);
    };

    const handleReactionAdded = (data) => {
      if (!data || !data.messageId || !data.reaction) return;
      const { chatId, messageId, reaction } = data;
      if (chatId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          const reactions = msg.reactions || [];
          // Remove any existing reaction from same user with same emoji
          const filtered = reactions.filter(
            (r) =>
              !(
                r &&
                reaction &&
                r.userId === reaction.userId &&
                r.emoji === reaction.emoji
              )
          );

          return { ...msg, reactions: [...filtered, reaction] };
        })
      );
    };

    const handleReactionRemoved = (data) => {
      if (!data || !data.messageId || !data.userId || !data.emoji) return;
      const { chatId, messageId, userId, emoji } = data;
      if (chatId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const reactions = (msg.reactions || []).filter(
              (r) => !(r.userId === userId && r.emoji === emoji)
            );
            return { ...msg, reactions };
          }
          return msg;
        })
      );
    };

    const handleMessageBlocked = (data) => {
      if (!isBlindDate || !data) return;
      setBlockedInfoMessage(
        data.message ||
          "In blind date chats, you can't send personal details like phone numbers, social media or email until both of you choose to reveal your profiles."
      );
      setShowBlockedInfoModal(true);
    };

    const handleSocketMessage = (data) => {
      if (!data || !data.message) return;
      const msg = data.message;
      if (msg.chatId !== conversationId) return;
      const msgId = msg.id || `${msg.senderId}-${msg.createdAt}`;
      if (processedMessageIdsRef.current.has(msgId)) {
        return;
      }
      processedMessageIdsRef.current.add(msgId);
      handleMessage(data);
    };

    const backgroundMessageHandler = (data) => {
      if (!data || !data.message) return;
      if (data.message.chatId === conversationId) {
        const msgId = data.message.id || `${data.message.senderId}-${data.message.createdAt}`;
        if (processedMessageIdsRef.current.has(msgId)) {
          return;
        }
        processedMessageIdsRef.current.add(msgId);
        handleMessage(data);
      }
    };

    socketService.addMessageHandler(`chat-${conversationId}`, backgroundMessageHandler);

    socket.on("chat:history", handleHistory);
    socket.on("chat:message", handleSocketMessage);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:presence", handlePresence);
    socket.on("chat:presence:active", handleActivePresence);
    socket.on("chat:reaction:added", handleReactionAdded);
    socket.on("chat:reaction:removed", handleReactionRemoved);
    socket.on("chat:message:blocked", handleMessageBlocked);

    return () => {
      try {
        socket.emit("chat:leave", { chatId: conversationId });
      } catch {}
      processedMessageIdsRef.current.clear();
      socketService.removeMessageHandler(`chat-${conversationId}`);
      socket.off("chat:history", handleHistory);
      socket.off("chat:message", handleSocketMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:presence", handlePresence);
      socket.off("chat:presence:active", handleActivePresence);
      socket.off("chat:reaction:added", handleReactionAdded);
      socket.off("chat:reaction:removed", handleReactionRemoved);
      socket.off("chat:message:blocked", handleMessageBlocked);
      socketService.clearCurrentChatId();
    };
  }, [conversationId, myUserId, user]);

  // Mark this chat as active/inactive while the screen is mounted
  useEffect(() => {
    if (!token || !conversationId) return;
    const socket = getSocket(token);
    if (!socket) return;

    try {
      socket.emit("chat:active", { chatId: conversationId });
    } catch {}

    return () => {
      try {
        socket.emit("chat:inactive", { chatId: conversationId });
      } catch {}
    };
  }, [token, conversationId]);

  // Fetch blind date status and track message count
  useEffect(() => {
    if (!isBlindDate || !conversationId || !token) return;
    
    const fetchBlindDateStatus = async () => {
      try {
        const status = await blindDatingApi.getChatStatus(conversationId, token);
        const data = status?.data || status;
        
        if (data?.match) {
          setBlindDateMatch(data.match);
          setHasRevealedSelf(data.hasRevealedSelf || false);
          setOtherHasRevealed(data.otherHasRevealed || false);
          setBothRevealed(data.match.status === 'revealed');
          setBlindDateMessageCount(data.match.message_count || 0);
          if (data.otherUserProfile) {
            setOtherUserProfile(data.otherUserProfile);
          }
        }
      } catch (error) {
        console.log('[BlindDate] Error fetching status:', error);
      }
    };
    
    fetchBlindDateStatus();
  }, [isBlindDate, conversationId, token]);

  // Track message count for blind date reveal prompt
  useEffect(() => {
    if (!isBlindDate) return;
    
    const totalMessages = messages.length;
    setBlindDateMessageCount(totalMessages);
    
    // Don't show prompt if already revealed or both revealed
    if (hasRevealedSelf || bothRevealed) return;
    
    // Show reveal prompt when threshold is reached
    const shouldShowPrompt = totalMessages >= REVEAL_THRESHOLD && 
      (lastPromptDismissedAt === 0 || totalMessages >= lastPromptDismissedAt + REVEAL_INTERVAL);
    
    if (shouldShowPrompt && !showRevealPrompt) {
      setShowRevealPrompt(true);
    }
  }, [messages, isBlindDate, hasRevealedSelf, bothRevealed, lastPromptDismissedAt, showRevealPrompt]);

  // Listen for blind date socket events
  useEffect(() => {
    if (!isBlindDate || !token) return;
    
    const socket = getSocket(token);
    if (!socket) return;
    
    // When other user reveals their identity
    const handleRevealRequested = (data) => {
      console.log('[BlindDate] Received reveal_requested:', data);
      if (data.chatId === conversationId || data.matchId === blindDateMatch?.id) {
        setOtherHasRevealed(true);
        // Show prompt immediately when other user reveals
        if (!hasRevealedSelf) {
          setShowRevealPrompt(true);
        }
      }
    };
    
    // When both users have revealed - LIVE UPDATE UI
    const handleBothRevealed = (data) => {
      console.log('[BlindDate] Received both_revealed:', data);
      if (data.chatId === conversationId || data.matchId === blindDateMatch?.id) {
        // Update all reveal states
        setBothRevealed(true);
        setHasRevealedSelf(true);
        setOtherHasRevealed(true);
        setShowRevealPrompt(false);
        
        // Update other user's profile with revealed data
        if (data.otherUser) {
          setOtherUserProfile(data.otherUser);
          // Update conversation name and avatar if we have the data
          if (data.otherUser.first_name) {
            // The header will automatically use otherUserProfile if available
          }
        }
        
        // Friendship was created - update canMessage state
        if (data.friendshipCreated) {
          setFriendStatus('friends');
          setCanMessage(true);
        }
        
        // Show success alert
        Alert.alert(
          '🎉 Profiles Revealed!',
          'Both of you have revealed! You are now friends and can see each other\'s full profiles.',
          [{ 
            text: 'View Profile', 
            onPress: () => {
              if (data.otherUserId) {
                router.push(`/secure/user-profile/${data.otherUserId}`);
              }
            }
          },
          { text: 'Continue Chatting' }]
        );
      }
    };
    
    socket.on('blind_date:reveal_requested', handleRevealRequested);
    socket.on('blind_date:revealed', handleBothRevealed);
    
    return () => {
      socket.off('blind_date:reveal_requested', handleRevealRequested);
      socket.off('blind_date:revealed', handleBothRevealed);
    };
  }, [isBlindDate, token, conversationId, blindDateMatch?.id, hasRevealedSelf, router]);

  const handleSend = () => {
    const trimmed = (composer || "").trim();
    if (!trimmed) return;

    // For non-blind-date chats, enforce canMessage on frontend
    if (!isBlindDate) {
      const socket = token ? getSocket(token) : null;
      if (
        !token ||
        !socket ||
        !paramOtherUserId ||
        !conversationId ||
        user?.id == null ||
        String(paramOtherUserId) === String(user.id)
      ) {
        return;
      }

      if (
        paramOtherUserId &&
        user?.id != null &&
        String(paramOtherUserId) !== String(user.id) &&
        !canMessage
      ) {
        return;
      }
    }

    const socket = token ? getSocket(token) : null;
    if (!socket || !conversationId) return;

    setComposer("");

    // If editing a message, emit edit instead of new message
    if (editingMessage && editingMessage.id) {
      try {
        socket.emit("chat:edit", {
          messageId: editingMessage.id,
          text: trimmed,
        });
      } catch {}

      // Optimistically update local message text
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessage.id
            ? { ...msg, text: trimmed, isEdited: true }
            : msg
        )
      );
      setEditingMessage(null);
      return;
    }

    // New message
    try {
      socket.emit("chat:message", { chatId: conversationId, text: trimmed });
    } catch {}
  };

  const handleAddReaction = async (messageId, emoji) => {
    if (!token || !messageId || !emoji) return;

    // Optimistic local update so the reaction appears immediately
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = msg.reactions || [];
        const exists = reactions.some(
          (r) => r && r.userId === myUserId && r.emoji === emoji
        );
        if (exists) return msg;
        const optimisticReaction = {
          id: `temp-${Date.now()}`,
          messageId,
          userId: myUserId,
          emoji,
          createdAt: Date.now(),
        };
        return { ...msg, reactions: [...reactions, optimisticReaction] };
      })
    );

    // Use socket-based toggle so backend broadcasts chat:reaction:added/removed
    try {
      const socket = getSocket(token);
      if (socket && conversationId) {
        socket.emit("chat:reaction:toggle", {
          chatId: conversationId,
          messageId,
          emoji,
        });
      }
    } catch (error) {
      // Silent error for now
    }
  };

  const renderItem = ({ item }) => {
    const senderIdStr = item.senderId != null ? String(item.senderId) : null;
    const isMine = senderIdStr && myUserId && senderIdStr === myUserId;
    const isSelected = selectedMessageIds.includes(item.id);
    const isEditing = editingMessage && editingMessage.id === item.id;
    return (
      <MessageBubble
        message={item}
        isMine={isMine}
        onReact={(emoji) => handleAddReaction(item.id, emoji)}
        onDoubleTap={() => setReactionTarget(item)}
        onLongPress={() => {
          setActionMessage(item);
          setShowMessageActions(true);
        }}
        isSelected={isSelected}
        isEditing={!!isEditing}
        selectionMode={selectionMode}
        onToggleSelect={() => toggleSelectMessage(item.id)}
      />
    );
  };

  const emitTyping = (isTyping) => {
    const socket = token ? getSocket(token) : null;
    if (!socket || !conversationId) return;
    try {
      socket.emit("chat:typing", {
        chatId: conversationId,
        isTyping,
        typing: isTyping,
      });
    } catch {}
  };

  // Report message handlers
  const handleOpenReportModal = (message) => {
    setReportMessage(message);
    setSelectedReportReason(null);
    setReportAdditionalDetails('');
    setShowMessageActions(false);
    setActionMessage(null);
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setReportMessage(null);
    setSelectedReportReason(null);
    setReportAdditionalDetails('');
    setIsSubmittingReport(false);
  };

  const handleSubmitReport = async () => {
    if (!selectedReportReason || !reportMessage) {
      Alert.alert('Error', 'Please select a reason for your report.');
      return;
    }

    // Get the sender ID of the message being reported
    const reportedUserId = reportMessage.senderId;
    if (!reportedUserId) {
      Alert.alert('Error', 'Unable to identify the message sender.');
      return;
    }

    // Prevent self-reporting
    if (String(reportedUserId) === myUserId) {
      Alert.alert('Error', 'You cannot report your own message.');
      return;
    }

    setIsSubmittingReport(true);

    try {
      const result = await reportsApi.submitReport({
        reportedUserId: String(reportedUserId),
        reportType: selectedReportReason.type,
        reason: selectedReportReason.label,
        messageId: reportMessage.id,
        chatId: conversationId,
        additionalDetails: reportAdditionalDetails.trim() || undefined
      });

      if (result.success) {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Our team will review it shortly.',
          [{ text: 'OK', onPress: handleCloseReportModal }]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to submit report. Please try again.');
        setIsSubmittingReport(false);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
      setIsSubmittingReport(false);
    }
  };

  const handleComposerChange = (text) => {
    setComposer(text);
    // Start typing
    emitTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1500);
  };

  // Blind date reveal handlers
  const handleRevealProfile = async () => {
    if (!conversationId || isRevealSubmitting || hasRevealedSelf) return;
    
    setIsRevealSubmitting(true);
    try {
      // Use cached match ID or fetch it
      let matchId = blindDateMatch?.id;
      if (!matchId) {
        const statusResult = await blindDatingApi.getChatStatus(conversationId, token);
        const data = statusResult?.data || statusResult;
        matchId = data?.match?.id;
      }
      
      if (!matchId) {
        Alert.alert('Error', 'Could not find blind date match information.');
        setIsRevealSubmitting(false);
        return;
      }
      
      const result = await blindDatingApi.requestReveal(matchId, token);
      const resultData = result?.data || result;
      
      if (resultData?.success) {
        setHasRevealedSelf(true);
        setShowRevealPrompt(false);
        
        if (resultData.bothRevealed) {
          setBothRevealed(true);
          setOtherHasRevealed(true);
          if (resultData.otherUser) {
            setOtherUserProfile(resultData.otherUser);
          }
          Alert.alert(
            '🎉 Profiles Revealed!',
            'Both of you have agreed to reveal! You can now see each other\'s full profiles and continue chatting as friends.',
            [{ text: 'Awesome!' }]
          );
        }
        // No alert for single reveal - the banner will show the status
      } else {
        Alert.alert('Error', resultData?.message || 'Failed to request reveal.');
      }
    } catch (error) {
      console.error('Error requesting reveal:', error);
      Alert.alert('Error', 'Failed to request reveal. Please try again.');
    } finally {
      setIsRevealSubmitting(false);
    }
  };

  const handleSkipReveal = () => {
    setShowRevealPrompt(false);
    // Record when we dismissed so we can show again after REVEAL_INTERVAL more messages
    setLastPromptDismissedAt(blindDateMessageCount);
  };

  const handleKeyPress = (e) => {
    if (Platform.OS !== "web") return;
    const key = e?.nativeEvent?.key || e?.key;
    const shift = !!(e?.nativeEvent?.shiftKey ?? e?.shiftKey);
    if (key === "Enter" && !shift) {
      e.preventDefault?.();
      handleSend();
    }
  };

  const handleStartEdit = () => {
    if (!actionMessage) return;
    const senderIdStr =
      actionMessage.senderId != null ? String(actionMessage.senderId) : null;
    if (!myUserId || senderIdStr !== myUserId) {
      setShowMessageActions(false);
      setActionMessage(null);
      return;
    }
    setEditingMessage(actionMessage);
    setComposer(actionMessage.text || "");
    setShowMessageActions(false);
  };

  const toggleSelectMessage = (messageId) => {
    setSelectionMode(true);
    setSelectedMessageIds((prev) => {
      if (prev.includes(messageId)) {
        const filtered = prev.filter((id) => id !== messageId);
        if (filtered.length === 0) {
          setSelectionMode(false);
        }
        return filtered;
      }
      return [...prev, messageId];
    });
  };

  const handleDeleteMessages = () => {
    const idsToDelete =
      selectionMode && selectedMessageIds.length > 0
        ? selectedMessageIds
        : actionMessage
        ? [actionMessage.id]
        : [];

    if (!idsToDelete.length || !token || !conversationId) return;
    const socket = getSocket(token);
    if (!socket) return;

    idsToDelete.forEach((id) => {
      try {
        socket.emit("chat:delete", { chatId: conversationId, messageId: id });
      } catch {}
    });

    // Optimistically remove from UI
    setMessages((prev) => prev.filter((msg) => !idsToDelete.includes(msg.id)));
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setActionMessage(null);
    setShowMessageActions(false);
  };

  // Update message status from delivery/read receipts
  useEffect(() => {
    if (!token || !conversationId) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handleDeliveryReceipt = ({ messageId, chatId, status }) => {
      if (chatId !== conversationId) return;
      const incoming = status || "delivered";
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const merged = mergeStatus(msg.status, incoming);
          return { ...msg, status: merged };
        })
      );
    };

    const handleReadReceipt = ({ messageId, chatId }) => {
      if (chatId !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const merged = mergeStatus(msg.status, "read");
          return { ...msg, status: merged };
        })
      );
    };

    // Fallback: legacy room-wide events used by older clients
    const handleLegacyDelivered = ({ chatId, messageId }) => {
      if (chatId !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const merged = mergeStatus(msg.status, "delivered");
          return { ...msg, status: merged };
        })
      );
    };

    const handleLegacyRead = ({ chatId, messageId }) => {
      if (chatId !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const merged = mergeStatus(msg.status, "read");
          return { ...msg, status: merged };
        })
      );
    };

    socket.on("chat:message:delivery_receipt", handleDeliveryReceipt);
    socket.on("chat:message:read_receipt", handleReadReceipt);
    socket.on("chat:delivered", handleLegacyDelivered);
    socket.on("chat:read", handleLegacyRead);

    const handleMessageEdited = (data) => {
      if (!data || !data.chatId || !data.messageId) return;
      const { chatId, messageId, text } = data;
      if (chatId !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, text: text ?? msg.text, isEdited: true }
            : msg
        )
      );
      // If we were editing this message, clear editing state
      if (editingMessage && editingMessage.id === messageId) {
        setEditingMessage(null);
      }
    };

    const handleMessageDeleted = (data) => {
      if (!data || !data.chatId || !data.messageId) return;
      const { chatId, messageId } = data;
      if (chatId !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, text: "This message was deleted", isDeleted: true }
            : msg
        )
      );
      if (editingMessage && editingMessage.id === messageId) {
        setEditingMessage(null);
        setComposer("");
      }
    };

    socket.on("chat:message:edited", handleMessageEdited);
    socket.on("chat:message:deleted", handleMessageDeleted);

    return () => {
      socket.off("chat:message:delivery_receipt", handleDeliveryReceipt);
      socket.off("chat:message:read_receipt", handleReadReceipt);
      socket.off("chat:delivered", handleLegacyDelivered);
      socket.off("chat:read", handleLegacyRead);
      socket.off("chat:message:edited", handleMessageEdited);
      socket.off("chat:message:deleted", handleMessageDeleted);
    };
  }, [conversationId, token]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;
    try {
      // Scroll to the end of the list (latest message)
      listRef.current.scrollToEnd({ animated: true });
    } catch {}
  }, [messages.length]);

  // Clear typing indicator if it gets stuck (no updates for a while)
  useEffect(() => {
    if (typingIndicatorTimeoutRef.current) {
      clearTimeout(typingIndicatorTimeoutRef.current);
      typingIndicatorTimeoutRef.current = null;
    }

    if (typingUsers.length > 0) {
      typingIndicatorTimeoutRef.current = setTimeout(() => {
        setTypingUsers([]);
        typingIndicatorTimeoutRef.current = null;
      }, 5000); // 5 seconds of no updates
    }

    return () => {
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current);
        typingIndicatorTimeoutRef.current = null;
      }
    };
  }, [typingUsers.length]);

  useEffect(() => {
    if (isBlindDate) {
      setFriendStatus('blind-date');
      setCanMessage(true);
      return;
    }

    if (!token || !paramOtherUserId || !user?.id) {
      if (!paramOtherUserId || (user?.id != null && String(paramOtherUserId) === String(user.id))) {
        setFriendStatus('self');
        setCanMessage(true);
      }
      return;
    }

    let isCancelled = false;
    const socket = getSocket(token);
    if (!socket) return;

    const handleStatusResponse = (data) => {
      socket.off('friend:status:response', handleStatusResponse);
      if (isCancelled) return;
      if (!data || data.error) {
        setFriendStatus('none');
        setCanMessage(false);
        return;
      }
      setFriendStatus(data.status || 'none');
      setCanMessage(data.status === 'friends');
    };

    socket.on('friend:status:response', handleStatusResponse);
    socket.emit('friend:status:get', { userId: paramOtherUserId });

    const timeout = setTimeout(() => {
      socket.off('friend:status:response', handleStatusResponse);
      if (!isCancelled && friendStatus === 'unknown') {
        setFriendStatus('none');
        setCanMessage(false);
      }
    }, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
      socket.off('friend:status:response', handleStatusResponse);
    };
  }, [token, paramOtherUserId, user?.id, friendStatus]);

  // Fetch other user's verification status
  useEffect(() => {
    if (!token || !paramOtherUserId || isBlindDate) return;
    
    const fetchVerificationStatus = async () => {
      try {
        const response = await exploreApi.getUserProfile(paramOtherUserId, token);
        if (response?.user?.verification_status === 'verified') {
          setOtherUserVerified(true);
        }
      } catch (error) {
        // Silent fail - verification badge just won't show
        console.log('[ChatConversation] Could not fetch user verification status');
      }
    };
    
    fetchVerificationStatus();
  }, [token, paramOtherUserId, isBlindDate]);

  // If myUserId changes after initial mount, ensure we don't show myself as typing
  useEffect(() => {
    if (!typingUsers.length) return;
    setTypingUsers((prev) => prev.filter((id) => id && id !== myUserId));
  }, [myUserId]);

  // Also auto-scroll when typing indicator appears
  useEffect(() => {
    if (!listRef.current) return;
    if (typingUsers.length === 0) return;
    try {
      listRef.current.scrollToEnd({ animated: true });
    } catch {}
  }, [typingUsers.length]);

  // Emit delivery/read receipts when other user's messages become visible
  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };
  const onViewableItemsChanged = React.useCallback(
    ({ viewableItems }) => {
      const socket = token ? getSocket(token) : null;
      if (!socket || !conversationId || !myUserId) return;
      viewableItems.forEach((vi) => {
        const item = vi.item;
        if (!item || !item.id) return;
        const senderIdStr =
          item.senderId != null ? String(item.senderId) : null;
        if (senderIdStr && myUserId && senderIdStr !== myUserId) {
          try {
            socket.emit("chat:delivered", { chatId: conversationId, messageId: item.id });
          } catch {}
          try {
            socket.emit("chat:read", { chatId: conversationId, messageId: item.id });
          } catch {}
          // Also emit new-style receipt events that backend uses to notify sender
          try {
            socket.emit("chat:message:delivered", { messageId: item.id });
          } catch {}
          try {
            socket.emit("chat:message:read", { messageId: item.id });
          } catch {}
        }
      });
    },
    [token, conversationId, myUserId]
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore || !conversationId) return;
    if (!token) return;

    setLoadingMore(true);
    try {
      const beforeIso = oldestAt ? new Date(oldestAt).toISOString() : undefined;
      const { messages: older } = await chatApi.getMessagesPaginated(
        conversationId,
        30,
        beforeIso,
        token
      );

      const olderAsc = [...older].sort(
        (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
      );

      if (!olderAsc.length) {
        setHasMore(false);
      } else {
        setMessages((prev) => deduplicateMessages([...olderAsc, ...prev]));
        setOldestAt(olderAsc[0].createdAt || oldestAt);
      }
    } catch (error) {
      // Silent fail for now
    }

    setLoadingMore(false);
  };

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;
    if (!contentOffset) return;
    // When user reaches near the top, try to load more
    if (contentOffset.y <= 50) {
      loadMore();
    }
  };

  return (
    <ImageBackground
      source={backgroundSource}
      style={styles.root}
      resizeMode="cover"
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      {/* Top safe area for header, covers notch with solid background */}
      <SafeAreaView
        style={[styles.safeArea, { flex: 0, backgroundColor: theme.background }]}
        edges={['top']}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.border,
              backgroundColor: theme.background,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              // Allow profile view if not blind date OR if both revealed
              const canViewProfile = !isBlindDate || bothRevealed;
              const profileId = otherUserProfile?.id || paramOtherUserId;
              if (canViewProfile && profileId) {
                router.push(`/secure/user-profile/${profileId}`);
              }
            }}
            disabled={!paramOtherUserId && !otherUserProfile?.id}
          >
            {(() => {
              // Use revealed profile photo if available, otherwise use avatarUrl
              const displayAvatarUrl = bothRevealed && otherUserProfile?.profile_photo_url 
                ? otherUserProfile.profile_photo_url 
                : avatarUrl;
              const shouldBlur = isBlindDate && !bothRevealed;
              
              if (displayAvatarUrl) {
                return (
                  <View style={{ overflow: 'hidden', borderRadius: 16 }}>
                    <Image
                      source={{ uri: displayAvatarUrl }}
                      style={styles.headerAvatarImage}
                      blurRadius={shouldBlur ? 50 : 0}
                    />
                    {shouldBlur && (
                      <BlurView
                        intensity={40}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                  </View>
                );
              }
              return (
                <View
                  style={[
                    styles.headerAvatarFallback,
                    { backgroundColor: shouldBlur ? theme.primary + '80' : theme.primary },
                  ]}
                >
                  <Text style={styles.headerAvatarFallbackText}>
                    {(bothRevealed && otherUserProfile?.first_name 
                      ? otherUserProfile.first_name 
                      : conversationName
                    ).charAt(0).toUpperCase()}
                  </Text>
                  {shouldBlur && (
                    <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                  )}
                </View>
              );
            })()}
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text
                style={[styles.headerTitle, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {bothRevealed && otherUserProfile?.first_name 
                  ? `${otherUserProfile.first_name} ${otherUserProfile.last_name || ''}`.trim()
                  : conversationName
                }
              </Text>
              {(otherUserVerified || (bothRevealed && otherUserProfile?.is_verified)) && (
                <VerifiedBadge size={18} style={{ marginLeft: 4 }} />
              )}
              {bothRevealed && (
                <View style={styles.friendBadge}>
                  <Ionicons name="people" size={12} color="#4CAF50" />
                  <Text style={styles.friendBadgeText}>Friends</Text>
                </View>
              )}
            </View>
            {isBlindDate && !bothRevealed && blindDateInfo ? (
              <Text
                style={[styles.headerSubtitle, { color: theme.primary }]}
                numberOfLines={1}
              >
                {[
                  blindDateInfo.matchReason ? `Looking for ${blindDateInfo.matchReason}` : null,
                  blindDateInfo.gender ? blindDateInfo.gender.charAt(0).toUpperCase() + blindDateInfo.gender.slice(1) : null,
                  blindDateInfo.age ? `${blindDateInfo.age} yrs` : null,
                ].filter(Boolean).join(' • ')}
              </Text>
            ) : bothRevealed && otherUserProfile ? (
              <Text
                style={[styles.headerSubtitle, { color: '#4CAF50' }]}
                numberOfLines={1}
              >
                {[
                  otherUserProfile.gender ? otherUserProfile.gender.charAt(0).toUpperCase() + otherUserProfile.gender.slice(1) : null,
                  otherUserProfile.age ? `${otherUserProfile.age} yrs` : null,
                  '• Tap to view profile'
                ].filter(Boolean).join(' ')}
              </Text>
            ) : (
              <Text
                style={[styles.headerSubtitle, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {isActive ? "Online" : "Offline"}
              </Text>
            )}
          </View>
        </View>
        
        {/* Blind Date Reveal Status Banner */}
        {isBlindDate && !bothRevealed && (hasRevealedSelf || otherHasRevealed) && (
          <View style={[
            styles.revealStatusBanner,
            { 
              backgroundColor: hasRevealedSelf && otherHasRevealed 
                ? '#4CAF50' 
                : otherHasRevealed 
                  ? theme.primary 
                  : '#FF9800'
            }
          ]}>
            <Ionicons 
              name={hasRevealedSelf ? "eye" : "eye-outline"} 
              size={16} 
              color="#fff" 
              style={{ marginRight: 8 }}
            />
            <Text style={styles.revealStatusText}>
              {hasRevealedSelf && !otherHasRevealed 
                ? "✨ You revealed your identity. Waiting for them..."
                : !hasRevealedSelf && otherHasRevealed
                  ? "🎭 They revealed their identity! Tap to reveal yours"
                  : "🎉 Both revealed!"
              }
            </Text>
            {!hasRevealedSelf && otherHasRevealed && (
              <TouchableOpacity 
                style={styles.revealStatusButton}
                onPress={handleRevealProfile}
                disabled={isRevealSubmitting}
              >
                {isRevealSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.revealStatusButtonText}>Reveal</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Both Revealed Success Banner */}
        {isBlindDate && bothRevealed && (
          <View style={[styles.revealStatusBanner, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.revealStatusText}>
              🎉 Profiles revealed! You can now see each other's full profiles.
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* Bottom area for messages + composer */}
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={keyboardBehavior}
          keyboardVerticalOffset={keyboardOffset}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            ListFooterComponent={
              typingUsers.length > 0 ? (
                <View style={styles.typingRow}>
                  <View style={styles.typingDotsContainer}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                  <Text style={[styles.typingText, { color: theme.textSecondary }]}>
                    typing...
                  </Text>
                </View>
              ) : null
            }
          />

          <View
            style={[styles.composerContainer, { borderTopColor: theme.border }]}
          >
            {selectionMode && selectedMessageIds.length > 0 && (
              <View style={styles.selectionToolbar}>
                <Text style={styles.selectionToolbarText}>
                  {selectedMessageIds.length} selected
                </Text>
                <View style={styles.selectionToolbarActions}>
                  <TouchableOpacity
                    onPress={handleDeleteMessages}
                    style={styles.selectionToolbarButton}
                  >
                    <Text
                      style={[
                        styles.selectionToolbarButtonText,
                        styles.deleteText,
                      ]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectionMode(false);
                      setSelectedMessageIds([]);
                    }}
                    style={styles.selectionToolbarButton}
                  >
                    <Text style={styles.selectionToolbarButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {editingMessage && (
              <View style={styles.editBanner}>
                <View style={styles.editBannerTextContainer}>
                  <Text style={styles.editBannerLabel}>Editing message</Text>
                  <Text
                    style={styles.editBannerPreview}
                    numberOfLines={1}
                  >
                    {editingMessage.text || ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditingMessage(null);
                    setComposer("");
                  }}
                >
                  <Text style={styles.editBannerCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.composerInner}>
              <TextInput
                style={[
                  styles.input,
                  { color: "#000000" },
                ]}
                value={composer}
                onChangeText={handleComposerChange}
                placeholder={
                  canMessage
                    ? "Type a message"
                    : "You can only message users you are friends with"
                }
                placeholderTextColor={theme.textPlaceholder}
                multiline
                onKeyPress={handleKeyPress}
                editable={canMessage}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!composer.trim() || !canMessage) && styles.sendButtonDisabled,
                  { borderColor: theme.primary },
                ]}
                onPress={handleSend}
                disabled={!composer.trim() || !canMessage}
              >
                <View style={[styles.sendButtonInner, { backgroundColor: theme.primary }]}>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {reactionTarget && (
        <View style={styles.reactionOverlayContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.reactionOverlayBackdrop}
            activeOpacity={1}
            onPress={() => setReactionTarget(null)}
          >
            <View style={styles.reactionOverlay}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionOverlayButton}
                  onPress={() => {
                    handleAddReaction(reactionTarget.id, emoji);
                    setReactionTarget(null);
                    setShowAllReactions(false);
                  }}
                >
                  <Text style={styles.reactionOverlayEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              {/* + icon to open full emoji sheet */}
              <TouchableOpacity
                style={styles.reactionOverlayButton}
                onPress={() => setShowAllReactions(true)}
              >
                <Text style={[styles.reactionOverlayEmoji, { fontWeight: "600" }]}>＋</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}
      {/* Message actions overlay for long-press */}
      {showMessageActions && actionMessage && (
        <View style={styles.actionsOverlayContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.actionsOverlayBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowMessageActions(false);
              setActionMessage(null);
            }}
          >
            <View style={styles.actionsSheet}>
              <TouchableOpacity
                style={styles.actionsSheetButton}
                onPress={() => {
                  toggleSelectMessage(actionMessage.id);
                  setShowMessageActions(false);
                }}
              >
                <Text style={styles.actionsSheetText}>Select</Text>
              </TouchableOpacity>
              {myUserId &&
                actionMessage.senderId != null &&
                String(actionMessage.senderId) === myUserId && (
                  <TouchableOpacity
                    style={styles.actionsSheetButton}
                    onPress={handleStartEdit}
                  >
                    <Text style={styles.actionsSheetText}>Edit</Text>
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                style={styles.actionsSheetButton}
                onPress={handleDeleteMessages}
              >
                <Text style={[styles.actionsSheetText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
              {/* Only show Report button for messages from other users */}
              {myUserId &&
                actionMessage.senderId != null &&
                String(actionMessage.senderId) !== myUserId && (
                  <TouchableOpacity
                    style={styles.actionsSheetButton}
                    onPress={() => handleOpenReportModal(actionMessage)}
                  >
                    <Text style={[styles.actionsSheetText, { color: '#FF6B6B' }]}>Report</Text>
                  </TouchableOpacity>
                )}
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Report Message Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseReportModal}
      >
        <View style={styles.reportModalOverlay}>
          <View style={[styles.reportModalContainer, { backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }]}>
            <View style={styles.reportModalHeader}>
              <Text style={[styles.reportModalTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
                Report Message
              </Text>
              <TouchableOpacity onPress={handleCloseReportModal} style={styles.reportModalCloseBtn}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.reportModalSubtitle, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Why are you reporting this message?
            </Text>

            <ScrollView style={styles.reportReasonsContainer}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.type}
                  style={[
                    styles.reportReasonItem,
                    { 
                      backgroundColor: selectedReportReason?.type === reason.type 
                        ? (isDarkMode ? '#3a3a5e' : '#e8f4fd') 
                        : (isDarkMode ? '#2a2a4e' : '#f5f5f5'),
                      borderColor: selectedReportReason?.type === reason.type 
                        ? '#007AFF' 
                        : 'transparent',
                      borderWidth: selectedReportReason?.type === reason.type ? 2 : 0,
                    }
                  ]}
                  onPress={() => setSelectedReportReason(reason)}
                >
                  <View style={styles.reportReasonContent}>
                    <Text style={[styles.reportReasonLabel, { color: isDarkMode ? '#fff' : '#000' }]}>
                      {reason.label}
                    </Text>
                    <Text style={[styles.reportReasonDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>
                      {reason.description}
                    </Text>
                  </View>
                  {selectedReportReason?.type === reason.type && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[
                styles.reportAdditionalInput,
                { 
                  backgroundColor: isDarkMode ? '#2a2a4e' : '#f5f5f5',
                  color: isDarkMode ? '#fff' : '#000',
                  borderColor: isDarkMode ? '#3a3a5e' : '#ddd'
                }
              ]}
              placeholder="Additional details (optional)"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              value={reportAdditionalDetails}
              onChangeText={setReportAdditionalDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.reportSubmitBtn,
                { 
                  backgroundColor: selectedReportReason ? '#FF6B6B' : '#ccc',
                  opacity: isSubmittingReport ? 0.7 : 1
                }
              ]}
              onPress={handleSubmitReport}
              disabled={!selectedReportReason || isSubmittingReport}
            >
              {isSubmittingReport ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.reportSubmitBtnText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showBlockedInfoModal && isBlindDate}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBlockedInfoModal(false)}
      >
        <View style={styles.blockedModalOverlay}>
          <View
            style={[
              styles.blockedModalContainer,
              { backgroundColor: isDarkMode ? "#1a1a2e" : "#ffffff" },
            ]}
          >
            <View style={styles.blockedModalTag}>
              <Text style={styles.blockedModalTagText}>Blind date safety</Text>
            </View>

            <View style={styles.blockedModalIconWrapper}>
              <Text style={styles.blockedModalIcon}>🔒</Text>
            </View>

            <Text
              style={[
                styles.blockedModalTitle,
                { color: isDarkMode ? "#fff" : "#000" },
              ]}
              numberOfLines={1}
            >
              No personal info yet
            </Text>
            <Text
              style={[
                styles.blockedModalSubtitle,
                { color: isDarkMode ? "#aaa" : "#666" },
              ]}
            >
              {blockedInfoMessage ||
                "In blind date chats, messages with personal details like phone numbers, social media or email are blocked until both of you choose to reveal your profiles."}
            </Text>
            <TouchableOpacity
              style={styles.blockedModalButton}
              onPress={() => setShowBlockedInfoModal(false)}
            >
              <Text style={styles.blockedModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Blind Date Reveal Prompt Modal */}
      <Modal
        visible={showRevealPrompt && isBlindDate && !hasRevealedSelf && !bothRevealed}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSkipReveal}
      >
        <View style={styles.revealModalOverlay}>
          <View style={[styles.revealModalContainer, { backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }]}>
            <View style={styles.revealModalIcon}>
              <Text style={{ fontSize: 48 }}>{otherHasRevealed ? '🎉' : '🎭'}</Text>
            </View>
            
            <Text style={[styles.revealModalTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
              {otherHasRevealed ? 'They Revealed!' : 'Time to Reveal?'}
            </Text>
            
            <Text style={[styles.revealModalSubtitle, { color: isDarkMode ? '#aaa' : '#666' }]}>
              {otherHasRevealed 
                ? 'Your match has revealed their identity! Would you like to reveal yours too?'
                : `You've exchanged ${blindDateMessageCount} messages! Would you like to reveal your profile to your match?`
              }
            </Text>
            
            <Text style={[styles.revealModalNote, { color: isDarkMode ? '#888' : '#999' }]}>
              {otherHasRevealed
                ? 'Once you reveal, you\'ll both see each other\'s full profiles and can continue as friends!'
                : 'Both of you need to agree to reveal. Once revealed, you\'ll see each other\'s full profiles and can continue as friends!'
              }
            </Text>
            
            <TouchableOpacity
              style={[
                styles.revealBtn, 
                { 
                  opacity: isRevealSubmitting ? 0.7 : 1,
                  backgroundColor: otherHasRevealed ? '#4CAF50' : '#007AFF'
                }
              ]}
              onPress={handleRevealProfile}
              disabled={isRevealSubmitting}
            >
              {isRevealSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.revealBtnText}>
                  {otherHasRevealed ? '🎉 Reveal & Connect!' : '✨ Reveal My Profile'}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.skipRevealBtn}
              onPress={handleSkipReveal}
            >
              <Text style={[styles.skipRevealBtnText, { color: isDarkMode ? '#aaa' : '#666' }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
            
            {!otherHasRevealed && (
              <Text style={[styles.revealModalHint, { color: isDarkMode ? '#666' : '#999' }]}>
                We'll ask again after {REVEAL_INTERVAL} more messages
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <ReactionPicker
        visible={!!(reactionTarget && showAllReactions)}
        onClose={() => setShowAllReactions(false)}
        onSelectEmoji={(emoji) => {
          if (reactionTarget && emoji) {
            handleAddReaction(reactionTarget.id, emoji);
          }
          setShowAllReactions(false);
          setReactionTarget(null);
        }}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarFallbackText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flexShrink: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowTheirs: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: "#DCF8C6",
    borderTopRightRadius: 2,
  },
  theirMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 2,
  },
  myMessageText: {
    fontSize: 15,
    color: "#000",
  },
  theirMessageText: {
    fontSize: 15,
    color: "#000",
  },
  composerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  composerInner: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingDotsContainer: {
    flexDirection: "row",
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 12,
  },
  statusRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  messageBubbleSelected: {
    borderWidth: 1,
    borderColor: "#7C3AED",
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  reactionBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 11,
    marginLeft: 3,
    color: "#374151",
  },
  reactionOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  reactionOverlayBackdrop: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  reactionOverlay: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  reactionOverlayButton: {
    marginHorizontal: 4,
  },
  reactionOverlayEmoji: {
    fontSize: 22,
  },
  actionsOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  actionsOverlayBackdrop: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  actionsSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  actionsSheetButton: {
    paddingVertical: 12,
  },
  actionsSheetText: {
    fontSize: 16,
  },
  deleteText: {
    color: "#EF4444",
  },
  selectionToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    marginBottom: 6,
  },
  selectionToolbarText: {
    fontSize: 12,
    color: "#1F2937",
  },
  selectionToolbarActions: {
    flexDirection: "row",
  },
  selectionToolbarButton: {
    marginLeft: 12,
  },
  selectionToolbarButtonText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginBottom: 6,
  },
  editBannerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  editBannerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  editBannerPreview: {
    fontSize: 12,
    color: "#4B5563",
  },
  editBannerCancel: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  // Report Modal Styles
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reportModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  reportModalCloseBtn: {
    padding: 4,
  },
  reportModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  reportReasonsContainer: {
    maxHeight: 280,
    marginBottom: 16,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  reportReasonContent: {
    flex: 1,
    marginRight: 12,
  },
  reportReasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportReasonDesc: {
    fontSize: 13,
  },
  reportAdditionalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
  },
  reportSubmitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Reveal Modal Styles
  revealModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  revealModalContainer: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  revealModalIcon: {
    marginBottom: 16,
  },
  revealModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  revealModalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  revealModalNote: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  revealBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  revealBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipRevealBtn: {
    paddingVertical: 10,
  },
  skipRevealBtnText: {
    fontSize: 14,
  },
  revealModalHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  revealStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  revealStatusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  revealStatusButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginLeft: 10,
  },
  revealStatusButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  friendBadgeText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  blockedModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  blockedModalContainer: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  blockedModalTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  blockedModalTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4C1D95',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockedModalIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    marginBottom: 12,
  },
  blockedModalIcon: {
    fontSize: 30,
  },
  blockedModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  blockedModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 21,
  },
  blockedModalButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  blockedModalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

