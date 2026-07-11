import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import * as ScreenCapture from "expo-screen-capture";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ensureImagePickerMediaLibraryPermission, ensureMediaLibraryPermission } from "@/utils/permissionGate";
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
import { useJamSession } from "@/contexts/JamSessionContext";
import JamMiniPlayerBar from "@/src/components/jam/JamMiniPlayerBar";
import { getSocket, socketService } from "@/src/api/socket";
import { chatApi } from "@/src/api/chat";
import { reportsApi } from "@/src/api/reports";
import { unreadCountService } from "@/src/services/unreadCountService";
import { blindDatingApi } from "@/src/api/blindDating";
import ReactionPicker from "@/src/components/ReactionPicker";
import { chatMediaService } from "@/src/services/chatMediaService";
import { LinearGradient } from "expo-linear-gradient";
import TypingIndicator from "@/components/chat/TypingIndicator";
import MediaSendingIndicator from "@/components/chat/MediaSendingIndicator";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatSearchBar from "@/components/chat/ChatSearchBar";
import RevealBanners from "@/components/chat/RevealBanners";
import ScrollToBottomButton from "@/components/chat/ScrollToBottomButton";
import SelectionToolbar from "@/components/chat/SelectionToolbar";
import ComposerBanners from "@/components/chat/ComposerBanners";
import MediaPreviewStrip from "@/components/chat/MediaPreviewStrip";
import ComposerInputBar from "@/components/chat/ComposerInputBar";
import MediaOptionsSheet from "@/components/chat/MediaOptionsSheet";
import MediaViewerModal from "@/components/chat/MediaViewerModal";
import QuickReactionRow from "@/components/chat/QuickReactionRow";
import MessageActionsSheet from "@/components/chat/MessageActionsSheet";
import ReportMessageModal from "@/components/chat/ReportMessageModal";
import BlockedInfoModal from "@/components/chat/BlockedInfoModal";
import RevealPromptModal from "@/components/chat/RevealPromptModal";
import { styles } from "@/components/chat/chatConversationStyles";
import {
  VIEW_ONCE_ERROR_MESSAGES,
  CACHE_MAX_MESSAGES,
  REVEAL_THRESHOLD,
  REVEAL_INTERVAL,
  mergeStatus,
  deduplicateMessages,
} from "@/components/chat/chatConversationHelpers";

