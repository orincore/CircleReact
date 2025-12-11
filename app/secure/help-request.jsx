import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { promptMatchingApi } from '@/src/api/promptMatching';

const HelpRequestScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [checkingActive, setCheckingActive] = useState(true);

  useEffect(() => {
    checkForActiveRequest();
  }, []);

  const checkForActiveRequest = async () => {
    try {
      const response = await promptMatchingApi.getActiveHelpRequest();
      if (response && response.request) {
        setActiveRequest(response.request);
      }
    } catch (error) {
      // No active request or error - that's fine
      console.log('No active request found');
    } finally {
      setCheckingActive(false);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      Alert.alert('Required', 'Please describe what you need help with');
      return;
    }

    if (prompt.length > 500) {
      Alert.alert('Too Long', 'Please keep your request under 500 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await promptMatchingApi.createHelpRequest(prompt.trim());

      if (response.success) {
        // Navigate to searching screen
        router.push({
          pathname: '/secure/help-searching',
          params: {
            requestId: response.requestId,
            prompt: prompt.trim(),
          },
        });
      } else {
        Alert.alert('Error', response.error || 'Failed to create help request');
      }
    } catch (error) {
      console.error('Error creating help request:', error);
      
      // Check if it's an active request error
      if (error.message?.includes('already have an active help request')) {
        handleActiveRequestError();
      } else {
        Alert.alert('Error', 'Failed to create help request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActiveRequestError = async () => {
    try {
      // Try to get the active request details
      const activeRequest = await promptMatchingApi.getActiveHelpRequest();
      
      if (activeRequest && activeRequest.request) {
        const { id: requestId, prompt: activePrompt, status } = activeRequest.request;
        
        Alert.alert(
          '🔍 Search Already Active',
          `You already have a help request running in the background:\n\n"${activePrompt}"\n\nStatus: ${status === 'searching' ? 'Looking for helpers' : status}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View Search',
              onPress: () => {
                router.push({
                  pathname: '/secure/help-searching',
                  params: {
                    requestId,
                    prompt: activePrompt,
                  },
                });
              },
            },
            {
              text: 'Stop Search',
              style: 'destructive',
              onPress: () => handleStopActiveRequest(requestId),
            },
          ]
        );
      } else {
        // Fallback if we can't get request details
        Alert.alert(
          '🔍 Search Already Active',
          'You already have a help request running in the background. Please wait for it to complete or cancel it first.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Go to Match Screen',
              onPress: () => router.push('/secure/(tabs)/match'),
            },
          ]
        );
      }
    } catch (fetchError) {
      console.error('Error fetching active request:', fetchError);
      // Fallback alert
      Alert.alert(
        '🔍 Search Already Active',
        'You already have a help request running in the background. Please check the Match screen to manage it.',
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Go to Match Screen',
            onPress: () => router.push('/secure/(tabs)/match'),
          },
        ]
      );
    }
  };

  const handleStopActiveRequest = async (requestId) => {
    try {
      setLoading(true);
      await promptMatchingApi.cancelHelpRequest(requestId);
      
      // Clear the active request from state
      setActiveRequest(null);
      
      Alert.alert(
        '✅ Search Stopped',
        'Your previous help request has been cancelled. You can now create a new one.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error stopping active request:', error);
      Alert.alert('Error', 'Failed to stop the active request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const examplePrompts = [
    "I need advice on career change",
    "Looking for workout motivation tips",
    "Need help with relationship advice",
    "Want to learn about investing",
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Request Help
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Active Request Banner */}
        {activeRequest && (
          <View style={[styles.activeRequestBanner, { 
            backgroundColor: theme.primary + '15',
            borderColor: theme.primary + '30'
          }]}>
            <View style={styles.activeRequestContent}>
              <Ionicons name="search" size={20} color={theme.primary} />
              <View style={styles.activeRequestText}>
                <Text style={[styles.activeRequestTitle, { color: theme.primary }]}>
                  🔍 Search Active
                </Text>
                <Text style={[styles.activeRequestPrompt, { color: theme.textSecondary }]} numberOfLines={2}>
                  "{activeRequest.prompt}"
                </Text>
              </View>
            </View>
            <View style={styles.activeRequestActions}>
              <TouchableOpacity
                style={[styles.activeRequestButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  router.push({
                    pathname: '/secure/help-searching',
                    params: {
                      requestId: activeRequest.id,
                      prompt: activeRequest.prompt,
                    },
                  });
                }}
              >
                <Text style={styles.activeRequestButtonText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.activeRequestButton, { 
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: theme.border
                }]}
                onPress={() => handleStopActiveRequest(activeRequest.id)}
              >
                <Text style={[styles.activeRequestButtonText, { color: theme.textPrimary }]}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="hand-right" size={60} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>
            What do you need help with?
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {activeRequest 
              ? 'You already have an active search. Stop it first to create a new request.'
              : 'Describe your situation and we\'ll find the perfect person to help you'
            }
          </Text>

          {/* Prompt Input */}
          <View style={[styles.inputContainer, { 
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border
          }]}>
            <TextInput
              style={[styles.input, { 
                color: theme.textPrimary,
                opacity: activeRequest ? 0.5 : 1
              }]}
              placeholder={activeRequest ? "Stop your active search first..." : "I need help with..."}
              placeholderTextColor={theme.textTertiary}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={500}
              textAlignVertical="top"
              editable={!activeRequest}
            />
            <Text style={[styles.charCount, { color: theme.textSecondary }]}>
              {prompt.length}/500
            </Text>
          </View>

          {/* Example Prompts */}
          <View style={styles.examplesContainer}>
            <Text style={[styles.examplesTitle, { color: theme.textSecondary }]}>
              Examples:
            </Text>
            {examplePrompts.map((example, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.exampleChip, { 
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  opacity: activeRequest ? 0.5 : 1
                }]}
                onPress={() => !activeRequest && setPrompt(example)}
                disabled={!!activeRequest}
              >
                <Text style={[styles.exampleText, { color: theme.textPrimary }]}>
                  {example}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { 
                backgroundColor: (prompt.trim() && !activeRequest) ? theme.primary : theme.border,
                opacity: (loading || activeRequest) ? 0.7 : 1,
              }
            ]}
            onPress={handleSubmit}
            disabled={!prompt.trim() || loading || !!activeRequest}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Find Helper</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info */}
          <View style={[styles.infoBox, { 
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border
          }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Your identity will remain hidden until both parties agree to reveal
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  examplesContainer: {
    marginBottom: 30,
  },
  examplesTitle: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  exampleChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  activeRequestBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeRequestContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  activeRequestText: {
    flex: 1,
  },
  activeRequestTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeRequestPrompt: {
    fontSize: 14,
    lineHeight: 18,
  },
  activeRequestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  activeRequestButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  activeRequestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default HelpRequestScreen;
