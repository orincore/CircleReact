import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { blindDatingApi } from '@/src/api/blindDating';

/**
 * Test Panel for Blind Dating Content Filter
 * Allows testing the Together AI content filter instantly
 */
const BlindDatingTestPanel = ({ onClose }) => {
  const { theme, isDarkMode } = useTheme();
  const { token } = useAuth();
  
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [runningTests, setRunningTests] = useState(false);
  const [testSuiteResults, setTestSuiteResults] = useState(null);
  
  // Match testing states
  const [findingMatch, setFindingMatch] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [blindDatingSettings, setBlindDatingSettings] = useState(null);
  const [enablingBlindDating, setEnablingBlindDating] = useState(false);
  const [matchStats, setMatchStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Test AI Chat states
  const [creatingTestMatch, setCreatingTestMatch] = useState(false);
  const [testMatchData, setTestMatchData] = useState(null);
  const [aiChatMessage, setAiChatMessage] = useState('');
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loadingDebug, setLoadingDebug] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Check connection and settings on mount
    checkConnection();
    loadSettings();
    loadStats();
  }, []);
  
  const checkConnection = async () => {
    try {
      const result = await blindDatingApi.testConnection(token);
      setConnectionStatus(result);
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus({ connected: false, error: error.message });
    }
  };
  
  const loadSettings = async () => {
    try {
      const result = await blindDatingApi.getSettings(token);
      setBlindDatingSettings(result.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };
  
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const result = await blindDatingApi.getStats(token);
      setMatchStats(result.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };
  
  const handleEnableBlindDating = async () => {
    setEnablingBlindDating(true);
    try {
      const result = await blindDatingApi.enable(token);
      setBlindDatingSettings(result.settings);
      setMatchResult({ 
        success: true, 
        message: result.message,
        type: 'enabled' 
      });
    } catch (error) {
      console.error('Failed to enable blind dating:', error);
      setMatchResult({ 
        success: false, 
        error: error.message,
        type: 'enabled'
      });
    } finally {
      setEnablingBlindDating(false);
    }
  };
  
  const handleFindInstantMatch = async () => {
    setFindingMatch(true);
    setMatchResult(null);
    
    try {
      const result = await blindDatingApi.findMatch(token);
      setMatchResult({
        ...result,
        type: 'match'
      });
      
      // Refresh stats after finding match
      loadStats();
    } catch (error) {
      console.error('Match finding failed:', error);
      setMatchResult({ 
        success: false, 
        error: error.message,
        type: 'match'
      });
    } finally {
      setFindingMatch(false);
    }
  };
  
  const handleCreateTestMatch = async () => {
    setCreatingTestMatch(true);
    setTestMatchData(null);
    setAiChatHistory([]);
    
    try {
      const result = await blindDatingApi.createTestMatch(token);
      setTestMatchData(result);
      
      // Add welcome message to chat
      setAiChatHistory([{
        role: 'system',
        content: '🤖 Test match created! You are now chatting with an AI blind date partner. Try sending messages - personal info will be blocked!',
      }]);
      
      // Refresh stats
      loadStats();
    } catch (error) {
      console.error('Failed to create test match:', error);
      setTestMatchData({ 
        success: false, 
        error: error.message 
      });
    } finally {
      setCreatingTestMatch(false);
    }
  };
  
  const handleDebugEligibility = async () => {
    setLoadingDebug(true);
    try {
      const result = await blindDatingApi.debugEligibility(token);
      setDebugInfo(result.debug);
    } catch (error) {
      console.error('Debug failed:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoadingDebug(false);
    }
  };
  
  const handleAiChat = async () => {
    if (!aiChatMessage.trim() || !testMatchData?.match) return;
    
    const userMsg = aiChatMessage.trim();
    setAiChatMessage('');
    
    // Add user message to history
    setAiChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiChatLoading(true);
    
    try {
      // First filter the message
      const filterResult = await blindDatingApi.testFilter(userMsg, token);
      
      if (filterResult.analysis?.containsPersonalInfo) {
        // Message was blocked
        setAiChatHistory(prev => [...prev, {
          role: 'system',
          content: `🚫 Your message was BLOCKED! Detected: ${filterResult.analysis.detectedTypes.join(', ')}`,
          blocked: true,
          original: userMsg,
          sanitized: filterResult.sanitizedMessage,
        }]);
      } else {
        // Get AI response
        const aiResponse = await blindDatingApi.getAIChatResponse(
          userMsg,
          testMatchData.match.id,
          testMatchData.chatId,
          'friendly_indian',
          token
        );
        
        setAiChatHistory(prev => [...prev, {
          role: 'assistant',
          content: aiResponse.response,
        }]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setAiChatHistory(prev => [...prev, {
        role: 'system',
        content: `❌ Error: ${error.message}`,
      }]);
    } finally {
      setAiChatLoading(false);
    }
  };
  
  const handleTestMessage = async () => {
    if (!testMessage.trim()) return;
    
    setLoading(true);
    setTestResult(null);
    
    try {
      const result = await blindDatingApi.testFilter(testMessage, token);
      setTestResult(result);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRunTestSuite = async () => {
    setRunningTests(true);
    setTestSuiteResults(null);
    
    try {
      const result = await blindDatingApi.runTests(token);
      setTestSuiteResults(result);
    } catch (error) {
      console.error('Test suite failed:', error);
      setTestSuiteResults({ error: error.message });
    } finally {
      setRunningTests(false);
    }
  };
  
  const sampleMessages = [
    // English - Block
    { text: "My instagram is @johndoe123", blocked: true },
    { text: "Call me at 555-123-4567", blocked: true },
    { text: "My email is test@example.com", blocked: true },
    // English - Allow
    { text: "Hi! How are you?", blocked: false },
    { text: "I'm an engineer", blocked: false },
    { text: "I live in a big city", blocked: false },
    // Hindi - Block
    { text: "Mera naam Rahul hai", blocked: true },
    { text: "Mera number 9876543210", blocked: true },
    { text: "Mera insta @priya_sharma", blocked: true },
    // Hindi - Allow
    { text: "Kaise ho?", blocked: false },
    { text: "Mai engineer hu", blocked: false },
    { text: "Tum bahut sundar ho", blocked: false },
  ];
  
  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.background, opacity: fadeAnim }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="flask" size={28} color={theme.primary} />
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Content Filter Test
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* Connection Status */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud" size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Together AI Connection
            </Text>
          </View>
          
          {connectionStatus ? (
            <View style={styles.connectionInfo}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: connectionStatus.connected ? theme.success + '20' : theme.error + '20' }
              ]}>
                <Ionicons 
                  name={connectionStatus.connected ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={connectionStatus.connected ? theme.success : theme.error} 
                />
                <Text style={[
                  styles.statusText,
                  { color: connectionStatus.connected ? theme.success : theme.error }
                ]}>
                  {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
              
              {connectionStatus.serviceInfo && (
                <View style={styles.serviceInfo}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                    Model: <Text style={{ color: theme.textPrimary }}>{connectionStatus.serviceInfo.model}</Text>
                  </Text>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                    Provider: <Text style={{ color: theme.textPrimary }}>{connectionStatus.serviceInfo.provider}</Text>
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <ActivityIndicator color={theme.primary} />
          )}
        </View>
        
        {/* Test Message Input */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbubble" size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Test a Message
            </Text>
          </View>
          
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: theme.background,
                color: theme.textPrimary,
                borderColor: theme.border
              }
            ]}
            placeholder="Type a message to test..."
            placeholderTextColor={theme.textSecondary}
            value={testMessage}
            onChangeText={setTestMessage}
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.buttonDisabled]}
            onPress={handleTestMessage}
            disabled={loading || !testMessage.trim()}
          >
            <LinearGradient
              colors={[theme.primary, theme.decorative1]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="white" />
                  <Text style={styles.buttonText}>Analyze Message</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Quick Sample Buttons */}
          <Text style={[styles.sampleLabel, { color: theme.textSecondary }]}>
            Quick samples:
          </Text>
          <View style={styles.sampleButtons}>
            {sampleMessages.map((sample, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.sampleButton,
                  { 
                    backgroundColor: sample.blocked ? theme.error + '15' : theme.success + '15',
                    borderColor: sample.blocked ? theme.error + '30' : theme.success + '30'
                  }
                ]}
                onPress={() => setTestMessage(sample.text)}
              >
                <Ionicons 
                  name={sample.blocked ? "close-circle" : "checkmark-circle"} 
                  size={14} 
                  color={sample.blocked ? theme.error : theme.success} 
                />
                <Text 
                  style={[styles.sampleText, { color: theme.textPrimary }]}
                  numberOfLines={1}
                >
                  {sample.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Test Result */}
        {testResult && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Analysis Result
              </Text>
            </View>
            
            {testResult.error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.error + '15' }]}>
                <Ionicons name="alert-circle" size={20} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {testResult.error}
                </Text>
              </View>
            ) : (
              <>
                <View style={[
                  styles.resultBadge,
                  { 
                    backgroundColor: testResult.analysis?.containsPersonalInfo 
                      ? theme.error + '20' 
                      : theme.success + '20' 
                  }
                ]}>
                  <Ionicons 
                    name={testResult.analysis?.containsPersonalInfo ? "shield" : "shield-checkmark"} 
                    size={24} 
                    color={testResult.analysis?.containsPersonalInfo ? theme.error : theme.success} 
                  />
                  <Text style={[
                    styles.resultText,
                    { color: testResult.analysis?.containsPersonalInfo ? theme.error : theme.success }
                  ]}>
                    {testResult.analysis?.containsPersonalInfo 
                      ? '🚫 BLOCKED - Contains Personal Info' 
                      : '✅ ALLOWED - Safe to Send'}
                  </Text>
                </View>
                
                <View style={styles.resultDetails}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Quick Check: <Text style={{ color: theme.textPrimary }}>
                      {testResult.quickCheckTriggered ? 'Triggered (patterns found)' : 'Passed (no patterns)'}
                    </Text>
                  </Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Confidence: <Text style={{ color: theme.textPrimary }}>
                      {Math.round((testResult.analysis?.confidence || 0) * 100)}%
                    </Text>
                  </Text>
                  
                  {testResult.analysis?.detectedTypes?.length > 0 && (
                    <>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        Detected Types:
                      </Text>
                      <View style={styles.typeChips}>
                        {testResult.analysis.detectedTypes.map((type, idx) => (
                          <View 
                            key={idx}
                            style={[styles.typeChip, { backgroundColor: theme.error + '20' }]}
                          >
                            <Text style={[styles.typeChipText, { color: theme.error }]}>
                              {type}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                  
                  {testResult.sanitizedMessage && testResult.analysis?.containsPersonalInfo && (
                    <>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                        Sanitized Version:
                      </Text>
                      <Text style={[styles.sanitizedText, { color: theme.textPrimary, backgroundColor: theme.background }]}>
                        {testResult.sanitizedMessage}
                      </Text>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        )}
        
        {/* Run Full Test Suite */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Run Full Test Suite
            </Text>
          </View>
          
          <Text style={[styles.testSuiteDesc, { color: theme.textSecondary }]}>
            Run 20 predefined test cases to verify the content filter is working correctly.
          </Text>
          
          <TouchableOpacity
            style={[styles.testButton, runningTests && styles.buttonDisabled]}
            onPress={handleRunTestSuite}
            disabled={runningTests}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {runningTests ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.buttonText}>Running Tests...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play" size={20} color="white" />
                  <Text style={styles.buttonText}>Run Test Suite</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Test Suite Results */}
          {testSuiteResults && (
            <View style={styles.testSuiteResults}>
              {testSuiteResults.error ? (
                <View style={[styles.errorBox, { backgroundColor: theme.error + '15' }]}>
                  <Ionicons name="alert-circle" size={20} color={theme.error} />
                  <Text style={[styles.errorText, { color: theme.error }]}>
                    {testSuiteResults.error}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Summary */}
                  <View style={[styles.summaryBox, { backgroundColor: theme.background }]}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>
                        {testSuiteResults.summary?.total}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: theme.success }]}>
                        {testSuiteResults.summary?.passed}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Passed</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: theme.error }]}>
                        {testSuiteResults.summary?.failed}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Failed</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: theme.primary }]}>
                        {testSuiteResults.summary?.passRate}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Pass Rate</Text>
                    </View>
                  </View>
                  
                  {/* Individual Results */}
                  <Text style={[styles.resultsHeader, { color: theme.textPrimary }]}>
                    Test Results:
                  </Text>
                  {testSuiteResults.results?.map((result, idx) => (
                    <View 
                      key={idx}
                      style={[
                        styles.testResultItem,
                        { 
                          backgroundColor: result.passed ? theme.success + '10' : theme.error + '10',
                          borderLeftColor: result.passed ? theme.success : theme.error
                        }
                      ]}
                    >
                      <View style={styles.testResultHeader}>
                        <Ionicons 
                          name={result.passed ? "checkmark-circle" : "close-circle"} 
                          size={16} 
                          color={result.passed ? theme.success : theme.error} 
                        />
                        <Text 
                          style={[styles.testResultMessage, { color: theme.textPrimary }]}
                          numberOfLines={1}
                        >
                          {result.message}
                        </Text>
                      </View>
                      <Text style={[styles.testResultDetail, { color: theme.textSecondary }]}>
                        Expected: {result.expected ? 'Block' : 'Allow'} | Actual: {result.actual ? 'Blocked' : 'Allowed'}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
        
        {/* ============ INSTANT MATCH TEST ============ */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart" size={20} color="#FF6B9D" />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Instant Match Test 💘
            </Text>
          </View>
          
          <Text style={[styles.testSuiteDesc, { color: theme.textSecondary }]}>
            Test the matchmaking system by instantly finding a compatible blind date match.
          </Text>
          
          {/* Blind Dating Status */}
          <View style={[styles.statusSection, { backgroundColor: theme.background, borderRadius: 12, padding: 12, marginBottom: 12 }]}>
            <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>
              Blind Dating Status:
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: blindDatingSettings?.is_enabled ? theme.success + '20' : theme.error + '20', marginTop: 6 }
            ]}>
              <Ionicons 
                name={blindDatingSettings?.is_enabled ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={blindDatingSettings?.is_enabled ? theme.success : theme.error} 
              />
              <Text style={[
                styles.statusText,
                { color: blindDatingSettings?.is_enabled ? theme.success : theme.error }
              ]}>
                {blindDatingSettings?.is_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          
          {/* Enable Button (if disabled) */}
          {!blindDatingSettings?.is_enabled && (
            <TouchableOpacity
              style={[styles.testButton, enablingBlindDating && styles.buttonDisabled]}
              onPress={handleEnableBlindDating}
              disabled={enablingBlindDating}
            >
              <LinearGradient
                colors={['#FF6B9D', '#FF8E53']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {enablingBlindDating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="power" size={20} color="white" />
                    <Text style={styles.buttonText}>Enable Blind Dating First</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {/* Find Match Button */}
          <TouchableOpacity
            style={[styles.testButton, (findingMatch || !blindDatingSettings?.is_enabled) && styles.buttonDisabled]}
            onPress={handleFindInstantMatch}
            disabled={findingMatch || !blindDatingSettings?.is_enabled}
          >
            <LinearGradient
              colors={blindDatingSettings?.is_enabled ? ['#FF6B9D', '#C44EF3'] : ['#888', '#666']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {findingMatch ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.buttonText}>Finding Match...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="search-heart" size={20} color="white" />
                  <Text style={styles.buttonText}>Find Instant Match</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Match Statistics */}
          {matchStats && (
            <View style={[styles.statsBox, { backgroundColor: theme.background, marginTop: 12 }]}>
              <Text style={[styles.statsTitle, { color: theme.textPrimary }]}>
                📊 Your Match Stats
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.primary }]}>{matchStats.totalMatches}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#FF6B9D' }]}>{matchStats.activeMatches}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.success }]}>{matchStats.revealedMatches}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Revealed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.textSecondary }]}>{matchStats.successRate}%</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Success</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Match Result */}
          {matchResult && (
            <View style={[styles.matchResultBox, { 
              backgroundColor: matchResult.success ? theme.success + '15' : theme.error + '15',
              marginTop: 16 
            }]}>
              <View style={styles.matchResultHeader}>
                <Ionicons 
                  name={matchResult.success ? 
                    (matchResult.match ? "heart-circle" : "checkmark-circle") : 
                    "close-circle"
                  } 
                  size={24} 
                  color={matchResult.success ? theme.success : theme.error} 
                />
                <Text style={[styles.matchResultTitle, { 
                  color: matchResult.success ? theme.success : theme.error 
                }]}>
                  {matchResult.success ? 
                    (matchResult.match ? '🎉 Match Found!' : '✓ Success!') : 
                    '✗ Failed'
                  }
                </Text>
              </View>
              
              <Text style={[styles.matchResultMessage, { color: theme.textPrimary }]}>
                {matchResult.message || matchResult.error}
              </Text>
              
              {/* Match Details */}
              {matchResult.match && (
                <View style={[styles.matchDetails, { backgroundColor: theme.surface, marginTop: 12 }]}>
                  <Text style={[styles.matchDetailTitle, { color: theme.textPrimary }]}>
                    Match Details:
                  </Text>
                  
                  <View style={styles.matchDetailRow}>
                    <Text style={[styles.matchDetailLabel, { color: theme.textSecondary }]}>
                      Match ID:
                    </Text>
                    <Text style={[styles.matchDetailValue, { color: theme.textPrimary }]} numberOfLines={1}>
                      {matchResult.match.id?.substring(0, 8)}...
                    </Text>
                  </View>
                  
                  <View style={styles.matchDetailRow}>
                    <Text style={[styles.matchDetailLabel, { color: theme.textSecondary }]}>
                      Compatibility:
                    </Text>
                    <Text style={[styles.matchDetailValue, { color: '#FF6B9D' }]}>
                      {Math.round((matchResult.match.compatibility_score || 0) * 100)}%
                    </Text>
                  </View>
                  
                  <View style={styles.matchDetailRow}>
                    <Text style={[styles.matchDetailLabel, { color: theme.textSecondary }]}>
                      Reveal Threshold:
                    </Text>
                    <Text style={[styles.matchDetailValue, { color: theme.textPrimary }]}>
                      {matchResult.match.reveal_threshold} messages
                    </Text>
                  </View>
                  
                  {matchResult.match.otherUser && (
                    <>
                      <View style={styles.matchDetailRow}>
                        <Text style={[styles.matchDetailLabel, { color: theme.textSecondary }]}>
                          Anonymous Name:
                        </Text>
                        <Text style={[styles.matchDetailValue, { color: theme.textPrimary }]}>
                          {matchResult.match.otherUser.first_name} {matchResult.match.otherUser.last_name}
                        </Text>
                      </View>
                      
                      {matchResult.match.otherUser.age && (
                        <View style={styles.matchDetailRow}>
                          <Text style={[styles.matchDetailLabel, { color: theme.textSecondary }]}>
                            Age:
                          </Text>
                          <Text style={[styles.matchDetailValue, { color: theme.textPrimary }]}>
                            {matchResult.match.otherUser.age}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* ============ AI TEST CHAT ============ */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbubbles" size={20} color="#C44EF3" />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              AI Test Chat 🤖
            </Text>
          </View>
          
          <Text style={[styles.testSuiteDesc, { color: theme.textSecondary }]}>
            Create a test match with an AI bot and chat to see how blind dating works! Try sending personal info - it will be blocked.
          </Text>
          
          {/* Debug Button */}
          <TouchableOpacity
            style={[styles.testButton, { marginBottom: 8 }]}
            onPress={handleDebugEligibility}
            disabled={loadingDebug}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loadingDebug ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="bug" size={18} color="white" />
                  <Text style={styles.buttonText}>Debug: Why No Matches?</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Debug Info */}
          {debugInfo && (
            <View style={[styles.debugBox, { backgroundColor: theme.background, marginBottom: 12 }]}>
              <Text style={[styles.debugTitle, { color: theme.textPrimary }]}>
                🔍 Debug Info:
              </Text>
              <Text style={[styles.debugText, { color: debugInfo.reason?.includes('✅') ? theme.success : theme.error }]}>
                {debugInfo.reason || debugInfo.error}
              </Text>
              {debugInfo.eligibility && (
                <>
                  <Text style={[styles.debugText, { color: theme.textSecondary }]}>
                    • Total users in app: {debugInfo.eligibility.totalUsersInApp}
                  </Text>
                  <Text style={[styles.debugText, { color: theme.textSecondary }]}>
                    • Users with blind dating ON: {debugInfo.eligibility.usersWithBlindDatingEnabled}
                  </Text>
                  <Text style={[styles.debugText, { color: theme.textSecondary }]}>
                    • Your active matches: {debugInfo.eligibility.yourCurrentActiveMatches}
                  </Text>
                </>
              )}
            </View>
          )}
          
          {/* Create Test Match Button */}
          <TouchableOpacity
            style={[styles.testButton, creatingTestMatch && styles.buttonDisabled]}
            onPress={handleCreateTestMatch}
            disabled={creatingTestMatch}
          >
            <LinearGradient
              colors={['#C44EF3', '#FF6B9D']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {creatingTestMatch ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.buttonText}>Creating Test Match...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>Create Test Match with AI Bot</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Test Match Result */}
          {testMatchData && (
            <View style={[styles.testMatchResult, { 
              backgroundColor: testMatchData.success ? theme.success + '15' : theme.error + '15',
              marginTop: 12
            }]}>
              {testMatchData.success ? (
                <>
                  <View style={styles.testMatchHeader}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                    <Text style={[styles.testMatchTitle, { color: theme.success }]}>
                      {testMatchData.message}
                    </Text>
                  </View>
                  
                  {/* Instructions */}
                  <View style={[styles.instructionsBox, { backgroundColor: theme.surface, marginTop: 10 }]}>
                    <Text style={[styles.instructionsTitle, { color: theme.textPrimary }]}>
                      📝 How to test:
                    </Text>
                    {Object.values(testMatchData.instructions || {}).map((step, idx) => (
                      <Text key={idx} style={[styles.instructionText, { color: theme.textSecondary }]}>
                        {idx + 1}. {step}
                      </Text>
                    ))}
                  </View>
                  
                  {/* AI Chat Interface */}
                  <View style={[styles.aiChatBox, { backgroundColor: theme.background, marginTop: 12 }]}>
                    <Text style={[styles.aiChatTitle, { color: theme.textPrimary }]}>
                      💬 Chat with AI Partner:
                    </Text>
                    
                    {/* Chat History */}
                    <View style={styles.chatHistory}>
                      {aiChatHistory.map((msg, idx) => (
                        <View 
                          key={idx} 
                          style={[
                            styles.chatBubble,
                            msg.role === 'user' ? styles.userBubble : styles.otherBubble,
                            msg.blocked && styles.blockedBubble,
                            { backgroundColor: msg.role === 'user' 
                              ? (msg.blocked ? theme.error + '20' : theme.primary + '20')
                              : theme.surface 
                            }
                          ]}
                        >
                          {msg.role === 'system' ? (
                            <Text style={[styles.systemMessage, { color: msg.blocked ? theme.error : theme.textSecondary }]}>
                              {msg.content}
                            </Text>
                          ) : (
                            <>
                              <Text style={[styles.chatRole, { color: theme.textSecondary }]}>
                                {msg.role === 'user' ? '👤 You' : '🎭 Mystery Match'}
                              </Text>
                              <Text style={[styles.chatText, { color: theme.textPrimary }]}>
                                {msg.content}
                              </Text>
                            </>
                          )}
                          {msg.blocked && msg.sanitized && (
                            <Text style={[styles.sanitizedHint, { color: theme.textSecondary }]}>
                              Sanitized: "{msg.sanitized}"
                            </Text>
                          )}
                        </View>
                      ))}
                      {aiChatLoading && (
                        <View style={[styles.chatBubble, styles.otherBubble, { backgroundColor: theme.surface }]}>
                          <ActivityIndicator color={theme.primary} size="small" />
                        </View>
                      )}
                    </View>
                    
                    {/* Chat Input */}
                    <View style={styles.chatInputRow}>
                      <TextInput
                        style={[styles.chatInput, { 
                          backgroundColor: theme.surface, 
                          color: theme.textPrimary,
                          borderColor: theme.border
                        }]}
                        placeholder="Type a message... (try: 'Mera naam Rahul hai')"
                        placeholderTextColor={theme.textSecondary}
                        value={aiChatMessage}
                        onChangeText={setAiChatMessage}
                        onSubmitEditing={handleAiChat}
                        editable={!aiChatLoading}
                      />
                      <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: theme.primary }]}
                        onPress={handleAiChat}
                        disabled={aiChatLoading || !aiChatMessage.trim()}
                      >
                        <Ionicons name="send" size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Quick Test Messages */}
                    <View style={styles.quickMessages}>
                      <Text style={[styles.quickLabel, { color: theme.textSecondary }]}>
                        Quick test:
                      </Text>
                      <View style={styles.quickButtons}>
                        <TouchableOpacity 
                          style={[styles.quickBtn, { backgroundColor: theme.error + '20' }]}
                          onPress={() => setAiChatMessage('Mera naam Rahul hai')}
                        >
                          <Text style={[styles.quickBtnText, { color: theme.error }]}>🚫 Hindi Name</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.quickBtn, { backgroundColor: theme.error + '20' }]}
                          onPress={() => setAiChatMessage('My insta is @test123')}
                        >
                          <Text style={[styles.quickBtnText, { color: theme.error }]}>🚫 Social</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.quickBtn, { backgroundColor: theme.success + '20' }]}
                          onPress={() => setAiChatMessage('Tum bahut sundar ho!')}
                        >
                          <Text style={[styles.quickBtnText, { color: theme.success }]}>✅ Flirt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.quickBtn, { backgroundColor: theme.success + '20' }]}
                          onPress={() => setAiChatMessage('Mai engineer hu, kaam bahut pasand hai')}
                        >
                          <Text style={[styles.quickBtnText, { color: theme.success }]}>✅ Generic</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.testMatchHeader}>
                  <Ionicons name="close-circle" size={24} color={theme.error} />
                  <Text style={[styles.testMatchTitle, { color: theme.error }]}>
                    Failed: {testMatchData.error}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectionInfo: {
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceInfo: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  testButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sampleLabel: {
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  sampleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    maxWidth: '100%',
  },
  sampleText: {
    fontSize: 12,
    flex: 1,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  resultDetails: {
    gap: 6,
  },
  detailLabel: {
    fontSize: 14,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sanitizedText: {
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  testSuiteDesc: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  testSuiteResults: {
    marginTop: 16,
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  resultsHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  testResultItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testResultMessage: {
    fontSize: 13,
    flex: 1,
  },
  testResultDetail: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 24,
  },
  // Match Testing Styles
  statusSection: {
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsBox: {
    borderRadius: 12,
    padding: 14,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  matchResultBox: {
    borderRadius: 12,
    padding: 14,
  },
  matchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  matchResultTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  matchResultMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  matchDetails: {
    borderRadius: 10,
    padding: 12,
  },
  matchDetailTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  matchDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  matchDetailLabel: {
    fontSize: 13,
  },
  matchDetailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  // AI Test Chat Styles
  debugBox: {
    borderRadius: 10,
    padding: 12,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  debugText: {
    fontSize: 12,
    marginTop: 4,
  },
  testMatchResult: {
    borderRadius: 12,
    padding: 14,
  },
  testMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testMatchTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  instructionsBox: {
    borderRadius: 10,
    padding: 12,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 8,
  },
  aiChatBox: {
    borderRadius: 12,
    padding: 12,
  },
  aiChatTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  chatHistory: {
    maxHeight: 250,
    marginBottom: 10,
  },
  chatBubble: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  blockedBubble: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  chatRole: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  chatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  systemMessage: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  sanitizedHint: {
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickMessages: {
    marginTop: 10,
  },
  quickLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default BlindDatingTestPanel;

