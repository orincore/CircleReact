import VoiceCallModal from "@/components/VoiceCallModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { chatApi } from "@/src/api/chat";
import { API_BASE_URL } from "@/src/api/config";
import { friendsApi } from "@/src/api/friends";
import { getSocket } from "@/src/api/socket";
import CachedMediaImage from '@/src/components/CachedMediaImage';
import ChatOptionsMenu from "@/src/components/ChatOptionsMenu";
import ConfirmationDialog from "@/src/components/ConfirmationDialog";
import ReactionBar from "@/src/components/ReactionBar";
import ReactionPicker from "@/src/components/ReactionPicker";
import UserProfileModal from "@/src/components/UserProfileModal";
import useBrowserNotifications from "@/src/hooks/useBrowserNotifications";
import { useResponsiveDimensions } from "@/src/hooks/useResponsiveDimensions";
import { useVoiceCall } from "@/src/hooks/useVoiceCall";
import MediaCacheService from '@/src/services/MediaCacheService';
import socketService from "@/src/services/socketService";
import { voiceCallService } from "@/src/services/VoiceCallService";
import { pickImage, pickVideo, takePhoto, uploadMediaToS3 } from '@/src/utils/mediaUpload';
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: screenWidth } = Dimensions.get('window');

// Hide scrollbar on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* Hide scrollbar for Chrome, Safari and Opera */
    *::-webkit-scrollbar {
      display: none;
    }
    
    /* Hide scrollbar for IE, Edge and Firefox */
    * {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `;
  document.head.appendChild(style);
}

// Modern Empty Chat Component
const EmptyChatAnimation = ({ conversationName, onSendHi, theme, isDarkMode }) => {
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

  // Keep otherUserId in sync with route param if it changes
  useEffect(() => {
    if (paramOtherUserId && typeof paramOtherUserId === 'string') {
      setOtherUserId(paramOtherUserId);
    }
  }, [paramOtherUserId]);
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
          colors={[theme.primary, theme.decorative1]}
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
        <Text style={[styles.modernTitle, { color: theme.textPrimary }]}>Welcome to your conversation</Text>
        <Text style={[styles.modernSubtitle, { color: theme.textSecondary }]}>
          Start connecting with <Text style={[styles.nameHighlight, { color: theme.primary }]}>{conversationName}</Text>
        </Text>
      </View>

      {/* Connection suggestions */}
      <View style={styles.suggestionsContainer}>
        <View style={styles.suggestionItem}>
          <View style={styles.suggestionIcon}>
            <Ionicons name="hand-right" size={16} color={theme.primary} />
          </View>
          <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>Say hello and introduce yourself</Text>
        </View>
        <View style={styles.suggestionItem}>
          <View style={styles.suggestionIcon}>
            <Ionicons name="help-circle" size={16} color={theme.primary} />
          </View>
          <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>Ask about their interests</Text>
        </View>
        <View style={styles.suggestionItem}>
          <View style={styles.suggestionIcon}>
            <Ionicons name="happy" size={16} color={theme.primary} />
          </View>
          <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>Share something fun about yourself</Text>
        </View>
      </View>

      {/* Modern CTA button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={styles.modernSendButton} onPress={onSendHi}>
          <View
            style={[styles.modernButtonGradient, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="paper-plane" size={18} color="white" />
            <Text style={styles.modernButtonText}>Start Conversation</Text>
          </View>
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

// Enhanced MessageBubble component with interactions
const MessageBubble = ({ message, isMine, conversationName, userAvatar, onEdit, onDelete, onReact, theme, isDarkMode, dynamicStyles }) => {
  const [showMenu, setShowMenu] = useState(false);
  const isBrowser = Platform.OS === 'web';
  
 
  
  const handleLongPress = () => {
    if (isMine && onEdit && onDelete) {
      // Show edit/delete options for own messages
      Alert.alert(
        'Message Options',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => onEdit(message) },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(message) },
        ]
      );
    } else if (onReact) {
      // Show reaction options for any message
      onReact(message);
    }
  };

  const handlePress = () => {
    // For non-own messages on browser, show emoji picker for reactions
    if (!isMine && isBrowser && onReact) {
      onReact(message);
    }
  };

  const handleMenuPress = (e) => {
    if (isBrowser && e?.stopPropagation) {
      e.stopPropagation();
    }
    setShowMenu(!showMenu);
  };

  const handleMenuAction = (action) => {
    setShowMenu(false);
    
    // Add small delay to ensure menu closes first
    setTimeout(() => {
      switch (action) {
        case 'edit':
          if (onEdit) {
            onEdit(message);
          }
          break;
        case 'delete':
          if (onDelete) {
            onDelete(message);
          }
          break;
        case 'react':
          if (onReact) {
            onReact(message);
          }
          break;
      }
    }, 100);
  };

  // Close menu when clicking outside (for browser)
  useEffect(() => {
    if (isBrowser && showMenu) {
      const handleClickOutside = () => setShowMenu(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu, isBrowser]);


  // Don't render messages that have no content
  if ((!message.text || message.text.trim() === '') && !message.mediaUrl) {
    return null;
  }

  return (
    <Pressable
      onLongPress={handleLongPress}
      onPress={handlePress}
      style={[{
        flexDirection: 'row',
        marginVertical: 6,
        paddingHorizontal: 12,
        alignItems: 'flex-end',
        justifyContent: isMine ? 'flex-end' : 'flex-start'
      }]}
    >
      {!isMine && (
        <View style={[styles.avatarContainer, { marginRight: 12, marginBottom: 6 }]}>
          {userAvatar && userAvatar.trim() ? (
            <Image 
              source={{ uri: userAvatar }} 
              style={styles.messageAvatarImage}
            />
          ) : (
            <View style={[styles.messageFallbackAvatar, { 
              backgroundColor: theme.surfaceSecondary,
              width: 36,
              height: 36,
              borderRadius: 18,
              shadowColor: theme.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 3
            }]}>
              <Text style={[styles.messageFallbackAvatarText, { color: theme.textPrimary }]}>
                {String(conversationName).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={[
        isMine ? dynamicStyles.myMessageBubble : dynamicStyles.otherMessageBubble
      ]}>
        {isMine ? (
          <>
            {/* 3-dot menu for browser users - inside bubble - only for own messages */}
            {isBrowser && isMine && (
              <TouchableOpacity 
                style={[styles.messageMenuButton, styles.messageMenuButtonMine]}
                onPress={handleMenuPress}
              >
                <Ionicons name="ellipsis-vertical" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            
            {/* Media Content */}
            {message.mediaUrl && (
              <View style={styles.mediaContainer}>
                {message.mediaType === 'image' ? (
                  <CachedMediaImage 
                    messageId={message.id}
                    mediaUrl={message.mediaUrl}
                    mediaType={message.mediaType}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                ) : message.mediaType === 'video' ? (
                  <View style={styles.videoContainer}>
                    {message.thumbnail && (
                      <CachedMediaImage 
                        messageId={`${message.id}_thumbnail`}
                        mediaUrl={message.thumbnail}
                        mediaType="image"
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.videoPlayButton}>
                      <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                ) : null}
              </View>
            )}
            
            {message.text && (
              <Text style={[styles.myMessageText, dynamicStyles.myMessageText]}>
                {message.text}
              </Text>
            )}
            {message.isEdited && (
              <Text style={styles.editedLabel}>edited</Text>
            )}
            <View style={[styles.messageFooter, dynamicStyles.messageFooter]}>
              <Text style={[styles.myTimestamp, dynamicStyles.myTimestamp]}>
                {new Date(message.createdAt ?? Date.now()).toLocaleTimeString([], { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </Text>
              <View style={[styles.messageStatus, dynamicStyles.messageStatus]}>
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
                    message.status === 'read' ? '#FFFFFF' : 
                    message.status === 'delivered' ? 'rgba(255,255,255,0.8)' : 
                    message.status === 'sent' ? 'rgba(255,255,255,0.6)' :
                    message.status === 'sending' ? 'rgba(255,255,255,0.5)' :
                    message.status === 'failed' ? '#FF4444' :
                    'rgba(255,255,255,0.4)'
                  }
                />
              </View>
            </View>

            {message.reactions && message.reactions.length > 0 && (
              <View style={styles.reactionsContainer}>
                {message.reactions.map((reaction, index) => (
                  <View key={index} style={styles.reactionBubble}>
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                    <Text style={styles.reactionCount}>{reaction.count || 1}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Media Content */}
            {message.mediaUrl && (
              <View style={styles.mediaContainer}>
                {message.mediaType === 'image' ? (
                  <CachedMediaImage 
                    messageId={message.id}
                    mediaUrl={message.mediaUrl}
                    mediaType={message.mediaType}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                ) : message.mediaType === 'video' ? (
                  <View style={styles.videoContainer}>
                    {message.thumbnail && (
                      <CachedMediaImage 
                        messageId={`${message.id}_thumbnail`}
                        mediaUrl={message.thumbnail}
                        mediaType="image"
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.videoPlayButton}>
                      <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                ) : null}
              </View>
            )}
            
            {message.text && (
              <Text style={[styles.theirMessageText, dynamicStyles.otherMessageText]}>
                {message.text}
              </Text>
            )}
            {message.isEdited && (
              <Text style={styles.editedLabel}>edited</Text>
            )}
            <View style={[styles.messageFooter, dynamicStyles.messageFooter]}>
              <Text style={[styles.theirTimestamp, dynamicStyles.theirTimestamp]}>
                {new Date(message.createdAt ?? Date.now()).toLocaleTimeString([], { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </Text>
            </View>

            {message.reactions && message.reactions.length > 0 && (
              <View style={styles.reactionsContainer}>
                {message.reactions.map((reaction, index) => (
                  <View key={index} style={styles.reactionBubble}>
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                    <Text style={styles.reactionCount}>{reaction.count || 1}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
      
      {/* Dropdown menu positioned relative to message bubble - only for own messages */}
      {isBrowser && showMenu && isMine && (
        <>
          {/* Invisible overlay to catch outside clicks */}
          <TouchableOpacity 
            style={styles.menuOverlay}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          <View style={[
            styles.messageDropdown,
            isMine ? styles.messageDropdownMine : styles.messageDropdownTheirs
          ]}>
            {isMine && onEdit && (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  handleMenuAction('edit');
                }}
              >
                <Ionicons name="create-outline" size={14} color="#7C2B86" />
                <Text style={styles.menuItemText}>Edit</Text>
              </TouchableOpacity>
            )}
            {isMine && onEdit && onDelete && <View style={styles.menuSeparator} />}
            {isMine && onDelete && (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  handleMenuAction('delete');
                }}
              >
                <Ionicons name="trash-outline" size={14} color="#FF4444" />
                <Text style={[styles.menuItemText, { color: '#FF4444' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
      
    </Pressable>
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
      // eslint-disable-next-line no-console
      console.error('Failed to send friend request:', error);
      
      // Show specific error message
      let errorMessage = 'Failed to send friend request. Please try again.';
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('Socket connection not available')) {
        errorMessage = 'Connection issue. Please refresh the page and try again.';
      } else if (error.message.includes('already sent')) {
        errorMessage = 'Friend request already sent to this user.';
      } else if (error.message.includes('already friends')) {
        errorMessage = 'You are already friends with this user.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSendingRequest(false);
    }
  };


  const handleAcceptFriendRequest = async () => {
    if (!requestStatus?.requestId || !token || sendingRequest) return;
    
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
      // eslint-disable-next-line no-console
      console.error('Failed to accept friend request:', error);
      
      // Show specific error message
      let errorMessage = 'Failed to accept friend request. Please try again.';
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('Socket connection not available')) {
        errorMessage = 'Connection issue. Please refresh the page and try again.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Friend request no longer exists. It may have been cancelled.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!requestStatus?.requestId || !token || sendingRequest) return;
    
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
      // eslint-disable-next-line no-console
      console.error('Failed to decline friend request:', error);
      
      // Show specific error message
      let errorMessage = 'Failed to decline friend request. Please try again.';
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('Socket connection not available')) {
        errorMessage = 'Connection issue. Please refresh the page and try again.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Friend request no longer exists. It may have been cancelled.';
      }
      
      Alert.alert('Error', errorMessage);
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

function TypingDots({ label, theme, isDarkMode }) {
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
      <View
        style={[
          styles.typingBubble,
          {
            backgroundColor: isDarkMode
              ? 'rgba(15, 23, 42, 0.8)'
              : 'rgba(255, 255, 255, 0.9)',
            borderWidth: 1,
            borderColor: isDarkMode
              ? 'rgba(148, 163, 184, 0.5)'
              : 'rgba(148, 163, 184, 0.6)',
          },
        ]}
      >
        <View style={styles.typingDotsContainer}>
          <Animated.View style={[styles.typingDot, { 
            backgroundColor: isDarkMode ? theme.primary : theme.textSecondary,
            transform: [{ 
              translateY: d1.interpolate({ inputRange: [0,1], outputRange: [0, -3] }) 
            }],
            opacity: d1.interpolate({ inputRange: [0,1], outputRange: [0.4, 1] })
          }]} />
          <Animated.View style={[styles.typingDot, { 
            backgroundColor: isDarkMode ? theme.primary : theme.textSecondary,
            transform: [{ 
              translateY: d2.interpolate({ inputRange: [0,1], outputRange: [0, -3] }) 
            }],
            opacity: d2.interpolate({ inputRange: [0,1], outputRange: [0.4, 1] })
          }]} />
          <Animated.View style={[styles.typingDot, { 
            backgroundColor: isDarkMode ? theme.primary : theme.textSecondary,
            transform: [{ 
              translateY: d3.interpolate({ inputRange: [0,1], outputRange: [0, -3] }) 
            }],
            opacity: d3.interpolate({ inputRange: [0,1], outputRange: [0.4, 1] })
          }]} />
        </View>
      </View>
      {label && (
        <Text
          style={[
            styles.typingLabel,
            { color: isDarkMode ? theme.textSecondary : theme.textSecondary },
          ]}
        >
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
  const { theme, isDarkMode } = useTheme();
  const myUserId = user?.id ?? "me";
  const responsive = useResponsiveDimensions();
  
  // Create dynamic styles based on theme
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.surface,
      borderBottomWidth: isDarkMode ? 0 : 1,
      borderBottomColor: isDarkMode ? 'transparent' : theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    myMessageBubble: {
      backgroundColor: theme.primary,
      borderRadius: 20,
      borderBottomRightRadius: 4,
      paddingHorizontal: 18,
      paddingVertical: 12,
      marginVertical: 3,
      marginLeft: 40,
      maxWidth: '85%',
      alignSelf: 'flex-end',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.4 : 0.25,
      shadowRadius: 8,
      elevation: 5,
      position: 'relative', // anchor for reactions just outside bubble
    },
    otherMessageBubble: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 18,
      paddingVertical: 12,
      marginVertical: 3,
      marginRight: 40,
      maxWidth: '85%',
      alignSelf: 'flex-start',
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.12,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
      position: 'relative', // anchor for reactions just outside bubble
    },
    myMessageText: {
      color: '#FFFFFF',
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
    },
    otherMessageText: {
      color: theme.textPrimary,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
    },
    inputContainer: {
      backgroundColor: theme.surface,
      borderTopWidth: isDarkMode ? 0 : 1,
      borderTopColor: isDarkMode ? 'transparent' : theme.border,
      paddingHorizontal: 24,
      paddingVertical: 20,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: isDarkMode ? 0.5 : 0.15,
      shadowRadius: 16,
      elevation: 12,
    },
    textInput: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 28,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontWeight: '400',
      color: theme.textPrimary,
      borderWidth: isDarkMode ? 0 : 1.5,
      borderColor: isDarkMode ? 'transparent' : theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
      lineHeight: 22,
    },
    sendButton: {
      backgroundColor: theme.primary,
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 16,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.6 : 0.4,
      shadowRadius: 12,
      elevation: 8,
      transform: [{ scale: 1 }],
    },
    textInputFocused: {
      borderColor: theme.primary,
      borderWidth: 2,
      shadowColor: theme.primary,
      shadowOpacity: isDarkMode ? 0.4 : 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    textInputContainer: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
    },
    placeholderStyle: {
      color: theme.textPlaceholder,
      fontSize: 16,
      fontWeight: '400',
    },
    characterCounter: {
      position: 'absolute',
      bottom: 8,
      right: 12,
      fontSize: 11,
      color: theme.textMuted,
      backgroundColor: theme.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      opacity: 0.8,
    },
    inputIndicator: {
      position: 'absolute',
      bottom: -2,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: theme.primary,
      borderRadius: 1,
      transform: [{ scaleX: 0 }],
    },
    mediaButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 6,
      elevation: 3,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
      gap: 4,
    },
    myTimestamp: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '400',
    },
    theirTimestamp: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: '400',
    },
    messageStatus: {
      marginLeft: 2,
    },
  };
  
  // Responsive detection
  const [screenData, setScreenData] = useState(() => {
    const { width } = Dimensions.get('window');
    const isBrowser = Platform.OS === 'web';
    const isMobileBrowser = isBrowser && (
      typeof navigator !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
    const isDesktop = width >= 768 && !isMobileBrowser;
    
    return {
      width,
      isDesktop,
      isBrowser,
      isMobileBrowser
    };
  });
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const isBrowser = Platform.OS === 'web';
      const isMobileBrowser = isBrowser && (
        typeof navigator !== 'undefined' && 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
      const isDesktop = window.width >= 768 && !isMobileBrowser;
      
      setScreenData({
        width: window.width,
        isDesktop,
        isBrowser,
        isMobileBrowser
      });
    });
    return () => subscription?.remove();
  }, []);

  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState([]);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [oldestAt, setOldestAt] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [otherUserOnline, setOtherUserOnline] = useState(false);

  // Initialize media cache service
  useEffect(() => {
    const initializeCache = async () => {
      try {
        await MediaCacheService.initialize();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize media cache:', error);
      }
    };
    
    initializeCache();
  }, [conversationId]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  // Browser notifications - track current chat to prevent notifications
  const { setCurrentChatId } = useBrowserNotifications();
  
  // Voice call functionality
  const { startVoiceCall } = useVoiceCall();

  // Track current chat for browser notifications
  useEffect(() => {
    if (conversationId) {
      setCurrentChatId(conversationId);
    }
    
    // Clear current chat when component unmounts
    return () => {
      setCurrentChatId(null);
    };
  }, [conversationId, setCurrentChatId]);

  // Helper function to deduplicate messages
  const deduplicateMessages = (messageArray) => {
    const seen = new Set();
    return messageArray.filter(msg => {
      if (seen.has(msg.id)) {
        // eslint-disable-next-line no-console
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
  const invisibleMarginRef = useRef(null);
  const [composerMarginHeight, setComposerMarginHeight] = useState(screenData.isDesktop ? 60 : 40);
  const [composerContainerHeight, setComposerContainerHeight] = useState(0);
  const [desktopComposerHeight, setDesktopComposerHeight] = useState(160);
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(52);
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessage, setEmojiPickerMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [originalMessageText, setOriginalMessageText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimer, setRetryTimer] = useState(null);
  
  // Fetch chat members to get the other user ID
  const fetchChatMembers = async () => {
    if (!conversationId || !token || !myUserId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/${conversationId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Find the other user (not me)
        const otherMember = data.members?.find(member => member.user_id !== myUserId);
        if (otherMember) {
          setOtherUserId(otherMember.user_id);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching chat members:', error);
    }
  };

  // Fetch chat members directly when friend matching fails
  const fetchChatMembersDirectly = async () => {
    if (!conversationId || !token || !myUserId) {
      console.log('❌ Missing required data for fetchChatMembersDirectly');
      return;
    }
    
    console.log('🔍 Fetching chat members for conversationId:', conversationId);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/${conversationId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Chat members response:', data);
        
        // Find the other user (not me)
        const otherMember = data.members?.find(member => member.user_id !== myUserId);
        if (otherMember) {
          console.log('✅ Found other user:', otherMember.user_id);
          setOtherUserId(otherMember.user_id);
        } else {
          console.log('❌ No other user found in chat members');
        }
      } else {
        console.log('❌ Failed to fetch chat members:', response.status);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching chat members directly:', error);
    }
  };

  // Fetch user profile function (defined outside useEffect so it can be reused)
  const fetchUserProfile = async (userId) => {
    try {
      const targetUserId = userId || otherUserId;
      const response = await fetch(`${API_BASE_URL}/api/friends/user/${targetUserId}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        if (userData.profilePhotoUrl) {
          setUserAvatar(userData.profilePhotoUrl);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching user profile:', error);
    }
  };

  // Debug avatar state changes
  useEffect(() => {
    if (otherUserId && token) {
      fetchUserProfile();
    }
  }, [otherUserId, token]);

  // Check friendship status when otherUserId is available from params
  useEffect(() => {
    if (otherUserId && otherUserId !== myUserId && token) {
      checkBlockStatus(otherUserId);
      checkFriendshipStatus(otherUserId);
      
      // Fetch profile picture if not already provided
      if (!userAvatar) {
        fetchUserProfile(otherUserId);
      }
      
      // Periodically refresh friendship status every 10 seconds
      const friendshipInterval = setInterval(() => {
        checkFriendshipStatus(otherUserId);
      }, 10000);
      
      return () => clearInterval(friendshipInterval);
    }
  }, [otherUserId, token, myUserId]);

  // Try to extract otherUserId from conversationId if not available from params
  useEffect(() => {
    if (!otherUserId && conversationId && myUserId) {
      
      // If conversationId is a UUID, we need a different approach
      // For now, let's try to get it from the friendships table directly
      const tryExtractOtherUserId = async () => {
        if (!token) return;
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/friends/list`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Look for friends and try to match with the conversation
            if (data.friends && data.friends.length > 0) {
              if (data.friends.length === 1) {
                // If there's only one friend, it's likely the other user
                const friend = data.friends[0];
                const friendUserId = friend.user_id || friend.id;
                setOtherUserId(friendUserId);
              } else {
                // If there are multiple friends, try to find the one that matches the conversation
                // Backend returns chat_id, but conversationId might be the same
                const matchingFriend = data.friends.find(friend => 
                  friend.chat_id === conversationId || friend.conversation_id === conversationId
                );
                if (matchingFriend) {
                  const friendUserId = matchingFriend.user_id || matchingFriend.id;
                  setOtherUserId(friendUserId);
                } else {
                  // If no match found by chat_id, try to get chat members from the backend
                  console.log('🔍 No friend match found, fetching chat members directly...');
                  await fetchChatMembersDirectly();
                }
              }
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error trying to extract otherUserId:', error);
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
        // eslint-disable-next-line no-console
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
        scrollToBottom();
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

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        try {
          scrollToBottom();
        } catch (error) {
        }
      }, 100);
      return () => clearTimeout(timer);
    }
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

  // Socket connection monitoring and auto-retry
  useEffect(() => {
    if (!token) return;

    const { socketService: apiSocketService } = require('@/src/api/socket');
    
    // Connection state listener
    const handleConnectionState = (state) => {
      setConnectionStatus(state);
      
      if (state === 'disconnected' || state === 'reconnecting') {
        // Start auto-retry every 5 seconds
        if (retryTimer) {
          clearInterval(retryTimer);
        }
        
        const timer = setInterval(() => {
          setRetryCount(prev => prev + 1);
          
          try {
            const s = getSocket(token);
            if (s && s.connected) {
              setConnectionStatus('connected');
              setRetryCount(0);
              clearInterval(timer);
              setRetryTimer(null);
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Reconnection attempt failed:', error);
          }
        }, 5000);
        
        setRetryTimer(timer);
      } else if (state === 'connected') {
        // Clear retry timer when connected
        if (retryTimer) {
          clearInterval(retryTimer);
          setRetryTimer(null);
        }
        setRetryCount(0);
      }
    };

    // Add connection listener
    apiSocketService.addConnectionListener(handleConnectionState);
    
    // Initial connection state
    const initialState = apiSocketService.getConnectionState();
    setConnectionStatus(initialState);

    return () => {
      apiSocketService.removeConnectionListener(handleConnectionState);
      if (retryTimer) {
        clearInterval(retryTimer);
        setRetryTimer(null);
      }
    };
  }, [token, retryTimer]);

  // Socket connection logic (same as original)
  useEffect(() => {
    if (!token || !conversationId || !myUserId) return;

    // Set current chat ID in socket service to prevent notifications
    socketService.setCurrentChatId(conversationId);

    const s = getSocket(token);
    
    // Add a test listener to see if ANY socket events are being received
    s.onAny((eventName, ...args) => {
      if (eventName.startsWith('friend:')) {
      }
    });
    
    // Register for background messages for this chat
    const backgroundMessageHandler = (data) => {
      if (!data || !data.message) {
        // eslint-disable-next-line no-console
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
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: status } : msg
      ));
    };

    const handleReadReceipt = ({ messageId, chatId, status }) => {
      if (chatId !== conversationId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'read' } : msg
      ));
    };

    // Set up socket event listeners
    s.on('chat:message:sent', handleMessageSent);
    s.on('chat:message:delivery_receipt', handleDeliveryReceipt);
    s.on('chat:message:read_receipt', handleReadReceipt);

    s.emit('chat:join', { chatId: conversationId });
    
    // Auto-mark all messages as read when chat is opened
    const markChatAsReadOnOpen = () => {
      try {
        s.emit('chat:mark-all-read', { chatId: conversationId });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error auto-marking chat as read:', error);
      }
    };
    
    // Mark as read after a shorter delay for better UX
    const markReadTimeout = setTimeout(markChatAsReadOnOpen, 800);
    
    // Socket event handlers
    const handleHistory = (data) => {
      if (!data || !data.messages) return;

      // Ensure messages are in chronological order (oldest first)
      const sorted = [...data.messages].sort((a, b) => {
        const aTime = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime();
        const bTime = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime();
        return aTime - bTime;
      });

      setMessages(sorted);

      // Oldest message timestamp is now the first item
      if (sorted.length > 0) {
        setOldestAt(sorted[0].createdAt);
      } else if (data.oldestAt) {
        setOldestAt(data.oldestAt);
      }
    };

    const handleMessage = (data) => {
      if (!data || !data.message) return;
      const msg = data.message;
      if (msg.chatId !== conversationId) return;
      setMessages(prev => [...prev, msg]);
    };

    const handleDelivered = (data) => {
      if (!data || !data.messageId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, status: 'delivered' } : msg
      ));
    };

    const handleRead = (data) => {
      if (!data || !data.messageId) return;
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, status: 'read' } : msg
      ));
    };

    const handleTyping = (data) => {
      if (!data || !data.chatId) return;
      // Backend emits `{ chatId, users: string[] }` for in-conversation typing state
      const users = Array.isArray(data.users) ? data.users : [];
      // Do not show self in typing indicator
      const others = users.filter((u) => u && u !== myUserId);
      setTypingUsers(others);
    };

    const handlePresence = (data) => {
      if (!data || !data.chatId) return;
      // Only react to presence updates for this conversation
      if (data.chatId !== conversationId) return;
      // Backend emits `{ chatId, online }`; we also support `isOnline` for compatibility
      const online = typeof data.isOnline === 'boolean' ? data.isOnline : !!data.online;
      setOtherUserOnline(online);
      // Keep header status in sync with presence
      setIsOnline(online);
    };

    const handleReactionAdded = (data) => {
      if (!data || !data.messageId || !data.reaction) return;
      const { chatId, messageId, reaction } = data;
      if (chatId !== conversationId) return;
      
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          // Avoid duplicates if the same reaction arrives multiple times
          const exists = reactions.some(r => {
            if (r.id && reaction.id) return r.id === reaction.id;
            return r.userId === reaction.userId && r.emoji === reaction.emoji;
          });
          if (exists) return msg;
          return { ...msg, reactions: [...reactions, reaction] };
        }
        return msg;
      }));
    };

    const handleReactionRemoved = (data) => {
      if (!data || !data.messageId || !data.userId || !data.emoji) return;
      const { chatId, messageId, userId, emoji } = data;
      if (chatId !== conversationId) return;
      
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = (msg.reactions || []).filter(
            r => !(r.userId === userId && r.emoji === emoji)
          );
          return { ...msg, reactions };
        }
        return msg;
      }));
    };
    
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
      if (data.receiver_id === myUserId) {
        setRequestStatus({
          type: 'friend_request',
          direction: 'received',
          requestId: data.requestId
        });
        
        // Set otherUserId if not already set
        if (!otherUserId && data.sender_id) {
          setOtherUserId(data.sender_id);
        }
      }
    });

    s.on('friend:request:sent', (data) => {
      if (data.sender_id === myUserId) {
        setRequestStatus({
          type: 'friend_request',
          direction: 'sent',
          requestId: data.requestId
        });
        
        // Set otherUserId if not already set
        if (!otherUserId && data.receiver_id) {
          setOtherUserId(data.receiver_id);
        }
      }
    });

    s.on('friend:request:accepted', (data) => {
      console.log('🎉 Friend request accepted event received:', data);
      
      // Check if this event involves the current user (myUserId)
      const isForCurrentUser = data.sender_id === myUserId || data.receiver_id === myUserId;
      
      // Also check if we know the otherUserId and it matches
      const targetUserId = data.sender_id !== myUserId ? data.sender_id : data.receiver_id;
      const isForCurrentChat = otherUserId && (data.sender_id === otherUserId || data.receiver_id === otherUserId);
      
      if (isForCurrentUser) {
        console.log('✅ Updating friendship status to friends');
        setFriendshipStatus('friends');
        setRequestStatus(null);
        setChatDisabled(false);
        
        // Update otherUserId if it's not set yet
        if (!otherUserId) {
          const newOtherUserId = targetUserId;
          console.log('📝 Setting otherUserId:', newOtherUserId);
          setOtherUserId(newOtherUserId);
        }
        
        // Immediately refresh the friendship status to make sure it's in sync
        if (targetUserId) {
          console.log('🔄 Refreshing friendship status for:', targetUserId);
          checkFriendshipStatus(targetUserId);
          setTimeout(() => {
            checkFriendshipStatus(targetUserId);
          }, 1000);
        }
        
        // Show a toast notification
        if (isForCurrentChat) {
          console.log('🎊 You are now friends! You can send messages.');
        }
      }
    });

    s.on('friend:request:declined', (data) => {
      if (data.sender_id === otherUserId || data.receiver_id === otherUserId) {
        setRequestStatus(null);
      }
    });

    s.on('friend:request:cancelled', (data) => {
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
      if (data.friend_id === otherUserId) {
        setFriendshipStatus('friends');
        setRequestStatus(null);
        setChatDisabled(false);
        
        // Show success message
        if (Platform.OS === 'web') {
          window.alert(` ${data.message}`);
        } else {
          Alert.alert('New Friend!', data.message);
        }
      }
    });

    // Chat clearing events
    s.on('chat:clear:success', (data) => {
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
      // eslint-disable-next-line no-console
      console.error('Chat clear error:', data);
      
      // Show error message
      if (Platform.OS === 'web') {
        window.alert('Error: ' + (data.error || 'Failed to clear chat. Please try again.'));
      } else {
        Alert.alert('Error', data.error || 'Failed to clear chat. Please try again.');
      }
    });

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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to check block status:', error);
    }
  };

  // Check friendship status and pending requests between users
  const checkFriendshipStatus = async (otherUserId) => {
    if (!token || !otherUserId) {
      return;
    }
    
    try {
      const response = await friendsApi.getFriendStatus(otherUserId, token);
      const status = response.status; // Keep original status: 'friends', 'not_friends', or 'unknown'
      
      setFriendshipStatus(status);
      
      // If not friends (but not unknown), check for pending requests
      if (status === 'not_friends') {
        await checkPendingRequests(otherUserId);
      } else if (status === 'friends') {
        setRequestStatus(null);
      } else if (status === 'unknown') {
        // Don't check pending requests or clear request status for unknown status
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to check friendship status:', error);
      // eslint-disable-next-line no-console
      console.error('Error details:', error.message);
      
      // Only set to 'not_friends' if current status is not already 'unknown'
      // This preserves the 'unknown' status when there are API errors
      if (friendshipStatus !== 'unknown') {
        setFriendshipStatus('not_friends');
        await checkPendingRequests(otherUserId);
      }
    }
  };

  // Check for pending friend requests
  const checkPendingRequests = async (otherUserId) => {
    if (!token || !otherUserId) return;
    
    try {
      const friendRequestResponse = await fetch(`${API_BASE_URL}/api/friends/pending-status/${otherUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (friendRequestResponse.ok) {
        const friendRequestData = await friendRequestResponse.json();
        
        if (friendRequestData.hasPendingRequest) {
          setRequestStatus({
            type: 'friend_request',
            direction: friendRequestData.direction, // 'sent' or 'received'
            requestId: friendRequestData.requestId
          });
          return;
        }
      }
      
      // No pending requests found
      setRequestStatus(null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to check pending friend requests:', error);
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

  // Handle media selection and upload
  const handleMediaPick = async (type) => {
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setUploadingMedia(false);
      Alert.alert('Timeout', 'Media selection took too long. Please try again.');
    }, 30000); // 30 second timeout
    
    try {
      setShowMediaOptions(false);
      setUploadingMedia(true);

      let media = null;
      
      try {
        if (type === 'image') {
          media = await pickImage();
        } else if (type === 'video') {
          media = await pickVideo();
        } else if (type === 'camera') {
          media = await takePhoto();
        }
      } catch (pickerError) {
        // eslint-disable-next-line no-console
        console.error('Picker error:', pickerError);
        clearTimeout(timeoutId);
        setUploadingMedia(false);
        Alert.alert('Picker Error', pickerError.message || 'Failed to open media picker');
        return;
      }

      if (!media) {
        clearTimeout(timeoutId);
        setUploadingMedia(false);
        return;
      }

      // Validate media has required properties
      if (!media.uri) {
        // eslint-disable-next-line no-console
        console.error('Invalid media object - no URI:', media);
        clearTimeout(timeoutId);
        setUploadingMedia(false);
        Alert.alert('Error', 'Invalid media selected');
        return;
      }

      // Upload to S3
      const mediaType = media.type === 'video' ? 'video' : 'image';
      
      try {
        const uploadResult = await uploadMediaToS3(media.uri, mediaType, token);
        
        // Send media message
        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
          id: tempId,
          senderId: myUserId,
          mediaUrl: uploadResult.url,
          mediaType: uploadResult.type,
          thumbnail: uploadResult.thumbnail,
          text: '', // Empty text for media messages
          createdAt: Date.now(),
          isEdited: false,
          isDeleted: false,
          reactions: [],
          status: 'sending',
        };

        // Add temporary message to UI
        setMessages(prev => [...prev, tempMessage]);

        // Send via socket
        const s = getSocket(token);
        const messageData = {
          chatId: conversationId,
          text: '',
          mediaUrl: uploadResult.url,
          mediaType: uploadResult.type,
          thumbnail: uploadResult.thumbnail,
        };
        s.emit('chat:message', messageData);

        // Cache media with temporary message ID for now
        // Will be updated with actual message ID when confirmation is received
        if (uploadResult.tempCacheId) {
          await MediaCacheService.cacheMedia(tempId, {
            mediaUrl: uploadResult.url,
            mediaType: uploadResult.type,
            thumbnail: uploadResult.thumbnail,
            fileName: uploadResult.fileName || `${uploadResult.type}_${Date.now()}`,
            fileSize: uploadResult.size
          });
        }
      } catch (uploadError) {
        // eslint-disable-next-line no-console
        console.error('Upload error:', uploadError);
        clearTimeout(timeoutId);
        setUploadingMedia(false);
        Alert.alert('Upload Failed', uploadError.message || 'Failed to upload media to server');
        return;
      }

      clearTimeout(timeoutId);
      setUploadingMedia(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Media upload error:', error);
      clearTimeout(timeoutId);
      setUploadingMedia(false);
      Alert.alert('Upload Failed', error.message || 'Failed to upload media');
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    try {
      // Use socket for real-time editing
      const s = getSocket(token);
      s.emit('chat:edit', { messageId, text: newText });
      
      // Also call API as backup
      await chatApi.editMessage(messageId, newText, token);
    } catch (error) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Failed to toggle mute:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleReactToMessage = (message, event) => {
    if (Platform.OS === 'web') {
      // Show emoji picker on browser
      setEmojiPickerMessage(message);
      setShowEmojiPicker(true);
    } else {
      // Mobile: Show reaction bar
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
    }
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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Failed to toggle reaction:', error);
    }
  };

  const startEditMessage = (message) => {
    setEditingMessage(message);
    setEditingMessageId(message.id);
    setOriginalMessageText(message.text);
    setComposer(message.text);
    
    // Focus the input on web
    if (Platform.OS === 'web') {
      setTimeout(() => {
        const input = document.querySelector('textarea[placeholder*="Type"]');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 100);
    }
  };

  const handleTypingChange = (text) => {
    setComposer(text);
    const s = getSocket(token);
    // Emit both `isTyping` (new) and `typing` (legacy) so backend handlers and any older
    // servers can understand the event shape
    try { s.emit('chat:typing', { chatId: conversationId, isTyping: true, typing: true }); } catch {}
    
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      try { s.emit('chat:typing', { chatId: conversationId, isTyping: false, typing: false }); } catch {}
    }, 1000);
  };

  const handleInputContentSizeChange = (e) => {
    const height = e?.nativeEvent?.contentSize?.height ?? 40;
    // Use different max heights for desktop vs mobile
    const maxHeight = screenData.isDesktop ? 300 : 120;
    const clamped = Math.min(maxHeight, Math.max(40, height));
    Animated.timing(composerHeight, {
      toValue: clamped,
      duration: 100,
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
        // Also emit new-style receipt events that backend uses to send
        // chat:message:delivery_receipt and chat:message:read_receipt to sender
        try { s.emit('chat:message:delivered', { messageId: item.id }); } catch {}
        try { s.emit('chat:message:read', { messageId: item.id }); } catch {}
      }
    });
  }).current;

  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    // Use the invisible margin height as the reference point for web browsers
    const threshold = Platform.OS === 'web' 
      ? Math.max(composerContainerHeight, composerMarginHeight) + (screenData.isDesktop ? 140 : 120) // Use measured composer height
      : 100;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold;
    setShowScrollToBottom(!isNearBottom);
  };

  // Store content size for scroll calculations
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 });

  // Scroll to bottom function that respects invisible margin
  const scrollToBottom = () => {
    if (listRef.current) {
      // Just use scrollToEnd - the paddingBottom will handle the spacing
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
    console.log('🔍 Avatar clicked - Debug info:');
    console.log('otherUserId:', otherUserId);
    console.log('conversationId:', conversationId);
    console.log('conversationName:', conversationName);
    console.log('myUserId:', myUserId);

    // If otherUserId is not known yet, try to derive from messages
    if (!otherUserId) {
      const candidate = [...messages].find(m => m.senderId && m.senderId !== myUserId);
      if (candidate && candidate.senderId) {
        setOtherUserId(candidate.senderId);
      } else if (paramOtherUserId && typeof paramOtherUserId === 'string') {
        setOtherUserId(paramOtherUserId);
      }
    }

    setShowUserProfile(true);
  };

  // Voice call handlers
  const handleStartVoiceCall = async () => {
    // Check if call is already in progress
    if (voiceCallService.callState !== 'idle') {
      // eslint-disable-next-line no-console
      console.warn('Call already in progress, ignoring button click');
      Alert.alert('Call in Progress', 'You already have an active call. Please end the current call before starting a new one.');
      return;
    }

    // Mobile browser specific debugging with iOS HTTP detection
    if (Platform.OS === 'web') {
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isDevelopmentIP = typeof window !== 'undefined' && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.href);
      const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
      
      // Show specific warning for iOS HTTP development
      if (isIOS && isDevelopmentIP && isHTTP) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ iOS HTTP Development Mode Detected!');
        // eslint-disable-next-line no-console
        console.warn('⚠️ Voice calls will likely fail on iOS with HTTP on IP addresses');
        // eslint-disable-next-line no-console
        console.warn('⚠️ This is expected browser security behavior');
      }
    }

    // Proceed with actual voice call for all platforms

    if (!otherUserId || friendshipStatus !== 'friends') {
      //console.log('❌ Cannot call - not friends or no otherUserId');
      Alert.alert('Cannot Call', 'You can only call friends.');
      return;
    }

    if (!startVoiceCall) {
      console.error('❌ startVoiceCall function is not available');
      Alert.alert('Error', 'Voice call functionality is not available.');
      return;
    }

    try {
      //console.log('📞 Starting voice call to:', otherUserId);
      
      // For iOS Safari, trigger any pending audio play due to user interaction
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && voiceCallService.pendingRemoteAudioPlay) {
          //console.log('🍎 iOS user interaction detected - enabling audio playback');
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
    //console.log('📞 Closing voice call modal');
    setShowVoiceCall(false);
    setVoiceCallData(null);
  };

  // Listen for incoming voice calls
  useEffect(() => {
    const socket = getSocket(token);
    if (!socket) return;

    const handleIncomingCall = (data) => {
      //console.log('📞 Incoming voice call:', data);
      
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
    //console.log('🗑️ handleClearChat called');
    
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
    //console.log('🗑️ User confirmed clearing chat:', conversationId);
    const s = getSocket(token);
    if (s) {
      //console.log('📡 Emitting chat:clear event');
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
    const myFirstName = user?.firstName || user?.username || 'there';
    const otherFirstName = conversationName.split(' ')[0] || conversationName;
    const hiMessage = `Hey ${otherFirstName}, I am ${myFirstName}. How are you?`;
    setComposer(hiMessage);
    
    // Auto-send the message
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  // Desktop Web View
  if (screenData.isDesktop && screenData.isBrowser) {
    return (
      <LinearGradient
        colors={["#1F1147", "#2D1B69", "#1F1147"]}
        locations={[0, 0.5, 1]}
        style={styles.desktopContainer}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        
        {/* Desktop Header */}
        <View style={styles.desktopHeader}>
          <View style={styles.desktopHeaderContent}>
            <TouchableOpacity 
              style={styles.desktopBackButton}
              onPress={() => router.replace('/secure/chat')}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.desktopUserInfo}
              onPress={handleAvatarClick}
            >
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.desktopAvatar} />
              ) : (
                <View style={styles.desktopAvatarFallback}>
                  <Text style={styles.desktopAvatarText}>
                    {String(conversationName).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.desktopUserText}>
                <Text style={styles.desktopUserName}>{conversationName}</Text>
                <View style={styles.desktopStatusRow}>
                  <View style={[styles.desktopStatusDot, { 
                    backgroundColor: isOnline ? '#10B981' : '#9CA3AF' 
                  }]} />
                  <Text style={styles.desktopStatusText}>
                    {isOnline ? 'Active now' : 'Offline'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <View style={styles.desktopHeaderActions}>
              {friendshipStatus === 'friends' && (
                <TouchableOpacity 
                  style={styles.desktopActionButton}
                  onPress={handleStartVoiceCall}
                >
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.desktopActionButton}
                onPress={() => setShowChatMenu(true)}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Desktop Chat Area */}
        <View style={[styles.desktopChatArea, { paddingBottom: desktopComposerHeight + 24 }]}>
          {/* Messages */}
          <FlatList
            ref={listRef}
            data={displayedMessages}
            keyExtractor={(item) => item.id}
            inverted={false}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isMine={item.senderId === myUserId}
                theme={theme}
                isDarkMode={isDarkMode}
                dynamicStyles={dynamicStyles}
                conversationName={conversationName}
                userAvatar={userAvatar}
                onEdit={startEditMessage}
                onDelete={handleDeleteMessage}
                onReact={handleReactToMessage}
              />
            )}
            contentContainerStyle={[
              styles.desktopMessageList,
              { paddingTop: 10, paddingBottom: 24 }
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <EmptyChatAnimation 
                conversationName={conversationName}
                onSendHi={handleSendHi}
                theme={theme}
                isDarkMode={isDarkMode}
              />
            }
            ListHeaderComponent={() => {
              const hasMoreToLoad = messages.length > messageLimit;
              const hasMoreFromServer = hasMore;
              
              if (!hasMoreToLoad && !hasMoreFromServer) return null;
              
              return (
                <TouchableOpacity 
                  style={styles.desktopLoadMoreButton}
                  onPress={hasMoreToLoad ? loadMoreMessages : loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#7C2B86" />
                  ) : (
                    <View style={styles.desktopLoadMoreContent}>
                      <Ionicons name="chevron-up" size={16} color="#7C2B86" />
                      <Text style={styles.desktopLoadMoreText}>
                        {hasMoreToLoad 
                          ? `Load more messages (${messages.length - messageLimit} remaining)` 
                          : 'Load earlier messages'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={() => (
              <View>
                {typingUsers.length > 0 ? (
                  <TypingDots 
                    label={`${conversationName} is typing`}
                    theme={theme}
                    isDarkMode={isDarkMode}
                  />
                ) : null}
                {/* Spacer to keep last message fully visible above absolute composer */}
                <View style={{ height: desktopComposerHeight + 24 }} />
              </View>
            )}
          />
          
          {/* Blocked/Not Friends Messages */}
          {blockStatus.isBlocked || blockStatus.isBlockedBy ? (
            <BlockedMessage blockStatus={blockStatus} conversationName={conversationName} />
          ) : friendshipStatus === 'not_friends' ? (
            <NotFriendsMessage 
              conversationName={conversationName}
              otherUserId={otherUserId}
              onFriendRequestSent={() => setFriendshipStatus('pending')}
              requestStatus={friendRequestStatus}
            />
          ) : null}
          
          {/* Desktop Input */}
          {friendshipStatus === 'friends' && !blockStatus.isBlocked && !blockStatus.isBlockedBy && (
            <View style={styles.desktopInputContainer} onLayout={(e) => setDesktopComposerHeight(e.nativeEvent.layout.height)}>
              <View style={styles.desktopInputWrapper}>
                {/* Media Picker Button for Desktop */}
                {!uploadingMedia && (
                  <TouchableOpacity 
                    style={styles.desktopMediaButton}
                    onPress={() => {
                      //console.log('🖥️ Desktop + button clicked, current state:', showMediaOptions);
                      //console.log('🖥️ Platform.OS:', Platform.OS);
                      setShowMediaOptions(!showMediaOptions);
                      //console.log('🖥️ Setting showMediaOptions to:', !showMediaOptions);
                    }}
                  >
                    <Ionicons name="add-circle" size={32} color="#7C2B86" />
                  </TouchableOpacity>
                )}

                {uploadingMedia && (
                  <View style={styles.desktopMediaButton}>
                    <ActivityIndicator size="small" color="#7C2B86" />
                  </View>
                )}

                <TextInput
                  style={styles.desktopInput}
                  value={composer}
                  onChangeText={handleTypingChange}
                  placeholder={`Message ${conversationName}...`}
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  multiline
                  scrollEnabled={true}
                  maxLength={2000}
                  onKeyPress={(e) => {
                    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                      e.preventDefault();
                      if (composer.trim()) handleSend();
                    }
                  }}
                />
                <TouchableOpacity 
                  style={[
                    styles.desktopSendButton,
                    !composer.trim() && styles.desktopSendButtonDisabled
                  ]}
                  onPress={() => composer.trim() && handleSend()}
                  disabled={!composer.trim()}
                >
                  <LinearGradient
                    colors={composer.trim() ? ["#7C2B86", "#FF6FB5"] : ["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.2)"]}
                    style={styles.desktopSendGradient}
                  >
                    <Ionicons 
                      name="send" 
                      size={18} 
                      color={composer.trim() ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)"} 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {/* Modals */}
        {showChatMenu && (
          <ChatOptionsMenu
            visible={showChatMenu}
            onClose={() => setShowChatMenu(false)}
            onClearChat={handleClearChat}
            onMuteToggle={handleMuteToggle}
            isMuted={isChatMuted}
            blockStatus={blockStatus}
            conversationName={conversationName}
          />
        )}
        
        
        {showVoiceCall && voiceCallData && (
          <VoiceCallModal
            visible={showVoiceCall}
            onClose={() => {
              setShowVoiceCall(false);
              setVoiceCallData(null);
            }}
            callData={voiceCallData}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
          />
        )}
        
        {showDeleteConfirm && (
          <ConfirmationDialog
            visible={showDeleteConfirm}
            title="Delete Message"
            message="Are you sure you want to delete this message? This action cannot be undone."
            onConfirm={confirmDeleteMessage}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setMessageToDelete(null);
            }}
            confirmText="Delete"
            cancelText="Cancel"
            destructive
          />
        )}
        
        {showClearChatConfirm && (
          <ConfirmationDialog
            visible={showClearChatConfirm}
            title="Clear Chat"
            message={`Are you sure you want to clear all messages in this chat? This will only clear messages for you.`}
            onConfirm={confirmClearChat}
            onCancel={() => setShowClearChatConfirm(false)}
            confirmText="Clear"
            cancelText="Cancel"
            destructive
          />
        )}
      </LinearGradient>
    );
  }
  
  // Mobile View
  return (
    <LinearGradient
      colors={[theme.background, theme.backgroundSecondary, theme.background]}
      locations={[0, 0.55, 1]}
      style={[styles.container, dynamicStyles.container]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background decorative elements */}
      <View style={[styles.blurCircleLarge, { backgroundColor: theme.decorative1, opacity: isDarkMode ? 0.3 : 0.1 }]} />
      <View style={[styles.blurCircleSmall, { backgroundColor: theme.decorative2, opacity: isDarkMode ? 0.3 : 0.1 }]} />
      <View style={[styles.blurCircleMedium, { backgroundColor: theme.decorative1, opacity: isDarkMode ? 0.3 : 0.1 }]} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        {Platform.OS === 'web' ? (
          <View style={[styles.header, styles.glassWeb, dynamicStyles.header]} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
            <Pressable 
              style={({ hovered }) => [
                styles.backButton, 
                hovered ? styles.headerBtnHoverWeb : null
              ]} 
              onPress={() => router.replace('/secure/chat')}
            >
              <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
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
                  <Text
                    style={[
                      styles.headerName,
                      { color: isDarkMode ? theme.textPrimary : '#000000' },
                    ]}
                    numberOfLines={1}
                  >
                    {conversationName}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.onlineIndicator, { 
                      backgroundColor: isOnline ? '#00FF94' : 'rgba(255,255,255,0.4)' 
                    }]} />
                    <Text
                      style={[
                        styles.headerStatus,
                        { color: isDarkMode ? theme.textSecondary : '#555555' },
                      ]}
                    >
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
                //console.log('📋 Opening chat menu (web)');
                setShowChatMenu(true);
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFE8FF" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.header, dynamicStyles.header]} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/secure/chat')}>
              <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
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
                  <Text
                    style={[
                      styles.headerName,
                      { color: isDarkMode ? theme.textPrimary : '#000000' },
                    ]}
                    numberOfLines={1}
                  >
                    {conversationName}
                  </Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.onlineIndicator,
                        {
                          backgroundColor: isOnline
                            ? '#00FF94'
                            : 'rgba(255,255,255,0.4)',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.headerStatus,
                        { color: isDarkMode ? theme.textSecondary : '#555555' },
                      ]}
                    >
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
                <Ionicons name="call" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => {
                //console.log('📋 Opening chat menu (mobile)');
                setShowChatMenu(true);
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={Platform.OS !== 'web'}
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
            inverted={false}
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
                theme={theme}
                isDarkMode={isDarkMode}
                dynamicStyles={dynamicStyles}
                conversationName={conversationName}
                onEdit={startEditMessage}
                onDelete={handleDeleteMessage}
                onReact={handleReactToMessage}
                conversationId={conversationId}
                token={token}
                userAvatar={userAvatar}
              />
            )}
            contentContainerStyle={[
              styles.messagesContainer,
              {
                // Inverted FlatList means paddingTop becomes visual bottom padding
                paddingTop: Platform.OS === 'web' ? 16 : 8,
                paddingBottom: 16, // Visual top padding (inverted)
              },
              screenData.isDesktop && {
                paddingHorizontal: 40,
              }
            ]}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={(width, height) => setContentSize({ width, height })}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setLayoutSize({ width, height });
            }}
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
            ListFooterComponent={null}
            ListEmptyComponent={() => (
              !chatDisabled && deduplicateMessages(displayedMessages).length === 0 ? (
                <EmptyChatAnimation 
                  conversationName={conversationName} 
                  onSendHi={handleSendHi}
                  theme={theme}
                  isDarkMode={isDarkMode}
                />
              ) : null
            )}
          />

          {/* Typing indicator directly above the composer (mobile) */}
          {typingUsers.length ? (
            <Animated.View style={[styles.typingIndicatorWrapper, { opacity: typingFade }]}>
              <TypingDots 
                label={`${String(conversationName).split(" ")[0]} is typing`}
                theme={theme}
                isDarkMode={isDarkMode}
              />
            </Animated.View>
          ) : null}

          {/* Scroll to Bottom Button */}
          {showScrollToBottom && (
            <TouchableOpacity 
              style={[
                styles.scrollToBottomButton,
                Platform.OS === 'web' && (
                  screenData.isDesktop
                    ? { bottom: desktopComposerHeight + 40, right: 40 }
                    : { bottom: composerMarginHeight + 100, right: 20 }
                ),
                (Platform.OS !== 'web' && composerContainerHeight > 0) && { bottom: composerContainerHeight + 20 }
              ]}
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

          {/* Invisible margin/spacer above composer */}
          {Platform.OS === 'web' && (
            <View 
              ref={invisibleMarginRef}
              onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                setComposerMarginHeight(height);
              }}
              style={{
                height: screenData.isDesktop ? 60 : 40, // Invisible margin height
                backgroundColor: 'transparent',
                pointerEvents: 'none',
                // Add a subtle visual indicator in development (remove in production)
                ...__DEV__ && { borderTopWidth: 1, borderTopColor: 'rgba(255, 0, 0, 0.1)' }
              }}
            />
          )}

          {/* Composer */}
          <View
            style={[
              styles.composerContainer,
              Platform.OS === 'web' ? styles.glassWeb : null,
              screenData.isDesktop && {
                paddingTop: 20,
                paddingBottom: 24,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
              },
              { 
                backgroundColor: Platform.OS === 'web' 
                  ? (screenData.isDesktop ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.4)') // Keep background for web
                  : 'transparent', // Transparent background for mobile
                borderTopWidth: Platform.OS === 'web' ? 1 : 0, // Remove top border on mobile
                paddingTop: Platform.OS === 'web' 
                  ? 12 // Keep default for web
                  : (isKeyboardVisible ? 8 : 12), // Reduce top padding when keyboard is visible
                paddingBottom: Platform.OS === 'web' 
                  ? (screenData.isDesktop ? 24 : 20) // More padding for web browsers
                  : (isKeyboardVisible ? 0 : Math.max((insets?.bottom || 0), 20))
              }
            ]}
            onLayout={(e) => setComposerContainerHeight(e.nativeEvent.layout.height)}
          >
            {Platform.OS !== 'web' && (
              <View style={[styles.composerBlur, { backgroundColor: theme.surface, opacity: 0.95 }]} />
            )}
            <View style={[
              styles.composerWrapper,
              screenData.isDesktop && {
                paddingHorizontal: 40,
                gap: 16,
              }
            ]}>
              {/* Edit Message Indicator */}
              {editingMessageId && (
                <View style={styles.editMessageIndicator}>
                  <View style={styles.editMessageContent}>
                    <Ionicons name="create-outline" size={16} color="#7C2B86" />
                    <Text style={styles.editMessageText}>
                      Editing message: "{originalMessageText.length > 50 ? originalMessageText.substring(0, 50) + '...' : originalMessageText}"
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.editMessageCancel}
                    onPress={() => {
                      setEditingMessageId(null);
                      setEditingMessage(null);
                      setOriginalMessageText('');
                      setComposer('');
                    }}
                  >
                    <Ionicons name="close" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Media Picker Button */}
              {!chatDisabled && !uploadingMedia && (
                <TouchableOpacity 
                  style={[styles.mediaButton, dynamicStyles.mediaButton]}
                  onPress={() => {
                    //console.log('📱 Media button clicked, current state:', showMediaOptions);
                    setShowMediaOptions(!showMediaOptions);
                    //console.log('📱 Setting showMediaOptions to:', !showMediaOptions);
                  }}
                >
                  <Ionicons name="add-circle" size={screenData.isDesktop ? 32 : 28} color={theme.primary} />
                </TouchableOpacity>
              )}

              {uploadingMedia && (
                <View style={[styles.mediaButton, dynamicStyles.mediaButton]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              )}

              <View style={[
                dynamicStyles.inputWrapper
              ]}>
                <View style={[
                  dynamicStyles.textInputContainer
                ]}>
                  <TextInput
                    style={[
                      styles.textInput,
                      dynamicStyles.textInput,
                      isInputFocused && dynamicStyles.textInputFocused,
                      chatDisabled && styles.textInputDisabled,
                      { 
                        minHeight: Math.max(52, inputHeight),
                        maxHeight: 120,
                      }
                    ]}
                  placeholder={
                    chatDisabled 
                      ? (blockStatus.isBlocked 
                          ? "You have blocked this user" 
                          : blockStatus.isBlockedBy 
                            ? "This user has blocked you"
                            : "Send a friend request to message")
                      : "Type a message..."
                  }
                  placeholderTextColor={chatDisabled ? (friendshipStatus === 'not_friends' ? theme.primary + '60' : "rgba(255, 68, 68, 0.6)") : theme.textPlaceholder}
                  value={composer}
                    onChangeText={chatDisabled ? undefined : handleTypingChange}
                    onKeyPress={chatDisabled ? undefined : handleKeyPress}
                    onContentSizeChange={chatDisabled ? undefined : (e) => {
                      const newHeight = Math.max(52, Math.min(120, e.nativeEvent.contentSize.height + 32));
                      setInputHeight(newHeight);
                      if (handleInputContentSizeChange) handleInputContentSizeChange(e);
                    }}
                    onFocus={() => {
                      setIsInputFocused(true);
                      Animated.timing(inputFocusAnim, {
                        toValue: 1,
                        duration: 200,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                      }).start();
                    }}
                    onBlur={() => {
                      setIsInputFocused(false);
                      Animated.timing(inputFocusAnim, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                      }).start();
                    }}
                    multiline
                    scrollEnabled={true}
                    maxLength={2000}
                    editable={!chatDisabled}
                    textAlignVertical="center"
                  />
                  
                  {/* Character Counter */}
                  {composer.length > 1500 && (
                    <Text style={dynamicStyles.characterCounter}>
                      {composer.length}/2000
                    </Text>
                  )}
                  
                  {/* Input Focus Indicator */}
                  <Animated.View 
                    style={[
                      dynamicStyles.inputIndicator,
                      {
                        transform: [{ scaleX: inputFocusAnim }]
                      }
                    ]}
                  />
                </View>
              </View>

              {composer.trim() && !chatDisabled ? (
                <TouchableOpacity style={[
                  styles.sendButton,
                  dynamicStyles.sendButton,
                  screenData.isDesktop && {
                    marginLeft: 16,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    marginBottom: 8,
                  }
                ]} 
                onPress={handleSend}
                activeOpacity={0.8}
                >
                  <View style={{ 
                    backgroundColor: 'transparent', 
                    borderRadius: 26, 
                    width: '100%', 
                    height: '100%', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Ionicons 
                      name={editingMessage ? "checkmark" : "paper-plane"} 
                      size={screenData.isDesktop ? 28 : 24} 
                      color="#FFFFFF" 
                      style={editingMessage ? {} : { transform: [{ rotate: '45deg' }] }}
                    />
                  </View>
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

      {/* Browser Emoji Picker */}
      {Platform.OS === 'web' && showEmojiPicker && (
        <View style={styles.emojiPickerOverlay}>
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>React to message</Text>
              <TouchableOpacity 
                style={styles.emojiPickerClose}
                onPress={() => {
                  setShowEmojiPicker(false);
                  setEmojiPickerMessage(null);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.emojiGrid}>
              {['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉', '🔥', '💯', '😍', '🤔', '😊', '😎', '🙄', '😴'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={async () => {
                    if (emojiPickerMessage) {
                      try {
                        const s = getSocket(token);
                        s.emit('chat:reaction:toggle', { 
                          chatId: conversationId, 
                          messageId: emojiPickerMessage.id, 
                          emoji 
                        });
                        setShowEmojiPicker(false);
                        setEmojiPickerMessage(null);
                      } catch (error) {
                        console.error('Failed to add reaction:', error);
                      }
                    }
                  }}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

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
        key={otherUserId || paramOtherUserId || 'unknown'}
        visible={showUserProfile && !!(otherUserId || paramOtherUserId)}
        onClose={() => {
          console.log('🔒 Closing user profile modal');
          setShowUserProfile(false);
        }}
        userId={otherUserId || paramOtherUserId}
        userName={conversationName}
        userAvatar={userAvatar}
      />

      <VoiceCallModal
        visible={showVoiceCall}
        onClose={handleCloseVoiceCall}
        callData={voiceCallData}
        token={token}
      />

      {/* Media Options - Portal-style overlay for browser compatibility */}
      {showMediaOptions && Platform.OS === 'web' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            paddingBottom: '100px'
          }}
          onClick={() => {
            //console.log('🎭 Closing media options (web)');
            setShowMediaOptions(false);
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '30px 20px',
              boxShadow: '0px -4px 20px rgba(0, 0, 0, 0.15)',
              minWidth: '300px',
              maxWidth: '400px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => {
                //console.log('📷 Camera option pressed (web)');
                setShowMediaOptions(false);
                handleMediaPick('camera');
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '30px',
                  backgroundColor: '#FF6FB5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '24px'
                }}
              >
                📷
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Camera</span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => {
                //console.log('🖼️ Photo option pressed (web)');
                setShowMediaOptions(false);
                handleMediaPick('image');
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '30px',
                  backgroundColor: '#7C2B86',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '24px'
                }}
              >
                🖼️
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Photo</span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => {
                //console.log('🎥 Video option pressed (web)');
                setShowMediaOptions(false);
                handleMediaPick('video');
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '30px',
                  backgroundColor: '#5D5FEF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '24px'
                }}
              >
                🎥
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Video</span>
            </div>
          </div>
        </div>
      )}

      {/* Media Options - React Native Modal for mobile */}
      {showMediaOptions && Platform.OS !== 'web' && (
        <Modal
          visible={showMediaOptions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMediaOptions(false)}
        >
          <View style={styles.mediaOptionsOverlay}>
            <TouchableOpacity 
              style={styles.mediaOptionsBackdrop}
              activeOpacity={1}
              onPress={() => {
                //console.log('🎭 Closing media options');
                setShowMediaOptions(false);
              }}
            />
            <View style={styles.mediaOptionsContainer}>
            <TouchableOpacity 
              style={styles.mediaOption}
              onPress={() => {
                //console.log('📷 Camera option pressed');
                setShowMediaOptions(false);
                handleMediaPick('camera');
              }}
            >
              <View style={[styles.mediaOptionIcon, { backgroundColor: '#FF6FB5' }]}>
                <Ionicons name="camera" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.mediaOptionText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaOption}
              onPress={() => {
                //console.log('🖼️ Photo option pressed');
                setShowMediaOptions(false);
                handleMediaPick('image');
              }}
            >
              <View style={[styles.mediaOptionIcon, { backgroundColor: '#7C2B86' }]}>
                <Ionicons name="image" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.mediaOptionText}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaOption}
              onPress={() => {
                //console.log('🎥 Video option pressed');
                setShowMediaOptions(false);
                handleMediaPick('video');
              }}
            >
              <View style={[styles.mediaOptionIcon, { backgroundColor: '#5D5FEF' }]}>
                <Ionicons name="videocam" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.mediaOptionText}>Video</Text>
            </TouchableOpacity>
          </View>
          </View>
        </Modal>
      )}</LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      height: '100vh',
      width: '100vw',
      maxWidth: '100vw',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
  },
  safeArea: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
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
    paddingHorizontal: Platform.OS === 'web' ? 24 : 12,
    paddingTop: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: Platform.OS === 'web' ? 16 : 12,
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
    marginLeft: 6,
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
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  headerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
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
    paddingHorizontal: 12, // Reduced padding for better space utilization
    paddingTop: 16,
    paddingBottom: 16,
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
    maxWidth: Platform.OS === 'web' ? '70%' : '75%',
    minWidth: Platform.OS === 'web' ? 100 : 60,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    marginLeft: Platform.OS === 'web' ? 100 : 40,
  },
  theirMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderBottomLeftRadius: 6,
    marginRight: Platform.OS === 'web' ? 100 : 40,
    backdropFilter: 'blur(10px)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    }),
  },
  myBubbleGradient: {
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myMessageText: {
    color: '#7C2B86',
    fontSize: Platform.OS === 'web' ? 15 : 15,
    lineHeight: Platform.OS === 'web' ? 22 : 20,
    fontWeight: '500',
  },
  theirMessageText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 15 : 15,
    lineHeight: Platform.OS === 'web' ? 22 : 20,
    fontWeight: '500',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 0,
    paddingBottom: 0,
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
  
  // Reactions - WhatsApp style at bottom-right of bubble
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'absolute',
    bottom: -2, // overlap bubble border a bit more while staying mostly outside
    right: 4,   // close to right edge of bubble
    zIndex: 15,
    maxWidth: 200,
    justifyContent: 'flex-end',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 2,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 24,
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
  
  // 3-dot menu styles for browser - WhatsApp style
  messageMenuButton: {
    position: 'absolute',
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.2)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(255, 255, 255, 1)',
        transform: 'scale(1.1)',
        shadowOpacity: 0.4,
      },
    }),
  },
  messageMenuButtonMine: {
    right: 4,
  },
  messageMenuButtonTheirs: {
    right: 4,
  },
  messageDropdown: {
    position: 'absolute',
    top: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 90,
    maxWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#7C2B86',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    }),
  },
  messageDropdownMine: {
    right: -10,
  },
  messageDropdownTheirs: {
    left: -10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      ':hover': {
        backgroundColor: 'rgba(124, 43, 134, 0.1)',
      },
    }),
  },
  menuItemText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#7C2B86',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
    marginHorizontal: 8,
  },
  menuOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 9998,
  },
  
  // Emoji Picker Styles
  emojiPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1147',
  },
  emojiPickerClose: {
    padding: 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  emojiText: {
    fontSize: 24,
  },
  
  // Edit Message Indicator Styles
  editMessageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7C2B86',
    transform: [{ skewX: '-2deg' }], // Tilted effect
  },
  editMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editMessageText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '500',
    flex: 1,
  },
  editMessageCancel: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Typing Indicator
  typingContainer: {
    paddingHorizontal: 12,
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
  typingIndicatorWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  
  // Composer Styles
  composerContainer: {
    borderTopWidth: 0, // No default border
    borderTopColor: 'rgba(255, 214, 242, 0.2)',
    paddingTop: 12, // Default mobile padding
    paddingBottom: 12, // Default mobile padding
    backgroundColor: 'transparent', // Transparent by default
    zIndex: 10, // Ensure composer is above other elements
    position: 'relative',
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
    paddingHorizontal: 12, // Reduced mobile padding
    gap: 8, // Reduced mobile gap
    zIndex: 11, // Above composer container
    position: 'relative',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Now transparent by default
    borderRadius: 0, // No default radius
    paddingHorizontal: 0, // No default padding
    paddingVertical: 0, // No default padding
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50, // Default mobile height
    maxHeight: 120, // Default mobile max height
    borderWidth: 0, // No default border
    borderColor: 'transparent', // Transparent border
    position: 'relative',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16, // Default mobile font size
    lineHeight: 22, // Default mobile line height
    fontWeight: '400',
    maxHeight: 120, // Increased for better scrolling
    paddingTop: 0,
    paddingBottom: 0,
    // Ensure vertical centering on Android
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'center', // Center align for better appearance
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
    fontSize: 16, // Default mobile font size
    lineHeight: 22, // Default mobile line height
    fontWeight: '400',
    includeFontPadding: false,
  },
  sendButton: {
    marginLeft: 12, // Default mobile margin
    width: 48, // Default mobile size
    height: 48, // Default mobile size
    borderRadius: 24, // Default mobile radius
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C2B86',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    alignSelf: 'flex-end',
    marginBottom: 1, // Default mobile alignment
    zIndex: 12, // Ensure button is clickable
    position: 'relative',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      boxShadow: '0px 2px 6px rgba(124, 43, 134, 0.25)',
      pointerEvents: 'auto',
      userSelect: 'none',
    }),
  },
  sendGradient: {
    width: 48, // Default mobile size
    height: 48, // Default mobile size
    borderRadius: 24, // Default mobile radius
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
    bottom: 120, // Default mobile position
    right: 20, // Default mobile position
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
  
  // Desktop Styles
  desktopContainer: {
    flex: 1,
  },
  desktopHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    backdropFilter: 'blur(20px)',
  },
  desktopHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1000,
    marginHorizontal: 'auto',
    width: '100%',
  },
  desktopBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  desktopUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#7C2B86',
  },
  desktopAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  desktopUserText: {
    flex: 1,
  },
  desktopUserName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  desktopStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  desktopStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  desktopStatusText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  desktopActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopChatArea: {
    flex: 1,
    maxWidth: 1000,
    marginHorizontal: 'auto',
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  desktopMessageList: {
    padding: 24,
    paddingBottom: 160,
  },
  desktopInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    padding: 20,
  },
  desktopInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align to bottom so send button stays at bottom
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
    maxWidth: 1000,
    marginHorizontal: 'auto',
    width: '100%',
    minHeight: 50,
    maxHeight: 320, // Add reasonable max height to prevent excessive growth
  },
  desktopInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    minHeight: 44, // Increased minimum height
    maxHeight: 300, // Large enough for about 13-14 lines
    padding: 8, // Add some padding for better text visibility
    margin: 0,
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '400',
    resize: 'none', // Prevent manual resizing on web
    overflow: 'auto', // Enable scrolling when needed
    height: 'auto', // Let height adjust automatically
    verticalAlign: 'top', // Align text to top
  },
  desktopSendButton: {
    borderRadius: 24,
    overflow: 'hidden',
    flexShrink: 0,
  },
  desktopSendButtonDisabled: {
    opacity: 0.5,
  },
  desktopSendGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  desktopLoadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  desktopLoadMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  desktopLoadMoreText: {
    color: '#7C2B86',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Reaction Styles
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginHorizontal: 8,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Media Styles
  mediaButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    zIndex: 12, // Ensure button is clickable
    position: 'relative',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
      pointerEvents: 'auto',
    }),
  },
  desktopMediaButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mediaOptionsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 100,
    backgroundColor: 'transparent',
  },
  mediaOptionsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mediaOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' && {
      boxShadow: '0px -4px 20px rgba(0, 0, 0, 0.15)',
    }),
  },
  mediaOption: {
    alignItems: 'center',
    gap: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
    }),
  },
  mediaOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  mediaContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
  },
  videoContainer: {
    position: 'relative',
  },
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
});