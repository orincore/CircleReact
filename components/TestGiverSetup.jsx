import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { promptMatchingApi } from '@/src/api/promptMatching';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * Test component to quickly set up a giver profile for Help Connect testing
 * This should be used for development/testing purposes only
 */
const TestGiverSetup = () => {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [giverProfile, setGiverProfile] = useState(null);

  const handleSetupGiver = async () => {
    if (!user || !token) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create giver profile with development skills
      const setupResponse = await fetch('/api/match/giver/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          skills: ['web development', 'mobile apps', 'javascript', 'react', 'node.js'],
          categories: ['tech', 'programming', 'career']
        })
      });

      if (!setupResponse.ok) {
        throw new Error('Failed to create giver profile');
      }

      // Step 2: Toggle availability to true
      const toggleResponse = await fetch('/api/match/giver/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isAvailable: true
        })
      });

      if (!toggleResponse.ok) {
        throw new Error('Failed to set availability');
      }

      // Step 3: Get the created profile
      const profileResponse = await promptMatchingApi.getGiverProfile(token);
      setGiverProfile(profileResponse.profile);

      Alert.alert(
        '✅ Success!',
        'Test giver profile created successfully!\n\n' +
        'Skills: Web development, Mobile apps, JavaScript, React, Node.js\n' +
        'Status: Available to help\n\n' +
        'You can now test Help Connect with prompts like:\n' +
        '"I need help in developing apps"',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error setting up giver:', error);
      Alert.alert('Error', `Failed to setup giver profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!giverProfile) return;

    try {
      setLoading(true);
      
      const newAvailability = !giverProfile.isAvailable;
      const response = await fetch('/api/match/giver/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isAvailable: newAvailability
        })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle availability');
      }

      setGiverProfile(prev => ({
        ...prev,
        isAvailable: newAvailability
      }));

      Alert.alert(
        'Success',
        `You are now ${newAvailability ? 'available' : 'unavailable'} to help others`
      );

    } catch (error) {
      console.error('Error toggling availability:', error);
      Alert.alert('Error', `Failed to toggle availability: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadGiverProfile = async () => {
    try {
      const response = await promptMatchingApi.getGiverProfile(token);
      setGiverProfile(response.profile);
    } catch (error) {
      console.log('No giver profile found');
      setGiverProfile(null);
    }
  };

  React.useEffect(() => {
    if (token) {
      loadGiverProfile();
    }
  }, [token]);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Ionicons name="construct" size={24} color={theme.primary} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Test Giver Setup
        </Text>
      </View>

      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Set up a test giver profile to test the Help Connect feature
      </Text>

      {giverProfile ? (
        <View style={[styles.profileCard, { backgroundColor: theme.background }]}>
          <View style={styles.profileHeader}>
            <Ionicons 
              name="checkmark-circle" 
              size={20} 
              color={giverProfile.isAvailable ? '#4CAF50' : '#FF9800'} 
            />
            <Text style={[styles.profileStatus, { color: theme.textPrimary }]}>
              Giver Profile Active
            </Text>
          </View>
          
          <Text style={[styles.profileDetail, { color: theme.textSecondary }]}>
            Status: {giverProfile.isAvailable ? 'Available' : 'Unavailable'}
          </Text>
          <Text style={[styles.profileDetail, { color: theme.textSecondary }]}>
            Total Helps: {giverProfile.totalHelpsGiven || 0}
          </Text>
          <Text style={[styles.profileDetail, { color: theme.textSecondary }]}>
            Rating: {giverProfile.averageRating || 0}/5
          </Text>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              { 
                backgroundColor: giverProfile.isAvailable ? '#FF9800' : '#4CAF50',
                opacity: loading ? 0.7 : 1
              }
            ]}
            onPress={handleToggleAvailability}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons 
                  name={giverProfile.isAvailable ? 'pause' : 'play'} 
                  size={16} 
                  color="#fff" 
                />
                <Text style={styles.toggleButtonText}>
                  {giverProfile.isAvailable ? 'Go Unavailable' : 'Go Available'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.setupButton,
            { 
              backgroundColor: theme.primary,
              opacity: loading ? 0.7 : 1
            }
          ]}
          onPress={handleSetupGiver}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.setupButtonText}>Create Test Giver Profile</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={[styles.infoBox, { backgroundColor: theme.primary + '10' }]}>
        <Ionicons name="information-circle" size={16} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          This creates a giver profile with "web development" skills. 
          Test with prompt: "I need help in developing apps"
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  profileCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  profileStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});

export default TestGiverSetup;
