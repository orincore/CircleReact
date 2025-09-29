import React, { useEffect, useMemo, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
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
  Animated,
  Easing,
  Pressable,
  Image,
  Dimensions,
  StatusBar,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { chatApi } from "@/src/api/chat";
import { useAuth } from "@/contexts/AuthContext";
import { socketService, getSocket } from "@/src/api/socket";
import { friendsApi } from "@/src/api/friends";
import { BlurView } from "expo-blur";
import ReactionPicker from "@/src/components/ReactionPicker";
import ReactionBar from "@/src/components/ReactionBar";
import MessageActionMenu from "@/src/components/MessageActionMenu";
import ConfirmationDialog from "@/src/components/ConfirmationDialog";
import ChatOptionsMenu from "@/src/components/ChatOptionsMenu";
import UserProfileModal from "@/src/components/UserProfileModal";

const { width: screenWidth } = Dimensions.get('window');

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

const MessageBubble = React.memo(({ message, isMine, conversationName, onEdit, onDelete, onReact, conversationId, token, avatarUri }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleLongPress = (event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX - 80, y: pageY - 100 });
    setShowActionMenu(true);
  };

  const handleEdit = () => {
    onEdit && onEdit(message);
  };

  const handleDelete = () => {
    onDelete && onDelete(message);
  };

  const handleReact = (event) => {
    onReact && onReact(message, event);
  };

  // Group reactions by emoji
  const groupedReactions = useMemo(() => {
    if (!message.reactions || !message.reactions.length) return {};
    
    const groups = {};
    message.reactions.forEach(reaction => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = [];
      }
      groups[reaction.emoji].push(reaction);
    });
    return groups;
  }, [message.reactions]);

  return (
    <Animated.View style={[
      styles.messageRow,
      isMine ? styles.messageRowMine : styles.messageRowTheirs,
      { 
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim 
      }
    ]}>
      {!isMine && (
        <View style={styles.avatarContainer}>
          {avatarUri && avatarUri.trim() ? (
            <Image 
              source={{ uri: avatarUri }} 
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
      
      <Pressable
        style={[
          styles.messageBubble,
          isMine ? styles.myMessageBubble : styles.theirMessageBubble
        ]}
        onLongPress={handleLongPress}
      >
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
      </Pressable>

      {/* Reactions - positioned at bottom of message bubble like WhatsApp */}
      {Object.keys(groupedReactions).length > 0 && (
        <View style={[
          styles.reactionsContainer, 
          isMine ? styles.reactionsContainerMine : styles.reactionsContainerTheirs
        ]}>
          {Object.entries(groupedReactions).map(([emoji, reactions]) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionBubble}
              onPress={(event) => {
                // Toggle this specific emoji reaction
                const s = getSocket(token);
                s.emit('chat:reaction:toggle', { 
                  chatId: conversationId, 
                  messageId: message.id, 
                  emoji 
                });
              }}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={styles.reactionCount}>{reactions.length}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <MessageActionMenu
        visible={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReact={handleReact}
        position={menuPosition}
        isMine={isMine}
        isDeleted={message.isDeleted}
        conversationSeeds={conversationSeeds[conversationId]}
      />
    </Animated.View>
  );
});

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
  const { id, name, avatar } = useLocalSearchParams();
  const conversationId = typeof id === "string" ? id : "ava";
  const conversationName = typeof name === "string" ? name : conversationId.split("-")[0] ?? "Chat";
  const avatarUri = typeof avatar === "string" && avatar.trim() ? avatar.trim() : null;
  const { token, user } = useAuth();
  const myUserId = user?.id ?? "me";

  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState([]);
  const [oldestAt, setOldestAt] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);

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
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [messageLimit, setMessageLimit] = useState(50); // Start with 50 messages
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [otherUserId, setOtherUserId] = useState(null);
  const [blockStatus, setBlockStatus] = useState({ isBlocked: false, isBlockedBy: false });
  const [chatDisabled, setChatDisabled] = useState(false);

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
        console.log('Found other user ID from messages:', foundOtherUserId);
        setOtherUserId(foundOtherUserId);
        
        // Check block status when we find the other user
        checkBlockStatus(foundOtherUserId);
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

    return () => {
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
        s.off('chat:reaction:toggle');
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
      
      // Disable chat if either user has blocked the other
      const isBlocked = response.isBlocked || response.isBlockedBy;
      setChatDisabled(isBlocked);
      
      console.log('Block status:', response, 'Chat disabled:', isBlocked);
    } catch (error) {
      console.error('Failed to check block status:', error);
    }
  };

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
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.headerAvatarImage} />
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
            
            <Pressable 
              style={({ hovered }) => [
                styles.headerAction, 
                hovered ? styles.headerBtnHoverWeb : null
              ]}
            >
              <Ionicons name="videocam" size={22} color="#FFE8FF" />
            </Pressable>
            
            <Pressable 
              style={({ hovered }) => [
                styles.headerAction, 
                hovered ? styles.headerBtnHoverWeb : null
              ]}
              onPress={() => setShowChatMenu(true)}
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
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.headerAvatarImage} />
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
            
            <TouchableOpacity style={styles.headerAction}>
              <Ionicons name="videocam" size={22} color="#FFE8FF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => setShowChatMenu(true)}
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
                avatarUri={avatarUri}
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
                      ? (blockStatus.isBlocked ? "You have blocked this user" : "This user has blocked you")
                      : "" // Remove placeholder when not blocked to avoid duplication with overlay
                  }
                  placeholderTextColor={chatDisabled ? "rgba(255, 68, 68, 0.6)" : "rgba(255, 255, 255, 0.6)"}
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

      <ChatOptionsMenu
        visible={showChatMenu}
        onClose={() => setShowChatMenu(false)}
        onMuteToggle={handleMuteToggle}
        isMuted={isChatMuted}
      />

      <UserProfileModal
        visible={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        userId={otherUserId || conversationId}
        userName={conversationName}
        userAvatar={avatarUri}
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
    marginVertical: 3,
    alignItems: 'flex-end',
    position: 'relative',
    marginBottom: 12, // Extra space for reactions at bottom
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
    maxWidth: '78%',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myMessageText: {
    color: '#7C2B86',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  theirMessageText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
});