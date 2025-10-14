import { useAuth } from '@/contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const HumanSupportChat = ({ visible, onClose, category, userId = null }) => {
  const { token } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [isTyping, setIsTyping] = useState(false)
  const [connectionState, setConnectionState] = useState('connecting') // connecting, connected, chatting
  const [agent, setAgent] = useState(null)
  const [showEscalation, setShowEscalation] = useState(false)
  const scrollViewRef = useRef(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Indian support agent names with realistic profiles
  const supportAgents = [
    { name: 'Priya Sharma', location: 'Mumbai', experience: '3 years', speciality: 'Billing & Subscriptions' },
    { name: 'Rahul Gupta', location: 'Bangalore', experience: '4 years', speciality: 'Technical Support' },
    { name: 'Ananya Patel', location: 'Delhi', experience: '2 years', speciality: 'Account & Profile' },
    { name: 'Arjun Singh', location: 'Pune', experience: '5 years', speciality: 'Matching & Dating' },
    { name: 'Kavya Reddy', location: 'Hyderabad', experience: '3 years', speciality: 'Safety & Reports' },
    { name: 'Vikash Kumar', location: 'Chennai', experience: '4 years', speciality: 'General Questions' },
    { name: 'Sneha Joshi', location: 'Kolkata', experience: '2 years', speciality: 'Billing & Subscriptions' },
    { name: 'Rohit Mehta', location: 'Ahmedabad', experience: '3 years', speciality: 'Technical Support' },
    { name: 'Divya Nair', location: 'Kochi', experience: '4 years', speciality: 'Account & Profile' },
    { name: 'Karan Malhotra', location: 'Jaipur', experience: '2 years', speciality: 'Matching & Dating' }
  ]

  useEffect(() => {
    if (visible && !conversationId) {
      startConnectionProcess()
    }
  }, [visible])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true })
    }
  }, [messages])

  useEffect(() => {
    // Fade in animation
    if (visible) {
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 300, 
        useNativeDriver: true 
      }).start()
    } else {
      Animated.timing(fadeAnim, { 
        toValue: 0, 
        duration: 300, 
        useNativeDriver: true 
      }).start()
    }
  }, [visible])

  useEffect(() => {
    // Pulse animation for connecting state
    if (connectionState === 'connecting') {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ]).start(() => {
          if (connectionState === 'connecting') pulse()
        })
      }
      pulse()
    }
  }, [connectionState])

  const startConnectionProcess = async () => {
    setConnectionState('connecting')
    
    // Simulate connection process
    setTimeout(() => {
      // Select appropriate agent based on category
      const categoryAgents = supportAgents.filter(agent => 
        !category || agent.speciality.toLowerCase().includes(category.title.toLowerCase().split(' ')[0].toLowerCase())
      )
      const selectedAgent = categoryAgents.length > 0 
        ? categoryAgents[Math.floor(Math.random() * categoryAgents.length)]
        : supportAgents[Math.floor(Math.random() * supportAgents.length)]
      
      setAgent(selectedAgent)
      setConnectionState('connected')
      
      // Show connected message
      setTimeout(() => {
        setConnectionState('chatting')
        startConversation(selectedAgent)
      }, 2000)
    }, 3000) // 3 second connection animation
  }

  const startConversation = async (selectedAgent) => {
    try {
      setLoading(true)
      const apiUrl = 'https://api.circle.orincore.com'
      
      //console.log('🔄 Starting conversation with:', { sessionId, userId, category: category?.title })
      
      const response = await fetch(`${apiUrl}/api/ai-support/conversation/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          userId,
          initialMessage: `I need help with ${category?.title || 'general support'}`
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConversationId(data.conversation.id)
        
        // Replace AI welcome with human agent welcome
        const humanWelcome = {
          role: 'assistant',
          content: `Hi! I'm ${selectedAgent.name} from Circle Support team. I'm here to help you with ${category?.title || 'your questions'}. How can I assist you today?`,
          timestamp: new Date()
        }
        
        setMessages([humanWelcome])
      } else {
        console.error('Failed to start conversation')
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm ${selectedAgent.name} from Circle Support. I'm experiencing some technical difficulties, but I'm here to help. What can I assist you with?`,
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      setMessages([{
        role: 'assistant',
        content: `Hi! I'm ${selectedAgent.name} from Circle Support. I'm here to help you. What can I assist you with today?`,
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return

    const userMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    // Simulate human typing delay
    setTimeout(async () => {
      try {
        if (conversationId) {
          const apiUrl = 'https://api.circle.orincore.com'
          //console.log('🔄 Sending message:', { conversationId, message: userMessage.content, userId })
          
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
            
            // Get the AI response and humanize it
            const aiMessage = data.conversation.messages[data.conversation.messages.length - 1]
            if (aiMessage && aiMessage.role === 'assistant') {
              const humanizedMessage = humanizeResponse(aiMessage.content)
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: humanizedMessage,
                timestamp: new Date()
              }])
            }
            
            if (data.aiResponse?.requiresEscalation) {
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `I understand this is important to you. Let me get my supervisor to review your case. Please hold on for a moment while I escalate this to our senior support team.`,
                  timestamp: new Date()
                }])
              }, 2000)
            }
          } else {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `I apologize, I'm experiencing some technical difficulties on my end. Let me try to help you another way. Can you please describe your issue again?`,
              timestamp: new Date()
            }])
          }
        } else {
          // Fallback response without API
          const fallbackResponse = generateFallbackResponse(userMessage.content)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fallbackResponse,
            timestamp: new Date()
          }])
        }
      } catch (error) {
        console.error('Error sending message:', error)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I'm sorry, I'm having some connection issues. Let me try to help you with what I can. Could you please tell me more about your concern?`,
          timestamp: new Date()
        }])
      } finally {
        setIsTyping(false)
      }
    }, Math.random() * 2000 + 1000) // Random delay 1-3 seconds to simulate human typing
  }

  const humanizeResponse = (aiResponse) => {
    // Add human-like touches to AI responses
    const humanPhrases = [
      "I understand your concern.",
      "Let me help you with that.",
      "I can definitely assist you with this.",
      "That's a great question!",
      "I'm here to help you resolve this.",
      "Let me check that for you.",
      "I see what you mean.",
      "That makes sense.",
      "I appreciate your patience.",
      "Thank you for bringing this to my attention."
    ]
    
    const closingPhrases = [
      "Is there anything else I can help you with?",
      "Let me know if you need any clarification!",
      "Feel free to ask if you have more questions.",
      "I'm here if you need further assistance.",
      "Hope this helps! Let me know if you need anything else."
    ]

    // Sometimes add a human opening
    let humanized = aiResponse
    if (Math.random() > 0.7) {
      const opener = humanPhrases[Math.floor(Math.random() * humanPhrases.length)]
      humanized = `${opener} ${humanized}`
    }

    // Sometimes add a human closing
    if (Math.random() > 0.6) {
      const closer = closingPhrases[Math.floor(Math.random() * closingPhrases.length)]
      humanized = `${humanized}\n\n${closer}`
    }

    // Replace "AI" references with human language
    humanized = humanized.replace(/I'm an AI/gi, "I'm here to help")
    humanized = humanized.replace(/as an AI/gi, "as your support agent")
    humanized = humanized.replace(/AI assistant/gi, "support representative")

    return humanized
  }

  const generateFallbackResponse = (userMessage) => {
    const message = userMessage.toLowerCase()
    
    if (message.includes('refund')) {
      return `I understand you're asking about a refund. Let me check our refund policy for you. Our refunds are available within 7 days of subscription purchase. Would you like me to check if your subscription is eligible for a refund?`
    }
    
    if (message.includes('subscription') || message.includes('billing')) {
      return `I can help you with subscription and billing questions. What specific issue are you experiencing with your subscription? I'm here to make sure we get this resolved for you.`
    }
    
    if (message.includes('login') || message.includes('password')) {
      return `I see you're having trouble with login. This is something I can definitely help you with. Have you tried resetting your password? I can guide you through the process step by step.`
    }
    
    if (message.includes('match') || message.includes('dating')) {
      return `I understand you're having issues with matches. Let me help you troubleshoot this. Are you not receiving matches, or are you having trouble with the matching process itself?`
    }
    
    return `Thank you for reaching out. I want to make sure I understand your concern correctly so I can provide the best help possible. Could you please provide a bit more detail about the issue you're experiencing?`
  }

  const handleRefundRequest = async () => {
    // Add user message showing they clicked the button
    const userMessage = {
      role: 'user',
      content: 'I want to request a refund',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    if (!userId || !token) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'd be happy to help you with a refund request. However, I need you to be logged in to process this. Please log in to your account and then I can check your refund eligibility and process it for you.`,
        timestamp: new Date()
      }])
      return
    }

    setIsTyping(true)
    try {
      const apiUrl = 'https://api.circle.orincore.com'
      
      //console.log('🔄 Processing refund request with token:', token ? 'Token present' : 'No token')
      
      const response = await fetch(`${apiUrl}/api/ai-support/refund/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: 'User requested refund via customer service chat'
        })
      })

      const data = await response.json()
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.success ? 
          `Great news! ${data.message}` : 
          `I understand you'd like a refund. ${data.message} Let me help you understand your options and see what we can do for you.`,
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('Error processing refund:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'm having some technical difficulties processing your refund request right now. Let me connect you with our billing specialist who can help you directly. Please hold on while I escalate this to our billing team.`,
        timestamp: new Date()
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleCancellationRequest = async () => {
    // Add user message showing they clicked the button
    const userMessage = {
      role: 'user',
      content: 'I want to cancel my subscription',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    if (!userId || !token) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'd be happy to help you cancel your subscription. However, I need you to be logged in to process this. Please log in to your account and then I can help you with the cancellation.`,
        timestamp: new Date()
      }])
      return
    }

    setIsTyping(true)
    try {
      const apiUrl = 'https://api.circle.orincore.com'
      
      //console.log('🔄 Processing cancellation request with token:', token ? 'Token present' : 'No token')
      
      const response = await fetch(`${apiUrl}/api/ai-support/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: 'User requested cancellation via customer service chat'
        })
      })

      const data = await response.json()
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.success ? 
          `I've processed your cancellation request. ${data.message}` : 
          `I understand you'd like to cancel your subscription. ${data.message} Let me help you with this process.`,
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('Error processing cancellation:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'm having some technical difficulties processing your cancellation request right now. Let me connect you with our billing specialist who can help you directly. Please hold on while I escalate this to our billing team.`,
        timestamp: new Date()
      }])
    } finally {
      setIsTyping(false)
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
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Connection States */}
          {connectionState === 'connecting' && (
            <View style={styles.connectionContainer}>
              <Animated.View style={[styles.connectionContent, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.connectionIcon}>
                  <ActivityIndicator size="large" color="#7C2B86" />
                </View>
                <Text style={styles.connectionTitle}>Connecting you with our support team...</Text>
                <Text style={styles.connectionSubtitle}>Please wait while we find the best agent to help you</Text>
                <View style={styles.connectionSteps}>
                  <Text style={styles.connectionStep}>• Finding available agent...</Text>
                  <Text style={styles.connectionStep}>• Reviewing your request...</Text>
                  <Text style={styles.connectionStep}>• Connecting to {category?.title || 'support'} specialist...</Text>
                </View>
              </Animated.View>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {connectionState === 'connected' && agent && (
            <View style={styles.connectionContainer}>
              <View style={styles.agentConnectedContent}>
                <View style={styles.agentAvatar}>
                  <Ionicons name="person" size={40} color="white" />
                </View>
                <Text style={styles.agentConnectedTitle}>Connected!</Text>
                <Text style={styles.agentName}>{agent.name}</Text>
                <Text style={styles.agentInfo}>{agent.speciality} • {agent.location}</Text>
                <Text style={styles.agentExperience}>{agent.experience} experience</Text>
                <View style={styles.connectionSuccess}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.connectionSuccessText}>You're now connected with {agent.name.split(' ')[0]}</Text>
                </View>
              </View>
            </View>
          )}

          {connectionState === 'chatting' && (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.agentAvatarSmall}>
                    <Ionicons name="person" size={20} color="white" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>{agent?.name}</Text>
                    <Text style={styles.headerSubtitle}>Circle Support • {agent?.location}</Text>
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
                {messages.map((message, index) => (
                  <View
                    key={index}
                    style={[
                      styles.messageContainer,
                      message.role === 'user' ? styles.userMessage : styles.agentMessage
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        message.role === 'user' ? styles.userBubble : styles.agentBubble
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          message.role === 'user' ? styles.userText : styles.agentText
                        ]}
                      >
                        {message.content}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          message.role === 'user' ? styles.userTime : styles.agentTime
                        ]}
                      >
                        {formatTime(message.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <View style={[styles.messageContainer, styles.agentMessage]}>
                    <View style={[styles.messageBubble, styles.agentBubble]}>
                      <View style={styles.typingIndicator}>
                        <Text style={styles.typingText}>{agent?.name.split(' ')[0]} is typing</Text>
                        <View style={styles.typingDots}>
                          <View style={styles.typingDot} />
                          <View style={styles.typingDot} />
                          <View style={styles.typingDot} />
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Quick Actions for Billing Category */}
              {category?.id === 'billing' && (
                <View style={styles.quickActionsContainer}>
                  <Text style={styles.quickActionsTitle}>Quick Actions:</Text>
                  <View style={styles.quickActionsRow}>
                    <TouchableOpacity 
                      style={styles.quickActionButton}
                      onPress={handleRefundRequest}
                      disabled={isTyping}
                    >
                      <Ionicons name="card-outline" size={16} color="#7C2B86" />
                      <Text style={styles.quickActionText}>Request Refund</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickActionButton}
                      onPress={handleCancellationRequest}
                      disabled={isTyping}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#7C2B86" />
                      <Text style={styles.quickActionText}>Cancel Subscription</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  multiline
                  maxLength={1000}
                  editable={!loading}
                  onSubmitEditing={sendMessage}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || loading) && styles.sendButtonDisabled
                  ]}
                  onPress={sendMessage}
                  disabled={!inputText.trim() || loading}
                >
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={(!inputText.trim() || loading) ? '#ccc' : 'white'} 
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
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
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  connectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  connectionContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  connectionIcon: {
    marginBottom: 30,
  },
  connectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F1147',
    textAlign: 'center',
    marginBottom: 8,
  },
  connectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  connectionSteps: {
    alignItems: 'flex-start',
  },
  connectionStep: {
    fontSize: 14,
    color: '#7C2B86',
    marginBottom: 8,
  },
  agentConnectedContent: {
    alignItems: 'center',
  },
  agentAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7C2B86',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  agentConnectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  agentName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 4,
  },
  agentInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  agentExperience: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  connectionSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectionSuccessText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
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
  agentAvatarSmall: {
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
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  agentMessage: {
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
  agentBubble: {
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
  agentText: {
    color: '#1F1147',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  agentTime: {
    color: '#666',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  typingDots: {
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
  quickActionsContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7C2B86',
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    color: '#7C2B86',
    fontWeight: '500',
  },
})

export default HumanSupportChat
