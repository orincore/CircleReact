import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ChatWidget = ({ visible, onClose, userId = null }) => {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [isTyping, setIsTyping] = useState(false)
  const [escalationEmail, setEscalationEmail] = useState('')
  const [showEscalation, setShowEscalation] = useState(false)
  const scrollViewRef = useRef(null)

  useEffect(() => {
    if (visible && !conversationId) {
      startConversation()
    }
  }, [visible])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true })
    }
  }, [messages])

  const startConversation = async () => {
    try {
      setLoading(true)
      const apiUrl = 'https://api.circle.orincore.com'
      
      const response = await fetch(`${apiUrl}/api/ai-support/conversation/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          userId,
          initialMessage: null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConversationId(data.conversation.id)
        setMessages(data.conversation.messages || [])
      } else {
        console.error('Failed to start conversation')
        setMessages([{
          role: 'assistant',
          content: 'Sorry, I\'m having trouble connecting right now. Please try again later or contact support at contact@orincore.com',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      setMessages([{
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again later or contact support at contact@orincore.com',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId || loading) return

    const userMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    try {
      const apiUrl = 'https://api.circle.orincore.com'
      const response = await fetch(`${apiUrl}/api/ai-support/conversation/${conversationId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update messages with the latest from server
        setMessages(data.conversation.messages || [])
        
        // Check if escalation is suggested
        if (data.aiResponse?.requiresEscalation) {
          setTimeout(() => {
            setShowEscalation(true)
          }, 2000)
        }
      } else if (response.status === 410) {
        // Conversation expired, restart
        setConversationId(null)
        startConversation()
      } else {
        // Add error message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again or contact support at contact@orincore.com',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact support at contact@orincore.com',
        timestamp: new Date()
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const escalateToEmail = async () => {
    if (!escalationEmail.trim() || !conversationId) return

    try {
      const apiUrl = 'https://api.circle.orincore.com'
      const response = await fetch(`${apiUrl}/api/ai-support/conversation/${conversationId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: escalationEmail.trim(),
          reason: 'User requested human assistance'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }])
        setShowEscalation(false)
        setEscalationEmail('')
      }
    } catch (error) {
      console.error('Error escalating conversation:', error)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.botAvatar}>
                <Ionicons name="chatbubble-ellipses" size={20} color="white" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Circle Support</Text>
                <Text style={styles.headerSubtitle}>AI Assistant</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {loading && messages.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#7C2B86" />
                <Text style={styles.loadingText}>Starting conversation...</Text>
              </View>
            ) : (
              messages.map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageContainer,
                    message.role === 'user' ? styles.userMessage : styles.botMessage
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userBubble : styles.botBubble
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        message.role === 'user' ? styles.userText : styles.botText
                      ]}
                    >
                      {message.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        message.role === 'user' ? styles.userTime : styles.botTime
                      ]}
                    >
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {/* Typing indicator */}
            {isTyping && (
              <View style={[styles.messageContainer, styles.botMessage]}>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              multiline
              maxLength={1000}
              editable={!loading && conversationId}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || loading || !conversationId) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading || !conversationId}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={(!inputText.trim() || loading || !conversationId) ? '#ccc' : 'white'} 
              />
            </TouchableOpacity>
          </View>

          {/* Escalation Modal */}
          <Modal
            visible={showEscalation}
            animationType="fade"
            transparent={true}
          >
            <View style={styles.escalationOverlay}>
              <View style={styles.escalationModal}>
                <Text style={styles.escalationTitle}>Contact Support Team</Text>
                <Text style={styles.escalationText}>
                  I'd be happy to connect you with our support team via email. 
                  They typically respond within 24 hours.
                </Text>
                <TextInput
                  style={styles.escalationInput}
                  value={escalationEmail}
                  onChangeText={setEscalationEmail}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.escalationButtons}>
                  <TouchableOpacity
                    style={styles.escalationCancelButton}
                    onPress={() => setShowEscalation(false)}
                  >
                    <Text style={styles.escalationCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.escalationSendButton,
                      !escalationEmail.trim() && styles.escalationSendButtonDisabled
                    ]}
                    onPress={escalateToEmail}
                    disabled={!escalationEmail.trim()}
                  >
                    <Text style={styles.escalationSendText}>Send to Support</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C2B86',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
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
  botBubble: {
    backgroundColor: '#f1f3f4',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: '#1F1147',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  botTime: {
    color: '#666',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    marginHorizontal: 2,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    backgroundColor: 'white',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C2B86',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  escalationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  escalationModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  escalationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 8,
  },
  escalationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  escalationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  escalationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  escalationCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    alignItems: 'center',
  },
  escalationCancelText: {
    fontSize: 14,
    color: '#666',
  },
  escalationSendButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#7C2B86',
    marginLeft: 8,
    alignItems: 'center',
  },
  escalationSendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  escalationSendText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
})

export default ChatWidget