import MessageBubble from "@/components/chat/MessageBubble";

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
    isMemeConnect: paramIsMemeConnect,
  } = useLocalSearchParams();
  const { token, user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { session: jamSession, isExpanded: isJamExpanded, startSession: startJamSession, setIsExpanded: setJamExpanded, setActiveChat } = useJamSession();
  // Mirrors JamMiniPlayerBar's own visibility condition -- when the bar is showing above
  // the composer, the floating scroll-to-bottom button (fixed-positioned relative to the
  // composer) needs to float higher too, or it renders on top of the bar instead of above it.
  const showJamBarAboveComposer = !!(jamSession && jamSession.status !== 'ended' && !isJamExpanded);

  const conversationId = typeof id === "string" ? id : "chat";

  // Fallback hydration for when this screen opens with only a chatId and no
  // name/avatar/otherUserId params -- e.g. a notification tap, which only
  // ever carries chatId (+ sometimes senderId/senderAvatar, but not every
  // notification type includes those, and other entry points may pass none
  // of it at all). Without this, the header silently rendered the
  // "Conversation" placeholder / no avatar forever, since nothing else in
  // this screen ever re-fetches that info once mounted.
  const [hydratedOtherUser, setHydratedOtherUser] = useState(null); // { id, name, avatar }
  useEffect(() => {
    const hasName = typeof name === "string" && name.trim();
    const hasAvatar = typeof avatar === "string" && avatar.trim();
    if (hasName && hasAvatar && paramOtherUserId) return; // already fully specified
    if (!token || !conversationId || conversationId === "chat") return;
    // Blind date / meme-connect identity is intentionally withheld until a
    // reveal and is hydrated by their own reveal-driven flows elsewhere in
    // this file -- fetching real members here would leak it early.
    if (paramIsBlindDate === 'true' || paramIsMemeConnect === 'true') return;
    let cancelled = false;
    (async () => {
      try {
        const { members } = await chatApi.getMembers(conversationId, token);
        if (cancelled || !Array.isArray(members)) return;
        const other = members.find((m) => String(m.user_id) !== String(user?.id));
        if (!other) return;
        const fullName = `${other.first_name || ''} ${other.last_name || ''}`.trim();
        setHydratedOtherUser({
          id: other.user_id,
          name: fullName || other.username || null,
          avatar: other.profile_photo_url || null,
        });
      } catch (error) {
        console.error('Failed to hydrate chat header info:', error);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, token, paramIsBlindDate, paramIsMemeConnect]);

  const conversationName =
    (typeof name === "string" && name.trim()) ? name : (hydratedOtherUser?.name || "Conversation");
  const avatarUrl =
    (typeof avatar === "string" && avatar.trim()) ? avatar.trim() : (hydratedOtherUser?.avatar || null);
  const resolvedOtherUserId = paramOtherUserId || hydratedOtherUser?.id || null;

  // Tells the (now app-global) JamSessionContext which chat is currently being viewed, so
  // it knows which chat's session to check/track — see setActiveChat's own comment for why
  // this doesn't tear down an ALREADY-ongoing session in a different chat just because the
  // user opened this one to read messages.
  useEffect(() => {
    setActiveChat({ chatId: conversationId, otherUserId: resolvedOtherUserId, otherUserName: conversationName });
  }, [conversationId, resolvedOtherUserId, conversationName, setActiveChat]);
  
  // Blind date info
  const isBlindDate = paramIsBlindDate === 'true';
  const blindDateInfo = isBlindDate ? {
    matchReason: blindDateMatchReason || '',
    gender: blindDateGender || '',
    age: blindDateAge ? parseInt(blindDateAge, 10) : null,
  } : null;

  // Anonymous meme-feed connect-request chat -- a separate, lighter-weight
  // anonymity flow from Blind Dating (no auto-matching, no message filtering,
  // just a reveal-request banner until both sides choose to reveal).
  const isMemeConnect = paramIsMemeConnect === 'true';
  const [memeConnectRequest, setMemeConnectRequest] = useState(null);
  const [revealingMemeConnect, setRevealingMemeConnect] = useState(false);

  const loadMemeConnectRequest = useCallback(async () => {
    if (!isMemeConnect || !token) return null;
    try {
      const { feedApi } = await import('@/src/api/feed');
      const res = await feedApi.getConnectRequests(token);
      const all = [...(res?.incoming || []), ...(res?.outgoing || [])];
      const match = all.find(r => r.chat_id === conversationId) || null;
      setMemeConnectRequest(match);
      return match;
    } catch (e) {
      console.error('Failed to load meme connect request for chat:', e);
      return null;
    }
  }, [isMemeConnect, token, conversationId]);

  const memeConnectBothRevealed = !!memeConnectRequest?.revealed_at;
  const memeConnectSelfRevealed = memeConnectRequest && user?.id
    ? (memeConnectRequest.requester_id === user.id ? memeConnectRequest.requester_revealed : memeConnectRequest.target_revealed)
    : false;
  // handleMemeConnectReveal and its supporting reveal logic are defined
  // further down, right after bothRevealed/otherUserProfile state exists
  // (they need to set that state directly -- see the comment there).

  const [messages, setMessages] = useState([]);
  // Mirrors `messages` for renderItem to read without being a dependency of
  // it -- renderItem is passed to FlashList, which treats a changed
  // renderItem identity as a signal to re-render currently-visible cells, so
  // closing over `messages` directly there would thrash on every send/receive
  // (see renderItem below and the useCallback deps comment near it).
  const messagesRef = useRef([]);
  messagesRef.current = messages;
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

  // In-chat message search state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  // Backend-driven search results (id/text/createdAt only) -- searches the
  // chat's full lifetime history, not just whatever page is currently loaded
  // into `messages` via pagination. Oldest-first, same convention as before.
  const [searchMatches, setSearchMatches] = useState([]);
  const [isHydratingSearchMatch, setIsHydratingSearchMatch] = useState(false);
  
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
        const perm = await ensureMediaLibraryPermission();
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
  const typingIndicatorTimeoutRef = useRef(null);
  const isNearBottomRef = useRef(true); // Track if user is near bottom for auto-scroll
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

  // Both-sides-revealed animation: a brief crossfade/pop on the header
  // avatar + name (masked -> real) plus a transient "revealed" toast,
  // instead of a blocking Alert.alert stealing focus the instant both
  // sides reveal. revealAnim drives both the header content opacity/scale
  // and the toast; justRevealed gates rendering the animated (heavier,
  // dual-image-crossfade) header content only during that window.
  const [justRevealed, setJustRevealed] = useState(false);
  const revealAnim = useRef(new Animated.Value(1)).current;
  const revealToastAnim = useRef(new Animated.Value(0)).current;
  const playRevealAnimation = useCallback(() => {
    setJustRevealed(true);
    revealAnim.setValue(0);
    revealToastAnim.setValue(0);
    Animated.parallel([
      Animated.timing(revealAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(revealToastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(revealToastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => setJustRevealed(false));
  }, [revealAnim, revealToastAnim]);

  // Once both sides have revealed a meme-connect chat, fetch the (no-longer-
  // anonymous) other user's real profile and feed it into the same
  // otherUserProfile/bothRevealed state Blind Dating's header already
  // renders from -- that header logic doesn't actually gate its name/avatar
  // fallback on isBlindDate, just bothRevealed + otherUserProfile, so reusing
  // it here means the header updates instantly with no meme-connect-specific
  // header code needed.
  const applyMemeConnectRevealedProfile = useCallback(async (request) => {
    if (!request?.revealed_at || !user?.id || !token) return;
    const otherUserId = request.requester_id === user.id ? request.target_id : request.requester_id;
    if (!otherUserId) return;
    try {
      const { API_BASE_URL } = await import('@/src/api/config');
      const response = await fetch(`${API_BASE_URL}/api/friends/user/${otherUserId}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data) return;
      setOtherUserProfile({
        id: data.id,
        first_name: data.firstName,
        last_name: data.lastName,
        profile_photo_url: data.profilePhotoUrl,
        gender: data.gender,
        age: data.age,
        needs: Array.isArray(data.needs) ? data.needs[0] : null,
        is_verified: data.verification_status === 'verified',
      });
      setBothRevealed(true);
    } catch (e) {
      console.error('Failed to load revealed profile for meme connect:', e);
    }
  }, [user?.id, token]);

  // Sync bothRevealed/otherUserProfile on mount too, not just reactively
  // when a reveal happens live during this session -- opening a
  // meme-connect chat that was ALREADY fully revealed in a past session
  // otherwise left bothRevealed stuck false forever (nothing else ever set
  // it), so the header kept showing the masked name/blurred photo even
  // though memeConnectBothRevealed (from memeConnectRequest.revealed_at)
  // was correctly true and the reveal button was correctly hidden.
  useEffect(() => {
    loadMemeConnectRequest().then((match) => {
      if (match?.revealed_at) {
        applyMemeConnectRevealedProfile(match);
      }
    });
  }, [loadMemeConnectRequest, applyMemeConnectRevealedProfile]);

  const handleMemeConnectReveal = async () => {
    if (!memeConnectRequest || revealingMemeConnect) return;
    try {
      setRevealingMemeConnect(true);
      const { feedApi } = await import('@/src/api/feed');
      const res = await feedApi.requestReveal(memeConnectRequest.id, token);
      if (res?.request) {
        setMemeConnectRequest(res.request);
        if (res.request.revealed_at) {
          await applyMemeConnectRevealedProfile(res.request);
          playRevealAnimation();
        }
      }
    } catch (e) {
      console.error('Failed to request reveal:', e);
    } finally {
      setRevealingMemeConnect(false);
    }
  };

  // Live updates for the meme-connect reveal flow: the other party revealing
  // (banner should update without reopening the chat) and both sides
  // revealing (header should update instantly on both ends, per above).
  useEffect(() => {
    if (!isMemeConnect || !token || !conversationId) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handleRevealRequestedMC = (data) => {
      if (data?.chatId !== conversationId) return;
      const iAmRequester = memeConnectRequest?.requester_id === user?.id;
      const selfAlreadyRevealed = iAmRequester
        ? memeConnectRequest?.requester_revealed
        : memeConnectRequest?.target_revealed;

      setMemeConnectRequest(prev => {
        if (!prev) return prev;
        const iAmReq = prev.requester_id === user?.id;
        return iAmReq ? { ...prev, target_revealed: true } : { ...prev, requester_revealed: true };
      });

      // Same "they revealed, want to reveal too?" prompt Blind Dating
      // already shows automatically -- meme-connect used to just flip the
      // flag silently and rely on the person noticing the banner text.
      if (!selfAlreadyRevealed) {
        Alert.alert(
          `${conversationName} revealed their identity!`,
          'Do you want to reveal yours too? Once you both reveal, your real names and photos become visible to each other.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Reveal', onPress: handleMemeConnectReveal },
          ]
        );
      }
    };

    const handleRevealedMC = async (data) => {
      if (data?.chatId !== conversationId) return;
      const match = await loadMemeConnectRequest();
      if (match?.revealed_at) {
        await applyMemeConnectRevealedProfile(match);
        playRevealAnimation();
      }
    };

    socket.on('meme_connect:reveal_requested', handleRevealRequestedMC);
    socket.on('meme_connect:revealed', handleRevealedMC);

    return () => {
      socket.off('meme_connect:reveal_requested', handleRevealRequestedMC);
      socket.off('meme_connect:revealed', handleRevealedMC);
    };
  }, [isMemeConnect, token, conversationId, user?.id, loadMemeConnectRequest, applyMemeConnectRevealedProfile, memeConnectRequest, conversationName]);

  // Single entry point for the header-right reveal button -- shown for
  // either anonymous chat type, before this user has revealed themself.
  // Blind Dating already has a full reveal modal (see showRevealPrompt
  // below); meme-connect only ever had a one-tap banner button with no
  // confirmation step, so this adds one for parity -- revealing your
  // identity isn't something to trigger by accident.
  const canRevealFromHeader =
    (isBlindDate && !bothRevealed && !hasRevealedSelf) ||
    (isMemeConnect && !memeConnectBothRevealed && !memeConnectSelfRevealed);

  const handleHeaderRevealPress = () => {
    if (isBlindDate) {
      setShowRevealPrompt(true);
      return;
    }
    if (isMemeConnect) {
      Alert.alert(
        'Reveal your identity?',
        `${conversationName} will be notified and can choose to reveal too. Once you both reveal, your real names and photos become visible to each other.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reveal', onPress: handleMemeConnectReveal },
        ]
      );
    }
  };

  const [reportAdditionalDetails, setReportAdditionalDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [canMessage, setCanMessage] = useState(() => {
    if (isBlindDate) return true;
    if (!resolvedOtherUserId) return true;
    if (user?.id != null && String(resolvedOtherUserId) === String(user.id)) return true;
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

    // socket.io rooms are cleared on every disconnect, including brief transport blips
    // ("transport close" + auto-retry, which happens routinely on mobile networks) — the
    // one-shot emit above only joins the room for the CURRENT connection. Without rejoining
    // here, a client that silently reconnected would keep sending its own messages fine
    // (those are direct emits) while going deaf to every io.to(room) broadcast — chat
    // messages, and critically every jam:* event (playback state, pause-on-presence-loss,
    // presence updates) — with no visible error, which reads as "out of sync" or "stuck
    // showing stale presence" until the screen is closed and reopened.
    const rejoinOnReconnect = () => socket.emit("chat:join", { chatId: conversationId });
    socket.on("connect", rejoinOnReconnect);

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

      // chat:history always carries only the newest page (server-side, this is
      // a hardcoded `getChatMessages(chatId, 30, ...)`), and this handler fires
      // on every rejoin -- not just the first load: mobile sockets reconnect
      // routinely (see the rejoinOnReconnect comment above) and re-emit
      // chat:join each time. A plain overwrite here used to wipe out every
      // older page the user had already scrolled back through via loadMore,
      // silently truncating history back to the newest 30 (breaking mark-as-read
      // for anything scrolled past) and regressing `oldestAt` so `loadMore`'s
      // `!hasMore` guard could get stuck. Merge instead: fresh rows win for any
      // message we already had (keeps reactions/status in sync), older
      // pagination-loaded messages outside this page are preserved.
      setMessages((prev) => {
        if (prev.length === 0) return deduplicated;
        const freshIds = new Set(deduplicated.map((m) => m.id));
        const keptOlder = prev.filter((m) => !freshIds.has(m.id));
        const merged = [...keptOlder, ...deduplicated].sort((a, b) => {
          const at = new Date(a.createdAt || 0).getTime();
          const bt = new Date(b.createdAt || 0).getTime();
          return at - bt;
        });
        return deduplicateMessages(merged);
      });
      deduplicated.forEach((msg) => {
        if (msg.id) {
          processedMessageIdsRef.current.add(msg.id);
        }
      });

      if (deduplicated.length > 0) {
        const incomingOldest = deduplicated[0].createdAt || null;
        setOldestAt((prev) => {
          if (!prev) return incomingOldest;
          if (!incomingOldest) return prev;
          // A rejoin's fresh page is always the newest N messages -- never let
          // it regress the oldest boundary we've already established via
          // scroll-back pagination.
          return new Date(incomingOldest).getTime() < new Date(prev).getTime()
            ? incomingOldest
            : prev;
        });
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
      socket.off("connect", rejoinOnReconnect);
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
    // Note: `user` itself is never dereferenced in this effect's body, only
    // `myUserId` (derived from `user.id`) is. AuthContext replaces `user` with
    // a new object on every setUser(...) call, which used to re-run this
    // whole effect (tear down socket listeners, re-emit chat:join) any time
    // that fired while a chat screen was open -- contributing to the
    // history-truncation issue handleHistory's merge above now guards against.
  }, [conversationId, myUserId]);

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
          playRevealAnimation();
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

        playRevealAnimation();
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
  }, [isBlindDate, token, conversationId, blindDateMatch?.id, hasRevealedSelf, router, playRevealAnimation]);

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

  // useCallback so this doesn't get recreated (and force ComposerInputBar to
  // re-render) on every unrelated parent re-render -- see the comment on
  // handleComposerChange above for why that matters here.
  const handleSend = useCallback(() => {
    const trimmed = (composer || "").trim();
    if (!trimmed) return;

    const socket = token ? getSocket(token) : null;

    // Hard requirements to send. The recipient is resolved server-side from the
    // chatId, so resolvedOtherUserId is NOT required here — some entry points open
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
      resolvedOtherUserId &&
      String(resolvedOtherUserId) !== String(user.id)
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
  }, [
    composer,
    token,
    conversationId,
    user,
    myUserId,
    isBlindDate,
    canMessage,
    resolvedOtherUserId,
    editingMessage,
    replyToMessage,
  ]);

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
      const perm = await ensureImagePickerMediaLibraryPermission();
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

  const handleAddReaction = useCallback(async (messageId, emoji) => {
    if (!token || !messageId || !emoji) return;

    // Optimistic local update so the reaction toggles immediately instead of
    // waiting on the chat:reaction:added/removed round-trip below -- tapping
    // your own reaction pill removes it, tapping any other emoji adds it.
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = msg.reactions || [];
        const exists = reactions.some(
          (r) => r && r.userId === myUserId && r.emoji === emoji
        );
        if (exists) {
          return {
            ...msg,
            reactions: reactions.filter(
              (r) => !(r && r.userId === myUserId && r.emoji === emoji)
            ),
          };
        }
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
  }, [token, myUserId, conversationId]);

  // id -> message lookup, rebuilt only when `messages` itself changes (not on
  // every render) — used for O(1) reply-preview resolution inside each bubble
  // (instead of an O(n) `.find()` per bubble, per render) and to resolve a
  // message id into the actual item object FlashList's scrollToItem needs.
  const messagesById = React.useMemo(() => {
    const map = new Map();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);
  const messagesByIdRef = useRef(messagesById);
  messagesByIdRef.current = messagesById;

  const scrollToMessageId = useCallback((messageId) => {
    const item = messageId ? messagesById.get(messageId) : null;
    if (!item || !listRef.current) return;
    try {
      listRef.current.scrollToItem({ item, animated: true, viewPosition: 0.5 });
    } catch {}
  }, [messagesById]);

  // Handle swipe-to-reply
  const handleSwipeReply = useCallback((message) => {
    setReplyToMessage(message);
    // Focus the input (optional haptic feedback could be added here)
  }, []);

  // Handle tap on reply preview to scroll to and highlight the original message
  const handleReplyTap = useCallback((replyToId) => {
    if (!replyToId || !messagesById.has(replyToId)) return;

    scrollToMessageId(replyToId);

    // Highlight the message
    setHighlightedMessageId(replyToId);

    // Remove highlight after 1.5 seconds
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1500);
  }, [messagesById, scrollToMessageId]);

  // In-chat message search: previously this filtered only the `messages`
  // array already loaded client-side via pagination (~30-50 messages), so
  // anything scrolled past silently became unsearchable. Now backed by
  // GET /chat/:chatId/messages/search, which queries the full history.
  // Matches are sorted oldest-first (same convention as before: index 0 is
  // the oldest match, the last index is the most recent).
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || !conversationId || !token) {
      setSearchMatches([]);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const { messages: results } = await chatApi.searchMessages(conversationId, q, token);
        if (cancelled) return;
        const ascending = [...results].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setSearchMatches(ascending);
        setSearchMatchIndex(ascending.length > 0 ? ascending.length - 1 : 0);
      } catch (error) {
        if (!cancelled) setSearchMatches([]);
      }
    }, 300); // debounce while the user is still typing
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery, conversationId, token]);

  const currentSearchMatchId = searchMatches[searchMatchIndex]?.id ?? null;

  // Scroll to (and highlight, via the same mechanism as reply-tap) whichever
  // message is currently selected in the search results. A match found via
  // full-history search may not be in the currently-loaded `messages` page
  // at all -- when that's the case, hydrate a window of messages around it
  // first (merged into `messages` the same way loadMore/chat:history do),
  // then scroll once it's actually present for FlashList to measure.
  useEffect(() => {
    if (!searchVisible || !currentSearchMatchId) return;
    if (messagesById.has(currentSearchMatchId)) {
      scrollToMessageId(currentSearchMatchId);
      return;
    }
    if (!conversationId || !token) return;
    let cancelled = false;
    setIsHydratingSearchMatch(true);
    (async () => {
      try {
        const { messages: around } = await chatApi.getMessagesAround(conversationId, currentSearchMatchId, token);
        if (cancelled || !around.length) return;
        const normalized = around.map((msg) => normalizeIncomingMessage(msg));
        setMessages((prev) => {
          const merged = deduplicateMessages([...prev, ...normalized]).sort(
            (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
          );
          return merged;
        });
        const earliest = normalized.reduce(
          (min, m) => (m.createdAt && (!min || m.createdAt < min) ? m.createdAt : min),
          null
        );
        if (earliest) {
          setOldestAt((prev) => (!prev || earliest < new Date(prev).getTime() ? earliest : prev));
        }
        // Let the merged state commit and FlashList lay out the new rows
        // before asking it to scroll to one of them.
        setTimeout(() => {
          if (!cancelled) scrollToMessageId(currentSearchMatchId);
        }, 50);
      } catch (error) {
        // Silent: the match stays selected, just doesn't auto-scroll.
      } finally {
        if (!cancelled) setIsHydratingSearchMatch(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentSearchMatchId, searchVisible, conversationId, token, messagesById, scrollToMessageId]);

  const goToPreviousSearchMatch = useCallback(() => {
    setSearchMatchIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToNextSearchMatch = useCallback(() => {
    setSearchMatchIndex((i) => Math.min(searchMatches.length - 1, i + 1));
  }, [searchMatches.length]);

  const closeSearch = useCallback(() => {
    setSearchVisible(false);
    setSearchQuery("");
    setSearchMatchIndex(0);
  }, []);

  // Helper function to format date for dividers
  const formatDateDivider = useCallback((timestamp) => {
    const date = new Date(timestamp);
    // An unparseable timestamp doesn't throw -- it silently renders the
    // literal string "Invalid Date" as the divider label instead.
    if (Number.isNaN(date.getTime())) return '';
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

  // Stable per-bubble handlers, shared by every row via the same function
  // reference across renders (the message/id is passed in at call time by
  // MessageBubble itself) -- required for MessageBubble's React.memo to
  // actually hold. Passing a fresh inline closure per row per render, as
  // renderItem used to, would give React.memo a new prop reference every
  // time regardless of memoization on the component itself.
  const handleDoubleTapMessage = useCallback((message) => {
    setReactionTarget(message);
  }, []);

  const handleLongPressMessage = useCallback((message) => {
    // The actions sheet is a native Modal (see render below), which presents
    // in its own layer above the keyboard, so no dismiss-timing dance is
    // needed here -- just close the keyboard for a cleaner look.
    Keyboard.dismiss();
    setActionMessage(message);
    setShowMessageActions(true);
  }, []);

  const handleMediaPressMessage = useCallback((url, type, isViewOnce, messageId) => {
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
  }, [viewedOnceMessages, consumeViewOnceMedia, mediaItems]);

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

  const renderItem = useCallback(({ item, index }) => {
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
    const isHighlighted = highlightedMessageId === item.id || (searchVisible && currentSearchMatchId === item.id);

    // Check if we need to show date divider. Reads from messagesRef (not the
    // `messages` state directly) so this closure doesn't need `messages` as
    // a dependency below -- see the comment on messagesRef's declaration.
    const currentDate = getDateString(item.createdAt);
    const prevMessage = index > 0 ? messagesRef.current[index - 1] : null;
    const prevDate = prevMessage ? getDateString(prevMessage.createdAt) : null;
    const showDateDivider = !prevMessage || currentDate !== prevDate;

    // Check if this is the first unread message
    const showUnreadDivider = item.id === firstUnreadMessageId;

    // O(1) lookup instead of scanning the whole message list per bubble.
    const repliedMessage = item.reply_to_id ? messagesByIdRef.current.get(item.reply_to_id) : null;

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
            myUserId={myUserId}
            onSwipeReply={handleSwipeReply}
            onReact={handleAddReaction}
            onDoubleTap={handleDoubleTapMessage}
            onLongPress={handleLongPressMessage}
            isSelected={isSelected}
            isEditing={!!isEditing}
            selectionMode={selectionMode}
            onToggleSelect={toggleSelectMessage}
            replyToMessage={repliedMessage}
            isDarkMode={isDarkMode}
            onReplyTap={handleReplyTap}
            isHighlighted={isHighlighted}
            onMediaPress={handleMediaPressMessage}
            viewedOnceMessages={viewedOnceMessages}
          />
      </View>
    );
  }, [
    isDarkMode,
    myUserId,
    bothRevealed,
    otherUserProfile,
    isBlindDate,
    conversationName,
    selectedMessageIds,
    editingMessage,
    highlightedMessageId,
    searchVisible,
    currentSearchMatchId,
    getDateString,
    firstUnreadMessageId,
    formatDateDivider,
    handleSwipeReply,
    handleAddReaction,
    handleDoubleTapMessage,
    handleLongPressMessage,
    toggleSelectMessage,
    handleReplyTap,
    handleMediaPressMessage,
    viewedOnceMessages,
  ]);

  const emitTyping = useCallback((isTyping) => {
    const socket = token ? getSocket(token) : null;
    if (!socket || !conversationId) return;
    try {
      socket.emit("chat:typing", {
        chatId: conversationId,
        isTyping,
        typing: isTyping,
      });
    } catch {}
  }, [token, conversationId]);

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

  // useCallback (rather than a plain function, like the "stable no-dep
  // callbacks" further below) so ComposerInputBar's React.memo actually gets
  // a stable onComposerChange/onSend/onKeyPress across unrelated re-renders
  // (a new message arriving, typing indicator from the other user, upload
  // progress ticking, etc.) instead of new closures forcing it to re-render
  // on every parent render regardless of whether the composer changed.
  const handleComposerChange = useCallback((text) => {
    setComposer(text);
    // Start typing
    emitTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1500);
  }, [emitTyping]);

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

  const handleKeyPress = useCallback((e) => {
    if (Platform.OS !== "web") return;
    const key = e?.nativeEvent?.key || e?.key;
    const shift = !!(e?.nativeEvent?.shiftKey ?? e?.shiftKey);
    if (key === "Enter" && !shift) {
      e.preventDefault?.();
      handleSend();
    }
  }, [handleSend]);

  const handleStartEdit = () => {
    if (!actionMessage) return;
    const senderIdStr =
      actionMessage.senderId != null ? String(actionMessage.senderId) : null;
    if (!myUserId || senderIdStr !== myUserId || actionMessage.sharedMemeId) {
      setShowMessageActions(false);
      setActionMessage(null);
      return;
    }
    setEditingMessage(actionMessage);
    setComposer(actionMessage.text || "");
    setShowMessageActions(false);
  };

  const toggleSelectMessage = useCallback((messageId) => {
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
  }, []);

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
  
  // Track new messages ONLY to drive the "N new messages" scroll-to-bottom
  // badge when the user has scrolled away from the bottom. Actually keeping
  // the view pinned to the bottom as new messages arrive is handled by
  // FlashList's own `maintainVisibleContentPosition.autoscrollToBottomThreshold`
  // (see the FlashList props below) -- that's the library's dedicated,
  // tested mechanism for exactly this, including the case where async
  // content (avatars/media/reaction pills) keeps resolving after the
  // message first mounts. Driving our own scrollToOffset/scrollToEnd here
  // as well would just race against it, which is the same kind of
  // uncoordinated-scroll-commands bug that caused the visible jitter this
  // migration is fixing in the first place.
  useEffect(() => {
    if (messages.length === 0) return;

    // Don't count if we're loading older messages
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
        // User is near bottom - FlashList keeps it pinned automatically.
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

    if (!token || !resolvedOtherUserId || !user?.id) {
      if (!resolvedOtherUserId || (user?.id != null && String(resolvedOtherUserId) === String(user.id))) {
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
    socket.emit('friend:status:get', { userId: resolvedOtherUserId });

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
  }, [token, resolvedOtherUserId, user?.id, friendStatus]);

  // Fetch other user's verification status using the same endpoint
  // as [userId].jsx and the self profile tab
  useEffect(() => {
    if (!token || !resolvedOtherUserId || isBlindDate) return;
    
    const fetchVerificationStatus = async () => {
      try {
        const { API_BASE_URL } = await import('@/src/api/config');
        const response = await fetch(`${API_BASE_URL}/api/friends/user/${resolvedOtherUserId}/profile`, {
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
  }, [token, resolvedOtherUserId, isBlindDate]);

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

  // Debounce guard for load more to prevent rapid calls (FlashList's
  // onStartReached can fire more than once in quick succession).
  const lastLoadTimeRef = useRef(0);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (receiptTimeoutRef.current) {
        clearTimeout(receiptTimeoutRef.current);
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

      const olderAsc = [...older]
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .map((msg) => normalizeIncomingMessage(msg));

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

  // Pagination (loading older messages, prepended at the start of `messages`)
  // is handled by FlashList's own onStartReached below instead of a manual
  // "near top" scroll check.
  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (!contentOffset || !contentSize || !layoutMeasurement) return;

    // Calculate distance from bottom
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

    // Track if user is near bottom (within 100px) for auto-scroll decision
    isNearBottomRef.current = distanceFromBottom < 100;

    // Show scroll to bottom button when user scrolls up more than 200px from bottom
    setShowScrollToBottom(distanceFromBottom > 200);
  }, []);

  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      isNearBottomRef.current = true;
      listRef.current.scrollToEnd({ animated: true });
      setShowScrollToBottom(false);
      setNewMessageCount(0); // Reset new message counter
    }
  }, [messages.length]);

  // Stable no-dependency callbacks for the extracted presentational
  // components below -- these only ever call setState setters (which React
  // guarantees are referentially stable), so wrapping them here (instead of
  // as fresh inline closures in the JSX every render) is what actually lets
  // each component's React.memo bail out on unrelated re-renders (e.g. a
  // composer keystroke) rather than recreating and diffing them every time.
  const closeSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  }, []);
  const cancelEditingMessage = useCallback(() => {
    setEditingMessage(null);
    setComposer("");
  }, []);
  const cancelReplyToMessage = useCallback(() => setReplyToMessage(null), []);
  const openMediaOptions = useCallback(() => setShowMediaOptions(true), []);
  const closeMediaOptions = useCallback(() => setShowMediaOptions(false), []);
  const closeMediaViewer = useCallback(() => setMediaViewerVisible(false), []);
  const closeQuickReaction = useCallback(() => setReactionTarget(null), []);
  const openAllReactionsFromQuickRow = useCallback(() => setShowAllReactions(true), []);
  const closeMessageActionsSheet = useCallback(() => {
    setShowMessageActions(false);
    setActionMessage(null);
  }, []);
  const closeBlockedInfoModal = useCallback(() => setShowBlockedInfoModal(false), []);

  const reactFromQuickRow = useCallback((emoji) => {
    handleAddReaction(reactionTarget.id, emoji);
    setReactionTarget(null);
    setShowAllReactions(false);
  }, [reactionTarget, handleAddReaction]);

  const reactFromActionsSheet = useCallback((emoji) => {
    handleAddReaction(actionMessage.id, emoji);
    setShowMessageActions(false);
    setActionMessage(null);
  }, [actionMessage, handleAddReaction]);
  const openAllReactionsFromActionsSheet = useCallback(() => {
    setReactionTarget(actionMessage);
    setShowAllReactions(true);
    setShowMessageActions(false);
    setActionMessage(null);
  }, [actionMessage]);
  const replyFromActionsSheet = useCallback(() => {
    setReplyToMessage(actionMessage);
    setShowMessageActions(false);
    setActionMessage(null);
  }, [actionMessage]);
  const selectFromActionsSheet = useCallback(() => {
    toggleSelectMessage(actionMessage.id);
    setShowMessageActions(false);
  }, [actionMessage, toggleSelectMessage]);

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
        <ChatHeader
          router={router}
          theme={theme}
          isBlindDate={isBlindDate}
          bothRevealed={bothRevealed}
          otherUserProfile={otherUserProfile}
          paramOtherUserId={resolvedOtherUserId}
          justRevealed={justRevealed}
          avatarUrl={avatarUrl}
          revealAnim={revealAnim}
          conversationName={conversationName}
          otherUserVerified={otherUserVerified}
          blindDateInfo={blindDateInfo}
          isOnline={isOnline}
          onlineLabelOpacity={onlineLabelOpacity}
          canRevealFromHeader={canRevealFromHeader}
          handleHeaderRevealPress={handleHeaderRevealPress}
          jamSession={jamSession}
          conversationId={conversationId}
          setJamExpanded={setJamExpanded}
          startJamSession={startJamSession}
          name={conversationName}
          setSearchVisible={setSearchVisible}
        />

        <ChatSearchBar
          visible={searchVisible}
          theme={theme}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchMatches={searchMatches}
          searchMatchIndex={searchMatchIndex}
          goToPreviousSearchMatch={goToPreviousSearchMatch}
          goToNextSearchMatch={goToNextSearchMatch}
          closeSearch={closeSearch}
        />

        <RevealBanners
          justRevealed={justRevealed}
          theme={theme}
          revealToastAnim={revealToastAnim}
          otherUserProfile={otherUserProfile}
          paramOtherUserId={resolvedOtherUserId}
          router={router}
          isMemeConnect={isMemeConnect}
          memeConnectBothRevealed={memeConnectBothRevealed}
          memeConnectRequest={memeConnectRequest}
          memeConnectSelfRevealed={memeConnectSelfRevealed}
          handleMemeConnectReveal={handleMemeConnectReveal}
          revealingMemeConnect={revealingMemeConnect}
          isBlindDate={isBlindDate}
          bothRevealed={bothRevealed}
          hasRevealedSelf={hasRevealedSelf}
          otherHasRevealed={otherHasRevealed}
          handleRevealProfile={handleRevealProfile}
          isRevealSubmitting={isRevealSubmitting}
        />
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
          <FlashList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onStartReached={loadMore}
            // Trigger a couple of screens before the actual top (not 0.5,
            // i.e. half a screen) so the network fetch for older messages has
            // time to land before a fast upward swipe reaches the top --
            // otherwise the user outruns the fetch and sees a blank gap.
            onStartReachedThreshold={2}
            maintainVisibleContentPosition={{
              autoscrollToBottomThreshold: 0.3,
              startRenderingFromBottom: true,
            }}
            ListFooterComponent={
              <TypingIndicator visible={typingUsers.length > 0} avatarUrl={avatarUrl} />
            }
          />

          {/* Scroll to bottom floating button with new message badge */}
          <ScrollToBottomButton
            visible={showScrollToBottom}
            isDarkMode={isDarkMode}
            newMessageCount={newMessageCount}
            onPress={scrollToBottom}
            style={showJamBarAboveComposer ? styles.scrollToBottomAboveJamBar : null}
          />

          <JamMiniPlayerBar style={styles.jamBarAboveComposer} />

          <View
            style={[styles.composerContainer, { borderTopColor: "transparent" }]}
          >
            <SelectionToolbar
              visible={selectionMode && selectedMessageIds.length > 0}
              selectedCount={selectedMessageIds.length}
              onDelete={handleDeleteMessages}
              onCancel={closeSelectionMode}
            />
            <ComposerBanners
              editingMessage={editingMessage}
              onCancelEdit={cancelEditingMessage}
              replyToMessage={replyToMessage}
              myUserId={myUserId}
              conversationName={conversationName}
              isDarkMode={isDarkMode}
              onCancelReply={cancelReplyToMessage}
            />
            {/* Sending indicator - smooth animated fill, no percentage text */}
            {isUploadingMedia && (
              <MediaSendingIndicator progress={uploadProgress} label="Sending..." />
            )}

            <MediaPreviewStrip
              visible={showMediaPreview && selectedMedia.length > 0}
              isDarkMode={isDarkMode}
              selectedMedia={selectedMedia}
              onCancel={handleCancelMediaPreview}
              onTrimVideo={handleTrimVideo}
              onRemoveMedia={handleRemoveMedia}
              onAddMoreMedia={handleAddMoreMedia}
              theme={theme}
              onSendMedia={handleSendMedia}
              isUploadingMedia={isUploadingMedia}
            />

            <ComposerInputBar
              isDarkMode={isDarkMode}
              canMessage={canMessage}
              onAttachPress={openMediaOptions}
              isUploadingMedia={isUploadingMedia}
              theme={theme}
              composer={composer}
              onComposerChange={handleComposerChange}
              onKeyPress={handleKeyPress}
              onSend={handleSend}
            />

            {/* Media options modal */}
            <MediaOptionsSheet
              visible={showMediaOptions}
              onClose={closeMediaOptions}
              isDarkMode={isDarkMode}
              onPickMedia={handlePickMedia}
              onTakePhoto={handleTakePhoto}
              onPickViewOnceMedia={handlePickViewOnceMedia}
            />

            {/* Media viewer modal */}
            <MediaViewerModal
              visible={mediaViewerVisible}
              onClose={closeMediaViewer}
              currentGalleryItem={currentGalleryItem}
              viewingMedia={viewingMedia}
              onDownload={handleDownloadMedia}
              mediaItems={mediaItems}
              mediaViewerIndex={mediaViewerIndex}
              setMediaViewerIndex={setMediaViewerIndex}
              mediaViewerWidth={mediaViewerWidth}
              resolvedViewingMediaUrl={resolvedViewingMediaUrl}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {/* Quick-reaction row for double-tap, as a Modal for the same reason
          the long-press actions sheet is one -- see comment below. */}
      <QuickReactionRow
        reactionTarget={reactionTarget}
        showAllReactions={showAllReactions}
        onClose={closeQuickReaction}
        onShowAllReactions={openAllReactionsFromQuickRow}
        onReact={reactFromQuickRow}
      />
      {/* Message actions sheet for long-press. A native Modal (like the other
          sheets in this screen -- media options, report) instead of a plain
          absolutely-positioned View: a raw View sibling of the
          KeyboardAvoidingView tree got clipped/pushed off-screen by the
          keyboard-dismiss/layout race (confirmed with a bright debug-colored
          version of the old markup -- it rendered, but squashed into a
          sliver at the very bottom instead of the full sheet). Modal
          presents in its own native layer above the keyboard and everything
          else, which sidesteps that race entirely. */}
      <MessageActionsSheet
        visible={showMessageActions && !!actionMessage}
        onClose={closeMessageActionsSheet}
        actionMessage={actionMessage}
        isDarkMode={isDarkMode}
        insets={insets}
        onReactEmoji={reactFromActionsSheet}
        onOpenAllReactions={openAllReactionsFromActionsSheet}
        onReply={replyFromActionsSheet}
        onSelect={selectFromActionsSheet}
        myUserId={myUserId}
        onEdit={handleStartEdit}
        onDelete={handleDeleteMessages}
        onReport={() => handleOpenReportModal(actionMessage)}
      />

      {/* Report Message Modal */}
      <ReportMessageModal
        visible={showReportModal}
        onClose={handleCloseReportModal}
        isDarkMode={isDarkMode}
        selectedReportReason={selectedReportReason}
        setSelectedReportReason={setSelectedReportReason}
        reportAdditionalDetails={reportAdditionalDetails}
        setReportAdditionalDetails={setReportAdditionalDetails}
        isSubmittingReport={isSubmittingReport}
        onSubmit={handleSubmitReport}
      />

      <BlockedInfoModal
        visible={showBlockedInfoModal && isBlindDate}
        onClose={closeBlockedInfoModal}
        isDarkMode={isDarkMode}
        blockedInfoMessage={blockedInfoMessage}
      />

      {/* Blind Connect Reveal Prompt Modal */}
      <RevealPromptModal
        visible={showRevealPrompt && isBlindDate && !hasRevealedSelf && !bothRevealed}
        onSkip={handleSkipReveal}
        isDarkMode={isDarkMode}
        otherHasRevealed={otherHasRevealed}
        blindDateMessageCount={blindDateMessageCount}
        isRevealSubmitting={isRevealSubmitting}
        onReveal={handleRevealProfile}
      />


      <ReactionPicker
        visible={!!(reactionTarget && showAllReactions)}
        isDarkMode={isDarkMode}
        onClose={() => {
          setShowAllReactions(false);
          setReactionTarget(null);
        }}
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
