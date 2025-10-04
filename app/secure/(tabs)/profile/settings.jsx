import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch, Alert, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { getUserPreferences, saveUserPreferences, syncPreferencesWithBackend, loadPreferencesFromUser, LOCATION_PREFERENCES, AGE_PREFERENCES } from "@/utils/preferences";
import { useAuth } from "@/contexts/AuthContext";
import LocationTrackingService from "@/services/LocationTrackingService";
import CustomDropdown from "@/components/CustomDropdown";

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
  
  // Removed social accounts modal state - moved to edit profile
  
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
        colors={["#1F1147", "#2D1B69", "#1F1147"]}
        locations={[0, 0.5, 1]}
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
      colors={["#1F1147", "#2D1B69", "#1F1147"]}
      locations={[0, 0.5, 1]}
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

          {/* Score Improvement Suggestions */}
          <View style={styles.suggestionsCard}>
            <View style={styles.suggestionsHeader}>
              <Ionicons name="bulb" size={24} color="#FFD700" />
              <Text style={styles.suggestionsTitle}>Improve Your Match Score</Text>
            </View>
            <Text style={styles.suggestionsSubtitle}>
              Follow these tips to get better matches and increase your visibility
            </Text>
            
            <View style={styles.suggestionsList}>
              <View style={styles.suggestionItem}>
                <View style={styles.suggestionIcon}>
                  <Ionicons name="heart" size={18} color="#FF6FB5" />
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>
                    <Text style={styles.suggestionBold}>Add more interests</Text> - Users with 5+ interests get 3x more matches
                  </Text>
                </View>
              </View>

              <View style={styles.suggestionItem}>
                <View style={styles.suggestionIcon}>
                  <Ionicons name="location" size={18} color="#5D5FEF" />
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>
                    <Text style={styles.suggestionBold}>Enable location tracking</Text> - Get matched with nearby users automatically
                  </Text>
                </View>
              </View>

              <View style={styles.suggestionItem}>
                <View style={styles.suggestionIcon}>
                  <Ionicons name="chatbubbles" size={18} color="#7C2B86" />
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>
                    <Text style={styles.suggestionBold}>Be active</Text> - Regular activity boosts your profile visibility by 50%
                  </Text>
                </View>
              </View>

              <View style={styles.suggestionItem}>
                <View style={styles.suggestionIcon}>
                  <Ionicons name="image" size={18} color="#FF6FB5" />
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>
                    <Text style={styles.suggestionBold}>Update your profile photo</Text> - Profiles with photos get 10x more views
                  </Text>
                </View>
              </View>

              <View style={styles.suggestionItem}>
                <View style={styles.suggestionIcon}>
                  <Ionicons name="people" size={18} color="#5D5FEF" />
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>
                    <Text style={styles.suggestionBold}>Specify what you're looking for</Text> - Clear needs help find compatible matches
                  </Text>
                </View>
              </View>
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
            
            <CustomDropdown
              options={LOCATION_OPTIONS}
              selectedValue={locationPreference}
              onValueChange={setLocationPreference}
              placeholder="Select location preference"
              style={styles.dropdown}
            />
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
            
            <CustomDropdown
              options={AGE_OPTIONS}
              selectedValue={agePreference}
              onValueChange={setAgePreference}
              placeholder="Select age preference"
              style={styles.dropdown}
            />
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

          {/* Social Accounts section removed - moved to edit profile */}

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
  suggestionsCard: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.3)",
    marginBottom: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionsTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  suggestionsSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 20,
  },
  suggestionsList: {
    gap: 14,
    marginTop: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flex: 1,
    paddingTop: 2,
  },
  suggestionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  suggestionBold: {
    fontWeight: '700',
    color: '#FFFFFF',
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
  dropdown: {
    marginTop: 8,
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
});
