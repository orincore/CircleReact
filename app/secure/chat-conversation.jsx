import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import { Gesture, GestureDetector, ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import * as ScreenCapture from "expo-screen-capture";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatVideoPlayer from "@/components/ChatVideoPlayer";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
// expo-media-library is native-only (saving to the device photo gallery,
// which handleDownloadMedia below already skips on web via a browser
// download-link fallback). Its web build extends expo-modules-core's
// NativeModule class, which throws "Class extends value undefined" the
// moment this module is evaluated — and Expo Router's static web output
// evaluates every route's imports up front to validate the route tree, so
// an unconditional import here broke every route, not just this screen.
const MediaLibrary = Platform.OS !== "web" ? require("expo-media-library") : null;

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getSocket, socketService } from "@/src/api/socket";
import { chatApi } from "@/src/api/chat";
import { reportsApi, REPORT_REASONS } from "@/src/api/reports";
import { unreadCountService } from "@/src/services/unreadCountService";
import { blindDatingApi } from "@/src/api/blindDating";
import ReactionPicker from "@/src/components/ReactionPicker";
import VerifiedBadge from "@/components/VerifiedBadge";
import { chatMediaService } from "@/src/services/chatMediaService";
import { LinearGradient } from "expo-linear-gradient";
import TypingIndicator from "@/components/chat/TypingIndicator";
import AnimatedMessageBubble from "@/components/chat/AnimatedMessageBubble";
import MediaSendingIndicator from "@/components/chat/MediaSendingIndicator";

// Used for messageBubble's maxWidth below. A percentage maxWidth only
// resolves correctly against a parent with a definite (non-auto) width —
// the bubble's immediate parent is the swipe-gesture wrapper, which is
// itself auto/shrink-to-fit, so "80%" had nothing definite to resolve
// against and produced inconsistent results (sometimes stretching to fill,
// sometimes wrapping text early). An absolute pixel value sidesteps that
// entirely since it doesn't need to resolve against any ancestor.
const SCREEN_WIDTH = Dimensions.get("window").width;

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Swipeable Message Wrapper for reply gesture using react-native-gesture-handler
// This prevents keyboard from closing during swipe
function SwipeableMessage({ children, isMine, onSwipeReply, message }) {
  const translateX = useRef(new Animated.Value(0)).current;
  // Separate opacity per side: previously both used one direction-agnostic
  // value (based on Math.abs(translationX)), so swiping either way faded in
  // BOTH the left and right reply icons at once. Each side now only reacts
  // to swipes toward it.
  const leftIconOpacity = useRef(new Animated.Value(0)).current;
  const rightIconOpacity = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 60;
  const hasTriggeredReply = useRef(false);

  // Reset the trigger flag
  const resetTriggerFlag = useCallback(() => {
    hasTriggeredReply.current = false;
  }, []);

  // Wrapper function to safely call the reply callback
  const triggerReply = useCallback(() => {
    if (onSwipeReply && !hasTriggeredReply.current) {
      hasTriggeredReply.current = true;
      onSwipeReply(message);
    }
  }, [onSwipeReply, message]);

  // Reset animation to original position
  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(leftIconOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(rightIconOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, leftIconOpacity, rightIconOpacity]);

  // Update animation values
  const updateAnimation = useCallback((translationXValue) => {
    const clampedX = Math.max(-SWIPE_THRESHOLD - 20, Math.min(SWIPE_THRESHOLD + 20, translationXValue));
    translateX.setValue(clampedX);
    const progress = Math.min(Math.abs(clampedX) / SWIPE_THRESHOLD, 1);
    // Dragging right (positive X) reveals the left indicator; dragging left
    // (negative X) reveals the right one — never both at once.
    leftIconOpacity.setValue(clampedX > 0 ? progress : 0);
    rightIconOpacity.setValue(clampedX < 0 ? progress : 0);
  }, [translateX, leftIconOpacity, rightIconOpacity]);

  // Handle gesture end with threshold check
  const handleGestureEnd = useCallback((translationXValue) => {
    if (Math.abs(translationXValue) >= SWIPE_THRESHOLD) {
      triggerReply();
    }
    resetPosition();
  }, [triggerReply, resetPosition]);
  
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // Only activate after 20px horizontal movement
    .failOffsetY([-15, 15]) // Fail if vertical movement exceeds 15px (allow more vertical tolerance)
    .minDistance(10) // Minimum distance before gesture activates
    .onStart(() => {
      'worklet';
      runOnJS(resetTriggerFlag)();
    })
    .onUpdate((event) => {
      'worklet';
      runOnJS(updateAnimation)(event.translationX);
    })
    .onEnd((event) => {
      'worklet';
      runOnJS(handleGestureEnd)(event.translationX);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(resetPosition)();
    });

  // Every extra plain View/Animated.View wrapped around the bubble for the
  // swipe gesture was another auto-width column container Yoga had to
  // resolve, and each one was a chance for the "stretch to my own
  // not-yet-determined width" ambiguity that caused short text to measure
  // at an already-wrapped width (confirmed via on-screen debug
  // measurements). Fix: don't wrap the bubble in anything extra at all.
  // GestureDetector's one required child IS the bubble itself (transform
  // passed straight into its style), and the reply icons are now rendered
  // as siblings positioned against messageRow directly (which already has
  // position:'relative') instead of against a removed middle wrapper.
  return (
    <>
      <Animated.View
        style={[
          styles.replyIconContainer,
          styles.replyIconLeft,
          { opacity: leftIconOpacity },
        ]}
      >
        <View style={styles.replyIconCircle}>
          <Ionicons name="arrow-undo" size={18} color="#fff" />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.replyIconContainer,
          styles.replyIconRight,
          { opacity: rightIconOpacity },
        ]}
      >
        <View style={styles.replyIconCircle}>
          <Ionicons name="arrow-undo" size={18} color="#fff" />
        </View>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={{
            transform: [{ translateX }],
            alignSelf: isMine ? "flex-end" : "flex-start",
            alignItems: isMine ? "flex-end" : "flex-start",
          }}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
}

