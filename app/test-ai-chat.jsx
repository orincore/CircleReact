import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native'
import ChatWidget from '../components/ai-support/ChatWidget'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TestAIChat = () => {
  const [showChat, setShowChat] = useState(false)
  const [userId, setUserId] = useState(null)

  // Get current user ID for testing
  React.useEffect(() => {
    const getUserId = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken')
        if (token) {
          // Decode token to get user ID (simplified)
          const payload = JSON.parse(atob(token.split('.')[1]))
          setUserId(payload.sub || payload.user_id)
        }
      } catch (error) {
        console.log('No user logged in, testing as anonymous')
      }
    }
    getUserId()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>AI Customer Service Test</Text>
        <Text style={styles.subtitle}>Test different scenarios:</Text>
        
        <View style={styles.testScenarios}>
          <Text style={styles.scenarioTitle}>🧪 Test Scenarios:</Text>
          
          <Text style={styles.scenario}>
            <Text style={styles.bold}>1. Refund Request (Eligible):</Text>
            {'\n'}"I want a refund for my subscription"
          </Text>
          
          <Text style={styles.scenario}>
            <Text style={styles.bold}>2. Refund Request (Ineligible):</Text>
            {'\n'}"I subscribed 2 months ago, can I get a refund?"
          </Text>
          
          <Text style={styles.scenario}>
            <Text style={styles.bold}>3. Subscription Questions:</Text>
            {'\n'}"What's the difference between Premium and Premium Plus?"
          </Text>
          
          <Text style={styles.scenario}>
            <Text style={styles.bold}>4. Technical Support:</Text>
            {'\n'}"I can't log into my account"
          </Text>
          
          <Text style={styles.scenario}>
            <Text style={styles.bold}>5. Escalation Test:</Text>
            {'\n'}"I want to speak to a human agent"
          </Text>
          
          <Text style={styles.scenario}>
            <Text style={styles.bold}>6. Policy Persistence Test:</Text>
            {'\n'}Keep insisting on refund after denial (test 3x limit)
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.testButton}
          onPress={() => setShowChat(true)}
        >
          <Text style={styles.testButtonText}>🤖 Start AI Chat Test</Text>
        </TouchableOpacity>

        <Text style={styles.userInfo}>
          Testing as: {userId ? `User ${userId}` : 'Anonymous User'}
        </Text>
      </View>

      <ChatWidget 
        visible={showChat}
        onClose={() => setShowChat(false)}
        userId={userId}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F1147',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  testScenarios: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7C2B86',
    marginBottom: 15,
  },
  scenario: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1F1147',
  },
  testButton: {
    backgroundColor: '#7C2B86',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  testButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
})

export default TestAIChat
