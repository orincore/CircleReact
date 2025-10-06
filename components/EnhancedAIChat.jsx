import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Animated,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';

const EnhancedAIChat = ({ visible, onClose, initialMessage = '' }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState(initialMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [agentInfo, setAgentInfo] = useState(null);
  const [satisfactionSurvey, setSatisfactionSurvey] = useState(null);
  const [showSatisfactionModal, setShowSatisfactionModal] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [escalationInfo, setEscalationInfo] = useState(null);
  
  const scrollViewRef = useRef(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;

  // API Base URL
  const API_BASE_URL = 'https://api.circle.orincore.com';

  useEffect(() => {
    if (visible && initialMessage) {
      startConversation(initialMessage);
    }
  }, [visible, initialMessage]);

  useEffect(() => {
    if (isTyping) {
      startTypingAnimation();
    } else {
      stopTypingAnimation();
    }
  }, [isTyping]);

  const startTypingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopTypingAnimation = () => {
    typingAnimation.stopAnimation();
    typingAnimation.setValue(0);
  };

  const startConversation = async (message = '') => {
    try {
      setIsLoading(true);
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/conversation/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          message: message || 'Hello, I need help with my account'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConversationId(data.conversation.id);
        setMessages(data.conversation.messages || []);
        
        // Set agent info from personality
        if (data.conversation.personality) {
          setAgentInfo({
            name: data.conversation.personality.name,
            greeting: data.conversation.personality.greeting
          });
        }

        // Handle AI response with typing delay
        if (data.aiResponse) {
          handleAIResponse(data.aiResponse);
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId) return;

    const userMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/conversation/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId,
          message: messageToSend
        })
      });

      const data = await response.json();
      
      if (data.success && data.aiResponse) {
        handleAIResponse(data.aiResponse);
        
        // Update conversation state
        if (data.conversation) {
          setMessages(data.conversation.messages || []);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIResponse = (aiResponse) => {
    // Handle typing delay
    if (aiResponse.typingDelay && aiResponse.shouldShowTyping) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        processAIResponse(aiResponse);
      }, Math.min(aiResponse.typingDelay, 5000)); // Max 5 seconds
    } else {
      processAIResponse(aiResponse);
    }
  };

  const processAIResponse = (aiResponse) => {
    // Set detected language
    if (aiResponse.detectedLanguage) {
      setDetectedLanguage(aiResponse.detectedLanguage);
    }

    // Handle escalation
    if (aiResponse.escalationDecision?.shouldEscalate) {
      setEscalationInfo(aiResponse.escalationDecision);
    }

    // Handle multi-part messages
    if (aiResponse.multiPart && aiResponse.messages) {
      aiResponse.messages.forEach((msg, index) => {
        setTimeout(() => {
          const aiMessage = {
            role: 'assistant',
            content: msg,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        }, index * 1500); // 1.5 second delay between messages
      });
    } else {
      const aiMessage = {
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }

    // Handle satisfaction survey
    if (aiResponse.satisfactionSurveyId) {
      setTimeout(() => {
        setSatisfactionSurvey({ id: aiResponse.satisfactionSurveyId });
        setShowSatisfactionModal(true);
      }, 2000);
    }

    // Handle conversation end
    if (aiResponse.conversationEnded) {
      setTimeout(() => {
        Alert.alert(
          'Conversation Complete',
          'Thank you for contacting Circle support. Is there anything else we can help you with?',
          [
            { text: 'Close Chat', onPress: onClose },
            { text: 'New Question', onPress: () => setMessages([]) }
          ]
        );
      }, 3000);
    }
  };

  const submitSatisfactionRating = async (rating, feedback = '') => {
    try {
      await fetch(`${API_BASE_URL}/api/ai-admin/satisfaction/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId,
          userId: user?.id,
          rating,
          feedback,
          category: 'overall',
          agentType: 'ai'
        })
      });

      setShowSatisfactionModal(false);
      Alert.alert('Thank You!', 'Your feedback helps us improve our service.');
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isAgent = message.role === 'assistant';

    return (
      <View key={index} style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
        {isAgent && (
          <View style={styles.agentHeader}>
            <View style={styles.agentAvatar}>
              <Ionicons name="person" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.agentName}>
              {agentInfo?.name || 'AI Assistant'}
            </Text>
            {detectedLanguage !== 'en' && (
              <View style={styles.languageBadge}>
                <Text style={styles.languageText}>{detectedLanguage.toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}
        
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {message.content}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.aiMessage]}>
      <View style={styles.agentHeader}>
        <View style={styles.agentAvatar}>
          <Ionicons name="person" size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.agentName}>
          {agentInfo?.name || 'AI Assistant'} is typing...
        </Text>
      </View>
      
      <View style={[styles.messageBubble, styles.aiBubble]}>
        <Animated.View style={[styles.typingDots, { opacity: typingAnimation }]}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </Animated.View>
      </View>
    </View>
  );

  const renderEscalationInfo = () => {
    if (!escalationInfo) return null;

    return (
      <View style={styles.escalationBanner}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          style={styles.escalationGradient}
        >
          <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          <Text style={styles.escalationText}>
            {escalationInfo.priority.toUpperCase()} Priority - Connecting to specialist
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderSatisfactionModal = () => (
    <Modal
      visible={showSatisfactionModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.satisfactionModal}>
          <Text style={styles.modalTitle}>How was your experience?</Text>
          <Text style={styles.modalSubtitle}>Please rate your conversation with our AI assistant</Text>
          
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={styles.ratingButton}
                onPress={() => submitSatisfactionRating(rating)}
              >
                <Ionicons 
                  name="star" 
                  size={32} 
                  color={rating <= 3 ? '#FF6B6B' : '#4CAF50'} 
                />
                <Text style={styles.ratingText}>{rating}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => setShowSatisfactionModal(false)}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <LinearGradient
          colors={['#7C2B86', '#5D5FEF']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.aiIndicator}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>AI Support</Text>
                <Text style={styles.headerSubtitle}>
                  {agentInfo?.name ? `Chatting with ${agentInfo.name}` : 'Enhanced AI Assistant'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Escalation Banner */}
        {renderEscalationInfo()}

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message, index) => renderMessage(message, index))}
          {isTyping && renderTypingIndicator()}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <Animated.View style={{ transform: [{ rotate: '45deg' }] }}>
                  <Ionicons name="hourglass" size={20} color="#FFFFFF" />
                </Animated.View>
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Satisfaction Modal */}
        {renderSatisfactionModal()}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    padding: 4,
  },
  escalationBanner: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  escalationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  escalationText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  agentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  languageBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  languageText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#7C2B86',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  satisfactionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  ratingButton: {
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default EnhancedAIChat;