function MessageBubble({
  message,
  isMine,
  senderName,
  onReact,
  onDoubleTap,
  onLongPress,
  isSelected,
  isEditing,
  selectionMode,
  onToggleSelect,
  replyToMessage,
  allMessages,
  isDarkMode,
  onReplyTap,
  isHighlighted,
  onMediaPress,
  viewedOnceMessages,
  onSwipeReply,
}) {
  const viewedOnceMessagesSet = viewedOnceMessages instanceof Set ? viewedOnceMessages : new Set();
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
    } else if (message.status === "sending" || message.isOptimistic) {
      tickIconName = "time-outline"; // clock for sending
      tickColor = "#A0A0A0";
    } else if (message.status === "failed") {
      tickIconName = "alert-circle"; // error icon for failed
      tickColor = "#FF4444";
    }
  }

  // Group reactions by emoji for display
  const reactionCounts = {};
  (message.reactions || []).forEach((r) => {
    if (!r || !r.emoji) return;
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  const lastTapRef = useRef(0);

  // Bubble backgrounds invert between light/dark mode via AnimatedMessageBubble
  // (mine: near-black in light mode / white in dark mode; theirs: the reverse),
  // so text color must invert right along with it to stay readable.
  const bubbleTextStyle = isMine
    ? [styles.myMessageText, isDarkMode && styles.myMessageTextDark]
    : [styles.theirMessageText, isDarkMode && styles.theirMessageTextDark];
  const bubbleIconColor = isMine
    ? (isDarkMode ? "#111111" : "#fff")
    : (isDarkMode ? "#E5E7EB" : "#374151");

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

  // Find the replied-to message if this message is a reply
  const repliedMessage = message.reply_to_id && allMessages
    ? allMessages.find(m => m.id === message.reply_to_id)
    : null;

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
        if (onLongPress) onLongPress();
      }}
    >
      {/* Swipe-to-reply is scoped to just the bubble itself (not the full
          row, which spans the whole screen width with empty space beside a
          short message) — SwipeableMessage used to wrap the entire Pressable
          row, so swiping anywhere in that empty space also triggered reply. */}
      <SwipeableMessage isMine={isMine} message={message} onSwipeReply={onSwipeReply}>
      <AnimatedMessageBubble
        isMine={isMine}
        isHighlighted={isHighlighted}
        style={[
          styles.messageBubble,
          isMine ? styles.myMessageBubble : styles.theirMessageBubble,
          isSelected && styles.messageBubbleSelected,
          isEditing && styles.messageBubbleEditing,
          isHighlighted && styles.messageBubbleHighlighted,
        ]}
      >
        {/* Sender name + time header row, "Room Chat" style */}
        <View style={styles.bubbleHeaderRow}>
          <Text style={[bubbleTextStyle, styles.bubbleSenderName]} numberOfLines={1}>
            {senderName}
          </Text>
          <View style={styles.bubbleHeaderRight}>
            {isMine && tickIconName ? (
              <Ionicons
                name={tickIconName}
                size={13}
                color={tickColor}
                style={{ marginRight: 4 }}
              />
            ) : null}
            <Text style={[styles.bubbleTimeText, { color: bubbleIconColor }]}>
              {formatTime()}
              {message.isEdited ? ' · edited' : ''}
            </Text>
          </View>
        </View>

        {/* Reply preview inside bubble - tappable to scroll to original message */}
        {repliedMessage && (
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => onReplyTap && onReplyTap(message.reply_to_id)}
            style={[
              styles.replyPreviewInBubble,
              isMine 
                ? (isDarkMode ? styles.replyPreviewInBubbleMineDark : styles.replyPreviewInBubbleMine)
                : (isDarkMode ? styles.replyPreviewInBubbleTheirsDark : styles.replyPreviewInBubbleTheirs),
            ]}
          >
            <View style={[
              styles.replyPreviewBar,
              isMine
                ? (isDarkMode ? styles.replyPreviewBarMineDark : styles.replyPreviewBarMine)
                : styles.replyPreviewBarTheirs,
            ]} />
            <View style={styles.replyPreviewContent}>
              <View style={styles.replyPreviewNameRow}>
                <Ionicons
                  name="arrow-undo-outline"
                  size={12}
                  color={bubbleIconColor}
                  style={styles.replyPreviewNameIcon}
                />
                <Text style={[
                  styles.replyPreviewName,
                  isMine
                    ? (isDarkMode ? styles.replyPreviewNameMineDark : styles.replyPreviewNameMine)
                    : (isDarkMode ? styles.replyPreviewNameTheirsDark : styles.replyPreviewNameTheirs),
                ]} numberOfLines={1}>
                  {repliedMessage.senderId === message.senderId ? 'You' : 'Them'}
                </Text>
              </View>
              <Text style={[
                styles.replyPreviewText,
                isMine 
                  ? (isDarkMode ? styles.replyPreviewTextMineDark : styles.replyPreviewTextMine)
                  : (isDarkMode ? styles.replyPreviewTextTheirsDark : styles.replyPreviewTextTheirs),
                repliedMessage.isViewOnce && { fontStyle: 'italic' }
              ]} numberOfLines={1}>
                {repliedMessage.text || 
                 (repliedMessage.isViewOnce 
                   ? (repliedMessage.mediaType === 'video' ? 'View once video' : 'View once photo')
                   : (repliedMessage.mediaType === 'video' ? '📹 Video' : repliedMessage.mediaUrl ? '📷 Image' : 'Message')
                 )}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {/* Media content (image or video) */}
        {message.mediaUrl && !message.isViewOnce && (
          <TouchableOpacity 
            style={styles.mediaContainer}
            activeOpacity={0.9}
            onPress={() => onMediaPress && onMediaPress(message.mediaUrl, message.mediaType, message.isViewOnce, message.id)}
          >
            {message.mediaType === 'video' ? (
              <View style={styles.videoContainer}>
                <ExpoImage
                  source={{ uri: message.thumbnail || message.mediaUrl }}
                  style={styles.mediaImage}
                  contentFit="cover"
                  cachePolicy="disk"
                />
                <View style={styles.videoPlayOverlay}>
                  <View style={styles.videoPlayButton}>
                    <Ionicons name="play" size={24} color="#fff" />
                  </View>
                </View>
              </View>
            ) : (
              <ExpoImage
                source={{ uri: message.mediaUrl }}
                style={styles.mediaImage}
                contentFit="cover"
                cachePolicy="disk"
              />
            )}
          </TouchableOpacity>
        )}
        {/* View Once Media - never render an actual preview; the real media_url
            is server-stripped from history entirely (see chat.repo.ts) and only
            ever handed out once, at tap time, via the view-once consume flow. */}
        {message.isViewOnce && message.mediaType && (
          (message.viewOnceViewed || viewedOnceMessagesSet.has(message.id)) ? (
            <Text style={[
              bubbleTextStyle,
              styles.viewOnceMessageText,
              { opacity: 0.6 }
            ]}>
              <Ionicons name="eye-off-outline" size={14} color={bubbleIconColor} />
              {' '}Opened
            </Text>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onMediaPress && onMediaPress(message.mediaUrl, message.mediaType, message.isViewOnce, message.id)}
            >
              <Text style={[
                bubbleTextStyle,
                styles.viewOnceMessageText
              ]}>
                <Ionicons name="eye-off" size={14} color={bubbleIconColor} />
                {' '}{message.mediaType === 'video' ? 'View once video' : 'View once photo'}
              </Text>
            </TouchableOpacity>
          )
        )}
        {/* Text content */}
        {message.text ? (
          <Text style={bubbleTextStyle}>
            {message.text}
          </Text>
        ) : null}
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
      </AnimatedMessageBubble>
      </SwipeableMessage>
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
    isOtherUserVerified: paramIsOtherUserVerified,
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
  const onlineLabelOpacity = useRef(new Animated.Value(1)).current;
  // Crossfade the "Online"/"Offline" label instead of an instant text swap.
  useEffect(() => {
    onlineLabelOpacity.setValue(0);
    Animated.timing(onlineLabelOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOnline]);
  const [isActive, setIsActive] = useState(false);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null); // For swipe-to-reply
  const [highlightedMessageId, setHighlightedMessageId] = useState(null); // For highlighting replied message
  const [showScrollToBottom, setShowScrollToBottom] = useState(false); // For scroll to bottom button
  const [newMessageCount, setNewMessageCount] = useState(0); // Count of new messages while scrolled up
  
  // Media sharing state
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]); // Array of { uri, type, fileName, isViewOnce }
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null); // { url, type, isViewOnce, messageId }
  const [viewedOnceMessages, setViewedOnceMessages] = useState(new Set()); // Track viewed view-once messages
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const mediaViewerWidth = useMemo(() => Dimensions.get('window').width, []);

  const normalizeIncomingMessage = useCallback(
    (raw) => {
      if (!raw) return raw;
      const normalizedIsDeleted = Boolean(raw.is_deleted ?? raw.isDeleted);
      const normalizedIsViewOnce = Boolean(raw.isViewOnce ?? raw.is_view_once ?? raw.view_once);
      // Server-authoritative "already viewed" — the real gate. The client's
      // own viewedOnceMessages Set (below) only smooths over the moment
      // between consuming it and the next history refresh; it used to be the
      // ONLY gate, which reset on every remount/app restart.
      const normalizedViewOnceViewed = Boolean(raw.viewOnceViewed ?? raw.view_once_viewed_at);
      return {
        ...raw,
        is_deleted: normalizedIsDeleted,
        isViewOnce: normalizedIsViewOnce,
        viewOnceViewed: normalizedViewOnceViewed,
      };
    },
    []
  );

  const [resolvedViewingMediaUrl, setResolvedViewingMediaUrl] = useState(null);

  const mediaItems = useMemo(() => {
    return (messages || [])
      .map((m) => normalizeIncomingMessage(m))
      .filter((m) => m && !m.is_deleted)
      .filter((m) => !!m.mediaUrl)
      // View-once media should not be part of the swipe gallery
      .filter((m) => !m.isViewOnce)
      .map((m) => ({
        id: m.id,
        url: m.mediaUrl,
        type: m.mediaType || (m.mediaUrl?.includes('.mp4') || m.mediaUrl?.includes('.mov') ? 'video' : 'image'),
        thumbnail: m.thumbnail,
      }));
  }, [messages, normalizeIncomingMessage]);

  const currentGalleryItem = useMemo(() => {
    return mediaItems?.[mediaViewerIndex] || null;
  }, [mediaItems, mediaViewerIndex]);

  const getCacheFileUriForUrl = useCallback(async (url, fallbackExt) => {
    const base = (url || '').split('?')[0];
    const extMatch = base.match(/\.([a-z0-9]+)$/i);
    const ext = (extMatch?.[1] || fallbackExt || 'bin').toLowerCase();
    const dir = `${FileSystem.cacheDirectory}circle_media_cache/`;
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    } catch {}
    const safeName = base.replace(/[^a-z0-9]/gi, '_').slice(-120);
    return `${dir}${safeName}_${Date.now()}.${ext}`;
  }, []);

  const cacheRemoteFileToDisk = useCallback(
    async (url, fallbackExt) => {
      const fileUri = await getCacheFileUriForUrl(url, fallbackExt);
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download failed');
      return result.uri;
    },
    [getCacheFileUriForUrl, token]
  );

  const handleDownloadMedia = useCallback(
    async (url, mediaType) => {
      if (!url) return;

      if (Platform.OS === 'web') {
        try {
          if (typeof document !== 'undefined') {
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
          }
        } catch {}
        try {
          await Linking.openURL(url);
        } catch {}
        return;
      }

      try {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Required', 'Please allow access to Photos to download media.');
          return;
        }

        const fallbackExt = mediaType === 'video' ? 'mp4' : 'jpg';
        const localUri = await cacheRemoteFileToDisk(url, fallbackExt);
        await MediaLibrary.saveToLibraryAsync(localUri);
        Alert.alert('Saved', `${mediaType === 'video' ? 'Video' : 'Image'} downloaded to your gallery.`);
      } catch (e) {
        console.error('❌ Download media failed:', e);
        Alert.alert('Download Failed', e?.message || 'Failed to download media.');
      }
    },
    [cacheRemoteFileToDisk]
  );

  // The only path that ever obtains a view-once message's real media URL —
  // the server strips media_url from all history/broadcast payloads for
  // view-once messages (see chat.repo.ts) and only hands it out here, once,
  // via an atomic server-side consume. This replaces the old approach of
  // just opening the (locally-cached) mediaUrl and telling the server about
  // it afterward — that couldn't actually enforce anything server-side.
  const VIEW_ONCE_ERROR_MESSAGES = {
    already_viewed: 'This view-once media has already been opened and can no longer be viewed.',
    sender_cannot_view: "You already sent this — only the recipient can open it, and only once.",
    not_found: 'This media is no longer available.',
    invalid_request: 'Could not open this media. Please try again.',
    server_error: 'Could not open this media. Please try again.',
  };

  const consumeViewOnceMedia = useCallback((messageId, type) => {
    const socket = token ? getSocket(token) : null;
    if (!socket || !conversationId) {
      Alert.alert('Not Connected', 'Please check your connection and try again.');
      return;
    }

    socket.emit('chat:message:viewed', { chatId: conversationId, messageId }, (response) => {
      if (!response || response.error) {
        if (response?.error === 'already_viewed') {
          setViewedOnceMessages((prev) => new Set([...prev, messageId]));
        }
        Alert.alert(
          'Unavailable',
          VIEW_ONCE_ERROR_MESSAGES[response?.error] || 'Could not open this media.'
        );
        return;
      }

      setViewedOnceMessages((prev) => new Set([...prev, messageId]));
      setViewingMedia({
        url: response.mediaUrl,
        type: response.mediaType || type,
        isViewOnce: true,
        messageId,
      });
      setMediaViewerVisible(true);
    });
  }, [token, conversationId]);

  // Resolve the media viewer's URL and, for regular (non-view-once) videos,
  // cache the remote file to disk for smoother playback. Screenshot
  // protection is NOT toggled here — it's already active for this entire
  // screen whenever it's mounted (see the screen-wide effect below), for
  // every non-exempt user. Toggling it again here was actually a bug: its
  // cleanup called allowScreenCaptureAsync() when the viewer closed, which
  // would have lifted that screen-wide protection early. Marking a message
  // as "viewed" also no longer happens here — consumeViewOnceMedia() already
  // did that atomically on the server before the viewer ever opens.
  useEffect(() => {
    if (!mediaViewerVisible || !viewingMedia) return;

    const active = currentGalleryItem || viewingMedia;
    if (!active?.url) return;

    setResolvedViewingMediaUrl(active.url);

    if (active.type === 'video' && !active.isViewOnce && Platform.OS !== 'web') {
      (async () => {
        try {
          const cachedUri = await cacheRemoteFileToDisk(active.url, 'mp4');
          setResolvedViewingMediaUrl(cachedUri);
        } catch (e) {
          console.warn('⚠️ Video cache failed, using remote URL:', e);
          setResolvedViewingMediaUrl(active.url);
        }
      })();
    }
  }, [mediaViewerVisible, viewingMedia, currentGalleryItem, cacheRemoteFileToDisk]);

  // Cache key for this conversation
  const cacheKey = `@circle:chat_messages:${conversationId}`;
  const CACHE_MAX_MESSAGES = 50; // Cache last 50 messages for fast load

  // Load cached messages on mount for instant display
  useEffect(() => {
    const loadCachedMessages = async () => {
      if (!conversationId) return;
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsedMessages = JSON.parse(cached);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages);
            parsedMessages.forEach((msg) => {
              if (msg.id) processedMessageIdsRef.current.add(msg.id);
            });
            if (parsedMessages.length > 0) {
              setOldestAt(parsedMessages[0].createdAt || null);
            }
          }
        }
      } catch (error) {
        console.warn('[Chat] Failed to load cached messages:', error);
      } finally {
        setIsCacheLoaded(true);
      }
    };
    loadCachedMessages();
  }, [conversationId]);

  // Save messages to cache whenever they change
  const saveMessagesToCache = useCallback(async (messagesToCache) => {
    if (!conversationId || !messagesToCache.length) return;
    try {
      // Only cache the last N messages to keep storage small
      const toCache = messagesToCache.slice(-CACHE_MAX_MESSAGES);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(toCache));
    } catch (error) {
      console.warn('[Chat] Failed to cache messages:', error);
    }
  }, [conversationId, cacheKey]);

  // Debounced cache save
  const cacheTimeoutRef = useRef(null);
  useEffect(() => {
    if (!isCacheLoaded || messages.length === 0) return;
    // Debounce cache saves to avoid excessive writes
    if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    cacheTimeoutRef.current = setTimeout(() => {
      saveMessagesToCache(messages);
    }, 1000);
    return () => {
      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    };
  }, [messages, isCacheLoaded, saveMessagesToCache]);

  const [oldestAt, setOldestAt] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Normalize my user ID to string for consistent comparisons
  const myUserId = user?.id != null ? String(user.id) : null;
  const isScreenshotExempt =
    typeof user?.username === "string" &&
    ["orincore", "karun"].includes(user.username.toLowerCase());
  const typingTimeoutRef = useRef(null);
  const processedMessageIdsRef = useRef(new Set());
  const listRef = useRef(null);
  // Message id -> y-offset within the ScrollView's content, recorded via
  // onLayout on each row. Needed because scrollToIndex (FlatList-only) never
  // worked here — this screen renders messages via `.map()` inside a
  // ScrollView, which has no index-based scrolling API.
  const messagePositionsRef = useRef({});
  const typingIndicatorTimeoutRef = useRef(null);
  const isNearBottomRef = useRef(true); // Track if user is near bottom for auto-scroll
  const hasInitialScrollRef = useRef(false);
  // Track in-flight optimistic sends so we can fail them loudly if the server
  // never confirms (e.g. dropped/blocked) instead of leaving a silent clock.
  const pendingSendTimeoutsRef = useRef(new Map()); // tempId -> setTimeout handle
  const lastOptimisticTempIdRef = useRef(null);

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
  const [otherUserVerified, setOtherUserVerified] = useState(paramIsOtherUserVerified === 'true');

  // Track local system messages like screenshot attempts (not sent to server)
  const [screenshotAttemptCount, setScreenshotAttemptCount] = useState(0);

  // Lavender-to-white (light) / near-black (dark) gradient, replacing the
  // old doodle-pattern wallpaper image for a cleaner, modern look. Light
  // mode starts from a noticeably deeper lavender (not just an off-white
  // tint) so the gradient actually reads as a gradient rather than flat white.
  const backgroundGradient = isDarkMode
    ? ["#241E33", "#150F1F", "#0A0A0D"]
    : ["#D9CCFF", "#EDE6FF", "#FFFFFF"];

  // The swipe-to-reply-vs-scroll gesture conflict this fixes is a mobile
  // touch-arbitration issue; web has no such ambiguity (mouse/wheel scroll
  // doesn't compete with the pan gesture the same way), so use the plain
  // ScrollView there rather than gesture-handler's wrapper.
  const MessageListScrollView = Platform.OS === "web" ? ScrollView : GestureScrollView;

  // Neither KeyboardAvoidingView's "height" behavior nor the manifest's
  // windowSoftInputMode="adjustResize" actually resize anything here —
  // tuning keyboardVerticalOffset made zero observable difference either
  // way, which only happens if the automatic resize path isn't running at
  // all. This app now targets Android 15 (compileSdk/targetSdk 36), which
  // enforces edge-to-edge display; that's a known breaker of the legacy
  // adjustResize mechanism. Bypass it: track the keyboard's own height
  // directly via Keyboard show/hide events and apply it as explicit padding
  // on Android, instead of trusting KeyboardAvoidingView to compute it.
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setAndroidKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const keyboardBehavior = Platform.select({ ios: "padding", default: undefined });
  const keyboardOffset = Platform.select({
    ios: insets.top + 60,
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

  // Handle screenshot attempts: show notice and send a real chat message so both users see it
  const handleScreenshotAttempt = useCallback(() => {
    if (isScreenshotExempt) {
      return;
    }
    const displayName = user?.firstName || user?.first_name || user?.username || "You";

    try {
      Alert.alert(
        "Screenshots restricted",
        "Screenshots are not allowed in this chat."
      );
    } catch (e) {
      // Ignore alert errors
    }

    const socket = token ? getSocket(token) : null;
    if (!socket || !conversationId) {
      return;
    }

    const text = `${displayName} tried to take a screenshot`;
    const tempId = `temp-screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Optimistic local message
    const optimisticMessage = {
      id: tempId,
      text,
      senderId: myUserId,
      chatId: conversationId,
      createdAt: new Date().toISOString(),
      status: "sending",
      reactions: [],
      isOptimistic: true,
      type: "system_screenshot",
    };

    setScreenshotAttemptCount((c) => c + 1);
    setMessages((prev) => [...prev, optimisticMessage]);
    processedMessageIdsRef.current.add(tempId);

    // Ensure we stay at bottom so the divider is visible immediately on sender side
    isNearBottomRef.current = true;
    setShowScrollToBottom(false);
    setTimeout(() => {
      try {
        listRef.current?.scrollToEnd({ animated: true });
      } catch {}
    }, 50);

    try {
      socket.emit("chat:message", {
        chatId: conversationId,
        text,
        tempId,
        // Mark this as a system screenshot message so receivers render it as a divider
        type: "system_screenshot",
      });
    } catch (error) {
      // Mark message as failed if emit throws
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: "failed" } : msg
        )
      );
    }
  }, [user, token, conversationId, myUserId, isScreenshotExempt]);

  // Prevent screenshots while this screen is active and listen for attempts
  useEffect(() => {
    if (isScreenshotExempt) {
      return;
    }

    let subscription;

    const setup = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        // Ignore failures; not all platforms support this
      }

      try {
        subscription = ScreenCapture.addScreenshotListener(() => {
          handleScreenshotAttempt();
        });
      } catch (e) {
        // Ignore listener failures
      }
    };

    setup();

    return () => {
      try {
        ScreenCapture.allowScreenCaptureAsync();
      } catch (e) {
        // Ignore failures
      }

      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      }
    };
  }, [handleScreenshotAttempt, isScreenshotExempt]);

  // Socket setup: join room, history, messages, typing, presence
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    if (!socket || !conversationId) return;

    socket.emit("chat:join", { chatId: conversationId });
    socketService.setCurrentChatId(conversationId);

    // Mark all unread messages as read immediately when opening the chat
    const markAllMessagesAsRead = () => {
      if (!myUserId || !conversationId) return;
      
      // Get all messages from other users that we haven't marked as read yet
      const messagesToMark = messages.filter(msg => {
        if (!msg.id || msg.isOptimistic || String(msg.id).startsWith('temp-')) return false;
        const senderIdStr = msg.senderId != null ? String(msg.senderId) : null;
        return senderIdStr && myUserId && senderIdStr !== myUserId && !sentReceiptsRef.current.has(msg.id);
      });

      if (messagesToMark.length > 0) {
        // Mark them immediately without debounce since this is on chat open
        messagesToMark.forEach(msg => {
          try {
            socket.emit("chat:message:read", { messageId: msg.id, chatId: conversationId });
            sentReceiptsRef.current.add(msg.id);
          } catch {}
        });
        
        // Update unread count service immediately for zero-delay navbar updates
        unreadCountService.clearChatUnreadCount(conversationId);
        
        // Emit local event for other components that might be listening
        socket.emit("chat:local:unread_cleared", { chatId: conversationId, clearedCount: messagesToMark.length });
        
        // Clear the unread banner immediately since we're reading all messages
        setNewMessageCount(0);
      }
    };

    const handleHistory = (data) => {
      if (!data || !Array.isArray(data.messages)) return;
      const sorted = [...data.messages].sort((a, b) => {
        const at = new Date(a.createdAt || 0).getTime();
        const bt = new Date(b.createdAt || 0).getTime();
        return at - bt;
      });
      const deduplicated = deduplicateMessages(sorted)
        .map((msg) => normalizeIncomingMessage(msg))
        .filter((msg) => !msg?.is_deleted) // Filter out deleted messages
        .map((msg) => {
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
      const raw = normalizeIncomingMessage(data.message);
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
      
      // Don't add deleted messages
      if (msg.is_deleted) return;
      
      setMessages((prev) => {
        // Check if this is a confirmation for an optimistic message (tempId match)
        const tempId = data.tempId || raw.tempId;
        if (tempId) {
          const optimisticIndex = prev.findIndex((m) => m.id === tempId);
          if (optimisticIndex !== -1) {
            // Replace optimistic message with real one
            const updated = [...prev];
            updated[optimisticIndex] = { ...msg, isOptimistic: false };
            processedMessageIdsRef.current.add(msg.id);
            clearPendingSendTimeout(tempId);
            return updated;
          }
        }

        // For own messages, check if there's an optimistic message with same text (server didn't return tempId)
        const isMine = msg.senderId != null && String(msg.senderId) === myUserId;
        if (isMine) {
          const optimisticIndex = prev.findIndex(
            (m) => m.isOptimistic && m.text === msg.text && String(m.senderId) === myUserId
          );
          if (optimisticIndex !== -1) {
            // Replace optimistic message with real one
            const updated = [...prev];
            clearPendingSendTimeout(prev[optimisticIndex].id);
            updated[optimisticIndex] = { ...msg, isOptimistic: false };
            processedMessageIdsRef.current.add(msg.id);
            return updated;
          }
        }
        
        // Check for duplicate by real ID
        const exists = prev.some((m) => m.id === msg.id);
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
      // Presence is about the OTHER user; ignore any echo about ourselves.
      if (data.userId != null && String(data.userId) === myUserId) return;

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

    // Sent to the sender's devices when the recipient consumes a view-once
    // message, so the sender's own bubble flips to "Opened" in real time too
    // (they never receive the media URL itself, just this notice).
    const handleViewOnceConsumed = (data) => {
      if (!data || data.chatId !== conversationId || !data.messageId) return;
      setViewedOnceMessages((prev) => new Set([...prev, data.messageId]));
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
      if (!data) return;
      // The send didn't go through — surface it instead of leaving a silent clock.
      failLastPendingSend();

      if (isBlindDate) {
        setBlockedInfoMessage(
          data.message ||
            "In Blind Connect chats, you can't send personal details like phone numbers, social media or email until both of you choose to reveal your profiles."
        );
        setShowBlockedInfoModal(true);
        return;
      }

      // Regular chats: previously this was ignored entirely, so a blocked send
      // looked like "nothing happened". Tell the user why.
      const reason =
        data.reason === "not_friends"
          ? "You can only message people you're connected with."
          : data.reason === "blocked"
          ? "You can't message this user."
          : data.message || "Your message couldn't be sent.";
      Alert.alert("Message not sent", reason);
    };

    const handleMessageError = (data) => {
      failLastPendingSend();
      Alert.alert(
        "Message not sent",
        data?.error || "Something went wrong sending your message. Please try again."
      );
    };

    const handleMessageRateLimited = () => {
      failLastPendingSend();
      Alert.alert(
        "Slow down",
        "You're sending messages too quickly. Please wait a moment and try again."
      );
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
    socket.on("chat:message:view_once_consumed", handleViewOnceConsumed);
    socket.on("chat:reaction:added", handleReactionAdded);
    socket.on("chat:reaction:removed", handleReactionRemoved);
    socket.on("chat:message:blocked", handleMessageBlocked);
    socket.on("chat:message:error", handleMessageError);
    socket.on("chat:message:rate_limited", handleMessageRateLimited);

    // Listen for unread count updates to clear the banner when count becomes 0
    const handleUnreadCountUpdate = ({ chatId, unreadCount }) => {
      if (chatId === conversationId && unreadCount === 0) {
        setNewMessageCount(0);
      }
    };
    socket.on("chat:unread_count", handleUnreadCountUpdate);

    // Mark messages as read after a short delay to ensure messages are loaded
    const readTimeout = setTimeout(markAllMessagesAsRead, 500);

    return () => {
      clearTimeout(readTimeout);
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
      socket.off("chat:message:view_once_consumed", handleViewOnceConsumed);
      socket.off("chat:reaction:added", handleReactionAdded);
      socket.off("chat:reaction:removed", handleReactionRemoved);
      socket.off("chat:message:blocked", handleMessageBlocked);
      socket.off("chat:message:error", handleMessageError);
      socket.off("chat:message:rate_limited", handleMessageRateLimited);
      socket.off("chat:unread_count", handleUnreadCountUpdate);
      socketService.clearCurrentChatId();
      // Cancel any in-flight "no confirmation" timers so they don't fire after unmount.
      pendingSendTimeoutsRef.current.forEach((handle) => clearTimeout(handle));
      pendingSendTimeoutsRef.current.clear();
    };
  }, [conversationId, myUserId, user]);

  // Mark messages as read when they are loaded (separate from socket setup)
  useEffect(() => {
    if (!token || !conversationId || !myUserId || messages.length === 0) return;
    
    const socket = getSocket(token);
    if (!socket) return;

    // Get all messages from other users that we haven't marked as read yet
    const messagesToMark = messages.filter(msg => {
      if (!msg.id || msg.isOptimistic || String(msg.id).startsWith('temp-')) return false;
      const senderIdStr = msg.senderId != null ? String(msg.senderId) : null;
      return senderIdStr && myUserId && senderIdStr !== myUserId && !sentReceiptsRef.current.has(msg.id);
    });

    if (messagesToMark.length > 0) {
      // Mark them immediately without debounce since this is on message load
      messagesToMark.forEach(msg => {
        try {
          socket.emit("chat:message:read", { messageId: msg.id, chatId: conversationId });
          sentReceiptsRef.current.add(msg.id);
        } catch {}
      });
      
      // Update unread count service immediately for zero-delay navbar updates
      unreadCountService.reduceChatUnreadCount(conversationId, messagesToMark.length);
      
      // Emit local event for other components that might be listening
      socket.emit("chat:local:unread_cleared", { chatId: conversationId, clearedCount: messagesToMark.length });
      
      // Clear the unread banner immediately since we're reading all messages
      setNewMessageCount(0);
    }
  }, [messages, token, conversationId, myUserId]);

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

  // Initial Blind Connect status is now fetched via socket in the socket event listener useEffect
  // This ensures real-time updates from the start

  // Track message count for Blind Connect reveal prompt
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

  // Listen for Blind Connect socket events - ALL REAL-TIME UPDATES
  useEffect(() => {
    if (!isBlindDate || !token) return;
    
    const socket = getSocket(token);
    if (!socket) return;
    
    // Fetch blind date status via REST API as fallback
    const fetchBlindDateStatus = async () => {
      try {
        const response = await blindDatingApi.getChatStatus(conversationId, token);
        if (response?.isBlindDate && response?.match) {
          setBlindDateMatch(response.match);
          setHasRevealedSelf(response.hasRevealedSelf || false);
          setOtherHasRevealed(response.otherHasRevealed || false);
          setBothRevealed(response.match.status === 'revealed');
          if (response.otherUserProfile) {
            setOtherUserProfile(response.otherUserProfile);
          }
        }
      } catch (error) {
        console.warn('[Chat] Failed to fetch blind date status:', error);
      }
    };
    
    // Fetch immediately via REST API
    fetchBlindDateStatus();
    
    // Handle status response from socket
    const handleStatusResponse = (data) => {
      if (data?.match) {
        setBlindDateMatch(data.match);
        setHasRevealedSelf(data.hasRevealedSelf || false);
        setOtherHasRevealed(data.otherHasRevealed || false);
        setBothRevealed(data.match.status === 'revealed');
        if (data.otherUserProfile) {
          setOtherUserProfile(data.otherUserProfile);
        }
      }
    };
    
    // Handle reveal success (when I reveal)
    const handleRevealSuccess = (data) => {
      setIsRevealSubmitting(false);
      
      if (data.chatId === conversationId || data.matchId === blindDateMatch?.id) {
        setHasRevealedSelf(true);
        setShowRevealPrompt(false);
        
        if (data.match) {
          setBlindDateMatch(data.match);
        }
        
        if (data.bothRevealed) {
          setBothRevealed(true);
          setOtherHasRevealed(true);
          if (data.otherUser) {
            setOtherUserProfile(data.otherUser);
          }
          if (data.friendshipCreated) {
            setFriendStatus('friends');
            setCanMessage(true);
          }
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
        // Single reveal - banner will show status
      }
    };
    
    // Handle reveal error
    const handleRevealError = (data) => {
      setIsRevealSubmitting(false);
      Alert.alert('Error', data.error || 'Failed to request reveal.');
    };
    
    // When other user reveals their identity (I receive notification)
    const handleRevealRequested = (data) => {
      if (data.chatId === conversationId || data.matchId === blindDateMatch?.id) {
        setOtherHasRevealed(true);
        // Show prompt immediately when other user reveals
        if (!hasRevealedSelf) {
          setShowRevealPrompt(true);
        }
      }
    };
    
    // When both users have revealed - LIVE UPDATE UI (received by both)
    const handleBothRevealed = (data) => {
      if (data.chatId === conversationId || data.matchId === blindDateMatch?.id) {
        // Update all reveal states
        setBothRevealed(true);
        setHasRevealedSelf(true);
        setOtherHasRevealed(true);
        setShowRevealPrompt(false);
        setIsRevealSubmitting(false);
        
        // Update other user's profile with revealed data
        if (data.otherUser) {
          setOtherUserProfile(data.otherUser);
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
    
    // Register all socket event listeners
    socket.on('blind_date:status', handleStatusResponse);
    socket.on('blind_date:reveal:success', handleRevealSuccess);
    socket.on('blind_date:reveal:error', handleRevealError);
    socket.on('blind_date:reveal_requested', handleRevealRequested);
    socket.on('blind_date:revealed', handleBothRevealed);
    
    // Request initial status via socket
    if (conversationId) {
      socket.emit('blind_date:get_status', { chatId: conversationId });
    }
    
    return () => {
      socket.off('blind_date:status', handleStatusResponse);
      socket.off('blind_date:reveal:success', handleRevealSuccess);
      socket.off('blind_date:reveal:error', handleRevealError);
      socket.off('blind_date:reveal_requested', handleRevealRequested);
      socket.off('blind_date:revealed', handleBothRevealed);
    };
  }, [isBlindDate, token, conversationId, blindDateMatch?.id, hasRevealedSelf, router]);

  // Clear the "no confirmation" failure timer for an optimistic message once
  // the server acknowledges/echoes it.
  const clearPendingSendTimeout = (tempId) => {
    if (!tempId) return;
    const handle = pendingSendTimeoutsRef.current.get(tempId);
    if (handle) {
      clearTimeout(handle);
      pendingSendTimeoutsRef.current.delete(tempId);
    }
  };

  // Mark the most recent in-flight optimistic send as failed. Used when the
  // server reports a block/error/rate-limit (those events don't carry a tempId,
  // and there's only ever one send in flight at a time from this composer).
  const failLastPendingSend = () => {
    const tempId = lastOptimisticTempIdRef.current;
    if (!tempId) return;
    clearPendingSendTimeout(tempId);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId && (m.status === "sending" || m.isOptimistic)
          ? { ...m, status: "failed", isOptimistic: false }
          : m
      )
    );
  };

  const handleSend = () => {
    const trimmed = (composer || "").trim();
    if (!trimmed) return;

    const socket = token ? getSocket(token) : null;

    // Hard requirements to send. The recipient is resolved server-side from the
    // chatId, so paramOtherUserId is NOT required here — some entry points open
    // a chat without it. If we genuinely can't send, say so instead of silently
    // doing nothing (which looked like "the button is broken").
    if (
      !token ||
      !socket ||
      !conversationId ||
      conversationId === "chat" ||
      user?.id == null
    ) {
      Alert.alert(
        "Can't send message",
        "You're not connected right now. Check your internet connection and try again."
      );
      return;
    }

    // Frontend friendship gate (UX only; the backend is authoritative and will
    // return chat:message:blocked if messaging isn't allowed).
    if (
      !isBlindDate &&
      !canMessage &&
      paramOtherUserId &&
      String(paramOtherUserId) !== String(user.id)
    ) {
      Alert.alert(
        "Can't message yet",
        "You can only message people you're connected with."
      );
      return;
    }

    setComposer("");

    // When user sends a message, they are effectively at the bottom and have seen new messages
    // Clear any pending new-message banner immediately
    setNewMessageCount(0);

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

    // New message - add optimistic update for instant rendering
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage = {
      id: tempId,
      text: trimmed,
      senderId: myUserId,
      chatId: conversationId,
      createdAt: new Date().toISOString(),
      status: 'sending',
      reactions: [],
      isOptimistic: true,
      reply_to_id: replyToMessage?.id || null, // Include reply reference
    };

    // Add optimistic message immediately for instant UI feedback
    setMessages((prev) => [...prev, optimisticMessage]);
    processedMessageIdsRef.current.add(tempId);
    lastOptimisticTempIdRef.current = tempId;

    // Clear reply state after sending
    const replyId = replyToMessage?.id || null;
    setReplyToMessage(null);

    // Scroll to bottom after adding message and mark as near bottom
    isNearBottomRef.current = true;
    setShowScrollToBottom(false);
    setTimeout(() => {
      try {
        listRef.current?.scrollToEnd({ animated: true });
      } catch {}
    }, 50);

    try {
      socket.emit("chat:message", {
        chatId: conversationId,
        text: trimmed,
        tempId,
        replyToId: replyId, // Send reply reference to backend
      });

      // If the server never echoes the message back (dropped, not connected,
      // unauthenticated, etc.), don't leave it stuck on a clock forever — mark
      // it failed so the user sees it didn't go through.
      const failTimer = setTimeout(() => {
        pendingSendTimeoutsRef.current.delete(tempId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId && (msg.status === "sending" || msg.isOptimistic)
              ? { ...msg, status: "failed", isOptimistic: false }
              : msg
          )
        );
      }, 10000);
      pendingSendTimeoutsRef.current.set(tempId, failTimer);
    } catch (error) {
      // Mark message as failed if emit throws
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  };

  // Media handling functions
  const handlePickMedia = async () => {
    console.log('🎬 handlePickMedia called');
    try {
      console.log('🎬 Calling chatMediaService.pickMedia()...');
      const media = await chatMediaService.pickMedia();
      console.log('🎬 pickMedia returned:', media);
      setShowMediaOptions(false);
      if (media) {
        console.log('🎬 Adding media to preview');
        // Add to selected media for preview
        setSelectedMedia(prev => [...prev, media]);
        setShowMediaPreview(true);
      } else {
        console.log('🎬 No media selected');
      }
    } catch (error) {
      console.error('❌ Media pick error:', error);
      setShowMediaOptions(false);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    console.log('🎬 handleTakePhoto called');
    try {
      console.log('🎬 Calling chatMediaService.takePhoto()...');
      const photo = await chatMediaService.takePhoto();
      console.log('🎬 takePhoto returned:', photo);
      setShowMediaOptions(false);
      if (photo) {
        console.log('🎬 Adding photo to preview');
        // Add to selected media for preview
        setSelectedMedia(prev => [...prev, photo]);
        setShowMediaPreview(true);
      } else {
        console.log('🎬 No photo taken');
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      setShowMediaOptions(false);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePickViewOnceMedia = async () => {
    console.log('🔒 handlePickViewOnceMedia called');
    
    // Check if on web platform
    if (Platform.OS === 'web') {
      Alert.alert(
        'App Only Feature',
        'View Once media is only available on the mobile app for security reasons. Please use the iOS or Android app to send view-once media.',
        [{ text: 'OK' }]
      );
      setShowMediaOptions(false);
      return;
    }
    
    try {
      console.log('🔒 Calling chatMediaService.pickMedia()...');
      const media = await chatMediaService.pickMedia();
      console.log('🔒 pickMedia returned:', media);
      setShowMediaOptions(false);
      if (media) {
        console.log('🔒 Adding view-once media to preview');
        // Mark as view-once
        setSelectedMedia(prev => [...prev, { ...media, isViewOnce: true }]);
        setShowMediaPreview(true);
      } else {
        console.log('🔒 No media selected');
      }
    } catch (error) {
      console.error('❌ View-once media pick error:', error);
      setShowMediaOptions(false);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  const handleAddMoreMedia = async () => {
    try {
      const media = await chatMediaService.pickMedia();
      if (media) {
        setSelectedMedia(prev => [...prev, media]);
      }
    } catch (error) {
      console.error('❌ Media pick error:', error);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  const handleRemoveMedia = (index) => {
    setSelectedMedia(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setShowMediaPreview(false);
      }
      return updated;
    });
  };

  const handleTrimVideo = async (index) => {
    const target = selectedMedia?.[index];
    if (!target || target.type !== 'video') return;

    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Trim not available',
        'Video trimming in preview is currently available on iOS only. On Android, trimming requires an additional native video editor/FFmpeg integration.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setSelectedMedia((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          uri: asset.uri,
          type: 'video',
          fileName: asset.fileName || next[index]?.fileName || `video_${Date.now()}.mp4`,
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
        };
        return next;
      });
    } catch (e) {
      console.error('❌ Trim video failed:', e);
      Alert.alert('Trim Failed', e?.message || 'Failed to trim video.');
    }
  };

  const handleCancelMediaPreview = () => {
    setSelectedMedia([]);
    setShowMediaPreview(false);
  };

  const handleSendMedia = async () => {
    if (!token || !conversationId || !canMessage || selectedMedia.length === 0) return;

    try {
      setIsUploadingMedia(true);
      
      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        setUploadProgress(0);

        // Upload with compression
        const result = await chatMediaService.uploadMedia(
          media.uri,
          media.type,
          token,
          (progress) => {
            const overallProgress = (i + progress) / selectedMedia.length;
            setUploadProgress(overallProgress);
          }
        );

        // Send media message via socket
        const socket = getSocket(token);
        if (!socket) {
          throw new Error('Not connected');
        }

        const tempId = `temp-media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticMessage = {
          id: tempId,
          text: '',
          mediaUrl: result.url,
          mediaType: result.type,
          thumbnail: result.thumbnail,
          senderId: myUserId,
          chatId: conversationId,
          createdAt: new Date().toISOString(),
          status: 'sending',
          reactions: [],
          isOptimistic: true,
          isViewOnce: media.isViewOnce || false,
        };

        // Add optimistic message
        setMessages((prev) => [...prev, optimisticMessage]);
        processedMessageIdsRef.current.add(tempId);

        // Emit to socket
        socket.emit('chat:message', {
          chatId: conversationId,
          text: '',
          mediaUrl: result.url,
          mediaType: result.type,
          thumbnail: result.thumbnail,
          isViewOnce: media.isViewOnce || false,
          tempId,
        });

        console.log(`✅ Media ${i + 1}/${selectedMedia.length} sent:`, result.type);
      }

      // Scroll to bottom after all sent
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd({ animated: true });
        } catch {}
      }, 50);

      // Clear selected media
      setSelectedMedia([]);
      setShowMediaPreview(false);
    } catch (error) {
      console.error('❌ Media upload failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload media. Please try again.');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
    }
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

  // Handle swipe-to-reply
  const handleSwipeReply = useCallback((message) => {
    setReplyToMessage(message);
    // Focus the input (optional haptic feedback could be added here)
  }, []);

  // Handle tap on reply preview to scroll to and highlight the original message
  const handleReplyTap = useCallback((replyToId) => {
    if (!replyToId || !listRef.current) return;

    // Find the replied message so we at least confirm it still exists
    const messageIndex = messages.findIndex(m => m.id === replyToId);
    if (messageIndex === -1) return;

    // This screen renders messages via `.map()` inside a ScrollView (not a
    // FlatList), which has no index-based scrolling API — scroll to the
    // y-offset recorded by that row's onLayout instead.
    const y = messagePositionsRef.current[replyToId];
    if (typeof y === "number") {
      listRef.current.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }

    // Highlight the message
    setHighlightedMessageId(replyToId);
    
    // Remove highlight after 1.5 seconds
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1500);
  }, [messages]);

  // Helper function to format date for dividers
  const formatDateDivider = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    
    // Check if within this week
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Check if same year
    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
    
    // Different year
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  // Helper to get date string for comparison
  const getDateString = useCallback((timestamp) => {
    return new Date(timestamp).toDateString();
  }, []);

  // Find the first unread message from other user
  const firstUnreadMessageId = useMemo(() => {
    if (!messages.length || !myUserId) return null;
    // Find first message from other user that is not read
    for (const msg of messages) {
      const senderIdStr = msg.senderId != null ? String(msg.senderId) : null;
      if (senderIdStr !== myUserId && msg.status !== 'read' && !msg.isOptimistic) {
        return msg.id;
      }
    }
    return null;
  }, [messages, myUserId]);

  const renderItem = ({ item, index }) => {
    const isScreenshotDivider =
      item?.type === "system_screenshot" ||
      (typeof item?.text === "string" &&
        item.text.toLowerCase().includes("tried to take a screenshot"));

    if (isScreenshotDivider) {
      return (
        <View style={styles.dividerContainer}>
          <View
            style={[
              styles.dividerPill,
              {
                backgroundColor: isDarkMode ? "#4B5563" : "#E5E7EB",
              },
            ]}
          >
            <Text
              style={[
                styles.dividerText,
                { color: isDarkMode ? "#F9FAFB" : "#374151" },
              ]}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    }

    const senderIdStr = item.senderId != null ? String(item.senderId) : null;
    const isMine = senderIdStr && myUserId && senderIdStr === myUserId;
    // Same reveal-aware display name the header uses, so the in-bubble
    // "Room Chat" style header row shows the same name as the screen title.
    const otherDisplayName =
      (bothRevealed && otherUserProfile?.first_name) || (isBlindDate && otherUserProfile?.first_name)
        ? `${otherUserProfile.first_name} ${otherUserProfile.last_name || ''}`.trim()
        : conversationName;
    const isSelected = selectedMessageIds.includes(item.id);
    const isEditing = editingMessage && editingMessage.id === item.id;
    const isHighlighted = highlightedMessageId === item.id;
    
    // Check if we need to show date divider
    const currentDate = getDateString(item.createdAt);
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const prevDate = prevMessage ? getDateString(prevMessage.createdAt) : null;
    const showDateDivider = !prevMessage || currentDate !== prevDate;
    
    // Check if this is the first unread message
    const showUnreadDivider = item.id === firstUnreadMessageId;
    
    return (
      <View>
        {/* Date Divider */}
        {showDateDivider && (
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerPill, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
              <Text style={[styles.dividerText, { color: isDarkMode ? '#D1D5DB' : '#6B7280' }]}>
                {formatDateDivider(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        
        {/* Unread Messages Divider */}
        {showUnreadDivider && (
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerPill, styles.unreadDividerPill]}>
              <Text style={styles.unreadDividerText}>Unread Messages</Text>
            </View>
          </View>
        )}
        
          <MessageBubble
            message={item}
            isMine={isMine}
            senderName={isMine ? "You" : otherDisplayName}
            onSwipeReply={handleSwipeReply}
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
            allMessages={messages}
            isDarkMode={isDarkMode}
            onReplyTap={handleReplyTap}
            isHighlighted={isHighlighted}
            onMediaPress={(url, type, isViewOnce, messageId) => {
              if (isViewOnce) {
                if (Platform.OS === 'web') {
                  Alert.alert(
                    'App Only Feature',
                    'View Once media can only be viewed on the mobile app. Please use the iOS or Android app to view this media.',
                    [{ text: 'OK' }]
                  );
                  return;
                }

                if (viewedOnceMessages.has(messageId)) {
                  Alert.alert(
                    'Already Viewed',
                    'This view-once media has already been opened and can no longer be viewed.',
                    [{ text: 'OK' }]
                  );
                  return;
                }

                consumeViewOnceMedia(messageId, type);
                return;
              }

              const idx = mediaItems.findIndex((m) => m.url === url || m.id === messageId);
              if (idx >= 0) setMediaViewerIndex(idx);
              setViewingMedia({ url, type, isViewOnce, messageId });
              setMediaViewerVisible(true);
            }}
            viewedOnceMessages={viewedOnceMessages}
          />
      </View>
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

  // Blind Connect reveal handlers - USE SOCKET for real-time updates
  const handleRevealProfile = async () => {
    if (!conversationId || isRevealSubmitting || hasRevealedSelf) return;
    
    const socket = token ? getSocket(token) : null;
    if (!socket) {
      Alert.alert('Error', 'Connection not available. Please try again.');
      return;
    }
    
    setIsRevealSubmitting(true);
    
    // Use cached match ID or fetch it via socket
    let matchId = blindDateMatch?.id;
    if (!matchId) {
      // Request status via socket first
      socket.emit('blind_date:get_status', { chatId: conversationId });
      // Wait a bit for response, or use REST as fallback
      try {
        const statusResult = await blindDatingApi.getChatStatus(conversationId, token);
        const data = statusResult?.data || statusResult;
        matchId = data?.match?.id;
        if (data?.match) {
          setBlindDateMatch(data.match);
        }
      } catch (e) {
        // Silent fail - fallback status fetch failed
      }
    }
    
    if (!matchId) {
      Alert.alert('Error', 'Could not find Blind Connect match information.');
      setIsRevealSubmitting(false);
      return;
    }
    
    // Send reveal request via socket for real-time response
    socket.emit('blind_date:request_reveal', { 
      matchId, 
      chatId: conversationId 
    });
    
    // The response will be handled by the socket event listeners
    // Set a timeout to reset submitting state if no response
    setTimeout(() => {
      setIsRevealSubmitting(false);
    }, 10000);
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
      
      // Instantly remove deleted message from UI
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      
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

  // Track the last message ID to detect actual new messages (not just status updates)
  const lastMessageIdRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const isLoadingOlderRef = useRef(false);
  
  // Auto-scroll to bottom ONLY when a new message is added at the END - not on status updates or older messages
  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;
    
    // Don't scroll if we're loading older messages
    if (loadingMore || isLoadingOlderRef.current) {
      lastMessageIdRef.current = messages[messages.length - 1]?.id;
      lastMessageCountRef.current = messages.length;
      return;
    }
    
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id;
    
    // Check if this is a new message at the END (not older messages loaded at the beginning)
    // A new message means: different last message ID AND the message count increased
    const isNewMessageAtEnd = lastMessageId !== lastMessageIdRef.current && 
                              messages.length > lastMessageCountRef.current;
    
    if (isNewMessageAtEnd) {
      if (isNearBottomRef.current) {
        // User is near bottom - scroll to show new message
        try {
          setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } catch {}
        // Reset new message count since we're scrolling to bottom
        setNewMessageCount(0);
      } else {
        // User is scrolled up - increment new message counter
        setNewMessageCount((prev) => prev + 1);
      }
    }
    
    // Update refs
    lastMessageIdRef.current = lastMessageId;
    lastMessageCountRef.current = messages.length;
  }, [messages, loadingMore]);

  // On initial load of this conversation, ensure we start at the latest (bottom) message
  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;
    if (hasInitialScrollRef.current) return;

    hasInitialScrollRef.current = true;
    try {
      // Small delay to allow layout to settle before scrolling
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 50);
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

  // Fetch other user's verification status using the same endpoint
  // as [userId].jsx and the self profile tab
  useEffect(() => {
    if (!token || !paramOtherUserId || isBlindDate) return;
    
    const fetchVerificationStatus = async () => {
      try {
        const { API_BASE_URL } = await import('@/src/api/config');
        const response = await fetch(`${API_BASE_URL}/api/friends/user/${paramOtherUserId}/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.verification_status === 'verified') {
            setOtherUserVerified(true);
          }
        }
      } catch (error) {
        // Silent fail - verification badge just won't show
      }
    };
    
    fetchVerificationStatus();
  }, [token, paramOtherUserId, isBlindDate]);

  // If myUserId changes after initial mount, ensure we don't show myself as typing
  useEffect(() => {
    if (!typingUsers.length) return;
    setTypingUsers((prev) => prev.filter((id) => id && id !== myUserId));
  }, [myUserId]);

  // Also auto-scroll when typing indicator appears - only if user is near bottom.
  // scrollToEnd() here used to fire in the same tick as the state change that
  // mounts <TypingIndicator>, before the ScrollView had actually re-measured
  // its content to include the indicator's height — so it scrolled to the
  // PREVIOUS bottom (last message), leaving the indicator just off-screen.
  // A short delay lets that layout pass land first.
  useEffect(() => {
    if (typingUsers.length === 0) return;
    if (!isNearBottomRef.current) return;
    const timeout = setTimeout(() => {
      try {
        listRef.current?.scrollToEnd({ animated: true });
      } catch {}
    }, 80);
    return () => clearTimeout(timeout);
  }, [typingUsers.length]);

  // Emit delivery/read receipts when other user's messages become visible
  // Use a Set to track which messages we've already sent receipts for
  const sentReceiptsRef = useRef(new Set());
  const receiptQueueRef = useRef([]);
  const receiptTimeoutRef = useRef(null);
  
  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };
  const onViewableItemsChanged = React.useCallback(
    ({ viewableItems }) => {
      const socket = token ? getSocket(token) : null;
      if (!socket || !conversationId || !myUserId) return;
      
      // Collect message IDs that need receipts
      const messageIdsToMark = [];
      viewableItems.forEach((vi) => {
        const item = vi.item;
        if (!item || !item.id) return;
        // Skip optimistic messages (they have temp IDs)
        if (item.isOptimistic || String(item.id).startsWith('temp-')) return;
        // Skip if we already sent receipt for this message
        if (sentReceiptsRef.current.has(item.id)) return;
        
        const senderIdStr = item.senderId != null ? String(item.senderId) : null;
        if (senderIdStr && myUserId && senderIdStr !== myUserId) {
          messageIdsToMark.push(item.id);
          sentReceiptsRef.current.add(item.id);
        }
      });
      
      if (messageIdsToMark.length === 0) return;
      
      // Add to queue and debounce
      receiptQueueRef.current.push(...messageIdsToMark);
      
      // Clear existing timeout and set new one
      if (receiptTimeoutRef.current) clearTimeout(receiptTimeoutRef.current);
      receiptTimeoutRef.current = setTimeout(() => {
        const uniqueIds = [...new Set(receiptQueueRef.current)];
        receiptQueueRef.current = [];
        
        // Send receipts in batch - only emit chat:message:read (which handles both)
        uniqueIds.forEach((messageId) => {
          try {
            socket.emit("chat:message:read", { messageId, chatId: conversationId });
          } catch {}
        });
        
        // Update unread count service immediately for zero-delay navbar updates
        if (uniqueIds.length > 0) {
          unreadCountService.reduceChatUnreadCount(conversationId, uniqueIds.length);
          socket.emit("chat:local:unread_cleared", { chatId: conversationId, clearedCount: uniqueIds.length });
        }
      }, 100); // Debounce 100ms for faster response
    },
    [token, conversationId, myUserId]
  );

  // Debounce ref for load more to prevent rapid calls
  const loadMoreTimeoutRef = useRef(null);
  const lastLoadTimeRef = useRef(0);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (receiptTimeoutRef.current) {
        clearTimeout(receiptTimeoutRef.current);
      }
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
      // Clear the sent receipts set when leaving the chat
      sentReceiptsRef.current.clear();
    };
  }, []);
  
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !conversationId || !token) return;
    
    // Debounce: prevent loading more than once per second
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 1000) return;
    lastLoadTimeRef.current = now;

    // Mark that we're loading older messages to prevent auto-scroll
    isLoadingOlderRef.current = true;
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
        // Add older messages smoothly
        setMessages((prev) => deduplicateMessages([...olderAsc, ...prev]));
        setOldestAt(olderAsc[0].createdAt || oldestAt);
      }
    } catch (error) {
      // Silent fail for now
    }

    // Small delay before hiding loader for smoother UX
    setTimeout(() => {
      setLoadingMore(false);
      // Reset the loading older flag after a short delay
      setTimeout(() => {
        isLoadingOlderRef.current = false;
      }, 200);
    }, 300);
  }, [loadingMore, hasMore, conversationId, token, oldestAt]);

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (!contentOffset || !contentSize || !layoutMeasurement) return;
    
    // Calculate distance from bottom
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    
    // Track if user is near bottom (within 100px) for auto-scroll decision
    isNearBottomRef.current = distanceFromBottom < 100;
    
    // Show scroll to bottom button when user scrolls up more than 200px from bottom
    setShowScrollToBottom(distanceFromBottom > 200);
    
    // Load more when near top (scrolled up) - with debounce
    if (contentOffset.y < 150 && !loadingMore && hasMore) {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
      loadMoreTimeoutRef.current = setTimeout(() => {
        loadMore();
      }, 200);
    }
  }, [loadMore, loadingMore, hasMore]);

  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      isNearBottomRef.current = true;
      listRef.current.scrollToEnd({ animated: true });
      setShowScrollToBottom(false);
      setNewMessageCount(0); // Reset new message counter
    }
  }, [messages.length]);

  return (
    <LinearGradient
      colors={backgroundGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      locations={[0, 0.35, 1]}
      style={styles.root}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      {/* Top safe area for header - transparent so the gradient shows through */}
      <SafeAreaView
        style={[styles.safeArea, { flex: 0, backgroundColor: "transparent" }]}
        edges={['top']}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: "transparent",
              backgroundColor: "transparent",
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.surface }]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/secure/(tabs)/match');
              }
            }}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ position: 'relative' }}
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
                  <View style={{ overflow: 'hidden', borderRadius: 12 }}>
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
                  : isBlindDate && otherUserProfile?.first_name
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
            {isBlindDate && !bothRevealed && (blindDateInfo || otherUserProfile) ? (
              <Text
                style={[styles.headerSubtitle, { color: theme.primary }]}
                numberOfLines={1}
              >
                {[
                  blindDateInfo?.matchReason ? `Looking for ${blindDateInfo.matchReason}` : (otherUserProfile?.needs ? `Looking for ${otherUserProfile.needs}` : null),
                  blindDateInfo?.gender || otherUserProfile?.gender ? (blindDateInfo?.gender || otherUserProfile?.gender).charAt(0).toUpperCase() + (blindDateInfo?.gender || otherUserProfile?.gender).slice(1) : null,
                  blindDateInfo?.age || otherUserProfile?.age ? `${blindDateInfo?.age || otherUserProfile?.age} yrs` : null,
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
            ) : isBlindDate ? (
              <Text
                style={[styles.headerSubtitle, { color: theme.primary }]}
                numberOfLines={1}
              >
                Blind Connect • Anonymous Chat
              </Text>
            ) : (
              <Animated.View
                style={{ flexDirection: "row", alignItems: "center", opacity: onlineLabelOpacity }}
              >
                {isOnline && (
                  <View style={[styles.onlineStatusDotInline, { backgroundColor: theme.success }]} />
                )}
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: isOnline ? theme.success : theme.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </Animated.View>
            )}
          </View>
        </View>
        
        {/* Blind Connect Reveal Status Banner */}
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
      <SafeAreaView
        style={[styles.safeArea, Platform.OS === "android" && { paddingBottom: androidKeyboardHeight }]}
        edges={['bottom']}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={keyboardBehavior}
          keyboardVerticalOffset={keyboardOffset}
        >
          <MessageListScrollView
            ref={listRef}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {messages.map((item, index) => (
              <View
                key={item.id || index}
                onLayout={(e) => {
                  if (item.id) messagePositionsRef.current[item.id] = e.nativeEvent.layout.y;
                }}
              >
                {renderItem({ item, index })}
              </View>
            ))}

            <TypingIndicator visible={typingUsers.length > 0} avatarUrl={avatarUrl} />
          </MessageListScrollView>

          {/* Scroll to bottom floating button with new message badge */}
          {showScrollToBottom && (
            <TouchableOpacity
              style={[styles.scrollToBottomButton, { backgroundColor: isDarkMode ? '#FFFFFF' : '#111111' }]}
              onPress={scrollToBottom}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-down" size={22} color={isDarkMode ? '#111111' : '#FFFFFF'} />
              {newMessageCount > 0 && (
                <View style={[styles.newMessageBadge, { borderColor: isDarkMode ? '#0B0B0F' : '#FFFFFF' }]}>
                  <Text style={styles.newMessageBadgeText}>
                    {newMessageCount > 99 ? '99+' : newMessageCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <View
            style={[styles.composerContainer, { borderTopColor: "transparent" }]}
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
            {/* Reply preview banner */}
            {replyToMessage && (
              <View style={[
                styles.replyBanner,
                { backgroundColor: isDarkMode ? '#2D2D3A' : '#F3F4F6' }
              ]}>
                <View style={styles.replyBannerBar} />
                <View style={styles.replyBannerContent}>
                  <Text style={[
                    styles.replyBannerLabel,
                    { color: isDarkMode ? '#A78BFA' : '#7C3AED' }
                  ]}>
                    Replying to {replyToMessage.senderId === myUserId ? 'yourself' : conversationName}
                  </Text>
                  <Text style={[
                    styles.replyBannerText,
                    { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
                    replyToMessage.isViewOnce && { fontStyle: 'italic' }
                  ]} numberOfLines={1}>
                    {replyToMessage.text || 
                     (replyToMessage.isViewOnce 
                       ? (replyToMessage.mediaType === 'video' ? 'View once video' : 'View once photo')
                       : (replyToMessage.mediaType === 'video' ? '📹 Video' : replyToMessage.mediaUrl ? '📷 Image' : 'Message')
                     )}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.replyBannerClose}
                  onPress={() => setReplyToMessage(null)}
                >
                  <Ionicons name="close" size={20} color={isDarkMode ? '#9CA3AF' : '#666'} />
                </TouchableOpacity>
              </View>
            )}
            {/* Sending indicator - smooth animated fill, no percentage text */}
            {isUploadingMedia && (
              <MediaSendingIndicator progress={uploadProgress} label="Sending..." />
            )}
            
            {/* Media preview section */}
            {showMediaPreview && selectedMedia.length > 0 && (
              <View style={[styles.mediaPreviewContainer, { backgroundColor: isDarkMode ? '#1F1F2E' : '#F9FAFB' }]}>
                <View style={styles.mediaPreviewHeader}>
                  <Text style={[styles.mediaPreviewTitle, { color: isDarkMode ? '#FFFFFF' : '#1F2937' }]}>
                    {selectedMedia.length} {selectedMedia.length === 1 ? 'item' : 'items'} selected
                  </Text>
                  <TouchableOpacity onPress={handleCancelMediaPreview}>
                    <Ionicons name="close" size={24} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.mediaPreviewScroll}
                  contentContainerStyle={styles.mediaPreviewScrollContent}
                >
                  {selectedMedia.map((media, index) => (
                    <View key={index} style={styles.mediaPreviewItem}>
                      <Image
                        source={{ uri: media.uri }}
                        style={styles.mediaPreviewImage}
                        resizeMode="cover"
                      />
                      {media.type === 'video' && (
                        <View style={styles.mediaPreviewVideoIcon}>
                          <Ionicons name="play-circle" size={24} color="#fff" />
                        </View>
                      )}
                      {media.type === 'video' && (
                        <TouchableOpacity
                          style={styles.mediaPreviewTrim}
                          onPress={() => handleTrimVideo(index)}
                        >
                          <Ionicons name="cut-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.mediaPreviewRemove}
                        onPress={() => handleRemoveMedia(index)}
                      >
                        <Ionicons name="close-circle" size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={[styles.mediaPreviewAddMore, { borderColor: isDarkMode ? '#374151' : '#D1D5DB' }]}
                    onPress={handleAddMoreMedia}
                  >
                    <Ionicons name="add" size={28} color={theme.primary} />
                    <Text style={[styles.mediaPreviewAddMoreText, { color: theme.primary }]}>Add</Text>
                  </TouchableOpacity>
                </ScrollView>
                <View style={styles.mediaPreviewActions}>
                  <TouchableOpacity
                    style={[styles.mediaPreviewSendButton, { backgroundColor: theme.primary }]}
                    onPress={handleSendMedia}
                    disabled={isUploadingMedia}
                  >
                    {isUploadingMedia ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="send" size={18} color="#fff" />
                        <Text style={styles.mediaPreviewSendText}>Send</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.composerInner}>
              {/* Media attachment button - black/white circular pill, "Room Chat" style */}
              <TouchableOpacity
                style={[styles.attachButton, !canMessage && styles.attachButtonDisabled]}
                onPress={() => setShowMediaOptions(true)}
                disabled={!canMessage || isUploadingMedia}
              >
                <View style={[
                  styles.attachButtonInner,
                  { backgroundColor: isDarkMode ? '#FFFFFF' : '#111111' }
                ]}>
                  <Ionicons
                    name="add"
                    size={22}
                    color={isDarkMode ? '#111111' : '#FFFFFF'}
                  />
                </View>
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.textPrimary,
                    backgroundColor: theme.surfaceSecondary,
                  },
                ]}
                value={composer}
                onChangeText={handleComposerChange}
                placeholder={
                  canMessage
                    ? "Type message..."
                    : "You can only message users you are friends with"
                }
                placeholderTextColor={theme.textPlaceholder}
                multiline
                onKeyPress={handleKeyPress}
                editable={canMessage && !isUploadingMedia}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!composer.trim() || !canMessage || isUploadingMedia) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!composer.trim() || !canMessage || isUploadingMedia}
              >
                <View style={[styles.sendButtonInner, { backgroundColor: isDarkMode ? '#FFFFFF' : '#111111' }]}>
                  <Feather
                    name="send"
                    size={17}
                    color={isDarkMode ? '#111111' : '#FFFFFF'}
                  />
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Media options modal */}
            <Modal
              visible={showMediaOptions}
              transparent
              animationType="slide"
              onRequestClose={() => setShowMediaOptions(false)}
            >
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
                activeOpacity={1}
                onPress={() => setShowMediaOptions(false)}
              >
                <TouchableOpacity 
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={{ backgroundColor: isDarkMode ? '#1F1F2E' : '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                      Share Media
                    </Text>
                    
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
                      onPress={handlePickMedia}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED20', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                        <Ionicons name="images-outline" size={24} color="#7C3AED" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                          Photo & Video Library
                        </Text>
                        <Text style={{ fontSize: 14, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                          Choose from your gallery
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
                      onPress={handleTakePhoto}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                        <Ionicons name="camera-outline" size={24} color="#10B981" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                          Take Photo
                        </Text>
                        <Text style={{ fontSize: 14, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                          Use your camera
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
                      onPress={handlePickViewOnceMedia}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                        <Ionicons name="eye-off-outline" size={24} color="#EF4444" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                          View Once Media
                        </Text>
                        <Text style={{ fontSize: 14, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                          Can only be viewed once (App only)
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{ borderTopWidth: 1, borderTopColor: isDarkMode ? '#374151' : '#E5E7EB', paddingTop: 15, marginTop: 10, alignItems: 'center' }}
                      onPress={() => setShowMediaOptions(false)}
                    >
                      <Text style={{ fontSize: 16, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

            {/* Media viewer modal */}
            <Modal
              visible={mediaViewerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setMediaViewerVisible(false)}
            >
              <View style={styles.mediaViewerOverlay}>
                {/* Never offer to save view-once media — the whole point is
                    it's gone after this one viewing. */}
                {currentGalleryItem && !viewingMedia?.isViewOnce && (
                  <TouchableOpacity
                    style={styles.mediaViewerDownloadButton}
                    onPress={() => handleDownloadMedia(currentGalleryItem.url, currentGalleryItem.type)}
                  >
                    <Ionicons name="download-outline" size={26} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.mediaViewerCloseButton}
                  onPress={() => setMediaViewerVisible(false)}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                {/* view-once media is deliberately excluded from mediaItems
                    (it's not part of the swipeable gallery), and its viewer
                    open never sets mediaViewerIndex — so gate on isViewOnce
                    explicitly here, otherwise a chat with any regular media
                    at all would render the FlatList gallery (showing some
                    unrelated stale item) instead of the actual consumed
                    view-once content. */}
                {!viewingMedia?.isViewOnce && mediaItems.length > 0 ? (
                  <FlatList
                    data={mediaItems}
                    horizontal
                    pagingEnabled
                    style={{ flex: 1, width: '100%' }}
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={Math.min(Math.max(mediaViewerIndex, 0), Math.max(mediaItems.length - 1, 0))}
                    getItemLayout={(_, index) => ({ length: mediaViewerWidth, offset: mediaViewerWidth * index, index })}
                    keyExtractor={(item) => String(item.id || item.url)}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                    onViewableItemsChanged={({ viewableItems }) => {
                      const first = viewableItems?.[0];
                      if (first?.index != null) {
                        setMediaViewerIndex(first.index);
                      }
                    }}
                    renderItem={({ item }) => (
                      <View style={[styles.mediaViewerPage, { width: mediaViewerWidth }]}>
                        {item.type === 'video' ? (
                          <ChatVideoPlayer
                            key={(currentGalleryItem?.id === item.id ? (resolvedViewingMediaUrl || item.url) : item.url)}
                            uri={(currentGalleryItem?.id === item.id ? (resolvedViewingMediaUrl || item.url) : item.url)}
                            style={styles.mediaViewerVideo}
                            autoPlay={currentGalleryItem?.id === item.id}
                          />
                        ) : (
                          <ExpoImage
                            source={{ uri: item.url }}
                            style={styles.mediaViewerImage}
                            contentFit="contain"
                            cachePolicy="disk"
                          />
                        )}
                      </View>
                    )}
                  />
                ) : (
                  viewingMedia && (
                    <View style={styles.mediaViewerContent}>
                      {viewingMedia.type === 'video' ? (
                        <ChatVideoPlayer
                          key={resolvedViewingMediaUrl || viewingMedia.url}
                          uri={resolvedViewingMediaUrl || viewingMedia.url}
                          style={styles.mediaViewerVideo}
                          autoPlay
                        />
                      ) : (
                        <ExpoImage
                          source={{ uri: viewingMedia.url }}
                          style={styles.mediaViewerImage}
                          contentFit="contain"
                          cachePolicy="disk"
                        />
                      )}
                    </View>
                  )
                )}
              </View>
            </Modal>
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
              {/* Reply option */}
              <TouchableOpacity
                style={styles.actionsSheetButton}
                onPress={() => {
                  setReplyToMessage(actionMessage);
                  setShowMessageActions(false);
                  setActionMessage(null);
                }}
              >
                <Text style={[styles.actionsSheetText, { color: '#7C3AED' }]}>Reply</Text>
              </TouchableOpacity>
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
              <Text style={styles.blockedModalTagText}>Blind Connect safety</Text>
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
                "In Blind Connect chats, messages with personal details like phone numbers, social media or email are blocked until both of you choose to reveal your profiles."}
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

      {/* Blind Connect Reveal Prompt Modal */}
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
    </LinearGradient>
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
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerInfo: {
    flex: 1,
  },
  headerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 12,
    marginRight: 8,
  },
  headerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 12,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineStatusDotInline: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
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
    position: "relative",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowTheirs: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    // Without this, children (header row, message text) default to
    // alignItems:'stretch' and get stretched to the bubble's shrink-to-fit
    // width instead of measuring at their own natural size — that
    // stretch-then-relayout round trip is what caused short text (e.g. a
    // URL) to wrap onto a second line even though the bubble looked wide
    // enough. flex-start makes every child size to its own content instead.
    alignItems: "flex-start",
  },
  myMessageBubble: {
    // Background (near-black / white in dark mode) comes from AnimatedMessageBubble.
    borderTopRightRadius: 4,
  },
  theirMessageBubble: {
    // Background (white / dark surface in dark mode) comes from AnimatedMessageBubble.
    borderTopLeftRadius: 4,
  },
  myMessageText: {
    fontSize: 15,
    color: "#fff",
  },
  myMessageTextDark: {
    color: "#111111",
  },
  theirMessageText: {
    fontSize: 15,
    color: "#111111",
  },
  theirMessageTextDark: {
    color: "#F1F5F9",
  },
  bubbleHeaderRow: {
    // Deliberately NOT justifyContent:'space-between' and NOT width:'100%'.
    // This row sits inside a bubble that shrink-wraps to whichever is wider
    // (header vs. message text). Both of those properties feed back into
    // that shrink-to-fit sizing pass ambiguously — space-between alone made
    // short messages wrap to two lines (bubble width got locked to the
    // header's own ill-defined intrinsic size); adding width:'100%' to try
    // to fix that instead made EVERY sent bubble stretch edge-to-edge
    // (percentages on a child of an auto-sized parent make the whole
    // ancestor chain's width indefinite, which flex-end resolves by
    // stretching — received bubbles use justifyContent:'flex-start' and
    // happened not to visibly hit this, but it's the same underlying
    // ambiguity). A fixed gap (bubbleHeaderRight's marginLeft) makes the
    // row's natural width a deterministic sum instead — no percentages,
    // no space-between, no ambiguity.
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bubbleHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  bubbleSenderName: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  bubbleTimeText: {
    fontSize: 11,
  },
  viewOnceMessageText: {
    fontStyle: 'italic',
    opacity: 0.9,
  },
  // Media message styles
  mediaContainer: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  videoContainer: {
    position: 'relative',
    width: 200,
    height: 200,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  videoPlayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  viewOnceIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  viewOnceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  composerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  composerInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16, // rounded-square, matching send/attach/avatar buttons
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 8,
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendButtonInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  // Attach button styles
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attachButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachButtonDisabled: {
    opacity: 0.4,
  },

  // Media preview styles
  mediaPreviewContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  mediaPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  mediaPreviewScroll: {
    marginBottom: 12,
  },
  mediaPreviewScrollContent: {
    paddingRight: 12,
  },
  mediaPreviewItem: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  mediaPreviewVideoIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  mediaPreviewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 11,
  },
  mediaPreviewAddMore: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreviewAddMoreText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  mediaPreviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  mediaPreviewSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mediaPreviewSendText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Date and Unread Dividers - WhatsApp/Instagram style
  dividerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dividerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  unreadDividerPill: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
  },
  unreadDividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Above the composer
    width: 44,
    height: 44,
    borderRadius: 16, // rounded-square, matching send/attach/avatar buttons
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 100,
  },
  newMessageBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444', // Red badge
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
  },
  newMessageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Loading more messages indicator
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  loadingMoreText: {
    fontSize: 13,
    marginLeft: 10,
    fontWeight: '500',
  },
  noMoreMessagesText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
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
  messageBubbleHighlighted: {
    backgroundColor: '#FEF3C7', // Light yellow highlight
    borderWidth: 2,
    borderColor: '#F59E0B', // Amber border
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
  // Swipe-to-reply styles
  replyIconContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    zIndex: 1,
  },
  replyIconLeft: {
    left: 8,
  },
  replyIconRight: {
    right: 8,
  },
  replyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Reply preview inside message bubble - nested card, quoting the original
  replyPreviewInBubble: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // "Mine" bubble is near-black in light mode / white in dark mode (see
  // AnimatedMessageBubble), so its reply-preview overlay/bar/text need to
  // invert too - a dark overlay that worked on the old light lilac bubble
  // would be invisible against black.
  replyPreviewInBubbleMine: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)', // light overlay on black bubble
  },
  replyPreviewInBubbleTheirs: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)', // Light purple tint on white bubble
  },
  replyPreviewInBubbleMineDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)', // dark overlay on white bubble (dark mode)
  },
  replyPreviewInBubbleTheirsDark: {
    backgroundColor: 'rgba(124, 58, 237, 0.18)', // purple tint on dark surface bubble
  },
  replyPreviewBar: {
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  replyPreviewBarMine: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // visible on black bubble (light mode)
  },
  replyPreviewBarMineDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // visible on white bubble (dark mode)
  },
  replyPreviewBarTheirs: {
    backgroundColor: '#7C3AED', // Purple accent, visible on white/dark-surface bubble
  },
  replyPreviewContent: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  replyPreviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyPreviewNameIcon: {
    marginRight: 4,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyPreviewNameMine: {
    color: 'rgba(255, 255, 255, 0.85)', // light mode: on black bubble
  },
  replyPreviewNameTheirs: {
    color: '#7C3AED', // Purple for their messages
  },
  replyPreviewText: {
    fontSize: 13,
  },
  replyPreviewTextMine: {
    color: 'rgba(255, 255, 255, 0.75)', // light mode: on black bubble
  },
  replyPreviewTextTheirs: {
    color: '#111111',
  },
  replyPreviewNameMineDark: {
    color: '#111111', // dark mode: on white bubble
  },
  replyPreviewNameTheirsDark: {
    color: '#C4B5FD', // lighter purple for legibility on dark surface
  },
  replyPreviewTextMineDark: {
    color: '#111111', // dark mode: on white bubble
  },
  replyPreviewTextTheirsDark: {
    color: '#F1F5F9', // light text on dark surface bubble
  },
  // Reply banner in composer
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  replyBannerBar: {
    width: 3,
    height: '100%',
    minHeight: 32,
    backgroundColor: '#7C3AED',
    borderRadius: 2,
    marginRight: 10,
  },
  replyBannerContent: {
    flex: 1,
  },
  replyBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 2,
  },
  replyBannerText: {
    fontSize: 13,
    color: '#6B7280',
  },
  replyBannerClose: {
    padding: 4,
    marginLeft: 8,
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
  // Upload progress styles
  // Media viewer styles
  mediaViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  mediaViewerDownloadButton: {
    position: 'absolute',
    top: 50,
    right: 64,
    zIndex: 10,
    padding: 10,
  },
  mediaViewerContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerPage: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerImage: {
    width: '100%',
    height: '80%',
  },
  mediaViewerVideo: {
    width: '100%',
    height: '80%',
  },
});

