import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch, Alert, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { getUserPreferences, saveUserPreferences, syncPreferencesWithBackend, loadPreferencesFromUser, LOCATION_PREFERENCES, AGE_PREFERENCES } from "@/utils/preferences";
import { useAuth } from "@/contexts/AuthContext";
import LocationTrackingService from "@/services/LocationTrackingService";
import SocialAccountsManager from "@/src/components/SocialAccountsManager";

const LOCATION_OPTIONS = [
  { id: 'local', label: 'Local Only', description: 'Within 10km of your location' },
  { id: 'nearby', label: 'Nearby', description: 'Within 50km of your location' },
  { id: 'city', label: 'Same City', description: 'Within 100km of your location' },
  { id: 'region', label: 'Same Region', description: 'Within 300km of your location' },
  { id: 'country', label: 'Same Country', description: 'Within 1000km of your location' },
  { id: 'international', label: 'International', description: 'Anywhere in the world' },
];

const AGE_OPTIONS = [
  { id: 'close', label: 'Close Age (±2 years)' },
  { id: 'similar', label: 'Similar Age (±5 years)' },
  { id: 'flexible', label: 'Flexible (±10 years)' },
  { id: 'open', label: 'Very Open (±15 years)' },
  { id: 'any', label: 'Any Age' },
];

const INTEREST_OPTIONS = [
  "art", "music", "coding", "coffee", "running", "yoga", "travel", "books", "movies", "gaming",
  "fitness", "food", "photography", "fashion", "tech", "design", "writing", "finance", "crypto", "ai",
];

