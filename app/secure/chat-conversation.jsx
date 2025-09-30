import React, { useState, useEffect, useRef, useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Pressable,
  Dimensions,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
  Keyboard
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getSocket } from "@/src/api/socket";
import socketService from "@/src/services/socketService";
import ConfirmationDialog from "@/src/components/ConfirmationDialog";
import { chatApi } from "@/src/api/chat";
import useBrowserNotifications from "@/src/hooks/useBrowserNotifications";
import { friendsApi } from "@/src/api/friends";
import ChatOptionsMenu from "@/src/components/ChatOptionsMenu";
import UserProfileModal from "@/src/components/UserProfileModal";
import { API_BASE_URL } from "@/src/api/config";
import ReactionBar from "@/src/components/ReactionBar";
import ReactionPicker from "@/src/components/ReactionPicker";
import VoiceCallModal from "@/components/VoiceCallModal";
import { voiceCallService, testVoiceCallService } from "@/src/services/VoiceCallService";
import { useVoiceCall } from "@/src/hooks/useVoiceCall";

const { width: screenWidth } = Dimensions.get('window');

// Modern Empty Chat Component
const EmptyChatAnimation = ({ conversationName, onSendHi }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    const entranceAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    // Floating animation for the chat icon
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle pulse for the button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    entranceAnimation.start(() => {
      floatAnimation.start();
      pulseAnimation.start();
    });

    return () => {
      floatAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <Animated.View style={[
      styles.emptyChatContainer,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      {/* Modern Chat Icon */}
      <Animated.View style={[
        styles.modernChatIcon,
        { transform: [{ translateY: floatTranslateY }] }
      ]}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="chatbubbles" size={48} color="white" />
        </LinearGradient>
        
        {/* Floating dots */}
        <View style={styles.floatingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </Animated.View>

      {/* Professional heading */}
      <View style={styles.headingContainer}>
        <Text style={styles.modernTitle}>Welcome to your conversation</Text>
        <Text style={styles.modernSubtitle}>
          Start connecting with <Text style={styles.nameHighlight}>{conversationName}</Text>
        </Text>
      </View>

      {/* Connection suggestions */}
      <View style={styles.suggestionsContainer}>
        <View style={styles.suggestionItem}>
          <View style={styles.suggestionIcon}>
            <Ionicons name="hand-right" size={16} color="#6366f1" />
          </View>
          <Text style={styles.suggestionText}>Say hello and introduce yourself</Text>
        </View>
        <View style={styles.suggestionItem}>
          <View style={styles.suggestionIcon}>
            <Ionicons name="help-circle" size={16} color="#6366f1" />
          </View>
          <Text style={styles.suggestionText}>Ask about their interests</Text>
        </View>
        <View style={styles.suggestionItem}>
          <View style={styles.suggestionIcon}>
            <Ionicons name="happy" size={16} color="#6366f1" />
          </View>
          <Text style={styles.suggestionText}>Share something about yourself</Text>
        </View>
      </View>

      {/* Modern CTA button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={styles.modernSendButton} onPress={onSendHi}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.modernButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="paper-plane" size={18} color="white" />
            <Text style={styles.modernButtonText}>Start Conversation</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Subtle background elements */}
      <View style={styles.backgroundElements}>
        <View style={[styles.bgCircle, styles.bgCircle1]} />
        <View style={[styles.bgCircle, styles.bgCircle2]} />
        <View style={[styles.bgCircle, styles.bgCircle3]} />
      </View>
    </Animated.View>
  );
};

// Simple MessageBubble component
const MessageBubble = ({ message, isMine, conversationName, userAvatar }) => {
  return (
    <View style={[
      styles.messageRow,
      isMine ? styles.messageRowMine : styles.messageRowTheirs
    ]}>
      {!isMine && (
        <View style={styles.avatarContainer}>
          {userAvatar && userAvatar.trim() ? (
            <Image 
              source={{ uri: userAvatar }} 
              style={styles.messageAvatarImage}
            />
          ) : (
            <View style={styles.messageFallbackAvatar}>
              <Text style={styles.messageFallbackAvatarText}>
                {String(conversationName).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        isMine ? styles.myMessageBubble : styles.theirMessageBubble
      ]}>
        {isMine ? (
          <LinearGradient
            colors={["#FFD6F2", "#FFBEF0", "#FF9AE8"]}
            style={styles.myBubbleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.myMessageText}>
              {message.text}
            </Text>
            {message.isEdited && (
              <Text style={styles.editedLabel}>edited</Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={styles.myTimestamp}>
                {new Date(message.createdAt ?? Date.now()).toLocaleTimeString([], { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </Text>
              <View style={styles.messageStatus}>
                <Ionicons
                  name={
                    message.status === 'read' ? 'checkmark-done' : 
                    message.status === 'delivered' ? 'checkmark' : 
                    message.status === 'sent' ? 'checkmark' :
                    message.status === 'sending' ? 'time-outline' :
                    message.status === 'failed' ? 'alert-circle-outline' :
                    'ellipse-outline'
                  }
                  size={13}
                  color={
                    message.status === 'read' ? '#7C2B86' : 
                    message.status === 'delivered' ? 'rgba(124,43,134,0.7)' : 
                    message.status === 'sent' ? 'rgba(124,43,134,0.5)' :
                    message.status === 'sending' ? 'rgba(124,43,134,0.4)' :
                    message.status === 'failed' ? '#FF4444' :
                    'rgba(124,43,134,0.3)'
                  }
                />
              </View>
            </View>
          </LinearGradient>
        ) : (
          <>
            <Text style={styles.theirMessageText}>
              {message.text}
            </Text>
            {message.isEdited && (
              <Text style={styles.editedLabel}>edited</Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={styles.theirTimestamp}>
                {new Date(message.createdAt ?? Date.now()).toLocaleTimeString([], { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

// Blocked message component
const BlockedMessage = ({ blockStatus, conversationName }) => {
  const getMessage = () => {
    if (blockStatus.isBlocked && blockStatus.isBlockedBy) {
      return `You and ${conversationName} have blocked each other. No messages can be sent or received.`;
    } else if (blockStatus.isBlocked) {
      return `You have blocked ${conversationName}. You cannot send or receive messages until you unblock them.`;
    } else if (blockStatus.isBlockedBy) {
      return `${conversationName} has blocked you. You cannot send or receive messages.`;
    }
    return '';
  };

  return (
    <View style={styles.blockedMessageContainer}>
      <View style={styles.blockedMessageCard}>
        <Ionicons name="ban" size={24} color="#FF4444" />
        <Text style={styles.blockedMessageTitle}>Messages Blocked</Text>
        <Text style={styles.blockedMessageText}>{getMessage()}</Text>
      </View>
    </View>
  );
};

// Not friends message component with action buttons
const NotFriendsMessage = ({ conversationName, otherUserId, onFriendRequestSent, requestStatus }) => {
  const { token } = useAuth();
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleSendFriendRequest = async () => {
    if (!otherUserId || !token || sendingRequest) return;
    
    setSendingRequest(true);
    try {
      // Import FriendRequestService dynamically to avoid circular imports
      const { FriendRequestService } = await import('@/src/services/FriendRequestService');
      const result = await FriendRequestService.sendFriendRequest(otherUserId, token);
      
      Alert.alert(
        'Friend Request Sent', 
        `Friend request sent to ${conversationName}. You can message each other once they accept.`,
        [{ text: 'OK', onPress: onFriendRequestSent }]
      );
    } catch (error) {
      console.error('Failed to send friend request:', error);
      Alert.alert('Error', error.message || 'Failed to send friend request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };


  const handleAcceptFriendRequest = async () => {
    if (!requestStatus?.requestId || !token || sendingRequest) return;
    
    console.log('✅ Accepting friend request:', requestStatus.requestId);
    setSendingRequest(true);
    try {
      const { FriendRequestService } = await import('@/src/services/FriendRequestService');
      const result = await FriendRequestService.acceptFriendRequest(requestStatus.requestId, token);
      
      Alert.alert(
        'Friend Request Accepted', 
        `You are now friends with ${conversationName}. You can now message each other!`,
        [{ text: 'OK', onPress: onFriendRequestSent }]
      );
    } catch (error) {
      console.error('❌ Failed to accept friend request:', error);
      Alert.alert('Error', error.message || 'Failed to accept friend request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!requestStatus?.requestId || !token || sendingRequest) return;
    
    console.log('❌ Declining friend request:', requestStatus.requestId);
    setSendingRequest(true);
    try {
      const { FriendRequestService } = await import('@/src/services/FriendRequestService');
      const result = await FriendRequestService.declineFriendRequest(requestStatus.requestId, token);
      
      Alert.alert(
        'Friend Request Declined', 
        `Friend request from ${conversationName} has been declined.`,
        [{ text: 'OK', onPress: onFriendRequestSent }]
      );
    } catch (error) {
      console.error('❌ Failed to decline friend request:', error);
      Alert.alert('Error', error.message || 'Failed to decline friend request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };


  return (
    <View style={styles.notFriendsContainer}>
      <View style={styles.notFriendsCard}>
        <Ionicons name="people-outline" size={24} color="#7C2B86" />
        <Text style={styles.notFriendsTitle}>Connect to Message</Text>
        <Text style={styles.notFriendsText}>
          You need to be friends with {conversationName} to send messages.
        </Text>
        
        <View style={styles.actionButtonsContainer}>
          {requestStatus ? (
            // Show accept/decline buttons for received requests or status for sent requests
            requestStatus.direction === 'received' ? (
              // Received request - show accept/decline buttons
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.friendRequestButton]} 
                  onPress={handleAcceptFriendRequest}
                  disabled={sendingRequest}
                >
                  <LinearGradient
                    colors={["#22C55E", "#16A34A"]}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>
                      {sendingRequest ? 'Accepting...' : 'Accept Friend Request'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.declineButton]} 
                  onPress={handleDeclineFriendRequest}
                  disabled={sendingRequest}
                >
                  <View style={styles.declineButtonContent}>
                    <Ionicons name="close" size={16} color="#EF4444" />
                    <Text style={styles.declineButtonText}>
                      {sendingRequest ? 'Declining...' : 'Decline'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              // Sent request - show status
              <View style={styles.requestStatusContainer}>
                <Ionicons name="time-outline" size={20} color="#7C2B86" />
                <Text style={styles.requestStatusText}>
                  Friend request sent to {conversationName}
                </Text>
                <Text style={styles.requestStatusSubtext}>
                  Waiting for their response...
                </Text>
              </View>
            )
          ) : (
            // No pending requests - show send button
            <TouchableOpacity 
              style={[styles.actionButton, styles.friendRequestButton]} 
              onPress={handleSendFriendRequest}
              disabled={sendingRequest}
            >
              <LinearGradient
                colors={["#7C2B86", "#A16AE8"]}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {sendingRequest ? 'Sending...' : 'Send Friend Request'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

function TypingDots({ label }) {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeAnim = (val, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 500, easing: Easing.bezier(0.4, 0.0, 0.2, 1), useNativeDriver: true, delay }),
          Animated.timing(val, { toValue: 0, duration: 500, easing: Easing.bezier(0.4, 0.0, 0.2, 1), useNativeDriver: true }),
        ])
      ).start();
    makeAnim(d1, 0);
    makeAnim(d2, 160);
    makeAnim(d3, 320);
  }, [d1, d2, d3]);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <View style={styles.typingDotsContainer}>
          <Animated.View style={[styles.typingDot, { 
            transform: [{ 
              translateY: d1.interpolate({ inputRange: [0,1], outputRange: [0, -3] }) 
            }],
            opacity: d1.interpolate({ inputRange: [0,1], outputRange: [0.4, 1] })
          }]} />
          <Animated.View style={[styles.typingDot, { 
            transform: [{ 
              translateY: d2.interpolate({ inputRange: [0,1], outputRange: [0, -3] }) 
            }],
            opacity: d2.interpolate({ inputRange: [0,1], outputRange: [0.4, 1] })
          }]} />
          <Animated.View style={[styles.typingDot, { 
            transform: [{ 
              translateY: d3.interpolate({ inputRange: [0,1], outputRange: [0, -3] }) 
            }],
            opacity: d3.interpolate({ inputRange: [0,1], outputRange: [0.4, 1] })
          }]} />
        </View>
      </View>
      {label && (
        <Text style={styles.typingLabel}>
          {label}
        </Text>
      )}
    </View>
  );
}


const conversationSeeds = {
  ava: {
    greeting: "I had so much fun at the art fair! Thank you for inviting me.",
    reply: "Same here! Your insights about the installations were incredible.",
    conversationSeeds: {
      ava: {
        greeting: "I had so much fun at the art fair! Thank you for inviting me.",
        reply: "Same here! Your insights about the installations were incredible.",
      },
      "ava-parker": {
        greeting: "Catching the sunrise run tomorrow? I'll bring the playlist!",
        reply: "Absolutely. I'll grab our favorite cold brew afterwards.",
      },
      noah: {
        greeting: "I have a surprise planned for Friday ",
        reply: "Should I be excited or nervous? Either way, I'm in!",
      },
      liam: {
        greeting: "Let's cook that pasta recipe you mentioned!",
        reply: "I'm marinating the tomatoes already. This will be delicious.",
      },
      "mason-lopez": {
        greeting: "Found another hidden taco truck. Up for an impromptu adventure?",
        reply: "Always! I'll grab the sketchbook so we can doodle on napkins again.",
      },
    },
    signature: "Let's pick a new exhibit soon!",
  },
  "ava-parker": {
    greeting: "Catching the sunrise run tomorrow? I'll bring the playlist!",
    reply: "Absolutely. I'll grab our favorite cold brew afterwards.",
    signature: "Seriously, you're the best running buddy!",
  },
  noah: {
    greeting: "I have a surprise planned for Friday 👀",
    reply: "Should I be excited or nervous? Either way, I'm in!",
    signature: "Just promise there's dessert involved!",
  },
  liam: {
    greeting: "Let's cook that pasta recipe you mentioned!",
    reply: "I'm marinating the tomatoes already. This will be delicious.",
    signature: "Can we add garlic bread to the list?",
  },
  "mason-lopez": {
    greeting: "Found another hidden taco truck. Up for an impromptu adventure?",
    reply: "Always! I'll grab the sketchbook so we can doodle on napkins again.",
    signature: "City nights with you > anything else.",
  },
};

export default function InstagramChatScreen() {
  const router = useRouter();
  const { id, name, avatar, otherUserId: paramOtherUserId } = useLocalSearchParams();
  const conversationId = typeof id === "string" ? id : "ava";
  const conversationName = typeof name === "string" ? name : conversationId.split("-")[0] ?? "Chat";
  const initialAvatar = typeof avatar === "string" && avatar.trim() ? avatar.trim() : null;
  const { token, user } = useAuth();
  const myUserId = user?.id ?? "me";

  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState([]);
  const [oldestAt, setOldestAt] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);

  // Browser notifications - track current chat to prevent notifications
  const { setCurrentChatId } = useBrowserNotifications();
  
  // Voice call functionality
  const { startVoiceCall } = useVoiceCall();

  // Track current chat for browser notifications
  useEffect(() => {
    if (conversationId) {
      setCurrentChatId(conversationId);
      console.log('🔔 Set current chat ID for notifications:', conversationId);
    }
    
    // Clear current chat when component unmounts
    return () => {
      setCurrentChatId(null);
      console.log('🔔 Cleared current chat ID for notifications');
    };
  }, [conversationId, setCurrentChatId]);

  // Helper function to deduplicate messages
  const deduplicateMessages = (messageArray) => {
    const seen = new Set();
    return messageArray.filter(msg => {
      if (seen.has(msg.id)) {
        console.warn('Duplicate message detected and removed:', msg.id);
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  };
  const listRef = useRef(null);
  const typingTimer = useRef(null);
  const composerHeight = useRef(new Animated.Value(50)).current;
  const typingFade = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [reactionBarPosition, setReactionBarPosition] = useState({ x: 0, y: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [messageLimit, setMessageLimit] = useState(50); // Start with 50 messages
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [voiceCallData, setVoiceCallData] = useState(null);
  const [otherUserId, setOtherUserId] = useState(
    paramOtherUserId && typeof paramOtherUserId === "string" ? paramOtherUserId : null
  );
  const [blockStatus, setBlockStatus] = useState({ isBlocked: false, isBlockedBy: false });
  const [friendshipStatus, setFriendshipStatus] = useState('unknown'); // 'friends', 'not_friends', 'unknown'
  const [requestStatus, setRequestStatus] = useState(null); // { type: 'friend_request', direction: 'sent'/'received', requestId: 'id' }
  const [chatDisabled, setChatDisabled] = useState(false);
  const [userAvatar, setUserAvatar] = useState(initialAvatar);
  
  // Debug avatar state changes
  useEffect(() => {
    console.log('🖼️ Avatar state changed:', { 
      userAvatar, 
      initialAvatar, 
      platform: Platform.OS 
    });
  }, [userAvatar]);

  // Fetch user profile picture if not provided
  const fetchUserProfile = async (userId) => {
    if (!userId || !token) return;
    
    try {
      console.log('🖼️ Fetching profile picture for user:', userId);
      console.log('🌐 Platform:', Platform.OS);
      console.log('🔗 API URL:', `${API_BASE_URL}/api/friends/user/${userId}/profile`);
      
      const response = await fetch(`${API_BASE_URL}/api/friends/user/${userId}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('📊 User data received:', userData);
        
        if (userData.profilePhotoUrl) {
          console.log('✅ Found profile picture:', userData.profilePhotoUrl);
          setUserAvatar(userData.profilePhotoUrl);
        } else {
          console.log('⚠️ No profile picture URL in response');
        }
      } else {
        console.log('❌ Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
    }
  };

  // Check friendship status when otherUserId is available from params
  useEffect(() => {
    if (otherUserId && otherUserId !== myUserId && token) {
      console.log('👤 otherUserId available from params, checking friendship status:', otherUserId);
      checkBlockStatus(otherUserId);
      checkFriendshipStatus(otherUserId);
      
      // Fetch profile picture if not already provided
      if (!userAvatar) {
        fetchUserProfile(otherUserId);
      }
    } else {
      console.log('👤 otherUserId not available yet:', { otherUserId, myUserId, token: !!token });
    }
  }, [otherUserId, token, myUserId]);

  // Try to extract otherUserId from conversationId if not available from params
  useEffect(() => {
    if (!otherUserId && conversationId && myUserId) {
      console.log('👤 Attempting to extract otherUserId from conversationId:', conversationId);
      
      // If conversationId is a UUID, we need a different approach
      // For now, let's try to get it from the friendships table directly
      const tryExtractOtherUserId = async () => {
        if (!token) return;
        
        try {
          console.log('🔍 Querying friendships table to find other user for chat:', conversationId);
          
          // Try to find friendships involving current user
          const response = await fetch(`${API_BASE_URL}/api/friends/list`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('👥 User friends list:', data);
            
            // Look for friends and try to match with the conversation
            if (data.friends && data.friends.length > 0) {
              console.log('👥 Available friends:', data.friends);
              
              // For debugging: if current user is one of the known users, set the other
              if (myUserId === '5d73dab8-eb6a-4842-a368-6ddfe0e7b208') {
                console.log('👤 Debug: Setting otherUserId to known friend');
                setOtherUserId('8ccd6396-3d6f-475d-abac-a3a0a0aea279');
              } else if (myUserId === '8ccd6396-3d6f-475d-abac-a3a0a0aea279') {
                console.log('👤 Debug: Setting otherUserId to known friend');
                setOtherUserId('5d73dab8-eb6a-4842-a368-6ddfe0e7b208');
              } else if (data.friends.length === 1) {
                // If there's only one friend, it's likely the other user
                const friend = data.friends[0];
                const friendUserId = friend.user_id || friend.id;
                console.log('👤 Found potential otherUserId from friends list:', friendUserId);
                setOtherUserId(friendUserId);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error trying to extract otherUserId:', error);
        }
      };
      
      tryExtractOtherUserId();
    }
  }, [otherUserId, conversationId, myUserId, token]);

  // Load mute status when component mounts
  useEffect(() => {
    const loadMuteStatus = async () => {
      if (!token || !conversationId) return;
      try {
        const response = await chatApi.getMuteStatus(conversationId, token);
        setIsChatMuted(response.isMuted);
      } catch (error) {
        console.error('Failed to load mute status:', error);
      }
    };
    loadMuteStatus();
  }, [token, conversationId]);

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (typingUsers.length > 0 && !showScrollToBottom) {
      // Small delay to ensure typing indicator is rendered
      const timer = setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollToEnd({ animated: true });
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [typingUsers.length, showScrollToBottom]);

  // Manage displayed messages for performance
  useEffect(() => {
    if (messages.length <= messageLimit) {
      setDisplayedMessages(messages);
    } else {
      // Show the most recent messages up to the limit
      const recentMessages = messages.slice(-messageLimit);
      setDisplayedMessages(recentMessages);
    }
  }, [messages, messageLimit]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      try { showSub.remove(); } catch {}
      try { hideSub.remove(); } catch {}
    };
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // Animate typing indicator
  useEffect(() => {
    Animated.timing(typingFade, {
      toValue: typingUsers.length ? 1 : 0,
      duration: 200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [typingUsers.length, typingFade]);

  // Socket connection logic (same as original)
  useEffect(() => {
    if (!token || !conversationId || !myUserId) return;

    // Set current chat ID in socket service to prevent notifications
    socketService.setCurrentChatId(conversationId);

    const s = getSocket(token);
    console.log('🔌 Setting up socket listeners for chat:', conversationId);
    console.log('👤 Current otherUserId:', otherUserId);
    console.log('🔗 Socket connected:', s.connected);
    
    // Add a test listener to see if ANY socket events are being received
    s.onAny((eventName, ...args) => {
      if (eventName.startsWith('friend:')) {
        console.log('🎧 Socket event received:', eventName, args);
      }
    });
    
    // Register for background messages for this chat
    const backgroundMessageHandler = (data) => {
      if (!data || !data.message) {
        console.warn('Invalid background message data:', data);
        return;
      }
      
      if (data.message.chatId === conversationId) {
        // Handle background message for this chat - pass the full data object
        handleMessage(data);
      }
    };
    
    socketService.addMessageHandler(`chat-${conversationId}`, backgroundMessageHandler);

    // Handle message status updates
    const handleMessageSent = ({ messageId, chatId }) => {
      console.log('✅ Message sent confirmation:', { messageId, chatId });
      if (chatId !== conversationId) return;
      
      setMessages(prev => {
        // Find the most recent message with 'sending' status
        const sendingIndex = prev.findIndex(msg => msg.status === 'sending');
        if (sendingIndex !== -1) {
          const updated = [...prev];
          updated[sendingIndex] = { ...updated[sendingIndex], id: messageId, status: 'sent' };
          return updated;
        }
        
        // If no sending message found, update by messageId
        return prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        );
      });
    };

    const handleDeliveryReceipt = ({ messageId, chatId, status }) => {
      console.log('📨 Delivery receipt received:', { messageId, chatId, status });
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: status } : msg
      ));
    };

    const handleReadReceipt = ({ messageId, chatId, status }) => {
      console.log('👁️ Read receipt received:', { messageId, chatId, status });
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'read' } : msg
      ));
    };

    // Set up socket event listeners
    s.on('chat:message:sent', handleMessageSent);
    s.on('chat:message:delivery_receipt', handleDeliveryReceipt);
    s.on('chat:message:read_receipt', handleReadReceipt);

    const handleHistory = ({ chatId, messages }) => {
      if (chatId !== conversationId) return;
      const asc = [...messages].sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
      setMessages(asc.map(m => ({
        id: m.id,
        senderId: m.senderId,
        text: m.text,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        isEdited: m.isEdited,
        isDeleted: m.isDeleted,
        reactions: m.reactions || [],
        status: m.senderId === myUserId ? (m.status || 'sent') : undefined, // Use backend status or default to 'sent'
      })));
      
      // Set pagination state
      if (asc.length) {
        setOldestAt(asc[0].createdAt);
        setHasMore(asc.length >= 30); // Assume more if we got a full page
      } else {
        setHasMore(false);
      }
      
      // Extract other user's ID from messages
      const others = asc.filter(m => m.senderId !== myUserId);
      if (others.length > 0 && !otherUserId) {
        const foundOtherUserId = others[0].senderId;
        console.log('👤 Found other user ID from messages:', foundOtherUserId);
        console.log('👤 Setting otherUserId state to:', foundOtherUserId);
        setOtherUserId(foundOtherUserId);
        
        // Check block status and friendship status when we find the other user
        checkBlockStatus(foundOtherUserId);
        checkFriendshipStatus(foundOtherUserId);
      } else if (others.length === 0 && !otherUserId) {
        // No messages yet, try to extract other user ID from conversation ID
        console.log('👤 No messages found, attempting to extract otherUserId from conversationId:', conversationId);
        console.log('👤 Current myUserId:', myUserId);
        
        // Conversation ID might be in format: userId1-userId2 or a UUID
        // Try to extract the other user ID if it's in a recognizable format
        if (conversationId.includes('-') && conversationId.length > 20) {
          // Might be a UUID format, try to get other user from chat members API
          console.log('👤 ConversationId appears to be UUID format, fetching chat members');
          fetchChatMembers(conversationId);
        } else {
          // Try to parse as user1-user2 format
          const parts = conversationId.split('-');
          if (parts.length >= 2) {
            const possibleOtherUserId = parts.find(part => part !== myUserId);
            if (possibleOtherUserId && possibleOtherUserId !== myUserId) {
              console.log('👤 Extracted otherUserId from conversationId:', possibleOtherUserId);
              setOtherUserId(possibleOtherUserId);
              checkBlockStatus(possibleOtherUserId);
              checkFriendshipStatus(possibleOtherUserId);
            }
          }
        }
        
        // Browser-specific debugging
        if (Platform.OS === 'web' && otherUserId) {
          console.log('🌐 Browser detected - testing API connectivity');
          console.log('🔗 API Base URL:', API_BASE_URL);
          
          // Test API connectivity
          fetch(`${API_BASE_URL}/api/friends/status/${otherUserId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          .then(response => {
            console.log('🧪 API test response status:', response.status);
            return response.json();
          })
          .then(data => {
            console.log('🧪 API test response data:', data);
          })
          .catch(error => {
            console.error('🧪 API test failed:', error);
          });
        }
      }
      
      if (others.length) {
        const last = others[others.length - 1];
        try { s.emit('chat:delivered', { chatId: conversationId, messageId: last.id }); } catch {}
        try { s.emit('chat:read', { chatId: conversationId, messageId: last.id }); } catch {}
      }
    };

    const handleMessage = (data) => {
      if (!data || !data.message) {
        console.warn('Invalid message data received:', data);
        return;
      }
      
      const { message } = data;
      if (!message || !message.chatId || !message.id) {
        console.warn('Invalid message object:', message);
        return;
      }
      
      if (message.chatId !== conversationId) return;
      
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const existingIndex = prev.findIndex(m => m.id === message.id);
        if (existingIndex !== -1) {
          // Update existing message
          const updated = [...prev];
          updated[existingIndex] = {
            id: message.id,
            senderId: message.senderId,
            text: message.text,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            isEdited: message.isEdited || false,
            isDeleted: message.isDeleted || false,
            reactions: message.reactions || [],
            status: message.senderId === myUserId ? 'sent' : undefined,
          };
          return updated;
        } else {
          // Add new message and auto-scroll if user is near bottom
          const newMessages = [...prev, {
            id: message.id,
            senderId: message.senderId,
            text: message.text,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            isEdited: message.isEdited || false,
            isDeleted: message.isDeleted || false,
            reactions: message.reactions || [],
            status: message.senderId === myUserId ? 'sent' : undefined,
          }];
          
          // Auto-scroll to bottom if user is already near bottom or if it's their own message
          setTimeout(() => {
            if (listRef.current && (!showScrollToBottom || message.senderId === myUserId)) {
              listRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
          
          return newMessages;
        }
      });
      
      if (message.senderId !== myUserId) {
        console.log('📨 Marking message as delivered:', message.id);
        try { s.emit('chat:message:delivered', { messageId: message.id }); } catch {}
        console.log('👁️ Marking message as read:', message.id);
        try { s.emit('chat:message:read', { messageId: message.id }); } catch {}
      }
    };

    const handleDelivered = (data) => {
      if (!data || !data.chatId || !data.messageId) return;
      const { chatId, messageId, by } = data;
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deliveredBy: [...new Set([...(m.deliveredBy||[]), by])] } : m));
    };

    const handleRead = (data) => {
      if (!data || !data.chatId || !data.messageId) return;
      const { chatId, messageId, by } = data;
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, readBy: [...new Set([...(m.readBy||[]), by])] } : m));
    };

    const handleTyping = (data) => {
      if (!data || !data.chatId || !Array.isArray(data.users)) return;
      const { chatId, users } = data;
      if (chatId !== conversationId) return;
      
      const newTypingUsers = users.filter(u => u !== myUserId);
      const wasTyping = typingUsers.length > 0;
      const isNowTyping = newTypingUsers.length > 0;
      
      setTypingUsers(newTypingUsers);
      
      // Auto-scroll to bottom when typing indicator appears (but only if user is near bottom)
      if (!wasTyping && isNowTyping && !showScrollToBottom) {
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollToEnd({ animated: true });
          }
        }, 200); // Small delay to let the typing indicator render
      }
    };

    const handlePresence = (data) => {
      if (!data || !data.chatId) return;
      const { chatId, online } = data;
      if (chatId === conversationId) setIsOnline(!!online);
    };

    const handleReactionAdded = (data) => {
      if (!data || !data.chatId || !data.messageId || !data.reaction) return;
      const { chatId, messageId, reaction } = data;
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              reactions: [...(msg.reactions || []), reaction]
            }
          : msg
      ));
    };

    const handleReactionRemoved = (data) => {
      if (!data || !data.chatId || !data.messageId || !data.userId || !data.emoji) return;
      const { chatId, messageId, userId, emoji } = data;
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              reactions: (msg.reactions || []).filter(r => 
                !(r.userId === userId && r.emoji === emoji)
              )
            }
          : msg
      ));
    };

    s.emit('chat:join', { chatId: conversationId });
    
    // Auto-mark all messages as read when chat is opened
    const markChatAsReadOnOpen = () => {
      console.log('📖 Auto-marking chat as read on open:', conversationId);
      try {
        s.emit('chat:mark-all-read', { chatId: conversationId });
      } catch (error) {
        console.error('❌ Error auto-marking chat as read:', error);
      }
    };
    
    // Mark as read after a shorter delay for better UX
    const markReadTimeout = setTimeout(markChatAsReadOnOpen, 800);
    
    s.on('chat:history', handleHistory);
    s.on('chat:message', handleMessage);
    s.on('chat:delivered', handleDelivered);
    s.on('chat:read', handleRead);
    s.on('chat:typing', handleTyping);
    s.on('chat:presence', handlePresence);
    s.on('chat:reaction:added', handleReactionAdded);
    s.on('chat:reaction:removed', handleReactionRemoved);
    
    // Handle message editing
    s.on('chat:message:edited', (data) => {
      if (!data || !data.chatId || !data.messageId) return;
      const { chatId, messageId, text } = data;
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text, isEdited: true, updatedAt: Date.now() }
          : msg
      ));
    });

    // Handle message deletion
    s.on('chat:message:deleted', (data) => {
      if (!data || !data.chatId || !data.messageId) return;
      const { chatId, messageId } = data;
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: 'This message was deleted', isDeleted: true }
          : msg
      ));
    });
    
    // Handle toggle events
    s.on('chat:reaction:toggle', (data) => {
      if (!data || !data.chatId) return;
      const { chatId, messageId, action, reaction, userId, emoji } = data;
      if (chatId !== conversationId) return;
      if (action === 'added' && reaction) {
        handleReactionAdded({ chatId, messageId, reaction });
      } else if (action === 'removed' && userId && emoji) {
        handleReactionRemoved({ chatId, messageId, userId, emoji });
      }
    });

    s.on('chat:message:blocked', (data) => {
      let message;
      switch (data.reason) {
        case 'user_blocked':
          message = 'You cannot send messages because you have blocked this user.';
          break;
        case 'blocked_by_user':
          message = 'You cannot send messages because this user has blocked you.';
          break;
        case 'not_friends':
          message = 'You can only send messages to friends. Send a friend request first.';
          break;
        default:
          message = 'You cannot send messages to this user.';
      }
      
      Alert.alert('Message blocked', message);
    });

    // Real-time friend request events
    s.on('friend:request:received', (data) => {
      console.log('📨 Received friend request:', data);
      console.log('🔍 Checking if this is for current user:', data.receiver_id, '===', myUserId);
      if (data.receiver_id === myUserId) {
        console.log('✅ Setting request status to received');
        setRequestStatus({
          type: 'friend_request',
          direction: 'received',
          requestId: data.requestId
        });
        
        // Set otherUserId if not already set
        if (!otherUserId && data.sender_id) {
          console.log('📝 Setting otherUserId from received friend request:', data.sender_id);
          setOtherUserId(data.sender_id);
        }
      } else {
        console.log('❌ Friend request not for current user');
      }
    });

    s.on('friend:request:sent', (data) => {
      console.log('📤 Friend request sent confirmed:', data);
      console.log('🔍 Checking if this is from current user:', data.sender_id, '===', myUserId);
      if (data.sender_id === myUserId) {
        console.log('✅ Setting request status to sent');
        setRequestStatus({
          type: 'friend_request',
          direction: 'sent',
          requestId: data.requestId
        });
        
        // Set otherUserId if not already set
        if (!otherUserId && data.receiver_id) {
          console.log('📝 Setting otherUserId from sent friend request:', data.receiver_id);
          setOtherUserId(data.receiver_id);
        }
      } else {
        console.log('❌ Friend request not from current user');
      }
    });

    s.on('friend:request:accepted', (data) => {
      console.log('✅ Friend request accepted:', data);
      console.log('🔍 Checking if accepted request involves otherUserId:', otherUserId);
      console.log('🔍 data.sender_id:', data.sender_id, 'data.receiver_id:', data.receiver_id);
      
      // Check if this event involves the current user (myUserId)
      const isForCurrentUser = data.sender_id === myUserId || data.receiver_id === myUserId;
      
      // Also check if we know the otherUserId and it matches
      const isForCurrentChat = otherUserId && (data.sender_id === otherUserId || data.receiver_id === otherUserId);
      
      console.log('🔍 Event matching check:', { 
        isForCurrentUser, 
        isForCurrentChat, 
        myUserId, 
        otherUserId,
        eventSenderId: data.sender_id,
        eventReceiverId: data.receiver_id
      });
      
      if (isForCurrentUser) {
        console.log('✅ Friend request accepted - updating friendship status to friends');
        setFriendshipStatus('friends');
        setRequestStatus(null);
        setChatDisabled(false);
        
        // Update otherUserId if it's not set yet
        if (!otherUserId) {
          const newOtherUserId = data.sender_id !== myUserId ? data.sender_id : data.receiver_id;
          console.log('📝 Setting otherUserId from friend request event:', newOtherUserId);
          setOtherUserId(newOtherUserId);
        }
        
        // Immediately refresh the friendship status to make sure it's in sync
        const targetUserId = otherUserId || (data.sender_id !== myUserId ? data.sender_id : data.receiver_id);
        if (targetUserId) {
          console.log('🔄 Immediately refreshing friendship status after friend request accepted');
          // Refresh immediately and again after 1 second to ensure it's updated
          checkFriendshipStatus(targetUserId);
          setTimeout(() => {
            console.log('🔄 Second refresh of friendship status');
            checkFriendshipStatus(targetUserId);
          }, 1000);
        }
      } else {
        console.log('❌ Friend request accepted but not for current chat user');
        console.log('❌ Debug info:', { otherUserId, conversationId, myUserId });
      }
    });

    s.on('friend:request:declined', (data) => {
      console.log('❌ Friend request declined:', data);
      if (data.sender_id === otherUserId || data.receiver_id === otherUserId) {
        setRequestStatus(null);
      }
    });

    s.on('friend:request:cancelled', (data) => {
      console.log('🚫 Friend request cancelled:', data);
      if (data.cancelledBy === otherUserId) {
        setRequestStatus(null);
      }
    });


    // Friend status changes (unfriend, etc.)
    s.on('friend:unfriended', (data) => {
      if (data.unfriendedBy === otherUserId) {
        setFriendshipStatus('not_friends');
        setRequestStatus(null);
        setChatDisabled(true);
      }
    });

    // Handle automatic friendship from matchmaking
    s.on('friend:auto_added', (data) => {
      console.log('👥 Automatic friendship created:', data);
      if (data.friend_id === otherUserId) {
        setFriendshipStatus('friends');
        setRequestStatus(null);
        setChatDisabled(false);
        
        // Show success message
        if (Platform.OS === 'web') {
          window.alert(`🎉 ${data.message}`);
        } else {
          Alert.alert('New Friend!', data.message);
        }
      }
    });

    // Chat clearing events
    s.on('chat:clear:success', (data) => {
      console.log('✅ Chat cleared successfully:', data);
      if (data.chatId === conversationId) {
        // Clear all messages from the UI for this user only
        setMessages([]);
        setDisplayedMessages([]);
        
        // Show success message explaining it's user-specific
        if (Platform.OS === 'web') {
          window.alert('Chat cleared successfully. Only you will see this change - the other person still has their chat history.');
        } else {
          Alert.alert('Chat Cleared', 'Chat cleared successfully. Only you will see this change - the other person still has their chat history.');
        }
        
        // Navigate back to chat list since this chat is now cleared for this user
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    });

    s.on('chat:clear:error', (data) => {
      console.error('❌ Chat clear error:', data);
      
      // Show error message
      if (Platform.OS === 'web') {
        window.alert('Error: ' + (data.error || 'Failed to clear chat. Please try again.'));
      } else {
        Alert.alert('Error', data.error || 'Failed to clear chat. Please try again.');
      }
    });

    // Note: Removed 'chat:cleared:by:other' handler since we no longer notify other users
    // when someone clears their chat - it's now user-specific

    return () => {
      // Clear the mark as read timeout
      clearTimeout(markReadTimeout);
      
      try { s.emit('chat:leave', { chatId: conversationId }); } catch {}
      try {
        s.off('chat:history', handleHistory);
        s.off('chat:message', handleMessage);
        s.off('chat:delivered', handleDelivered);
        s.off('chat:read', handleRead);
        s.off('chat:typing', handleTyping);
        s.off('chat:presence', handlePresence);
        s.off('chat:reaction:added', handleReactionAdded);
        s.off('chat:reaction:removed', handleReactionRemoved);
        s.off('chat:message:edited');
        s.off('chat:message:deleted');
        s.off('chat:message:blocked');
        s.off('friend:request:received');
        s.off('friend:request:sent');
        s.off('friend:request:accepted');
        s.off('friend:request:declined');
        s.off('friend:request:cancelled');
        s.off('friend:unfriended');
        s.off('friend:auto_added');
        s.off('chat:clear:success');
        s.off('chat:clear:error');
        s.off('chat:message:blocked');
        s.off('chat:message:sent');
        s.off('chat:message:delivery_receipt');
        s.off('chat:message:read_receipt');
      } catch {}
      
      // Remove background message handler
      socketService.removeMessageHandler(`chat-${conversationId}`);
      
      // Clear current chat ID to allow notifications again
      socketService.clearCurrentChatId();
    };
  }, [token, conversationId, chatDisabled]);

  // Check block status between users
  const checkBlockStatus = async (otherUserId) => {
    if (!token || !otherUserId) return;
    
    try {
      const response = await friendsApi.getBlockStatus(otherUserId, token);
      setBlockStatus(response);
      
      console.log('Block status:', response);
    } catch (error) {
      console.error('Failed to check block status:', error);
    }
  };

  // Check friendship status and pending requests between users
  const checkFriendshipStatus = async (otherUserId) => {
    if (!token || !otherUserId) {
      console.log('❌ Cannot check friendship status - missing token or otherUserId:', { token: !!token, otherUserId });
      return;
    }
    
    try {
      console.log('🔍 Checking friendship status for user:', otherUserId);
      console.log('🔍 My user ID:', myUserId);
      console.log('🔍 Other user ID:', otherUserId);
      console.log('🔍 Using token:', token ? 'Present' : 'Missing');
      
      const response = await friendsApi.getFriendStatus(otherUserId, token);
      console.log('✅ Raw friendship status response:', response);
      
      // Preserve the actual status from the API response, including "unknown"
      const status = response.status; // Keep original status: 'friends', 'not_friends', or 'unknown'
      console.log('📊 Determined friendship status:', status, 'from response.status:', response.status);
      
      setFriendshipStatus(status);
      console.log('📊 Friendship status state updated to:', status);
      
      // If not friends (but not unknown), check for pending requests
      if (status === 'not_friends') {
        console.log('👥 Not friends - checking for pending requests');
        await checkPendingRequests(otherUserId);
      } else if (status === 'friends') {
        console.log('👥 Already friends - clearing request status');
        setRequestStatus(null);
      } else if (status === 'unknown') {
        console.log('👥 Unknown friendship status - preserving state, not checking requests');
        // Don't check pending requests or clear request status for unknown status
      }
    } catch (error) {
      console.error('❌ Failed to check friendship status:', error);
      console.error('❌ Error details:', error.message);
      
      // Only set to 'not_friends' if current status is not already 'unknown'
      // This preserves the 'unknown' status when there are API errors
      if (friendshipStatus !== 'unknown') {
        setFriendshipStatus('not_friends');
        console.log('📊 Friendship status defaulted to: not_friends due to error');
        // Still check for pending requests even if friendship check failed
        await checkPendingRequests(otherUserId);
      } else {
        console.log('📊 Preserving unknown friendship status despite API error');
      }
    }
  };

  // Fetch chat members to find the other user ID
  const fetchChatMembers = async (chatId) => {
    console.log('👤 Attempting to determine otherUserId for chat:', chatId);
    
    // Check if we have otherUserId in the URL parameters
    if (paramOtherUserId && paramOtherUserId !== myUserId) {
      console.log('👤 Found otherUserId from URL params:', paramOtherUserId);
      setOtherUserId(paramOtherUserId);
      checkBlockStatus(paramOtherUserId);
      checkFriendshipStatus(paramOtherUserId);
      return;
    }
    
    // For now, since there's no specific chat members endpoint, 
    // we'll rely on the message-based detection or show UI with unknown status
    console.log('👤 No otherUserId available yet, will show UI with unknown status');
  };

  // Check for pending friend requests
  const checkPendingRequests = async (otherUserId) => {
    if (!token || !otherUserId) return;
    
    try {
      console.log('🔍 Checking pending friend requests for user:', otherUserId);
      
      // Check for pending friend requests
      const friendRequestResponse = await fetch(`${API_BASE_URL}/api/friends/pending-status/${otherUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (friendRequestResponse.ok) {
        const friendRequestData = await friendRequestResponse.json();
        console.log('📋 Friend request status:', friendRequestData);
        
        if (friendRequestData.hasPendingRequest) {
          setRequestStatus({
            type: 'friend_request',
            direction: friendRequestData.direction, // 'sent' or 'received'
            requestId: friendRequestData.requestId
          });
          console.log('📨 Found pending friend request:', friendRequestData.direction);
          return;
        }
      }
      
      // No pending requests found
      setRequestStatus(null);
      console.log('📭 No pending friend requests found');
      
    } catch (error) {
      console.error('❌ Failed to check pending friend requests:', error);
      setRequestStatus(null);
    }
  };

  // Update chat disabled status based on block and friendship status
  useEffect(() => {
    const isBlocked = blockStatus.isBlocked || blockStatus.isBlockedBy;
    const isNotFriends = friendshipStatus === 'not_friends' || friendshipStatus === 'none';
    const isUnknownStatus = friendshipStatus === 'unknown';
    // Disable chat if blocked, not friends, or status is still unknown
    const shouldDisable = isBlocked || isNotFriends || isUnknownStatus;
    
    console.log('💬 Chat status update:', {
      blockStatus,
      friendshipStatus,
      isBlocked,
      isNotFriends,
      isUnknownStatus,
      shouldDisable
    });
    
    setChatDisabled(shouldDisable);
  }, [blockStatus, friendshipStatus]);

  const handleSend = () => {
    if (chatDisabled) {
      const message = blockStatus.isBlocked 
        ? 'You cannot send messages because you have blocked this user.'
        : 'You cannot send messages because this user has blocked you.';
      Alert.alert('Message Blocked', message);
      return;
    }

    if (editingMessage) {
      // Handle edit
      const trimmed = composer.trim();
      if (!trimmed) return;
      
      handleEditMessage(editingMessage.id, trimmed);
      setEditingMessage(null);
      setComposer("");
    } else {
      // Handle new message
      const trimmed = composer.trim();
      if (!trimmed) return;
      
      // Create temporary message with 'sending' status
      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        senderId: myUserId,
        text: trimmed,
        createdAt: Date.now(),
        isEdited: false,
        isDeleted: false,
        reactions: [],
        status: 'sending',
      };
      
      // Add temporary message to UI
      setMessages(prev => [...prev, tempMessage]);
      
      const s = getSocket(token);
      try { 
        s.emit('chat:message', { chatId: conversationId, text: trimmed });
      } catch (error) {
        // If sending fails, update status to 'failed'
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        ));
      }
      setComposer("");
    }
    
    // Reset composer height
    Animated.timing(composerHeight, {
      toValue: 50,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const handleEditMessage = async (messageId, newText) => {
    try {
      // Use socket for real-time editing
      const s = getSocket(token);
      s.emit('chat:edit', { messageId, text: newText });
      
      // Also call API as backup
      await chatApi.editMessage(messageId, newText, token);
    } catch (error) {
      console.error('Failed to edit message:', error);
      Alert.alert('Error', 'Failed to edit message');
    }
  };

  const handleDeleteMessage = (message) => {
    setMessageToDelete(message);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    try {
      // Use socket for real-time deletion
      const s = getSocket(token);
      s.emit('chat:delete', { chatId: conversationId, messageId: messageToDelete.id });
      
      // Also call API as backup
      await chatApi.deleteMessage(conversationId, messageToDelete.id, token);
    } catch (error) {
      console.error('Failed to delete message:', error);
      Alert.alert('Error', 'Failed to delete message');
    } finally {
      setMessageToDelete(null);
    }
  };

  const handleMuteToggle = async () => {
    try {
      const newMutedState = !isChatMuted;
      
      // Call API to update mute status
      await chatApi.setMuteStatus(conversationId, newMutedState, token);
      setIsChatMuted(newMutedState);
      
      // Show feedback
      Alert.alert(
        'Notifications',
        newMutedState ? 'Notifications muted for this chat' : 'Notifications enabled for this chat'
      );
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleReactToMessage = (message, event) => {
    setSelectedMessage(message);
    
    // Position reaction bar above the message
    let position;
    if (event && event.nativeEvent) {
      const { pageX, pageY } = event.nativeEvent;
      position = { 
        x: Math.max(20, Math.min(pageX - 150, screenWidth - 320)), 
        y: pageY - 60 
      };
    } else {
      // Fallback position when called from menu (center of screen)
      position = { 
        x: Math.max(20, screenWidth / 2 - 150), 
        y: 200 
      };
    }
    
    setReactionBarPosition(position);
    setShowReactionBar(true);
  };

  const handleQuickReaction = async (emoji) => {
    if (!selectedMessage) return;
    
    try {
      // Use socket.io for real-time reactions with toggle functionality
      const s = getSocket(token);
      s.emit('chat:reaction:toggle', { 
        chatId: conversationId, 
        messageId: selectedMessage.id, 
        emoji 
      });
      
      // Close reaction bar
      setShowReactionBar(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const handleShowMoreEmojis = () => {
    setShowReactionBar(false);
    setShowReactionPicker(true);
  };

  const handleAddReaction = async (emoji) => {
    if (!selectedMessage) return;
    
    try {
      // Use socket.io for real-time reactions with toggle functionality
      const s = getSocket(token);
      s.emit('chat:reaction:toggle', { 
        chatId: conversationId, 
        messageId: selectedMessage.id, 
        emoji 
      });
      
      setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const startEditMessage = (message) => {
    setEditingMessage(message);
    setComposer(message.text);
  };

  const handleTypingChange = (text) => {
    setComposer(text);
    const s = getSocket(token);
    try { s.emit('chat:typing', { chatId: conversationId, typing: true }); } catch {}
    
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      try { s.emit('chat:typing', { chatId: conversationId, typing: false }); } catch {}
    }, 1000);
  };

  const handleInputContentSizeChange = (e) => {
    const h = e?.nativeEvent?.contentSize?.height ?? 50;
    const clamped = Math.min(120, Math.max(50, Math.ceil(h) + 14));
    Animated.timing(composerHeight, {
      toValue: clamped,
      duration: 120,
      useNativeDriver: false,
    }).start();
  };

  const handleKeyPress = (e) => {
    if (Platform.OS !== 'web') return;
    const key = e?.nativeEvent?.key || e?.key;
    const shift = !!(e?.nativeEvent?.shiftKey ?? e?.shiftKey);
    if (key === 'Enter') {
      if (shift) return;
      e.preventDefault?.();
      handleSend();
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const beforeIso = oldestAt ? new Date(oldestAt).toISOString() : undefined;
      const { messages: older } = await chatApi.getMessagesPaginated(conversationId, 30, beforeIso, token);
      const olderAsc = [...older].sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
      if (!olderAsc.length) setHasMore(false);
      setMessages(prev => [...olderAsc, ...prev]);
      if (olderAsc.length) setOldestAt(olderAsc[0].createdAt);
    } catch {}
    setLoadingMore(false);
  };

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const s = getSocket(token);
    viewableItems.forEach((vi) => {
      const item = vi.item;
      if (item && item.senderId && item.senderId !== myUserId) {
        try { s.emit('chat:delivered', { chatId: conversationId, messageId: item.id }); } catch {}
        try { s.emit('chat:read', { chatId: conversationId, messageId: item.id }); } catch {}
      }
    });
  }).current;

  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShowScrollToBottom(!isNearBottom);
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
      setShowScrollToBottom(false);
    }
  };

  // Load more messages for better performance (increase display limit)
  const loadMoreMessages = () => {
    if (messages.length > messageLimit) {
      setMessageLimit(prev => Math.min(prev + 30, messages.length));
    }
  };

  // Handle avatar click to show user profile
  const handleAvatarClick = () => {
    console.log('Avatar clicked, opening profile modal');
    setShowUserProfile(true);
  };

  // Voice call handlers
  const handleStartVoiceCall = async () => {
    console.log('🔘 Call button clicked!');
    console.log('📊 Call button debug info:', {
      otherUserId,
      friendshipStatus,
      conversationName,
      userAvatar,
      startVoiceCall: typeof startVoiceCall,
      platform: Platform.OS
    });

    // Test voice call service status
    console.log('🧪 Testing voice call service status...');
    const testResult = testVoiceCallService();
    console.log('🧪 Test result:', testResult);

    // Check if call is already in progress
    if (testResult.serviceExists && voiceCallService.isCallActive()) {
      console.warn('⚠️ Call already in progress, ignoring button click');
      Alert.alert('Call in Progress', 'You already have an active call. Please end the current call before starting a new one.');
      return;
    }

    // Mobile browser specific debugging with iOS HTTP detection
    if (Platform.OS === 'web') {
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isDevelopmentIP = typeof window !== 'undefined' && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.href);
      const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
      
      console.log('📱 Mobile browser debug info:', {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        isMobile: typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isIOS,
        isDevelopmentIP,
        isHTTP,
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        hasWebRTC: typeof window !== 'undefined' && !!window.RTCPeerConnection,
        hasMediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
        hasGetUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
        isSecureContext: typeof window !== 'undefined' && window.isSecureContext
      });
      
      // Show specific warning for iOS HTTP development
      if (isIOS && isDevelopmentIP && isHTTP) {
        console.warn('⚠️ iOS HTTP Development Mode Detected!');
        console.warn('⚠️ Voice calls will likely fail on iOS with HTTP on IP addresses');
        console.warn('⚠️ This is expected browser security behavior');
      }
    }

    // Proceed with actual voice call for all platforms

    if (!otherUserId || friendshipStatus !== 'friends') {
      console.log('❌ Cannot call - not friends or no otherUserId');
      Alert.alert('Cannot Call', 'You can only call friends.');
      return;
    }

    if (!startVoiceCall) {
      console.error('❌ startVoiceCall function is not available');
      Alert.alert('Error', 'Voice call functionality is not available.');
      return;
    }

    try {
      console.log('📞 Starting voice call to:', otherUserId);
      
      // For iOS Safari, trigger any pending audio play due to user interaction
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && voiceCallService.pendingRemoteAudioPlay) {
          console.log('🍎 iOS user interaction detected - enabling audio playback');
          voiceCallService.forcePlayRemoteAudio();
        }
      }
      
      await startVoiceCall(otherUserId, conversationName, userAvatar);
    } catch (error) {
      console.error('❌ Failed to start voice call:', error);
      
      // Enhanced error handling for iOS HTTP scenarios
      let errorTitle = 'Call Failed';
      let errorMessage = error.message || 'Failed to start voice call. Please try again.';
      
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof window !== 'undefined') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isDevelopmentIP = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.href);
        const isHTTP = window.location.protocol === 'http:';
        
        if (isIOS && isDevelopmentIP && isHTTP) {
          errorTitle = 'iOS Development Limitation';
          errorMessage = `Voice calls don't work on iOS with HTTP on IP addresses (${window.location.hostname}).\n\nThis is a browser security restriction.\n\nSolutions:\n• Use HTTPS instead of HTTP\n• Use localhost instead of IP\n• Test on Android/desktop for HTTP development`;
        }
      }
      
      Alert.alert(errorTitle, errorMessage);
    }
  };

  const handleCloseVoiceCall = () => {
    console.log('📞 Closing voice call modal');
    setShowVoiceCall(false);
    setVoiceCallData(null);
  };

  // Listen for incoming voice calls
  useEffect(() => {
    const socket = getSocket(token);
    if (!socket) return;

    const handleIncomingCall = (data) => {
      console.log('📞 Incoming voice call:', data);
      
      // Only show if it's from the current chat user
      if (data.callerId === otherUserId) {
        setVoiceCallData({
          name: data.callerName,
          avatar: data.callerAvatar,
          id: data.callerId
        });
        setShowVoiceCall(true);
      }
    };

    socket.on('voice:incoming-call', handleIncomingCall);

    return () => {
      socket.off('voice:incoming-call', handleIncomingCall);
    };
  }, [token, otherUserId]);

  // Clear chat function
  const handleClearChat = () => {
    console.log('🗑️ handleClearChat called');
    
    if (Platform.OS === 'web') {
      // Use custom dialog on web
      setShowClearChatConfirm(true);
    } else {
      // Use native alert on mobile
      Alert.alert(
        'Clear Chat History',
        'Are you sure you want to clear all messages in this conversation for yourself? The other person will still see their chat history. This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('Clear chat cancelled'),
          },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: confirmClearChat,
          },
        ]
      );
    }
  };

  // Confirm clear chat function
  const confirmClearChat = () => {
    console.log('🗑️ User confirmed clearing chat:', conversationId);
    const s = getSocket(token);
    if (s) {
      console.log('📡 Emitting chat:clear event');
      s.emit('chat:clear', { chatId: conversationId });
    } else {
      console.error('❌ No socket connection available');
      // Show error message
      if (Platform.OS === 'web') {
        window.alert('Unable to clear chat. Please try again.');
      } else {
        Alert.alert('Error', 'Unable to clear chat. Please try again.');
      }
    }
    
    // Close the custom dialog if it was used (web only)
    if (Platform.OS === 'web') {
      setShowClearChatConfirm(false);
    }
  };

  // Handle sending "Hi" message from empty state
  const handleSendHi = () => {
    const hiMessage = "Hi! 👋";
    setComposer(hiMessage);
    
    // Auto-send the message
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  return (
    <LinearGradient
      colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
      locations={[0, 0.55, 1]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background blur effects */}
      <View style={styles.blurCircleLarge} />
      <View style={styles.blurCircleSmall} />
      <View style={styles.blurCircleMedium} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        {Platform.OS === 'web' ? (
          <View style={[styles.header, styles.glassWeb]} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
            <Pressable 
              style={({ hovered }) => [
                styles.backButton, 
                hovered ? styles.headerBtnHoverWeb : null
              ]} 
              onPress={() => router.replace('/secure/chat')}
            >
              <Ionicons name="chevron-back" size={26} color="#FFE8FF" />
            </Pressable>
            
            <View style={styles.headerInfo}>
              <View style={styles.headerTitleRow}>
                <Pressable 
                  onPress={handleAvatarClick} 
                  style={({ pressed, hovered }) => [
                    { opacity: pressed ? 0.8 : hovered ? 0.9 : 1 }
                  ]}
                >
                  {userAvatar ? (
                    <Image source={{ uri: userAvatar }} style={styles.headerAvatarImage} />
                  ) : (
                    <LinearGradient
                      colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.2)"]}
                      style={styles.headerAvatar}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.headerAvatarText}>
                        {String(conversationName).charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerName} numberOfLines={1}>
                    {conversationName}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.onlineIndicator, { 
                      backgroundColor: isOnline ? '#00FF94' : 'rgba(255,255,255,0.4)' 
                    }]} />
                    <Text style={styles.headerStatus}>
                      {isOnline ? 'Active now' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {friendshipStatus === 'friends' && (
              <Pressable 
                style={({ hovered }) => [
                  styles.headerAction, 
                  hovered ? styles.headerBtnHoverWeb : null
                ]}
                onPress={handleStartVoiceCall}
              >
                <Ionicons name="call" size={22} color="#FFE8FF" />
              </Pressable>
            )}
            
            <Pressable 
              style={({ hovered }) => [
                styles.headerAction, 
                hovered ? styles.headerBtnHoverWeb : null
              ]}
              onPress={() => {
                console.log('📋 Opening chat menu (web)');
                setShowChatMenu(true);
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFE8FF" />
            </Pressable>
          </View>
        ) : (
          <BlurView intensity={35} tint="dark" style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/secure/chat')}>
              <Ionicons name="chevron-back" size={26} color="#FFE8FF" />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <View style={styles.headerTitleRow}>
                <Pressable 
                  onPress={handleAvatarClick} 
                  style={({ pressed }) => [
                    { opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  {userAvatar ? (
                    <Image source={{ uri: userAvatar }} style={styles.headerAvatarImage} />
                  ) : (
                    <LinearGradient
                      colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.2)"]}
                      style={styles.headerAvatar}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.headerAvatarText}>
                        {String(conversationName).charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerName} numberOfLines={1}>
                    {conversationName}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.onlineIndicator, { 
                      backgroundColor: isOnline ? '#00FF94' : 'rgba(255,255,255,0.4)' 
                    }]} />
                    <Text style={styles.headerStatus}>
                      {isOnline ? 'Active now' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {friendshipStatus === 'friends' && (
              <TouchableOpacity 
                style={styles.headerAction}
                onPress={handleStartVoiceCall}
              >
                <Ionicons name="call" size={22} color="#FFE8FF" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => {
                console.log('📋 Opening chat menu (mobile)');
                setShowChatMenu(true);
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFE8FF" />
            </TouchableOpacity>
          </BlurView>
        )}

        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: 'height' })}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Blocked Message */}
          {chatDisabled && (blockStatus.isBlocked || blockStatus.isBlockedBy) && (
            <BlockedMessage blockStatus={blockStatus} conversationName={conversationName} />
          )}
          
          {/* Not Friends Message */}
          {(() => {
            // Show NotFriendsMessage if chat is disabled due to not being friends (not blocked)
            const shouldShowNotFriends = chatDisabled && 
              (friendshipStatus === 'not_friends' || friendshipStatus === 'unknown' || friendshipStatus === 'none') && 
              !blockStatus.isBlocked && 
              !blockStatus.isBlockedBy &&
              otherUserId; // Only show if we have identified the other user
              
            
            return shouldShowNotFriends ? (
              <NotFriendsMessage 
                conversationName={conversationName} 
                otherUserId={otherUserId}
                requestStatus={requestStatus}
                onFriendRequestSent={() => {
                  // Refresh friendship status after sending request
                  if (otherUserId) checkFriendshipStatus(otherUserId);
                }}
              />
            ) : null;
          })()}
          
          {/* Messages */}
          <FlatList
            ref={listRef}
            data={deduplicateMessages(displayedMessages)}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={20}
            windowSize={10}
            getItemLayout={undefined} // Let FlatList calculate automatically for better performance
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isMine={item.senderId === myUserId}
                conversationName={conversationName}
                onEdit={startEditMessage}
                onDelete={handleDeleteMessage}
                onReact={handleReactToMessage}
                conversationId={conversationId}
                token={token}
                userAvatar={userAvatar}
              />
            )}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            ListHeaderComponent={() => {
              const hasMoreToLoad = messages.length > messageLimit;
              const hasMoreFromServer = hasMore;
              
              return (
                <View>
                  {hasMoreToLoad && (
                    <TouchableOpacity 
                      style={styles.loadMoreButton} 
                      onPress={loadMoreMessages}
                    >
                      <View style={styles.loadMoreContainer}>
                        <Text style={styles.loadMoreText}>
                          Load more messages ({messages.length - messageLimit} remaining)
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {!hasMoreToLoad && hasMoreFromServer && (
                    <TouchableOpacity 
                      style={styles.loadMoreButton} 
                      onPress={loadMore} 
                      disabled={loadingMore}
                    >
                      <View style={styles.loadMoreContainer}>
                        <Text style={styles.loadMoreText}>
                          {loadingMore ? "Loading..." : "Load earlier messages"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListFooterComponent={typingUsers.length ? (
              <Animated.View style={{ opacity: typingFade }}>
                <TypingDots label={`${String(conversationName).split(" ")[0]} is typing`} />
              </Animated.View>
            ) : null}
            ListEmptyComponent={() => (
              !chatDisabled && deduplicateMessages(displayedMessages).length === 0 ? (
                <EmptyChatAnimation 
                  conversationName={conversationName} 
                  onSendHi={handleSendHi}
                />
              ) : null
            )}
          />

          {/* Scroll to Bottom Button */}
          {showScrollToBottom && (
            <TouchableOpacity 
              style={styles.scrollToBottomButton}
              onPress={scrollToBottom}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6FB5', '#A16AE8']}
                style={styles.scrollToBottomGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="chevron-down" size={24} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Composer */}
          <View
            style={[
              styles.composerContainer,
              Platform.OS === 'web' ? styles.glassWeb : null,
              { paddingBottom: isKeyboardVisible ? 12 : Math.max((insets?.bottom || 0), 8) }
            ]}
          >
            {Platform.OS !== 'web' && (
              <BlurView intensity={25} tint="dark" style={styles.composerBlur} />
            )}
            <View style={styles.composerWrapper}>
              <Animated.View style={[styles.inputContainer, { height: composerHeight }]}>
                
                {/* Custom placeholder overlay to ensure exact vertical centering - only show when not blocked */}
                {!composer.trim().length && !chatDisabled && (
                  <View pointerEvents="none" style={styles.inputPlaceholder}>
                    <Text style={styles.placeholderText} numberOfLines={1}>
                      {editingMessage ? 'Edit message...' : 'Message...'}
                    </Text>
                  </View>
                )}
                <TextInput
                  style={[styles.textInput, chatDisabled && styles.textInputDisabled]}
                  placeholder={
                    chatDisabled 
                      ? (blockStatus.isBlocked 
                          ? "You have blocked this user" 
                          : blockStatus.isBlockedBy 
                            ? "This user has blocked you"
                            : "Send a friend request to message")
                      : "" // Remove placeholder when not blocked to avoid duplication with overlay
                  }
                  placeholderTextColor={chatDisabled ? (friendshipStatus === 'not_friends' ? "rgba(124, 43, 134, 0.6)" : "rgba(255, 68, 68, 0.6)") : "rgba(255, 255, 255, 0.6)"}
                  value={composer}
                  onChangeText={chatDisabled ? undefined : handleTypingChange}
                  onKeyPress={chatDisabled ? undefined : handleKeyPress}
                  onContentSizeChange={chatDisabled ? undefined : handleInputContentSizeChange}
                  multiline
                  scrollEnabled={false}
                  maxLength={2000}
                  editable={!chatDisabled}
                />
              </Animated.View>
              
              {editingMessage && (
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setEditingMessage(null);
                    setComposer("");
                  }}
                >
                  <Ionicons name="close" size={18} color="#FF4444" />
                </TouchableOpacity>
              )}
              
              {composer.trim() && !chatDisabled ? (
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                  <LinearGradient
                    colors={["#7C2B86", "#A16AE8"]}
                    style={styles.sendGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons 
                      name={editingMessage ? "checkmark" : "paper-plane"} 
                      size={20} 
                      color="#FFFFFF" 
                      style={editingMessage ? {} : { transform: [{ rotate: '45deg' }] }}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              ) : chatDisabled ? (
                <TouchableOpacity style={[styles.sendButton, styles.sendButtonDisabled]} disabled>
                  <View style={styles.sendGradientDisabled}>
                    <Ionicons name="ban" size={18} color="#FF4444" />
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ReactionBar
        visible={showReactionBar}
        onSelectEmoji={handleQuickReaction}
        onShowMore={handleShowMoreEmojis}
        onClose={() => {
          setShowReactionBar(false);
          setSelectedMessage(null);
        }}
        position={reactionBarPosition}
        existingReactions={selectedMessage?.reactions || []}
        currentUserId={myUserId}
      />

      <ReactionPicker
        visible={showReactionPicker}
        onClose={() => setShowReactionPicker(false)}
        onSelectEmoji={handleAddReaction}
      />

      <ConfirmationDialog
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteMessage}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        destructive={true}
      />

      <ConfirmationDialog
        visible={showClearChatConfirm}
        onClose={() => setShowClearChatConfirm(false)}
        onConfirm={confirmClearChat}
        title="Clear Chat History"
        message="Are you sure you want to clear all messages in this conversation for yourself? The other person will still see their chat history. This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        destructive={true}
      />

      <ChatOptionsMenu
        visible={showChatMenu}
        onClose={() => setShowChatMenu(false)}
        onMuteToggle={handleMuteToggle}
        onClearChat={handleClearChat}
        isMuted={isChatMuted}
      />

      <UserProfileModal
        visible={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        userId={otherUserId || conversationId}
        userName={conversationName}
        userAvatar={userAvatar}
      />

      <VoiceCallModal
        visible={showVoiceCall}
        onClose={handleCloseVoiceCall}
        callData={voiceCallData}
        token={token}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      width: '100%',
    }),
  },
  safeArea: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100%',
      width: '100%',
    }),
  },
  flex: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100%',
      width: '100%',
    }),
  },
  
  // Background blur effects
  blurCircleLarge: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 214, 242, 0.2)",
    top: -100,
    right: -80,
    opacity: 0.8,
  },
  blurCircleSmall: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    bottom: 40,
    left: -60,
    opacity: 0.6,
  },
  blurCircleMedium: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(161, 106, 232, 0.15)",
    top: "40%",
    right: -30,
    opacity: 0.4,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassWeb: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(20px)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 20,
  },
  headerBtnHoverWeb: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: 'scale(1.05)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  headerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  headerAvatarText: {
    color: '#FFE8FF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    color: '#FFE8FF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerStatus: {
    color: 'rgba(255, 232, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  headerAction: {
    padding: 10,
    marginLeft: 4,
    borderRadius: 20,
  },
  
  // Messages Styles
  messagesContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2, // Reduced from 3 to 2
    alignItems: 'flex-end',
    position: 'relative',
    marginBottom: 6, // Reduced from 12 to 6 - less space between bubbles
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowTheirs: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 10,
    marginBottom: 6,
  },
  messageAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  messageFallbackAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  messageFallbackAvatarText: {
    color: '#FFE8FF',
    fontSize: 11,
    fontWeight: '700',
  },
  messageBubble: {
    maxWidth: '75%', // Reduced from 78% to 75% - smaller bubbles
    borderRadius: 16, // Reduced from 20 to 16 - smaller radius
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6, // Reduced from 8 to 6
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    marginLeft: 40,
  },
  theirMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderBottomLeftRadius: 6,
    marginRight: 40,
    backdropFilter: 'blur(10px)',
  },
  myBubbleGradient: {
    borderRadius: 16, // Reduced from 20 to 16
    borderBottomRightRadius: 6,
    paddingHorizontal: 12, // Reduced from 16 to 12 - smaller padding
    paddingVertical: 8, // Reduced from 12 to 8 - smaller padding
  },
  myMessageText: {
    color: '#7C2B86',
    fontSize: 15, // Reduced from 16 to 15 - smaller text
    lineHeight: 20, // Reduced from 22 to 20
    fontWeight: '500',
  },
  theirMessageText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 15, // Reduced from 16 to 15 - smaller text
    lineHeight: 20, // Reduced from 22 to 20
    fontWeight: '400',
    paddingHorizontal: 12, // Reduced from 16 to 12 - smaller padding
    paddingTop: 8, // Reduced from 12 to 8 - smaller padding
    paddingBottom: 4, // Reduced from 6 to 4
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2, // Reduced from 4 to 2
    paddingHorizontal: 12, // Reduced from 16 to 12
    paddingBottom: 8, // Reduced from 12 to 8 - smaller padding
  },
  myTimestamp: {
    color: 'rgba(124, 43, 134, 0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  theirTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  messageStatus: {
    marginLeft: 6,
  },
  editedLabel: {
    fontSize: 11,
    color: 'rgba(124, 43, 134, 0.6)',
    fontStyle: 'italic',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  
  // Reactions - WhatsApp/Instagram style at bottom of bubble
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'absolute',
    bottom: -8,
    zIndex: 10,
  },
  reactionsContainerMine: {
    right: 8,
    justifyContent: 'flex-end',
  },
  reactionsContainerTheirs: {
    left: 48, // Account for avatar space
    justifyContent: 'flex-start',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 28,
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 10,
    color: '#7C2B86',
    fontWeight: '700',
  },
  
  // Typing Indicator
  typingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  typingBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '78%',
    marginRight: 40,
    backdropFilter: 'blur(10px)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 16,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFE8FF',
    marginHorizontal: 2,
  },
  typingLabel: {
    color: 'rgba(255, 232, 255, 0.8)',
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 12,
    marginBottom: 4,
  },
  
  // Composer Styles
  composerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 12,
    paddingBottom: 12,
  },
  composerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  composerWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
    position: 'relative',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
    // Ensure vertical centering on Android
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
  },
  inputPlaceholder: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    includeFontPadding: false,
  },
  sendButton: {
    marginLeft: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C2B86',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    alignSelf: 'flex-end',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      boxShadow: '0px 2px 6px rgba(124, 43, 134, 0.25)',
      marginBottom: 6, // Better alignment on web
    }),
    ...(Platform.OS !== 'web' && {
      marginBottom: 1, // Keep original mobile alignment
    }),
  },
  sendGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    alignSelf: 'flex-end',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      marginBottom: 8, // Better alignment on web
    }),
    ...(Platform.OS !== 'web' && {
      marginBottom: 2, // Keep original mobile alignment
    }),
  },
  
  // Load More
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  loadMoreContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
  },
  loadMoreText: {
    color: 'rgba(255, 232, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  },

  // Scroll to Bottom Button
  scrollToBottomButton: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 100 : 120,
    right: 20,
    zIndex: 1000,
    elevation: 10,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  scrollToBottomGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...(Platform.OS === 'web' && {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    }),
  },

  // Blocked Message Styles
  blockedMessageContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.1)',
  },
  blockedMessageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(255, 68, 68, 0.1)',
    } : {
      shadowColor: '#FF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  blockedMessageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF4444',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  blockedMessageText: {
    fontSize: 14,
    color: 'rgba(255, 68, 68, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Not Friends Message Styles
  notFriendsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 43, 134, 0.1)',
  },
  notFriendsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.2)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(124, 43, 134, 0.1)',
    } : {
      shadowColor: '#7C2B86',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  notFriendsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C2B86',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  notFriendsText: {
    fontSize: 14,
    color: 'rgba(124, 43, 134, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  friendRequestButton: {
    // Gradient background handled by LinearGradient
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  declineButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  declineButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  requestStatusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.2)',
    gap: 8,
  },
  requestStatusText: {
    color: '#7C2B86',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  requestStatusSubtext: {
    color: 'rgba(124, 43, 134, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },

  // Disabled Input Styles
  textInputDisabled: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
    color: 'rgba(255, 68, 68, 0.7)',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradientDisabled: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },

  // Modern Empty Chat Styles
  emptyChatContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    minHeight: 400,
    position: 'relative',
  },
  
  // Modern Chat Icon
  modernChatIcon: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  floatingDots: {
    position: 'absolute',
    width: 120,
    height: 120,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.4)',
  },
  dot1: {
    top: 10,
    right: 20,
    animationDelay: '0s',
  },
  dot2: {
    bottom: 15,
    left: 15,
    animationDelay: '0.5s',
  },
  dot3: {
    top: 20,
    left: 10,
    animationDelay: '1s',
  },
  
  // Professional Heading
  headingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modernTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modernSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  nameHighlight: {
    color: '#6366f1',
    fontWeight: '700',
  },
  
  // Suggestions
  suggestionsContainer: {
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  suggestionText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    fontWeight: '600',
  },
  
  // Modern Button
  modernSendButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  modernButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 18,
    gap: 12,
  },
  modernButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // Background Elements
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: -1,
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
  },
  bgCircle1: {
    width: 100,
    height: 100,
    top: '10%',
    right: '10%',
  },
  bgCircle2: {
    width: 60,
    height: 60,
    bottom: '20%',
    left: '15%',
  },
  bgCircle3: {
    width: 80,
    height: 80,
    top: '60%',
    right: '20%',
  },
});