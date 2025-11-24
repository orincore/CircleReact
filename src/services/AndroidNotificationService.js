import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
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

  async initialize() {
    try {
      //console.log('🔔 Initializing Android notification service...');
      
      // Register for push notifications
      await this.registerForPushNotificationsAsync();
      
      // Set up notification channels
      await this.setupNotificationChannels();
      
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
      const authToken = await AsyncStorage.getItem('token');
      
      
      
      if (authToken && this.expoPushToken && this.expoPushToken !== 'undefined') {
        //console.log('🔄 User already authenticated, saving push token now');
        await this.savePushTokenToDatabase(this.expoPushToken);
      } else {
        
      }
    } catch (error) {
      console.error('❌ Error checking authentication for token save:', error);
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
        const { status } = await Notifications.requestPermissionsAsync();
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

    // Listener for when a user taps on or interacts with a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      //console.log('👆 Notification response received:', response);
      this.handleNotificationResponse(response);
    });
  }

  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;
    //console.log('📱 Processing notification:', { title, body, data });
    
    // You can add custom logic here for handling different notification types
    // For example, updating badge counts, playing custom sounds, etc.
  }

  handleNotificationResponse(response) {
    const { notification } = response;
    const { data } = notification.request.content;
    
    //console.log('🎯 User interacted with notification:', data);
    
    // Handle different notification types
    if (data?.type) {
      switch (data.type) {
        case 'friend_request':
          // Navigate to friend requests
          //console.log('📱 Opening friend requests');
          break;
        case 'message':
          // Navigate to chat
          if (data.chatId) {
            //console.log('📱 Opening chat:', data.chatId);
          }
          break;
        case 'match':
          // Navigate to matches
          //console.log('📱 Opening matches');
          break;
        case 'activity':
          // Navigate to activity feed
          //console.log('📱 Opening activity feed');
          break;
        case 'profile_visit':
          // Navigate to profile or notifications
          //console.log('📱 Opening profile visits');
          break;
        case 'voice_call':
          // Handle voice call
          //console.log('📱 Handling voice call');
          break;
        case 'marketing_campaign':
          // Handle marketing campaign notification
          //console.log('📱 Marketing campaign notification:', data.campaignId);
          // Can navigate to specific campaign landing page if needed
          break;
        default:
          //console.log('📱 Unknown notification type:', data.type);
      }
    }
  }

  // Show local notification
  async showLocalNotification({ title, body, data = {}, channelId = 'default' }) {
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
          categoryIdentifier: channelId,
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

  async showMessageNotification({ senderName, message, chatId, senderId }) {
    return this.showLocalNotification({
      title: `💬 ${senderName}`,
      body: message,
      data: { 
        type: 'message', 
        chatId, 
        senderId,
        action: 'open_chat'
      },
      channelId: 'messages'
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
      channelId: 'voice_calls'
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
    const { status } = await Notifications.requestPermissionsAsync();
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
      
      const authToken = authTokenOverride || await AsyncStorage.getItem('token');
      if (!authToken) {
        //console.log('⚠️ No auth token, skipping push token save');
        return;
      }

      const deviceType = Platform.OS;
      const deviceName = Device.deviceName || `${Platform.OS} Device`;

      
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
        }),
      });

      //console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        //console.log('✅ Push token saved to database:', data);
      } else {
        const error = await response.text();
        console.error('❌ Failed to save push token. Status:', response.status, 'Error:', error);
      }
    } catch (error) {
      console.error('❌ Error saving push token to database:', error);
    }
  }

  // Get push token
  getPushToken() {
    return this.expoPushToken;
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