const NEED_OPTIONS = [
  "Friendship",
  "Boyfriend", 
  "Girlfriend",
  "Dating",
  "Relationship",
  "Casual"
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, token } = useAuth();
  
  // Matching preferences
  const [locationPreference, setLocationPreference] = useState('nearby');
  const [agePreference, setAgePreference] = useState('flexible');
  const [friendshipLocationPriority, setFriendshipLocationPriority] = useState(true);
  const [relationshipDistanceFlexible, setRelationshipDistanceFlexible] = useState(true);
  
  // Profile preferences
  const [interests, setInterests] = useState(new Set());
  const [needs, setNeeds] = useState(new Set());
  const [interestSearch, setInterestSearch] = useState('');
  const [needSearch, setNeedSearch] = useState('');
  
  // Location tracking
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  
  // Social accounts
  const [showSocialAccountsModal, setShowSocialAccountsModal] = useState(false);
  
  const [loading, setLoading] = useState(true);

  // Load preferences from storage and reload when user data changes
  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      // Load preferences from backend if available, fallback to local
      const preferences = await loadPreferencesFromUser(user);
      setLocationPreference(preferences.locationPreference);
      setAgePreference(preferences.agePreference);
      setFriendshipLocationPriority(preferences.friendshipLocationPriority);
      setRelationshipDistanceFlexible(preferences.relationshipDistanceFlexible);
      
      // Load user interests and needs from user profile
      if (user?.interests) {
        setInterests(new Set(user.interests));
      }
      if (user?.needs) {
        setNeeds(new Set(user.needs));
      }
      
      // Load location tracking status
      const trackingEnabled = await LocationTrackingService.isTrackingEnabled();
      setLocationTrackingEnabled(trackingEnabled);
      
      const lastUpdate = await LocationTrackingService.getLastLocationUpdate();
      setLastLocationUpdate(lastUpdate);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      // Save matching preferences to backend and local storage
      const preferences = {
        locationPreference,
        agePreference,
        friendshipLocationPriority,
        relationshipDistanceFlexible,
      };
      
      console.log('💾 Saving preferences:', preferences);
      
      // Sync preferences with backend database
      const syncResult = await syncPreferencesWithBackend(preferences, token);
      
      // Update user profile with new interests and needs
      const interestsArray = Array.from(interests);
      const needsArray = Array.from(needs);
      
      await updateProfile({
        interests: interestsArray,
        needs: needsArray,
      });
      
      if (syncResult.success) {
        Alert.alert(
          'Settings Saved', 
          'Your matching preferences and profile have been updated successfully in the database.'
        );
        console.log('✅ All preferences saved successfully');
      } else if (syncResult.localSaved) {
        Alert.alert(
          'Partial Success', 
          'Profile updated and preferences saved locally, but failed to sync with server. Your preferences will sync when connection is restored.'
        );
        console.log('⚠️ Preferences saved locally but backend sync failed:', syncResult.error);
      } else {
        Alert.alert(
          'Error', 
          'Failed to save some preferences. Please check your connection and try again.'
        );
        console.log('❌ Failed to save preferences:', syncResult.error);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  const getSelectedLocationPreference = () => {
    return LOCATION_OPTIONS.find(pref => pref.id === locationPreference);
  };

  const getSelectedAgePreference = () => {
    return AGE_OPTIONS.find(pref => pref.id === agePreference);
  };

  // Helper functions for interests and needs
  const toggleInterest = (interest) => {
    const newInterests = new Set(interests);
    if (newInterests.has(interest)) {
      newInterests.delete(interest);
    } else {
      newInterests.add(interest);
    }
    setInterests(newInterests);
  };

  const toggleNeed = (need) => {
    const newNeeds = new Set(needs);
    if (newNeeds.has(need)) {
      newNeeds.delete(need);
    } else {
      newNeeds.add(need);
    }
    setNeeds(newNeeds);
  };

  const filteredInterests = INTEREST_OPTIONS.filter(interest => 
    interest.toLowerCase().includes(interestSearch.toLowerCase())
  );

  const filteredNeeds = NEED_OPTIONS.filter(need => 
    need.toLowerCase().includes(needSearch.toLowerCase())
  );

  // Location tracking functions
  const toggleLocationTracking = async (enabled) => {
    try {
      if (enabled) {
        // Start location tracking
        await LocationTrackingService.startTracking(token);
        setLocationTrackingEnabled(true);
        
        // Update location immediately
        await LocationTrackingService.updateLocationNow();
        const lastUpdate = await LocationTrackingService.getLastLocationUpdate();
        setLastLocationUpdate(lastUpdate);
        
        Alert.alert(
          'Location Tracking Enabled',
          'Circle will now update your location every 5 minutes for better matches, even when the app is closed.'
        );
      } else {
        // Stop location tracking
        await LocationTrackingService.stopTracking();
        setLocationTrackingEnabled(false);
        
        Alert.alert(
          'Location Tracking Disabled',
          'Circle will no longer track your location in the background.'
        );
      }
    } catch (error) {
      console.error('Error toggling location tracking:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to change location tracking settings. Please check your location permissions.'
      );
      // Revert the toggle if it failed
      setLocationTrackingEnabled(!enabled);
    }
  };

  const updateLocationNow = async () => {
    try {
      await LocationTrackingService.updateLocationNow();
      const lastUpdate = await LocationTrackingService.getLastLocationUpdate();
      setLastLocationUpdate(lastUpdate);
      
      Alert.alert('Location Updated', 'Your location has been updated successfully.');
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'Failed to update location. Please check your location permissions.');
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading preferences...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.blurCircleLarge} />
          <View style={styles.blurCircleSmall} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#FFE8FF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Matching Settings</Text>
              <Text style={styles.subtitle}>Customize your matching preferences</Text>
            </View>
          </View>

          {/* Location Preferences */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Location Preferences</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Choose how far you're willing to match with other users
            </Text>
            
            {LOCATION_OPTIONS.map((pref) => (
              <TouchableOpacity
                key={pref.id}
                style={[
                  styles.preferenceOption,
                  locationPreference === pref.id && styles.preferenceOptionSelected
                ]}
                onPress={() => setLocationPreference(pref.id)}
              >
                <View style={styles.preferenceContent}>
                  <Text style={[
                    styles.preferenceLabel,
                    locationPreference === pref.id && styles.preferenceLabelSelected
                  ]}>
                    {pref.label}
                  </Text>
                  <Text style={[
                    styles.preferenceDescription,
                    locationPreference === pref.id && styles.preferenceDescriptionSelected
                  ]}>
                    {pref.description}
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  locationPreference === pref.id && styles.radioButtonSelected
                ]}>
                  {locationPreference === pref.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Age Preferences */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Age Preferences</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Set your preferred age range for matches
            </Text>
            
            {AGE_OPTIONS.map((pref) => (
              <TouchableOpacity
                key={pref.id}
                style={[
                  styles.preferenceOption,
                  agePreference === pref.id && styles.preferenceOptionSelected
                ]}
                onPress={() => setAgePreference(pref.id)}
              >
                <View style={styles.preferenceContent}>
                  <Text style={[
                    styles.preferenceLabel,
                    agePreference === pref.id && styles.preferenceLabelSelected
                  ]}>
                    {pref.label}
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  agePreference === pref.id && styles.radioButtonSelected
                ]}>
                  {agePreference === pref.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Interests Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Interests</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select your interests to find better matches
            </Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#8880B6" />
              <TextInput
                value={interestSearch}
                onChangeText={setInterestSearch}
                placeholder="Search interests..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                style={styles.searchInput}
              />
            </View>
            
            <View style={styles.chipContainer}>
              {filteredInterests.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.chip,
                    interests.has(interest) && styles.chipSelected
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text style={[
                    styles.chipText,
                    interests.has(interest) && styles.chipTextSelected
                  ]}>
                    {interest}
                  </Text>
                  {interests.has(interest) && (
                    <Ionicons name="checkmark" size={14} color="#7C2B86" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Needs Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>What You're Looking For</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select what type of connections you're seeking
            </Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#8880B6" />
              <TextInput
                value={needSearch}
                onChangeText={setNeedSearch}
                placeholder="Search connection types..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                style={styles.searchInput}
              />
            </View>
            
            <View style={styles.chipContainer}>
              {filteredNeeds.map((need) => (
                <TouchableOpacity
                  key={need}
                  style={[
                    styles.chip,
                    styles.needChip,
                    needs.has(need) && styles.needChipSelected
                  ]}
                  onPress={() => toggleNeed(need)}
                >
                  <Text style={[
                    styles.chipText,
                    needs.has(need) && styles.chipTextSelected
                  ]}>
                    {need}
                  </Text>
                  {needs.has(need) && (
                    <Ionicons name="checkmark" size={14} color="#7C2B86" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Advanced Settings */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Advanced Settings</Text>
            </View>
            
            <View style={styles.switchOption}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Prioritize Location for Friendship</Text>
                <Text style={styles.switchDescription}>
                  When looking for friends, prioritize users who are very close to you
                </Text>
              </View>
              <Switch
                value={friendshipLocationPriority}
                onValueChange={setFriendshipLocationPriority}
                trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#FFD6F2' }}
                thumbColor={friendshipLocationPriority ? '#7C2B86' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchOption}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Flexible Distance for Relationships</Text>
                <Text style={styles.switchDescription}>
                  Allow longer distances when looking for romantic relationships
                </Text>
              </View>
              <Switch
                value={relationshipDistanceFlexible}
                onValueChange={setRelationshipDistanceFlexible}
                trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#FFD6F2' }}
                thumbColor={relationshipDistanceFlexible ? '#7C2B86' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Social Accounts */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="link" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Social Accounts</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Link your Spotify and Instagram accounts to show them on your profile and help others discover your interests
            </Text>
            
            <TouchableOpacity 
              style={styles.socialAccountsButton} 
              onPress={() => setShowSocialAccountsModal(true)}
            >
              <View style={styles.socialAccountsButtonContent}>
                <View style={styles.socialAccountsIcons}>
                  <Ionicons name="musical-notes" size={18} color="#1DB954" />
                  <Ionicons name="camera" size={18} color="#E4405F" />
                </View>
                <Text style={styles.socialAccountsButtonText}>Manage Social Accounts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFD6F2" />
            </TouchableOpacity>
          </View>

          {/* Location Tracking */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="navigate" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Location Tracking</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Automatically update your location every 5 minutes for better matches, even when the app is closed
            </Text>
            
            <View style={styles.switchOption}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Enable Background Tracking</Text>
                <Text style={styles.switchDescription}>
                  Updates your location every 5 minutes for improved matching accuracy
                </Text>
              </View>
              <Switch
                value={locationTrackingEnabled}
                onValueChange={toggleLocationTracking}
                trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#FFD6F2' }}
                thumbColor={locationTrackingEnabled ? '#7C2B86' : '#f4f3f4'}
              />
            </View>

            {lastLocationUpdate && (
              <View style={styles.locationStatus}>
                <Ionicons name="time" size={16} color="#FFD6F2" />
                <Text style={styles.locationStatusText}>
                  Last updated: {lastLocationUpdate.toLocaleString()}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.updateLocationButton} 
              onPress={updateLocationNow}
            >
              <Ionicons name="refresh" size={18} color="#7C2B86" />
              <Text style={styles.updateLocationButtonText}>Update Location Now</Text>
            </TouchableOpacity>
          </View>

          {/* Current Settings Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Current Settings</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Location:</Text>
              <Text style={styles.summaryValue}>{getSelectedLocationPreference()?.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Age Range:</Text>
              <Text style={styles.summaryValue}>{getSelectedAgePreference()?.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Friendship Priority:</Text>
              <Text style={styles.summaryValue}>{friendshipLocationPriority ? 'Location First' : 'Balanced'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Relationship Distance:</Text>
              <Text style={styles.summaryValue}>{relationshipDistanceFlexible ? 'Flexible' : 'Strict'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Interests:</Text>
              <Text style={styles.summaryValue}>{interests.size} selected</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Looking For:</Text>
              <Text style={styles.summaryValue}>{needs.size} selected</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Location Tracking:</Text>
              <Text style={styles.summaryValue}>{locationTrackingEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
            <Text style={styles.saveButtonText}>Save Preferences</Text>
            <Ionicons name="checkmark" size={20} color="#7C2B86" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Social Accounts Modal */}
      <Modal
        visible={showSocialAccountsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SocialAccountsManager onClose={() => setShowSocialAccountsModal(false)} />
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFE8FF',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.78)",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.25)",
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFE8FF",
  },
  sectionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.72)",
    lineHeight: 20,
  },
  preferenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  preferenceOptionSelected: {
    borderColor: '#FFD6F2',
    backgroundColor: 'rgba(255, 214, 242, 0.15)',
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE8FF',
  },
  preferenceLabelSelected: {
    color: '#FFD6F2',
  },
  preferenceDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  preferenceDescriptionSelected: {
    color: 'rgba(255, 214, 242, 0.8)',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FFD6F2',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD6F2',
  },
  switchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE8FF',
  },
  switchDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: "rgba(255, 214, 242, 0.15)",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD6F2",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFE8FF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: '#FFD6F2',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C2B86',
  },
  blurCircleLarge: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 214, 242, 0.2)",
    top: -50,
    right: -50,
  },
  blurCircleSmall: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    bottom: 50,
    left: -60,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFE8FF',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipSelected: {
    backgroundColor: '#FFD6F2',
    borderColor: 'rgba(255, 214, 242, 0.85)',
    shadowColor: '#7C2B86',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  needChip: {
    backgroundColor: 'rgba(93, 95, 239, 0.15)',
    borderColor: 'rgba(93, 95, 239, 0.35)',
  },
  needChipSelected: {
    backgroundColor: 'rgba(93, 95, 239, 0.4)',
    borderColor: '#5D5FEF',
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#7C2B86',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 214, 242, 0.15)',
    borderRadius: 12,
    marginTop: 8,
  },
  locationStatusText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  updateLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFD6F2',
    borderRadius: 12,
    marginTop: 12,
  },
  updateLocationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  socialAccountsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
    marginTop: 8,
  },
  socialAccountsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialAccountsIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  socialAccountsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE8FF',
  },
});
