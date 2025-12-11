import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import HelpRoleToggle from './HelpRoleToggle';
import GiverRequestModal from './GiverRequestModal';
import { usePromptMatching } from '@/src/hooks/usePromptMatching';

/**
 * Wrapper component that integrates prompt matching into the home screen
 * Handles role toggle and incoming request modal
 */
const PromptMatchingWrapper = () => {
  const router = useRouter();
  const {
    giverProfile,
    incomingRequest,
    toggleGiverAvailability,
    respondToRequest,
    dismissIncomingRequest,
  } = usePromptMatching();

  const [selectedRole, setSelectedRole] = useState('off');

  // Sync selectedRole with actual giver availability status
  useEffect(() => {
    if (giverProfile?.isAvailable) {
      setSelectedRole('giver');
    } else {
      setSelectedRole('off');
    }
  }, [giverProfile?.isAvailable]);

  const handleRoleChange = async (role) => {
    setSelectedRole(role);

    if (role === 'giver') {
      // Enable giver mode
      try {
        await toggleGiverAvailability(true);
        Alert.alert(
          '✋ Giver Mode Active', 
          'You are now available to help others! You\'ll receive notifications when someone needs help.',
          [{ text: 'Got it!' }]
        );
      } catch (error) {
        console.error('Error enabling giver mode:', error);
        const errorMessage = error?.message || 'Failed to enable giver mode';
        Alert.alert(
          'Connection Error', 
          `Could not enable giver mode. ${errorMessage}\n\nPlease check your internet connection and try again.`,
          [{ text: 'OK' }]
        );
        setSelectedRole('off');
      }
    } else if (role === 'receiver') {
      // Navigate to help request screen
      router.push('/secure/help-request');
      // Reset to off after navigation
      setTimeout(() => setSelectedRole('off'), 500);
    } else {
      // Disable giver mode
      if (giverProfile?.isAvailable) {
        try {
          await toggleGiverAvailability(false);
        } catch (error) {
          console.error('Error disabling giver mode:', error);
          // Don't show error when disabling, just log it
        }
      }
    }
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    
    try {
      await respondToRequest(incomingRequest.requestId, true);
      dismissIncomingRequest();
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async () => {
    if (!incomingRequest) return;
    
    try {
      await respondToRequest(incomingRequest.requestId, false);
      dismissIncomingRequest();
      Alert.alert('Request Declined', 'We\'ll find another helper for them');
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'Failed to decline request');
    }
  };

  return (
    <View style={styles.container}>
      <HelpRoleToggle
        selectedRole={selectedRole}
        onRoleChange={handleRoleChange}
      />

      <GiverRequestModal
        visible={!!incomingRequest}
        onClose={dismissIncomingRequest}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
        requestData={incomingRequest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Add any container styles if needed
  },
});

export default PromptMatchingWrapper;
