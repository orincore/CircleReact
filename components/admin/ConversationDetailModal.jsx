import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';

const ConversationDetailModal = ({ visible, onClose, conversationId }) => {
  const { token } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'https://api.circle.orincore.com';

  useEffect(() => {
    if (visible && conversationId) {
      loadConversationDetails();
    }
  }, [visible, conversationId]);

  const loadConversationDetails = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      setConversation({
        id: conversationId,
        user: { name: 'John Doe', email: 'john@example.com' },
        agent: { name: 'Priya', type: 'ai' },
        status: 'resolved',
        createdAt: '2024-01-07T10:30:00Z',
        updatedAt: '2024-01-07T10:45:00Z',
        messages: [
          { role: 'user', content: 'I want to cancel my subscription', timestamp: '2024-01-07T10:30:00Z' },
          { role: 'assistant', content: 'I understand your concern. Let me help you with that.', timestamp: '2024-01-07T10:31:00Z' },
          { role: 'assistant', content: 'I\'ve processed your cancellation and refund.', timestamp: '2024-01-07T10:32:00Z' }
        ],
        sentimentAnalysis: {
          sentiment: 'frustrated',
          confidence: 0.85,
          escalationRisk: 'medium'
        },
        satisfactionRating: 4,
        feedback: 'Quick resolution, thank you!'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load conversation details');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#4CAF50';
      case 'negative': return '#FF5722';
      case 'frustrated': return '#FF9800';
      case 'angry': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return '#F44336';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    return (
      <View key={index} style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {message.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  };

  if (!conversation) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient colors={['#7C2B86', '#5D5FEF']} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Conversation Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content}>
          {/* Conversation Info */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Conversation Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>{conversation.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User:</Text>
              <Text style={styles.infoValue}>{conversation.user.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Agent:</Text>
              <Text style={styles.infoValue}>{conversation.agent.name} ({conversation.agent.type})</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: conversation.status === 'resolved' ? '#4CAF50' : '#FF9800' }]}>
                <Text style={styles.statusText}>{conversation.status}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>
                {Math.round((new Date(conversation.updatedAt) - new Date(conversation.createdAt)) / 60000)} minutes
              </Text>
            </View>
          </View>

          {/* Sentiment Analysis */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Sentiment Analysis</Text>
            <View style={styles.sentimentContainer}>
              <View style={styles.sentimentItem}>
                <Text style={styles.sentimentLabel}>Sentiment</Text>
                <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor(conversation.sentimentAnalysis.sentiment) }]}>
                  <Text style={styles.sentimentText}>{conversation.sentimentAnalysis.sentiment}</Text>
                </View>
              </View>
              <View style={styles.sentimentItem}>
                <Text style={styles.sentimentLabel}>Confidence</Text>
                <Text style={styles.sentimentValue}>{(conversation.sentimentAnalysis.confidence * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.sentimentItem}>
                <Text style={styles.sentimentLabel}>Risk Level</Text>
                <View style={[styles.sentimentBadge, { backgroundColor: getRiskColor(conversation.sentimentAnalysis.escalationRisk) }]}>
                  <Text style={styles.sentimentText}>{conversation.sentimentAnalysis.escalationRisk}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Satisfaction */}
          {conversation.satisfactionRating && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Customer Satisfaction</Text>
              <View style={styles.satisfactionContainer}>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name="star"
                      size={24}
                      color={star <= conversation.satisfactionRating ? '#FFD700' : '#E0E0E0'}
                    />
                  ))}
                  <Text style={styles.ratingText}>{conversation.satisfactionRating}/5</Text>
                </View>
                {conversation.feedback && (
                  <Text style={styles.feedbackText}>"{conversation.feedback}"</Text>
                )}
              </View>
            </View>
          )}

          {/* Messages */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Conversation Messages</Text>
            <View style={styles.messagesContainer}>
              {conversation.messages.map((message, index) => renderMessage(message, index))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sentimentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sentimentItem: {
    alignItems: 'center',
  },
  sentimentLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sentimentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  satisfactionContainer: {
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  messagesContainer: {
    maxHeight: 300,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
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
  aiBubble: {
    backgroundColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
});

export default ConversationDetailModal;
