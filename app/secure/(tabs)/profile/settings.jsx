import CustomDropdown from "@/components/CustomDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import LocationTrackingService from "@/services/LocationTrackingService";
import { loadPreferencesFromUser, syncPreferencesWithBackend } from "@/utils/preferences";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomerSupportScreen from "../../../settings/customer-support";

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
  const subscriptionContext = useSubscription();
  
  // Safely extract subscription values
  const isPremium = subscriptionContext?.isPremium || false;
  const plan = subscriptionContext?.plan || 'free';
  const subscription = subscriptionContext?.subscription;
  
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
  
  // Invisible mode
  const [invisibleMode, setInvisibleMode] = useState(false);
  
  // Customer support modal
  const [showCustomerSupport, setShowCustomerSupport] = useState(false);
  
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
      
      // Load invisible mode status from user profile
      setInvisibleMode(user?.invisibleMode || false);
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
      
      //console.log('💾 Saving preferences:', preferences);
      
      // Sync preferences with backend database
      const syncResult = await syncPreferencesWithBackend(preferences, token);
      
      // Update user profile with new interests and needs
      const interestsArray = Array.from(interests);
      const needsArray = Array.from(needs);
      
      await updateProfile({
        interests: interestsArray,
        needs: needsArray,
        invisibleMode: invisibleMode,
      });
      
      if (syncResult.success) {
        if (Platform.OS === 'web') {
          window.alert('Settings Saved\n\nYour matching preferences and profile have been updated successfully in the database.');
        } else {
          Alert.alert(
            'Settings Saved', 
            'Your matching preferences and profile have been updated successfully in the database.'
          );
        }
        //console.log('✅ All preferences saved successfully');
      } else if (syncResult.localSaved) {
        if (Platform.OS === 'web') {
          window.alert('Partial Success\n\nProfile updated and preferences saved locally, but failed to sync with server. Your preferences will sync when connection is restored.');
        } else {
          Alert.alert(
            'Partial Success', 
            'Profile updated and preferences saved locally, but failed to sync with server. Your preferences will sync when connection is restored.'
          );
        }
        //console.log('⚠️ Preferences saved locally but backend sync failed:', syncResult.error);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Error\n\nFailed to save some preferences. Please check your connection and try again.');
        } else {
          Alert.alert(
            'Error', 
            'Failed to save some preferences. Please check your connection and try again.'
          );
        }
        //console.log('❌ Failed to save preferences:', syncResult.error);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      if (Platform.OS === 'web') {
        window.alert('Error\n\nFailed to save preferences. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
      }
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
  const toggleInvisibleMode = async (enabled) => {
    //console.log('🔄 Toggle invisible mode called, enabled:', enabled);
    try {
      if (enabled) {
        // On web, Alert.alert doesn't support callbacks properly, so handle it differently
        if (Platform.OS === 'web') {
          const confirmed = window.confirm(
            'Enable Invisible Mode?\n\nYou will be hidden from maps, explore, and suggestions. Most features will be disabled until you turn this off. You can only chat with existing friends.'
          );
          
          //console.log('✅ User confirmed:', confirmed);
          
          if (!confirmed) {
            // User cancelled, revert the toggle
            //console.log('❌ User cancelled, reverting toggle');
            setInvisibleMode(false);
            return;
          }
          
          // User confirmed, proceed with enabling
          //console.log('📝 Setting invisible mode to true...');
          setInvisibleMode(true);
          //console.log('🔄 Calling updateProfile with invisibleMode: true');
          const result = await updateProfile({ invisibleMode: true });
          //console.log('✅ UpdateProfile result:', result);
          window.alert('Invisible Mode Enabled\n\nYou are now hidden from discovery. Most features are disabled. You can turn this off anytime in settings.');
        } else {
          // Native mobile - use Alert.alert with callbacks
          Alert.alert(
            'Enable Invisible Mode?',
            'You will be hidden from maps, explore, and suggestions. Most features will be disabled until you turn this off. You can only chat with existing friends.',
            [
              { 
                text: 'Cancel', 
                style: 'cancel',
                onPress: () => {
                  // Revert the toggle
                  setInvisibleMode(false);
                }
              },
              { 
                text: 'Enable', 
                style: 'destructive',
                onPress: async () => {
                  setInvisibleMode(true);
                  await updateProfile({ invisibleMode: true });
                  Alert.alert(
                    'Invisible Mode Enabled',
                    'You are now hidden from discovery. Most features are disabled. You can turn this off anytime in settings.'
                  );
                }
              }
            ]
          );
        }
      } else {
        // Disabling invisible mode
        //console.log('📝 Disabling invisible mode...');
        setInvisibleMode(false);
        //console.log('🔄 Calling updateProfile with invisibleMode: false');
        const result = await updateProfile({ invisibleMode: false });
        //console.log('✅ UpdateProfile result:', result);
        
        if (Platform.OS === 'web') {
          window.alert('Invisible Mode Disabled\n\nYou are now visible again and can use all features.');
        } else {
          Alert.alert(
            'Invisible Mode Disabled',
            'You are now visible again and can use all features.'
          );
        }
      }
    } catch (error) {
      console.error('Error toggling invisible mode:', error);
      
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to change invisible mode. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to change invisible mode. Please try again.');
      }
      
      // Revert the toggle if it failed
      setInvisibleMode(!enabled);
    }
  };

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
        
        if (Platform.OS === 'web') {
          window.alert('Location Tracking Enabled\n\nCircle will now update your location every 5 minutes for better matches, even when the app is closed.');
        } else {
          Alert.alert(
            'Location Tracking Enabled',
            'Circle will now update your location every 5 minutes for better matches, even when the app is closed.'
          );
        }
      } else {
        // Stop location tracking
        await LocationTrackingService.stopTracking();
        setLocationTrackingEnabled(false);
        
        if (Platform.OS === 'web') {
          window.alert('Location Tracking Disabled\n\nCircle will no longer track your location in the background.');
        } else {
          Alert.alert(
            'Location Tracking Disabled',
            'Circle will no longer track your location in the background.'
          );
        }
      }
    } catch (error) {
      console.error('Error toggling location tracking:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error\n\n${error.message || 'Failed to change location tracking settings. Please check your location permissions.'}`);
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to change location tracking settings. Please check your location permissions.'
        );
      }
      // Revert the toggle if it failed
      setLocationTrackingEnabled(!enabled);
    }
  };

  const updateLocationNow = async () => {
    try {
      await LocationTrackingService.updateLocationNow();
      const lastUpdate = await LocationTrackingService.getLastLocationUpdate();
      setLastLocationUpdate(lastUpdate);
      if (Platform.OS === 'web') {
        window.alert('Success\n\nLocation updated successfully');
      } else {
        Alert.alert('Success', 'Location updated successfully');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      if (Platform.OS === 'web') {
        window.alert('Error\n\nFailed to update location. Please check your location permissions.');
      } else {
        Alert.alert('Error', 'Failed to update location. Please check your location permissions.');
      }
    }
  };

  const handleCancelSubscription = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Cancel Subscription\n\nAre you sure you want to cancel your ${plan.toUpperCase()} subscription? You'll lose access to premium features at the end of your current billing period.`
      );
      
      if (!confirmed) {
        return;
      }
      
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
        
        if (!token) {
          window.alert("Authentication Error\n\nNo authentication token found. Please log in again.");
          return;
        }

        const response = await fetch(`${apiUrl}/api/subscription/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          window.alert(
            "Subscription Cancelled\n\nYour subscription has been cancelled. You'll continue to have access to premium features until the end of your current billing period."
          );
          // Refresh subscription data
          subscriptionContext?.fetchSubscription?.();
        } else {
          const errorText = await response.text();
          let errorMessage = "Failed to cancel subscription";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch (e) {
            errorMessage = errorText || errorMessage;
          }
          window.alert(`Error\n\n${errorMessage}`);
        }
      } catch (error) {
        console.error('Cancel subscription error:', error);
        window.alert("Network Error\n\nFailed to cancel subscription. Please check your internet connection and try again.");
      }
    } else {
      Alert.alert(
        "Cancel Subscription",
        `Are you sure you want to cancel your ${plan.toUpperCase()} subscription? You'll lose access to premium features at the end of your current billing period.`,
        [
          { text: "Keep Subscription", style: "cancel" },
          { 
            text: "Cancel Subscription", 
            style: "destructive", 
            onPress: async () => {
              try {
                const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
                
                if (!token) {
                  Alert.alert("Authentication Error", "No authentication token found. Please log in again.");
                  return;
                }

                const response = await fetch(`${apiUrl}/api/subscription/cancel`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (response.ok) {
                  Alert.alert(
                    "Subscription Cancelled",
                    "Your subscription has been cancelled. You'll continue to have access to premium features until the end of your current billing period.",
                    [{ text: "OK", onPress: () => {
                      // Refresh subscription data
                      subscriptionContext?.fetchSubscription?.();
                    }}]
                  );
                } else {
                  const errorText = await response.text();
                  let errorMessage = "Failed to cancel subscription";
                  try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorJson.message || errorMessage;
                  } catch (e) {
                    errorMessage = errorText || errorMessage;
                  }
                  Alert.alert("Error", errorMessage);
                }
              } catch (error) {
                console.error('Cancel subscription error:', error);
                Alert.alert("Network Error", "Failed to cancel subscription. Please check your internet connection and try again.");
              }
            }
          }
        ]
      );
    }
  };

  const handleDeleteAccount = async () => {
    const userEmail = user?.email || '';
    const encodedEmail = encodeURIComponent(userEmail);
    const deleteAccountUrl = `https://circle.orincore.com/delete-account.html?email=${encodedEmail}`;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        "Delete Account\n\nAre you sure you want to delete your account? This action cannot be undone."
      );
      
      if (confirmed) {
        // Open delete account page in new tab
        window.open(deleteAccountUrl, '_blank');
      }
    } else {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete your account? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: async () => {
              try {
                // Open delete account page in external browser
                const supported = await Linking.canOpenURL(deleteAccountUrl);
                if (supported) {
                  await Linking.openURL(deleteAccountUrl);
                } else {
                  Alert.alert("Error", "Unable to open the delete account page.");
                }
              } catch (error) {
                console.error('Error opening delete account URL:', error);
                Alert.alert("Error", "Failed to open the delete account page.");
              }
            }
          }
        ]
      );
    }
  };

  const handleCustomerSupport = () => {
    setShowCustomerSupport(true);
  };

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
              <Ionicons name="settings-outline" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Advanced Settings</Text>
            </View>
            
            <TouchableOpacity style={styles.advancedSettingItem} onPress={() => router.push('/secure/profile/privacy')}>
              <View style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="shield-outline" size={20} color="#FFD6F2" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingItemTitle}>Privacy Settings</Text>
                    <Text style={styles.settingItemDescription}>Manage your privacy and visibility</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.advancedSettingItem} onPress={handleCustomerSupport}>
              <View style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="headset-outline" size={20} color="#FFD6F2" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingItemTitle}>Customer Support</Text>
                    <Text style={styles.settingItemDescription}>Get help from our support team</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Location Preferences */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Location Preferences</Text>
            </View>
            
            <View style={styles.switchOption}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Prioritize Location for Friendship</Text>
                <Text style={styles.switchDescription}>
                  Focus on finding friends nearby rather than far away
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

          {/* Invisible Mode */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="eye-off" size={20} color="#FFD6F2" />
              <Text style={styles.sectionTitle}>Invisible Mode</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Hide yourself from maps, explore, and suggestions. Most features will be disabled while active.
            </Text>
            
            <View style={styles.switchOption}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Enable Invisible Mode</Text>
                <Text style={styles.switchDescription}>
                  {invisibleMode ? 
                    "You are currently hidden from discovery. Most features are disabled." :
                    "Hide from all discovery features. You can only chat with existing friends."
                  }
                </Text>
              </View>
              <Switch
                value={invisibleMode}
                onValueChange={toggleInvisibleMode}
                trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#FF6B6B' }}
                thumbColor={invisibleMode ? '#DC2626' : '#f4f3f4'}
              />
            </View>

            {invisibleMode && (
              <View style={[styles.locationStatus, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
                <Ionicons name="warning" size={16} color="#FF6B6B" />
                <Text style={[styles.locationStatusText, { color: '#FF6B6B' }]}>
                  Invisible mode is active. Matching, explore, and location features are disabled.
                </Text>
              </View>
            )}
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
              <Text style={styles.summaryLabel}>Invisible Mode:</Text>
              <Text style={[styles.summaryValue, invisibleMode && { color: '#FF6B6B' }]}>
                {invisibleMode ? 'Active (Hidden)' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Location Tracking:</Text>
              <Text style={styles.summaryValue}>{locationTrackingEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
            <LinearGradient
              colors={["#7C2B86", "#9333EA"]}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Subscription Management */}
          {isPremium && plan !== 'free' && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="diamond" size={20} color="#FFD6F2" />
                <Text style={styles.sectionTitle}>Subscription Management</Text>
              </View>
              
              <View style={styles.subscriptionInfo}>
                <View style={styles.subscriptionRow}>
                  <Text style={styles.subscriptionLabel}>Current Plan:</Text>
                  <Text style={styles.subscriptionValue}>
                    {plan === 'premium_plus' ? 'Premium+' : 'Premium'}
                  </Text>
                </View>
                
                {subscription?.subscription?.expires_at && (
                  <View style={styles.subscriptionRow}>
                    <Text style={styles.subscriptionLabel}>Expires:</Text>
                    <Text style={styles.subscriptionValue}>
                      {new Date(subscription.subscription.expires_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                <View style={styles.subscriptionRow}>
                  <Text style={styles.subscriptionLabel}>Status:</Text>
                  <Text style={[styles.subscriptionValue, { color: '#10B981' }]}>
                    {subscription?.subscription?.status === 'active' ? 'Active' : subscription?.subscription?.status || 'Active'}
                  </Text>
                </View>
                
                {subscription?.subscription?.auto_renew && (
                  <View style={styles.subscriptionRow}>
                    <Text style={styles.subscriptionLabel}>Auto-Renew:</Text>
                    <Text style={styles.subscriptionValue}>
                      {subscription.subscription.auto_renew ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={styles.cancelSubscriptionButton} 
                onPress={handleCancelSubscription}
              >
                <Ionicons name="close-circle" size={20} color="#FF4D67" />
                <Text style={styles.cancelSubscriptionText}>Cancel Subscription</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Delete Account Section */}
          <View style={styles.dangerZone}>
            <View style={styles.dangerHeader}>
              <Ionicons name="warning" size={24} color="#FF4D67" />
              <Text style={styles.dangerTitle}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerDescription}>
              Once you delete your account, there is no going back. Please be certain.
            </Text>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete My Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <CustomerSupportScreen
        visible={showCustomerSupport}
        onClose={() => setShowCustomerSupport(false)}
      />
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
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFD6F2',
    fontWeight: '500',
  },
  
  // Subscription Management Styles
  subscriptionInfo: {
    marginBottom: 16,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  subscriptionValue: {
    fontSize: 14,
    color: '#FFD6F2',
    fontWeight: '600',
  },
  cancelSubscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 77, 103, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 103, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  cancelSubscriptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4D67',
  },
  saveButton: {
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7C2B86',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  dangerZone: {
    backgroundColor: 'rgba(255, 77, 103, 0.1)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 77, 103, 0.3)',
    marginTop: 20,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF4D67',
  },
  dangerDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF4D67',
    paddingVertical: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Advanced Settings Styles
  advancedSettingItem: {
    backgroundColor: 'rgba(255, 214, 242, 0.08)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.15)',
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 214, 242, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE8FF',
    marginBottom: 2,
  },
  settingItemDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
});
