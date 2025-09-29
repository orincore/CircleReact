import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useRouter, Stack } from 'expo-router';
import LocationMap from '@/components/LocationMap';
import UserProfileModal from '@/src/components/UserProfileModal';
import * as Location from 'expo-location';
import { nearbyUsersGql } from '@/src/api/graphql';
import { useAuth } from '@/contexts/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isLargeScreen = screenWidth >= 768; // Tablet/Desktop breakpoint

export default function LocationPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistance, setFilterDistance] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedPin, setHighlightedPin] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [screenData, setScreenData] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isLandscape: width > height,
      isBrowser: Platform.OS === 'web'
    };
  });
  const [userCategories, setUserCategories] = useState({
    nearby: [],
    far: []
  });
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749, // Default to San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [hasSetUserLocation, setHasSetUserLocation] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loadingTimeoutRef = useRef(null);

  // Listen for screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData({
        width: window.width,
        height: window.height,
        isLandscape: window.width > window.height,
        isBrowser: Platform.OS === 'web'
      });
    });

    return () => subscription?.remove();
  }, []);

  // Load user location and nearby users on mount
  useEffect(() => {
    loadLocationAndUsers();
  }, []);

  const loadLocationAndUsers = async () => {
    try {
      setLoading(true);
      
      // For web/browser, set a default region first
      if (Platform.OS === 'web') {
        // Set default region (can be user's approximate location or a default city)
        setMapRegion({
          latitude: 37.7749, // Default to San Francisco
          longitude: -122.4194,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        // Even if permission denied, keep the default region for web
        if (Platform.OS !== 'web') {
          setMapRegion({
            latitude: 37.7749, // Default location
            longitude: -122.4194,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      
      // Set actual user location only if not set before (initial load)
      if (!hasSetUserLocation) {
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setHasSetUserLocation(true);
        console.log('Set initial user location:', { latitude, longitude });
      }

      // Load nearby users
      await loadNearbyUsers(latitude, longitude);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load location and users:', error);
      // Ensure map region is set even on error
      setMapRegion({
        latitude: 37.7749, // Default location
        longitude: -122.4194,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setLoading(false);
    }
  };

  // Get structured location data from coordinates with robust parsing
  const getLocationData = async (latitude, longitude) => {
    console.log('Getting location data for coordinates:', { latitude, longitude });
    
    try {
      // Try Expo Location first (works on mobile)
      if (Platform.OS !== 'web') {
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          
          if (reverseGeocode.length > 0) {
            const location = reverseGeocode[0];
            console.log('Expo Location result:', location);
            
            const city = location.city || location.district || location.subregion || location.name;
            const country = location.country;
            const address = [
              location.streetNumber,
              location.street,
              location.district,
              location.city,
              location.region,
              location.country
            ].filter(Boolean).join(', ') || 'Address not available';
            
            const result = {
              city: city || 'Unknown City',
              country: country || 'Unknown Country',
              address: address,
              displayName: city && country ? `${city}, ${country}` : city || country || 'Unknown Location'
            };
            
            console.log('Expo Location structured result:', result);
            return result;
          }
        } catch (expoError) {
          console.warn('Expo Location failed:', expoError);
        }
      }
      
      // Fallback to web-compatible reverse geocoding
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        // Try multiple geocoding services for better reliability
        const geocodingServices = [
          
          // Service 1: BigDataCloud (free, no API key required)
          async () => {
            console.log('Trying BigDataCloud geocoding (Service 1)...');
            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              
              if (response.ok) {
                const data = await response.json();
                console.log('BigDataCloud response:', data);
                
                if (data) {
                  const city = data.city || data.locality || data.principalSubdivision;
                  const country = data.countryName;
                  const fullAddress = [
                    data.localityInfo?.administrative?.[3]?.name,
                    data.localityInfo?.administrative?.[2]?.name,
                    data.city || data.locality,
                    data.principalSubdivision,
                    data.countryName
                  ].filter(Boolean).join(', ') || 'Address not available';
                  
                  const result = {
                    city: city || 'Unknown City',
                    country: country || 'Unknown Country',
                    address: fullAddress,
                    displayName: city && country ? `${city}, ${country}` : city || country || 'Unknown Location'
                  };
                  
                  console.log('BigDataCloud structured result:', result);
                  return result;
                }
              } else {
                console.warn('BigDataCloud response not ok:', response.status);
              }
            } catch (error) {
              console.warn('BigDataCloud service error:', error);
            }
            return null;
          },
          
          // Service 2: OpenCage (backup with demo key - limited requests)
          async () => {
            console.log('Trying OpenCage geocoding (Service 2)...');
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=demo&language=en&no_annotations=1&limit=1`
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.results && data.results.length > 0) {
                const result = data.results[0];
                const components = result.components;
                
                if (components) {
                  const city = components.city || components.town || components.village || components.suburb;
                  const country = components.country;
                  const fullAddress = result.formatted || [
                    components.house_number,
                    components.road,
                    components.suburb,
                    components.city || components.town || components.village,
                    components.state,
                    components.country
                  ].filter(Boolean).join(', ') || 'Address not available';
                  
                  return {
                    city: city || 'Unknown City',
                    country: country || 'Unknown Country',
                    address: fullAddress,
                    displayName: city && country ? `${city}, ${country}` : city || country || 'Unknown Location'
                  };
                }
                
                // Fallback to formatted address
                if (result.formatted) {
                  const parts = result.formatted.split(',').map(part => part.trim());
                  return {
                    city: parts[0] || 'Unknown City',
                    country: parts[parts.length - 1] || 'Unknown Country',
                    address: result.formatted,
                    displayName: parts.length >= 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : parts[0] || 'Unknown Location'
                  };
                }
              }
            }
            return null;
          }
        ];
        
        // Try each service until one succeeds
        for (let i = 0; i < geocodingServices.length; i++) {
          const service = geocodingServices[i];
          try {
            console.log(`Trying geocoding service ${i + 1}/${geocodingServices.length}...`);
            const result = await service();
            if (result && result.city && result.country) {
              console.log(`Successfully got location from service ${i + 1}:`, result);
              return result;
            } else {
              console.log(`Service ${i + 1} returned incomplete data:`, result);
            }
          } catch (error) {
            console.warn(`Geocoding service ${i + 1} failed:`, error);
            continue;
          }
        }
        
        console.log('All geocoding services failed, trying simple coordinate parsing...');
        
        // Try a simple coordinate-based service as additional fallback
        try {
          const response = await fetch(`http://ip-api.com/json/?lat=${latitude}&lon=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            console.log('IP-API coordinate response:', data);
            
            if (data && data.city && data.country) {
              const result = {
                city: data.city,
                country: data.country,
                address: `${data.city}, ${data.regionName || data.region || ''}, ${data.country}`.replace(', ,', ','),
                displayName: `${data.city}, ${data.country}`
              };
              console.log('IP-API structured result:', result);
              return result;
            }
          }
        } catch (error) {
          console.warn('IP-API coordinate service failed:', error);
        }
        
        // Final fallback: show approximate location based on coordinates
        const getApproximateLocation = (lat, lng) => {
          // Simple continent/region detection based on coordinates
          if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40) {
            return {
              city: 'Unknown City',
              country: 'Europe',
              address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              displayName: 'Europe'
            };
          } else if (lat >= 10 && lat <= 37 && lng >= 60 && lng <= 140) {
            return {
              city: 'Unknown City',
              country: 'Asia',
              address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              displayName: 'Asia'
            };
          } else if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) {
            return {
              city: 'Unknown City',
              country: 'North America',
              address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              displayName: 'North America'
            };
          } else if (lat >= -35 && lat <= 15 && lng >= -82 && lng <= -35) {
            return {
              city: 'Unknown City',
              country: 'South America',
              address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              displayName: 'South America'
            };
          } else if (lat >= -35 && lat <= 37 && lng >= -20 && lng <= 52) {
            return {
              city: 'Unknown City',
              country: 'Africa',
              address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              displayName: 'Africa'
            };
          } else if (lat >= -47 && lat <= -10 && lng >= 113 && lng <= 154) {
            return {
              city: 'Unknown City',
              country: 'Australia',
              address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              displayName: 'Australia'
            };
          } else {
            return {
              city: 'Unknown City',
              country: 'Unknown Country',
              address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              displayName: `Location ${lat.toFixed(2)}, ${lng.toFixed(2)}`
            };
          }
        };
        
        const approximateLocation = getApproximateLocation(latitude, longitude);
        console.log('Using approximate location fallback:', approximateLocation);
        return approximateLocation;
      }
      
      // Final fallback with coordinates
      console.log('All services failed, using coordinate fallback');
      return {
        city: 'Unknown City',
        country: 'Unknown Country',
        address: `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        displayName: `Location ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
      };
    } catch (error) {
      console.error('Failed to get location data:', error);
      // Ensure we always return valid structured data
      return {
        city: 'Unknown City',
        country: 'Unknown Country',
        address: `Coordinates: ${latitude?.toFixed(4) || '0.0000'}, ${longitude?.toFixed(4) || '0.0000'}`,
        displayName: 'Unknown Location'
      };
    }
  };

  // Helper function to validate and clean location data
  const validateLocationData = (locationData) => {
    if (!locationData || typeof locationData !== 'object') {
      return {
        city: 'Unknown City',
        country: 'Unknown Country',
        address: 'Address not available',
        displayName: 'Unknown Location'
      };
    }

    return {
      city: (locationData.city && locationData.city !== 'Unknown City') ? locationData.city : 'Unknown City',
      country: (locationData.country && locationData.country !== 'Unknown Country') ? locationData.country : 'Unknown Country',
      address: locationData.address || 'Address not available',
      displayName: locationData.displayName || 'Unknown Location'
    };
  };

  // Load nearby users for map display
  const loadNearbyUsers = async (latitude, longitude, radiusKm = 50, skipLocationUpdate = false) => {
    try {
      setIsLoadingUsers(true);
      
      // Get location data only if not already updated by region change
      if (!skipLocationUpdate) {
        const rawLocationData = await getLocationData(latitude, longitude);
        const locationData = validateLocationData(rawLocationData);
        setCurrentLocationName(locationData.displayName);
        
        // Store structured location data for database usage
        console.log('Validated location data for database:', {
          location_city: locationData.city,
          location_country: locationData.country,
          location_address: locationData.address
        });
        
        // Ensure we have valid data before proceeding
        if (locationData.city === 'Unknown City' && locationData.country === 'Unknown Country') {
          console.warn('Could not resolve location for coordinates:', { latitude, longitude });
        }
      }
      
      const users = await nearbyUsersGql(latitude, longitude, radiusKm, 50, token);
      
      // Transform users for map display
      const mapUsers = users.map(user => ({
        id: user.id,
        name: user.firstName + (user.lastName ? ` ${user.lastName.charAt(0)}.` : ''),
        age: user.age,
        gender: user.gender,
        latitude: user.location.latitude,
        longitude: user.location.longitude,
        photoUrl: user.profilePhotoUrl,
        distance: user.distance,
        compatibility: `${Math.round(85 + Math.random() * 10)}%`, // Mock compatibility for now
        interests: user.interests,
        needs: user.needs
      }));
      
      // Categorize users by distance (nearby: ≤10km, far: >10km)
      const nearby = mapUsers.filter(user => user.distance <= 10);
      const far = mapUsers.filter(user => user.distance > 10);
      
      setNearbyUsers(mapUsers);
      setUserCategories({ nearby, far });
      
      console.log(`Loaded ${mapUsers.length} users near ${currentLocationName || 'this location'}:`, { 
        nearby: nearby.length, 
        far: far.length,
        location: { latitude, longitude }
      });
    } catch (error) {
      console.error('Failed to load nearby users:', error);
      setCurrentLocationName('Unknown Location');
      setUserCategories({ nearby: [], far: [] });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Debounced function to handle map region changes
  const handleMapRegionChange = useCallback((region) => {
    // Clear existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Set new timeout to load users after user stops moving the map
    loadingTimeoutRef.current = setTimeout(async () => {
      console.log('Map region changed by user, loading users for:', region);
      
      // Always update location data first, even if no users are found
      try {
        const rawLocationData = await getLocationData(region.latitude, region.longitude);
        const locationData = validateLocationData(rawLocationData);
        setCurrentLocationName(locationData.displayName);
        console.log('Updated location name to:', locationData.displayName);
        
        // Store structured location data for database usage
        console.log('Validated location data for database:', {
          location_city: locationData.city,
          location_country: locationData.country,
          location_address: locationData.address
        });
        
        // Log if geocoding failed
        if (locationData.city === 'Unknown City' && locationData.country === 'Unknown Country') {
          console.warn('Geocoding failed for region:', region);
        }
      } catch (error) {
        console.error('Failed to get location data for region change:', error);
        setCurrentLocationName('Unknown Location');
      }
      
      // Then load users for this location (skip location update since we already did it)
      loadNearbyUsers(region.latitude, region.longitude, 50, true);
    }, 1000); // Wait 1 second after user stops moving the map
  }, [token]);

  // Pull to refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Get current user location for loading nearby users
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = position.coords;
        
        // Only reload users, don't change map position
        await loadNearbyUsers(latitude, longitude);
      } else {
        // If no location permission, reload with current map center
        await loadNearbyUsers(mapRegion.latitude, mapRegion.longitude);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
      // Fallback: reload with current map center
      await loadNearbyUsers(mapRegion.latitude, mapRegion.longitude);
    } finally {
      setRefreshing(false);
    }
  }, [mapRegion]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Pulse animation for highlighted pins
  useEffect(() => {
    if (highlightedPin) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      // Clear highlight after 3 seconds
      const timeout = setTimeout(() => {
        setHighlightedPin(null);
        pulse.stop();
        pulseAnim.setValue(1);
      }, 3000);
      
      return () => {
        clearTimeout(timeout);
        pulse.stop();
        pulseAnim.setValue(1);
      };
    }
  }, [highlightedPin]);

  // Calculate total filtered users count from categories
  const getTotalFilteredCount = (categories) => {
    return categories.nearby.length + categories.far.length;
  };

  // Get filtered categories
  const getFilteredCategories = () => {
    const filteredNearby = userCategories.nearby.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.interests?.some(interest => 
                             interest.toLowerCase().includes(searchQuery.toLowerCase())
                           );
      
      // Apply distance filter for nearby users
      const matchesDistance = filterDistance === 'all' || 
                             filterDistance === 'nearby' ||
                             (filterDistance === 'close' && user.distance <= 5);
      
      return matchesSearch && matchesDistance;
    });

    const filteredFar = userCategories.far.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.interests?.some(interest => 
                             interest.toLowerCase().includes(searchQuery.toLowerCase())
                           );
      
      // Far users only show when filter is 'all'
      const matchesDistance = filterDistance === 'all';
      
      return matchesSearch && matchesDistance;
    });

    return { nearby: filteredNearby, far: filteredFar };
  };

  const filteredCategories = getFilteredCategories();
  const totalFilteredUsers = getTotalFilteredCount(filteredCategories);

  const handleUserSelect = (user) => {
    console.log('LocationPage handleUserSelect called for user:', user.id, user.name);
    setSelectedUserId(user.id);
    setHighlightedPin(user.id);
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const renderUserItem = (user, index) => {
    const isSelected = selectedUserId === user.id;
    const distance = user.distance ? `${user.distance.toFixed(1)}km away` : 'Distance unknown';
    
    return (
      <TouchableOpacity
        key={user.id}
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => handleUserSelect(user)}
        activeOpacity={0.7}
      >
        <View style={styles.userItemContent}>
          <View style={styles.userAvatar}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={['#FF6FB5', '#A16AE8', '#5D5FEF']}
                style={styles.avatarImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            
            {/* Online indicator */}
            <View style={styles.onlineIndicator} />
            
            {/* Compatibility badge */}
            {user.compatibility && (
              <View style={styles.compatibilityBadge}>
                <Text style={styles.compatibilityText}>{user.compatibility}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={styles.userMeta}>
                <Text style={styles.userAge}>{user.age}</Text>
                <View style={styles.metaDivider} />
                <Ionicons 
                  name={user.gender === 'female' ? 'female' : user.gender === 'male' ? 'male' : 'transgender'} 
                  size={14} 
                  color="#8B5CF6" 
                />
              </View>
            </View>
            
            <View style={styles.userDistance}>
              <Ionicons name="location" size={12} color="#7C2B86" />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
            
            {user.interests && user.interests.length > 0 && (
              <View style={styles.interestsContainer}>
                {user.interests.slice(0, 3).map((interest, idx) => (
                  <View key={idx} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
                {user.interests.length > 3 && (
                  <Text style={styles.moreInterests}>+{user.interests.length - 3}</Text>
                )}
              </View>
            )}
          </View>
          
          <TouchableOpacity style={styles.viewProfileButton} onPress={() => handleUserSelect(user)}>
            <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              style={styles.selectedGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const renderFilters = () => {
    return (
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterDistance === 'all' && styles.filterChipActive]}
            onPress={() => setFilterDistance('all')}
          >
            <Text style={[styles.filterText, filterDistance === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterChip, filterDistance === 'nearby' && styles.filterChipActive]}
            onPress={() => setFilterDistance('nearby')}
          >
            <Text style={[styles.filterText, filterDistance === 'nearby' && styles.filterTextActive]}>
              Nearby (≤10km)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterChip, filterDistance === 'close' && styles.filterChipActive]}
            onPress={() => setFilterDistance('close')}
          >
            <Text style={[styles.filterText, filterDistance === 'close' && styles.filterTextActive]}>
              Close (≤5km)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'card',
          gestureEnabled: true,
        }} 
      />
      <LinearGradient
        colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Nearby Matches</Text>
            <Text style={styles.headerSubtitle}>
              {totalFilteredUsers === 0 
                ? `No users found near ${currentLocationName || 'this location'}`
                : `${totalFilteredUsers} ${totalFilteredUsers === 1 ? 'user' : 'users'} found near ${currentLocationName || 'this location'}`
              }
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#7C2B86" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or interests..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="rgba(124, 43, 134, 0.5)"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#7C2B86" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Content */}
        <View style={[
          styles.contentContainer,
          screenData.isBrowser && screenData.isLandscape && styles.contentContainerLandscape
        ]}>
          {/* Map Section */}
          <View style={[
            styles.mapSection,
            screenData.isBrowser && screenData.isLandscape && styles.mapSectionLandscape
          ]}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Location Map</Text>
              <View style={styles.mapCountBadge}>
                <Ionicons name="location" size={14} color="#FFFFFF" />
                <Text style={styles.mapCountText}>{totalFilteredUsers}</Text>
              </View>
            </View>
            
            {mapRegion ? (
              <>
                <LocationMap
                  key={`map-${screenData.width}-${screenData.height}`} // Force re-render on screen change
                  region={mapRegion}
                  nearby={nearbyUsers.map(user => ({
                    ...user,
                    isHighlighted: highlightedPin === user.id,
                    pulseScale: highlightedPin === user.id ? pulseAnim : new Animated.Value(1)
                  }))}
                  style={styles.map}
                  onUserPress={handleUserSelect}
                  highlightedUserId={highlightedPin}
                  onRegionChange={handleMapRegionChange}
                />
                
                {/* Loading indicator for when users are being loaded */}
                {isLoadingUsers && (
                  <View style={styles.mapLoadingOverlay}>
                    <ActivityIndicator size="small" color="#7C2B86" />
                    <Text style={styles.mapLoadingText}>Loading users...</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.mapPlaceholder}>
                {loading ? (
                  <>
                    <ActivityIndicator size="large" color="#7C2B86" />
                    <Text style={styles.mapPlaceholderText}>Loading map...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="map-outline" size={48} color="rgba(124, 43, 134, 0.3)" />
                    <Text style={styles.mapPlaceholderText}>No location data available</Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Users List Section */}
          <View style={[
            styles.listSection,
            screenData.isBrowser && screenData.isLandscape && styles.listSectionLandscape
          ]}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>People in {currentLocationName || 'Area'}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{totalFilteredUsers}</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C2B86" />
                <Text style={styles.loadingText}>Finding people nearby...</Text>
              </View>
            ) : totalFilteredUsers > 0 ? (
              <ScrollView 
                style={styles.usersList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.usersListContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#7C2B86']}
                    tintColor="#7C2B86"
                  />
                }
              >
                {/* Nearby Users Section */}
                {filteredCategories.nearby.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="location" size={16} color="#8B5CF6" />
                      <Text style={styles.sectionTitle}>
                        Nearby ({filteredCategories.nearby.length})
                      </Text>
                      <Text style={styles.sectionSubtitle}>Within 10km</Text>
                    </View>
                    {filteredCategories.nearby.map(renderUserItem)}
                  </>
                )}

                {/* Far Users Section */}
                {filteredCategories.far.length > 0 && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: filteredCategories.nearby.length > 0 ? 24 : 0 }]}>
                      <Ionicons name="map" size={16} color="#EC4899" />
                      <Text style={styles.sectionTitle}>
                        Far ({filteredCategories.far.length})
                      </Text>
                      <Text style={styles.sectionSubtitle}>More than 10km away</Text>
                    </View>
                    {filteredCategories.far.map(renderUserItem)}
                  </>
                )}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="rgba(124, 43, 134, 0.3)" />
                <Text style={styles.emptyStateTitle}>No matches found</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery 
                    ? 'Try adjusting your search or filters' 
                    : `No people found near ${currentLocationName || 'this location'}`
                  }
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* User Profile Modal */}
        <UserProfileModal
          visible={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          userId={selectedUser?.id}
          userName={selectedUser?.name}
          userAvatar={selectedUser?.photoUrl || selectedUser?.avatar}
        />
      </SafeAreaView>
    </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F1147',
  },
  clearButton: {
    marginLeft: 8,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterTextActive: {
    color: '#7C2B86',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column', // Default to mobile layout (map above, list below)
  },
  // Responsive styles for browser landscape mode
  contentContainerLandscape: {
    flexDirection: 'row',
  },
  mapSection: {
    flex: 0, // Default mobile: fixed height, not flex
    height: 300, // Default mobile: fixed 300px height
    margin: 16,
    marginRight: 16, // Default mobile: equal margins
    marginBottom: 8, // Default mobile: small bottom margin
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  mapSectionLandscape: {
    flex: 1,
    height: 'auto',
    marginRight: 8,
    marginBottom: 16,
  },
  map: {
    width: '100%',
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.6)',
    textAlign: 'center',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
  },
  mapCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C2B86',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  mapCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  mapLoadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2B86',
  },
  listSection: {
    flex: 1, // Takes remaining space below map
    margin: 16,
    marginLeft: 16, // Default mobile: equal margins
    marginTop: 8, // Default mobile: small top margin (close to map)
    backgroundColor: '#FFFFFF', // White background for mobile
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listSectionLandscape: {
    flex: 1,
    marginLeft: 8,
    marginTop: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147', // Dark color for white background
  },
  countBadge: {
    backgroundColor: '#7C2B86',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    gap: isLargeScreen ? 12 : 8,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147', // Dark color for white background
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(31, 17, 71, 0.6)', // Dark color with opacity for white background
  },
  userItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isLargeScreen ? 16 : 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.15)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userItemSelected: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: isLargeScreen ? 56 : 48,
    height: isLargeScreen ? 56 : 48,
    borderRadius: isLargeScreen ? 28 : 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00FF94',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  compatibilityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00D4AA',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compatibilityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    flex: 1,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(124, 43, 134, 0.3)',
  },
  userDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.6)',
  },
  interestsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  interestText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  moreInterests: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(31, 17, 71, 0.5)',
  },
  viewProfileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  selectedGradient: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.7)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
