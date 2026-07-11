import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { chatApi } from '../api/chat';
import socketService from './socketService';
import { ensureNotificationPermission } from '@/utils/permissionGate';

// Deduplication cache for push notifications (messageId -> timestamp)
const recentPushNotifications = new Map();
const PUSH_DEDUP_WINDOW_MS = 5000; // 5 second window

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data || {};
    
    // For message notifications, check deduplication
    if (data.type === 'new_message' || data.type === 'message') {
      const messageId = data.messageId;
      if (messageId) {
        const now = Date.now();
        const lastShown = recentPushNotifications.get(messageId);
        if (lastShown && (now - lastShown) < PUSH_DEDUP_WINDOW_MS) {
          // Already shown this notification recently, suppress it
          return {
            shouldShowBanner: false,
            shouldShowList: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
        // Mark as shown
        recentPushNotifications.set(messageId, now);
        // Cleanup old entries
        if (recentPushNotifications.size > 100) {
          const cutoff = now - PUSH_DEDUP_WINDOW_MS;
          for (const [id, ts] of recentPushNotifications) {
            if (ts < cutoff) recentPushNotifications.delete(id);
          }
        }
      }
    }
    
    // Show and sound for all notification types
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

class AndroidNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
    this.notificationChannels = new Map();
    
    // Only initialize on mobile platforms
    if (Platform.OS !== 'web') {
      this.initialize();
    }
  }

  async setupNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync('incoming_call', [
        {
          identifier: 'ACCEPT_CALL',
          buttonTitle: 'Accept',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'DECLINE_CALL',
          buttonTitle: 'Decline',
          options: {
            opensAppToForeground: false,
            isDestructive: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('message_reply', [
        {
          identifier: 'REPLY_INLINE',
          buttonTitle: 'Reply',
          options: {
            opensAppToForeground: true,
          },
          textInput: {
            placeholder: 'Type a reply...',
            submitButtonTitle: 'Send',
          },
        },
      ]);
    } catch (error) {
      console.error('❌ Failed to set up notification categories:', error);
    }
  }

  async initialize() {
    try {
      //console.log('🔔 Initializing Android notification service...');
      
      // Register for push notifications
      await this.registerForPushNotificationsAsync();
      
      // Set up notification channels
      await this.setupNotificationChannels();

      // Set up notification categories (for actions like Accept/Decline on calls)
      await this.setupNotificationCategories();
      
      // Set up listeners
      this.setupNotificationListeners();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Android notification service:', error);
    }
  }

  async saveTokenIfAuthenticated() {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const authToken = await AsyncStorage.getItem('@circle:access_token');
      
      if (authToken && this.expoPushToken && this.expoPushToken !== 'undefined') {
        await this.savePushTokenToDatabase(this.expoPushToken, authToken);
      }
    } catch (error) {
      console.error('❌ Error checking authentication for token save:', error);
    }
  }

  /**
   * Refresh the push token and save to database
   * Call this when app comes to foreground or on login/signup
   * @param {string} authToken - The auth token to use for API call
   * @returns {Promise<string|null>} The push token or null if failed
   */
  async refreshAndSaveToken(authToken) {
    try {
      if (Platform.OS === 'web') {
        return null;
      }

      if (!Device.isDevice) {
        console.warn('⚠️ Must use physical device for Push Notifications');
        return null;
      }

      // Check permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.warn('⚠️ Push notification permissions not granted');
        return null;
      }

      // Get fresh token from Expo
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        console.error('❌ Project ID not found for push notifications');
        return null;
      }

      // Right after a permission grant (e.g. the user just flipped it on in
      // system Settings and came back), Android's FCM/Play Services
      // registration can take a beat to catch up -- getExpoPushTokenAsync()
      // sometimes throws transiently in that window. A couple of short
      // retries covers that without giving up on the very first hiccup.
      let token = null;
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          token = tokenData.data;
          lastError = null;
          break;
        } catch (e) {
          lastError = e;
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      if (lastError) {
        console.error('❌ Error getting push token after retries:', lastError);
      }

      if (token && token !== 'undefined') {
        this.expoPushToken = token;

        // Save to database if we have auth token
        if (authToken) {
          await this.savePushTokenToDatabase(token, authToken);
        }

        return token;
      }

      return null;
    } catch (error) {
      console.error('❌ Error refreshing push token:', error);
      return null;
    }
  }

  /**
   * Best-effort fallback net for detecting a permission grant that happened
   * in the OS Settings app. The AppState 'active' listener (see AuthContext)
   * is the primary path, but some Android OEM ROMs (aggressive battery/task
   * managers on MIUI, ColorOS, etc.) don't reliably fire that transition when
   * returning from Settings, which otherwise leaves a user stuck with
   * notifications enabled at the OS level but no token ever registered.
   * getPermissionsAsync is a cheap native call, so polling it is safe; the
   * expensive getExpoPushTokenAsync only runs once, when a token is missing.
   * @param {() => (string|Promise<string>)} getAuthToken
   */
  startPermissionWatcher(getAuthToken) {
    if (Platform.OS === 'web' || this._permissionWatcherInterval) return;

    this._permissionWatcherInterval = setInterval(async () => {
      try {
        if (this.expoPushToken) return; // already have one, nothing to recover

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;

        const authToken = typeof getAuthToken === 'function' ? await getAuthToken() : getAuthToken;
        if (!authToken) return;

        await this.refreshAndSaveToken(authToken);
      } catch (error) {
        // Best-effort background check -- failures here shouldn't be noisy.
      }
    }, 60000);
  }

  stopPermissionWatcher() {
    if (this._permissionWatcherInterval) {
      clearInterval(this._permissionWatcherInterval);
      this._permissionWatcherInterval = null;
    }
  }

  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      // Set notification channel for Android
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Circle Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C2B86',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await ensureNotificationPermission();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⚠️ Failed to get push token for push notification!');
        return;
      }
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        
        token = (await Notifications.getExpoPushTokenAsync({
          projectId,
        })).data;
        
        this.expoPushToken = token;
        //console.log('✅ Expo push token obtained:', token);
        
        // Try to save token immediately if user is already authenticated
        this.saveTokenIfAuthenticated().catch(err => {
          //console.log('⏳ Will save token after login');
        });
      } catch (e) {
        console.error('❌ Error getting push token:', e);
        token = `${e}`;
      }
    } else {
      console.warn('⚠️ Must use physical device for Push Notifications');
    }

    return token;
  }

  async setupNotificationChannels() {
    if (Platform.OS !== 'android') return;

    const channels = [
      {
        id: 'friend_requests',
        name: 'Friend Requests',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notifications for friend requests',
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C2B86',
      },
      {
        id: 'messages',
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notifications for new messages',
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD6F2',
      },
      {
        id: 'matches',
        name: 'Matches',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notifications for new matches',
        sound: 'default',
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF9AE8',
      },
      {
        id: 'activities',
        name: 'Live Activities',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Notifications for live activities and updates',
        sound: 'default',
        vibrationPattern: [0, 150, 150, 150],
        lightColor: '#7C2B86',
      },
      {
        id: 'profile_visits',
        name: 'Profile Visits',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Notifications for profile visits',
        sound: 'default',
        vibrationPattern: [0, 200],
        lightColor: '#7C2B86',
      },
      {
        id: 'voice_calls',
        name: 'Voice Calls',
        importance: Notifications.AndroidImportance.MAX,
        description: 'Notifications for incoming voice calls',
        sound: 'default',
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        lightColor: '#00FF94',
      }
    ];

    for (const channel of channels) {
      try {
        await Notifications.setNotificationChannelAsync(channel.id, {
          name: channel.name,
          importance: channel.importance,
          description: channel.description,
          sound: channel.sound,
          vibrationPattern: channel.vibrationPattern,
          lightColor: channel.lightColor,
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });
        
        this.notificationChannels.set(channel.id, channel);
        //console.log(`✅ Created notification channel: ${channel.name}`);
      } catch (error) {
        console.error(`❌ Failed to create channel ${channel.id}:`, error);
      }
    }
  }

  setupNotificationListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      //console.log('🔔 Notification received in foreground:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for when a user taps on or interacts with a notification.
    // This only fires for taps that happen while this listener is already
    // registered (app in foreground/background) -- it does NOT fire for the
    // tap that launched the app from a fully killed state, since that tap
    // happened before this JS listener existed. Cold-start taps are handled
    // separately via consumeColdStartResponseIfAny(), per Expo's docs:
    // https://docs.expo.dev/versions/latest/sdk/notifications/#retrieve-the-last-notification-response
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      //console.log('👆 Notification response received:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handles the notification response (if any) that launched the app from a
   * killed state. Must be called from a mounted screen inside the
   * authenticated navigator (see app/secure/_layout.jsx) rather than from
   * initialize() -- at that point the router/Stack isn't mounted yet
   * (AuthProvider renders null until session restore finishes), so any
   * router.push triggered from here earlier would silently fail. Clears the
   * stored response after handling so it isn't reprocessed on remount.
   */
  async consumeColdStartResponseIfAny() {
    try {
      const response = Notifications.getLastNotificationResponse();
      if (!response) return;

      await this.handleNotificationResponse(response);
      Notifications.clearLastNotificationResponse();
    } catch (error) {
      console.error('❌ Failed to handle cold-start notification response:', error);
    }
  }

  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;
    //console.log('📱 Processing notification:', { title, body, data });
    
    // You can add custom logic here for handling different notification types
    // For example, updating badge counts, playing custom sounds, etc.
  }

  async handleNotificationResponse(response) {
    const { notification, actionIdentifier, userText } = response;
    const { data } = notification.request.content;
    
    //console.log('🎯 User interacted with notification:', data);
    
    // Handle different notification types
    if (data?.type) {
      switch (data.type) {
        case 'friend_request':
        case 'friend_request_accepted':
          try {
            const { router } = await import('expo-router');
            router.push('/secure/(tabs)/profile/friends');
          } catch (error) {
            console.error('❌ Failed to navigate to friends from notification tap:', error);
          }
          break;
        case 'message':
        case 'new_message': {
          if (actionIdentifier === 'REPLY_INLINE') {
            const reply = (userText || '').trim();
            if (reply && data.chatId) {
              try {
                // Get token from AsyncStorage for the API call
                const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
                const token = await AsyncStorage.getItem('@circle:access_token');
                if (!token) {
                  console.error('❌ No auth token found for inline reply');
                  return;
                }
                console.log('📤 Sending inline reply from notification:', { chatId: data.chatId, replyLength: reply.length });
                await chatApi.sendMessage(String(data.chatId), reply, token);
                console.log('✅ Inline reply sent successfully');
              } catch (error) {
                console.error('❌ Failed to send inline reply from notification:', error);
              }
            }
          } else if (data.chatId) {
            try {
              const rawTitle = notification.request.content?.title;
              const senderName =
                data.senderName ||
                (typeof rawTitle === 'string'
                  ? rawTitle.replace(/^💬\s*/, '')
                  : 'Chat');
              socketService.navigateToChat(String(data.chatId), senderName, {
                avatar: data.senderAvatar,
                otherUserId: data.senderId,
              });
            } catch (error) {
              console.error('❌ Failed to navigate to chat from notification tap:', error);
            }
          }
          break;
        }
        case 'jam_session_started':
        case 'jam_session_left':
        case 'friend_birthday':
        case 'weather_checkin':
          // All three carry a chatId -- the notification is fundamentally
          // "something happened in this chat", so open it directly.
          if (data.chatId) {
            try {
              const label = data.senderName || data.birthdayUserName || data.targetUserName || null;
              socketService.navigateToChat(String(data.chatId), label, {
                otherUserId: data.senderId || data.birthdayUserId || data.targetUserId,
              });
            } catch (error) {
              console.error('❌ Failed to navigate to chat from notification tap:', error);
            }
          }
          break;
        case 'blind_date_match':
        case 'blind_date_reveal':
        case 'help_request_accepted':
          // Anonymous/blind chats are opened the same way as any other chat
          // once matched -- the chatId is what actually resolves to a screen.
          if (data.chatId) {
            try {
              socketService.navigateToChat(String(data.chatId), null, {});
            } catch (error) {
              console.error('❌ Failed to navigate to chat from notification tap:', error);
            }
          }
          break;
        case 'blind_date_reminder':
          // Only carries a bare matchId, no chatId to resolve to a screen --
          // fall back to the notifications hub so the tap isn't a no-op.
          try {
            const { router } = await import('expo-router');
            router.push('/secure/notifications');
          } catch (error) {
            console.error('❌ Failed to navigate from blind date reminder tap:', error);
          }
          break;
        case 'meme_liked_by_friend':
        case 'meme_discovery':
          if (data.memeId) {
            try {
              const { router } = await import('expo-router');
              router.push({ pathname: '/secure/meme-view', params: { memeId: String(data.memeId) } });
            } catch (error) {
              console.error('❌ Failed to navigate to meme from notification tap:', error);
            }
          }
          break;
        case 'match':
        case 'new_match':
          try {
            const { router } = await import('expo-router');
            router.push('/secure/(tabs)/match');
          } catch (error) {
            console.error('❌ Failed to navigate to match tab from notification tap:', error);
          }
          break;
        case 'activity':
          // Informational activity-feed pushes (user joined, friends
          // connected, etc.) have no dedicated screen to deep-link into.
          break;
        case 'profile_visit':
        case 'nearby_user':
          if (data.userId) {
            try {
              const { router } = await import('expo-router');
              router.push(`/secure/user-profile/${data.userId}`);
            } catch (error) {
              console.error('❌ Failed to navigate to profile from notification tap:', error);
            }
          }
          break;
        case 'voice_call':
        case 'incoming_call':
          // ACCEPT_CALL/DECLINE_CALL only make sense while the WebRTC
          // signaling session from a live socket connection is still around
          // (VoiceCallService.acceptCall/declineCall act on that in-memory
          // state) -- they can't be wired up here since a cold-start tap has
          // no such session. A plain tap can still always open the call
          // screen with what the payload tells us.
          if (actionIdentifier === 'ACCEPT_CALL' || actionIdentifier === 'DECLINE_CALL') {
            break;
          }
          if (data.callId) {
            try {
              const { router } = await import('expo-router');
              router.push({
                pathname: '/secure/voice-call',
                params: {
                  callId: String(data.callId),
                  ...(data.callerId ? { callerId: String(data.callerId) } : {}),
                  ...(data.callerName ? { callerName: data.callerName } : {}),
                  isIncoming: 'true',
                },
              });
            } catch (error) {
              console.error('❌ Failed to navigate to call screen from notification tap:', error);
            }
          }
          break;
        case 'help_request':
          try {
            const { router } = await import('expo-router');
            router.push('/secure/help-request');
          } catch (error) {
            console.error('❌ Failed to navigate to help request from notification tap:', error);
          }
          break;
        case 'help_request_expired':
        case 'help_request_no_helpers':
          if (data.requestId) {
            try {
              const { router } = await import('expo-router');
              router.push({ pathname: '/secure/help-searching', params: { requestId: String(data.requestId) } });
            } catch (error) {
              console.error('❌ Failed to navigate to help status from notification tap:', error);
            }
          }
          break;
        case 'referral_signup':
        case 'referral_approved':
        case 'referral_rejected':
        case 'referral_paid':
          try {
            const { router } = await import('expo-router');
            router.push('/secure/(tabs)/profile/referrals');
          } catch (error) {
            console.error('❌ Failed to navigate to referrals from notification tap:', error);
          }
          break;
        case 'verification_success':
        case 'verification_rejected':
          try {
            const { router } = await import('expo-router');
            router.push('/secure/notifications');
          } catch (error) {
            console.error('❌ Failed to navigate from verification notification tap:', error);
          }
          break;
        case 'marketing_campaign':
          // Admin-authored copy has no guaranteed deep-link target today --
          // open the notifications hub so the tap is never a no-op.
          try {
            const { router } = await import('expo-router');
            router.push('/secure/notifications');
          } catch (error) {
            console.error('❌ Failed to navigate from marketing campaign tap:', error);
          }
          break;
        case 'profile_suggestion':
          // Meme-connect requests reuse this generic type (see
          // memeConnect.service.ts) since they deliberately carry no
          // sender/user id -- route to the Connect Requests screen instead
          // of a profile. Admin announcement broadcasts also reuse it via
          // action: 'announcement'.
          if (data.action === 'meme_connect') {
            try {
              const { router } = await import('expo-router');
              router.push('/secure/(tabs)/memes/connect-requests');
            } catch (error) {
              console.error('❌ Failed to navigate to connect requests from notification tap:', error);
            }
          } else if (data.action === 'announcement') {
            try {
              const { router } = await import('expo-router');
              router.push('/secure/notifications');
            } catch (error) {
              console.error('❌ Failed to navigate from announcement notification tap:', error);
            }
          }
          break;
        case 'birthday_self':
          // Celebratory only, no deep-link target.
          break;
        default:
          // Unknown/future type -- open the notifications hub rather than
          // silently doing nothing on tap.
          try {
            const { router } = await import('expo-router');
            router.push('/secure/notifications');
          } catch (error) {
            console.error('❌ Failed to navigate from unknown notification type tap:', error);
          }
      }
    }
  }

  // Show local notification
  async showLocalNotification({ title, body, data = {}, channelId = 'default', categoryId = null }) {
    if (Platform.OS === 'web') {
      //console.log('🌐 Skipping local notification on web platform');
      return;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          // Use explicit category for things like incoming calls, otherwise fall back to channel
          categoryIdentifier: categoryId || channelId,
        },
        trigger: null, // Show immediately
      });

      //console.log('✅ Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Failed to show local notification:', error);
      return null;
    }
  }

  // Activity-specific notification methods
  async showActivityNotification({ type, title, body, data = {} }) {
    return this.showLocalNotification({
      title,
      body,
      data: { ...data, type: 'activity', activityType: type },
      channelId: 'activities'
    });
  }

  async showFriendRequestNotification({ senderName, senderId, requestId }) {
    return this.showLocalNotification({
      title: '👥 New Friend Request',
      body: `${senderName} wants to be your friend`,
      data: { 
        type: 'friend_request', 
        senderId, 
        requestId,
        action: 'friend_request'
      },
      channelId: 'friend_requests'
    });
  }

  async showMessageNotification({ senderName, message, chatId, senderId, messageId }) {
    // Deduplication: skip if we've shown this message recently (uses module-level cache)
    if (messageId) {
      const now = Date.now();
      const lastShown = recentPushNotifications.get(messageId);
      if (lastShown && (now - lastShown) < PUSH_DEDUP_WINDOW_MS) {
        // Already shown this notification recently, skip
        return null;
      }
      // Mark as shown
      recentPushNotifications.set(messageId, now);
      // Cleanup old entries periodically
      if (recentPushNotifications.size > 100) {
        const cutoff = now - PUSH_DEDUP_WINDOW_MS;
        for (const [id, ts] of recentPushNotifications) {
          if (ts < cutoff) recentPushNotifications.delete(id);
        }
      }
    }

    return this.showLocalNotification({
      title: `💬 ${senderName}`,
      body: message,
      data: { 
        type: 'message', 
        chatId, 
        senderId,
        senderName,
        action: 'open_chat'
      },
      channelId: 'messages',
      categoryId: 'message_reply'
    });
  }

  async showMatchNotification({ matchedUserName, matchId }) {
    return this.showLocalNotification({
      title: '💕 New Match!',
      body: `You matched with ${matchedUserName}`,
      data: { 
        type: 'match', 
        matchId,
        action: 'open_match'
      },
      channelId: 'matches'
    });
  }

  async showProfileVisitNotification({ visitorName, visitorId }) {
    return this.showLocalNotification({
      title: '👀 Profile Visit',
      body: `${visitorName} viewed your profile`,
      data: { 
        type: 'profile_visit', 
        visitorId,
        action: 'open_profile'
      },
      channelId: 'profile_visits'
    });
  }

  async showVoiceCallNotification({ callerName, callerId, callId }) {
    return this.showLocalNotification({
      title: '📞 Incoming Voice Call',
      body: `${callerName} is calling you`,
      data: { 
        type: 'voice_call', 
        callerId, 
        callId,
        action: 'answer_call'
      },
      channelId: 'voice_calls',
      categoryId: 'incoming_call'
    });
  }

  // User joined activity
  async showUserJoinedNotification({ userName, userId, location }) {
    return this.showActivityNotification({
      type: 'user_joined',
      title: '🎉 New User Joined',
      body: `${userName} from ${location} just joined Circle!`,
      data: { userId, location }
    });
  }

  // Friends connected activity
  async showFriendsConnectedNotification({ user1Name, user2Name, user1Id, user2Id }) {
    return this.showActivityNotification({
      type: 'friends_connected',
      title: '🤝 New Connection',
      body: `${user1Name} and ${user2Name} are now friends!`,
      data: { user1Id, user2Id }
    });
  }

  // Profile visited activity
  async showProfileVisitedNotification({ visitorName, profileName, visitorId, profileId }) {
    return this.showActivityNotification({
      type: 'profile_visited',
      title: '👁️ Profile Activity',
      body: `${visitorName} visited ${profileName}'s profile`,
      data: { visitorId, profileId }
    });
  }

  // User matched activity
  async showUserMatchedNotification({ user1Name, user2Name, user1Id, user2Id }) {
    return this.showActivityNotification({
      type: 'user_matched',
      title: '💕 New Match Alert',
      body: `${user1Name} and ${user2Name} matched!`,
      data: { user1Id, user2Id }
    });
  }

  // Location updated activity
  async showLocationUpdatedNotification({ userName, userId, location }) {
    return this.showActivityNotification({
      type: 'location_updated',
      title: '📍 Location Update',
      body: `${userName} is now in ${location}`,
      data: { userId, location }
    });
  }

  // Interest updated activity
  async showInterestUpdatedNotification({ userName, userId, interests }) {
    return this.showActivityNotification({
      type: 'interest_updated',
      title: '🎯 Interests Updated',
      body: `${userName} updated their interests: ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '...' : ''}`,
      data: { userId, interests }
    });
  }

  // Get notification permissions status
  async getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  // Request notification permissions
  async requestPermissions() {
    const { status } = await ensureNotificationPermission();
    return status;
  }

  // Clear all notifications
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    //console.log('🧹 All notifications cleared');
  }

  // Set badge count
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  // Save push token to database
  async savePushTokenToDatabase(token, authTokenOverride = null) {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const { API_BASE_URL } = await import('../api/config');
      
      const authToken = authTokenOverride || await AsyncStorage.getItem('@circle:access_token');
      if (!authToken) {
        return false;
      }
      
      if (!token || token === 'undefined') {
        return false;
      }

      const deviceType = Platform.OS;
      const deviceName = Device.deviceName || `${Platform.OS} Device`;
      const { getOrCreateDeviceId } = await import('./deviceId');
      const deviceId = await getOrCreateDeviceId();

      const response = await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token,
          deviceType,
          deviceName,
          deviceId,
        }),
      });

      //console.log('📡 Response status:', response.status);

      if (response.ok) {
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Failed to save push token. Status:', response.status, 'Error:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving push token to database:', error);
      return false;
    }
  }

  // Get push token
  getPushToken() {
    return this.expoPushToken;
  }

  /**
   * Unregister push token for current user
   * IMPORTANT: Call this BEFORE clearing auth tokens from storage
   * @param {string} authTokenOverride - The auth token to use (required since we call this before logout clears storage)
   */
  async unregisterPushTokenForCurrentUser(authTokenOverride = null) {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const { API_BASE_URL } = await import('../api/config');

      // Use override token or get from storage (but storage may already be cleared)
      const authToken = authTokenOverride || await AsyncStorage.getItem('@circle:access_token');
      if (!authToken) {
        console.warn('⚠️ No auth token available for unregistering push token');
        return false;
      }

      const token = this.expoPushToken;
      const { getOrCreateDeviceId } = await import('./deviceId');
      const deviceId = await getOrCreateDeviceId();

      // Always send the specific token/device if available, otherwise disable all tokens for user
      const body = token && token !== 'undefined'
        ? { token, deviceId }
        : (deviceId ? { deviceId } : {});

      const response = await fetch(`${API_BASE_URL}/api/notifications/unregister-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return true;
      } else {
        console.error('❌ Failed to unregister push token:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error unregistering push token:', error);
      return false;
    }
  }

  // Cleanup
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// Create singleton instance
const androidNotificationService = new AndroidNotificationService();

export default androidNotificationService;
