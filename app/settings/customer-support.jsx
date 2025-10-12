import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/contexts/AuthContext'
import HumanSupportChat from '../../components/support/HumanSupportChat'

const CustomerSupportScreen = ({ visible = true, onClose = () => {} }) => {
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showChat, setShowChat] = useState(false)

  const supportCategories = [
    {
      id: 'billing',
      title: 'Billing & Subscriptions',
      description: 'Questions about payments, refunds, and subscription plans',
      icon: 'card-outline',
      color: '#4CAF50',
      topics: [
        'Subscription plans and pricing',
        'Payment methods and billing',
        'Refunds and cancellations',
        'Upgrade or downgrade plans',
        'Billing history and invoices'
      ]
    },
    {
      id: 'account',
      title: 'Account & Profile',
      description: 'Help with your account settings and profile management',
      icon: 'person-outline',
      color: '#2196F3',
      topics: [
        'Login and password issues',
        'Profile setup and verification',
        'Account security and privacy',
        'Delete or deactivate account',
        'Profile photo and information'
      ]
    },
    {
      id: 'matching',
      title: 'Matching & Dating',
      description: 'Issues with matches, conversations, and dating features',
      icon: 'heart-outline',
      color: '#E91E63',
      topics: [
        'Finding and viewing matches',
        'Chat and messaging features',
        'Dating preferences and filters',
        'Blocked or reported users',
        'Match recommendations'
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      description: 'App crashes, bugs, and technical difficulties',
      icon: 'construct-outline',
      color: '#FF9800',
      topics: [
        'App crashes or freezing',
        'Login and connectivity issues',
        'Photo upload problems',
        'Notification settings',
        'App performance and bugs'
      ]
    },
    {
      id: 'safety',
      title: 'Safety & Reports',
      description: 'Report inappropriate behavior or safety concerns',
      icon: 'shield-outline',
      color: '#F44336',
      topics: [
        'Report inappropriate behavior',
        'Block or unblock users',
        'Safety tips and guidelines',
        'Fake profiles and scams',
        'Privacy and data protection'
      ]
    },
    {
      id: 'general',
      title: 'General Questions',
      description: 'Other questions and feedback about Circle',
      icon: 'help-circle-outline',
      color: '#9C27B0',
      topics: [
        'How Circle works',
        'App features and updates',
        'Success stories and tips',
        'Feedback and suggestions',
        'Partnership inquiries'
      ]
    }
  ]

  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    setShowChat(true)
  }

  const CategoryCard = ({ category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategorySelect(category)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        <Ionicons name={category.icon} size={28} color="white" />
      </View>
      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle}>{category.title}</Text>
        <Text style={styles.categoryDescription}>{category.description}</Text>
        <View style={styles.topicsList}>
          {category.topics.slice(0, 3).map((topic, index) => (
            <Text key={index} style={styles.topicItem}>• {topic}</Text>
          ))}
          {category.topics.length > 3 && (
            <Text style={styles.moreTopics}>+ {category.topics.length - 3} more topics</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  )

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#7C2B86', '#A16AE8']}
          style={styles.header}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Support</Text>
          <Text style={styles.headerSubtitle}>How can we help you today?</Text>
        </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <View style={styles.supportInfo}>
            <Ionicons name="time-outline" size={20} color="#7C2B86" />
            <Text style={styles.supportInfoText}>Average response time: 2-3 minutes</Text>
          </View>
          <View style={styles.supportInfo}>
            <Ionicons name="people-outline" size={20} color="#7C2B86" />
            <Text style={styles.supportInfoText}>24/7 support available</Text>
          </View>
          <View style={styles.supportInfo}>
            <Ionicons name="chatbubbles-outline" size={20} color="#7C2B86" />
            <Text style={styles.supportInfoText}>Live chat with our support team</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select a category to get started:</Text>

        {supportCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}

        <View style={styles.emergencySection}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning-outline" size={24} color="#F44336" />
            <Text style={styles.emergencyTitle}>Need Immediate Help?</Text>
          </View>
          <Text style={styles.emergencyText}>
            For urgent safety concerns or emergencies, please contact local authorities immediately.
          </Text>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => handleCategorySelect(supportCategories.find(c => c.id === 'safety'))}
          >
            <Text style={styles.emergencyButtonText}>Report Safety Issue</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Quick Answers</Text>
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I cancel my subscription?</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Why am I not getting matches?</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I verify my profile?</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>

        <HumanSupportChat
          visible={showChat}
          onClose={() => setShowChat(false)}
          category={selectedCategory}
          userId={user?.id}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  introSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  supportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportInfoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  topicsList: {
    marginTop: 4,
  },
  topicItem: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  moreTopics: {
    fontSize: 12,
    color: '#7C2B86',
    fontWeight: '500',
    marginTop: 2,
  },
  emergencySection: {
    backgroundColor: '#FFF3F3',
    borderRadius: 12,
    padding: 20,
    marginVertical: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  emergencyButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  faqSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 16,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqQuestion: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
})

export default CustomerSupportScreen
