import LocationMap from '@/components/LocationMap';
import { useAuth } from '@/contexts/AuthContext';
import { nearbyUsersGql } from '@/src/api/graphql';
import UserProfileModal from '@/src/components/UserProfileModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isLargeScreen = screenWidth >= 768; // Tablet/Desktop breakpoint
const isDesktop = screenWidth >= 1024; // Desktop breakpoint

export default function LocationPage() {
  const router = useRouter();
  const { token, user } = useAuth();
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
      isBrowser: Platform.OS === 'web',
      isDesktop: width >= 1024
    };
  });
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [drawerHeight] = useState(new Animated.Value(screenHeight * 0.4));
  const [hoveredUserId, setHoveredUserId] = useState(null);
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
        isBrowser: Platform.OS === 'web',
        isDesktop: window.width >= 1024
      });
    });

    return () => subscription?.remove();
  }, []);

  // Pan responder for mobile drawer
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = screenHeight * 0.4 - gestureState.dy;
        if (newHeight >= screenHeight * 0.2 && newHeight <= screenHeight * 0.8) {
          drawerHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vy;
        const currentHeight = drawerHeight._value;
        
        let targetHeight;
        if (velocity > 0.5) {
          targetHeight = screenHeight * 0.2; // Minimize
        } else if (velocity < -0.5) {
          targetHeight = screenHeight * 0.8; // Maximize
        } else {
          targetHeight = currentHeight > screenHeight * 0.5 
            ? screenHeight * 0.8 
            : screenHeight * 0.4;
        }
        
        Animated.spring(drawerHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }).start();
      },
    })
  ).current;

  // Redirect if invisible mode is enabled
  useEffect(() => {
    if (user?.invisibleMode) {
      //console.log('🚫 User is in invisible mode, redirecting back...');
      router.back();
    }
  }, [user?.invisibleMode]);

  // Load user location and nearby users on mount
  useEffect(() => {
    if (!user?.invisibleMode) {
      loadLocationAndUsers();
    }
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
        //console.log('Location permission denied');
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
            
            //console.log('Expo Location structured result:', result);
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
            //console.log('Trying BigDataCloud geocoding (Service 1)...');
            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              
              if (response.ok) {
                const data = await response.json();
                //console.log('BigDataCloud response:', data);
                
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
                  
                  //console.log('BigDataCloud structured result:', result);
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
            //console.log('Trying OpenCage geocoding (Service 2)...');
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
            //console.log(`Trying geocoding service ${i + 1}/${geocodingServices.length}...`);
            const result = await service();
            if (result && result.city && result.country) {
              //console.log(`Successfully got location from service ${i + 1}:`, result);
              return result;
            } else {
              //console.log(`Service ${i + 1} returned incomplete data:`, result);
            }
          } catch (error) {
            console.warn(`Geocoding service ${i + 1} failed:`, error);
            continue;
          }
        }
        
        //console.log('All geocoding services failed, trying simple coordinate parsing...');
        
        // Try a simple coordinate-based service as additional fallback
        try {
          const response = await fetch(`http://ip-api.com/json/?lat=${latitude}&lon=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            //console.log('IP-API coordinate response:', data);
            
            if (data && data.city && data.country) {
              const result = {
                city: data.city,
                country: data.country,
                address: `${data.city}, ${data.regionName || data.region || ''}, ${data.country}`.replace(', ,', ','),
                displayName: `${data.city}, ${data.country}`
              };
              //console.log('IP-API structured result:', result);
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
        //console.log('Using approximate location fallback:', approximateLocation);
        return approximateLocation;
      }
      
      // Final fallback with coordinates
      //console.log('All services failed, using coordinate fallback');
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
      //console.log('Map region changed by user, loading users for:', region);
      
      // Always update location data first, even if no users are found
      try {
        const rawLocationData = await getLocationData(region.latitude, region.longitude);
        const locationData = validateLocationData(rawLocationData);
        setCurrentLocationName(locationData.displayName);
        //console.log('Updated location name to:', locationData.displayName);
        
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
    //console.log('LocationPage handleUserSelect called for user:', user.id, user.name);
    //console.log('Complete user object:', JSON.stringify(user, null, 2));
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

  // Render desktop filter panel
  const renderDesktopFilterPanel = () => {
    if (!screenData.isDesktop) return null;
    
    return (
      <View style={styles.desktopFilterPanel}>
        <View style={styles.filterPanelHeader}>
          <Ionicons name="options-outline" size={20} color="#7C2B86" />
          <Text style={styles.filterPanelTitle}>Filters</Text>
        </View>
        
        {/* Distance Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Distance</Text>
          {['all', 'nearby', 'close'].map((dist) => (
            <TouchableOpacity
              key={dist}
              style={styles.filterOption}
              onPress={() => setFilterDistance(dist)}
            >
              <View style={[
                styles.filterRadio,
                filterDistance === dist && styles.filterRadioActive
              ]}>
                {filterDistance === dist && (
                  <View style={styles.filterRadioDot} />
                )}
              </View>
              <Text style={styles.filterOptionText}>
                {dist === 'all' ? 'All distances' : dist === 'nearby' ? 'Nearby (≤10km)' : 'Close (≤5km)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* User Stats */}
        <View style={styles.filterStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredCategories.nearby.length}</Text>
            <Text style={styles.statLabel}>Nearby</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredCategories.far.length}</Text>
            <Text style={styles.statLabel}>Far</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render mobile drawer
  const renderMobileDrawer = () => {
    if (screenData.isDesktop || viewMode !== 'map') return null;
    
    return (
      <Animated.View 
        style={[
          styles.mobileDrawer,
          { height: drawerHeight }
        ]}
      >
        {/* Drawer Handle */}
        <View 
          style={styles.drawerHandle}
          {...panResponder.panHandlers}
        >
          <View style={styles.drawerHandleBar} />
          <Text style={styles.drawerTitle}>
            {totalFilteredUsers} {totalFilteredUsers === 1 ? 'Person' : 'People'} Nearby
          </Text>
        </View>
        
        {/* Drawer Content */}
        <ScrollView 
          style={styles.drawerContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#7C2B86']}
              tintColor="#7C2B86"
            />
          }
        >
          {totalFilteredUsers > 0 ? (
            <View style={styles.drawerUserList}>
              {filteredCategories.nearby.length > 0 && (
                <>
                  <View style={styles.drawerSection}>
                    <Ionicons name="location" size={14} color="#8B5CF6" />
                    <Text style={styles.drawerSectionTitle}>
                      Nearby ({filteredCategories.nearby.length})
                    </Text>
                  </View>
                  {filteredCategories.nearby.map((user) => renderMiniUserCard(user))}
                </>
              )}
              
              {filteredCategories.far.length > 0 && (
                <>
                  <View style={[styles.drawerSection, { marginTop: 16 }]}>
                    <Ionicons name="map" size={14} color="#EC4899" />
                    <Text style={styles.drawerSectionTitle}>
                      Far ({filteredCategories.far.length})
                    </Text>
                  </View>
                  {filteredCategories.far.map((user) => renderMiniUserCard(user))}
                </>
              )}
            </View>
          ) : (
            <View style={styles.drawerEmpty}>
              <Ionicons name="people-outline" size={32} color="rgba(124, 43, 134, 0.3)" />
              <Text style={styles.drawerEmptyText}>No people found nearby</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  // Render mini user card for drawer
  const renderMiniUserCard = (user) => {
    const isSelected = selectedUserId === user.id;
    
    return (
      <TouchableOpacity
        key={user.id}
        style={[styles.miniUserCard, isSelected && styles.miniUserCardSelected]}
        onPress={() => handleUserSelect(user)}
        activeOpacity={0.7}
      >
        <View style={styles.miniUserAvatar}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.miniAvatarImage} />
          ) : (
            <LinearGradient
              colors={['#FF6FB5', '#A16AE8', '#5D5FEF']}
              style={styles.miniAvatarImage}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.miniAvatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          {user.compatibility && (
            <View style={styles.miniCompatBadge}>
              <Text style={styles.miniCompatText}>{user.compatibility}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.miniUserInfo}>
          <Text style={styles.miniUserName} numberOfLines={1}>{user.name}</Text>
          <View style={styles.miniUserMeta}>
            <Text style={styles.miniUserAge}>{user.age}</Text>
            <View style={styles.miniMetaDot} />
            <Ionicons 
              name={user.gender === 'female' ? 'female' : user.gender === 'male' ? 'male' : 'transgender'} 
              size={12} 
              color="#8B5CF6" 
            />
            <View style={styles.miniMetaDot} />
            <Ionicons name="location" size={10} color="#7C2B86" />
            <Text style={styles.miniDistance}>{user.distance?.toFixed(1)}km</Text>
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
      </TouchableOpacity>
    );
  };

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
        colors={["#1F1147", "#2D1B69", "#1F1147"]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
        {/* Invisible Mode Check */}
        {user?.invisibleMode ? (
          <View style={styles.invisibleModeContainer}>
            <View style={styles.invisibleModeCard}>
              <Ionicons name="eye-off" size={48} color="#FF6B6B" />
              <Text style={styles.invisibleModeTitle}>Location Features Disabled</Text>
              <Text style={styles.invisibleModeMessage}>
                You are currently in invisible mode. Location-based features are disabled to protect your privacy.
              </Text>
              <Text style={styles.invisibleModeSubtext}>
                Turn off invisible mode in Settings to use location features and see nearby users.
              </Text>
              <TouchableOpacity 
                style={styles.goToSettingsButton}
                onPress={() => router.push('/secure/(tabs)/profile/settings')}
              >
                <Ionicons name="settings" size={20} color="#FFFFFF" />
                <Text style={styles.goToSettingsText}>Go to Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.backFromInvisibleButton}
                onPress={() => router.back()}
              >
                <Text style={styles.backFromInvisibleText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {screenData.isDesktop ? 'Location Explorer' : 'Nearby Matches'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {totalFilteredUsers === 0 
                ? `No users found near ${currentLocationName || 'this location'}`
                : `${totalFilteredUsers} ${totalFilteredUsers === 1 ? 'user' : 'users'} found near ${currentLocationName || 'this location'}`
              }
            </Text>
          </View>
          
          {/* Desktop: View toggle, Mobile: Filter button */}
          {screenData.isDesktop ? (
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('map')}
              >
                <Ionicons name="map" size={18} color={viewMode === 'map' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="grid" size={18} color={viewMode === 'list' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="options" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
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
        {!screenData.isDesktop && showFilters && renderFilters()}

        {/* Content */}
        {screenData.isDesktop ? (
          // Desktop Layout: Filter Panel + Map/List View
          <View style={styles.desktopLayout}>
            {renderDesktopFilterPanel()}
            
            <View style={styles.desktopMainContent}>
              {viewMode === 'map' ? (
                // Map View with Hover Cards
                <View style={styles.desktopMapContainer}>
                  <View style={styles.desktopMapHeader}>
                    <Text style={styles.desktopMapTitle}>Location Map</Text>
                    <View style={styles.desktopMapBadge}>
                      <Ionicons name="location" size={14} color="#FFFFFF" />
                      <Text style={styles.desktopMapBadgeText}>{totalFilteredUsers} nearby</Text>
                    </View>
                  </View>
                  
                  {mapRegion ? (
                    <>
                      <LocationMap
                        key={`map-${screenData.width}-${screenData.height}`}
                        region={mapRegion}
                        nearby={nearbyUsers.map(user => ({
                          ...user,
                          isHighlighted: highlightedPin === user.id || hoveredUserId === user.id,
                          pulseScale: (highlightedPin === user.id || hoveredUserId === user.id) ? pulseAnim : new Animated.Value(1)
                        }))}
                        style={styles.desktopMap}
                        onUserPress={handleUserSelect}
                        highlightedUserId={highlightedPin || hoveredUserId}
                        onRegionChange={handleMapRegionChange}
                      />
                      
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
              ) : (
                // List/Grid View
                <ScrollView 
                  style={styles.desktopGridContainer}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.desktopGridContent}
                >
                  {totalFilteredUsers > 0 ? (
                    <View style={styles.desktopGrid}>
                      {[...filteredCategories.nearby, ...filteredCategories.far].map((user) => (
                        <View 
                          key={user.id}
                          style={styles.desktopGridItem}
                          onMouseEnter={() => Platform.OS === 'web' && setHoveredUserId(user.id)}
                          onMouseLeave={() => Platform.OS === 'web' && setHoveredUserId(null)}
                        >
                          {renderUserItem(user)}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="people-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                      <Text style={[styles.emptyStateTitle, { color: '#FFFFFF' }]}>No matches found</Text>
                      <Text style={[styles.emptyStateText, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                        {searchQuery 
                          ? 'Try adjusting your search or filters' 
                          : `No people found near ${currentLocationName || 'this location'}`
                        }
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        ) : (
          // Mobile Layout: Map with Drawer OR List View
          <View style={styles.mobileLayout}>
            {viewMode === 'map' ? (
              <>
                {/* Full Screen Map */}
                <View style={styles.mobileMapContainer}>
                  {mapRegion ? (
                    <>
                      <LocationMap
                        key={`map-${screenData.width}-${screenData.height}`}
                        region={mapRegion}
                        nearby={nearbyUsers.map(user => ({
                          ...user,
                          isHighlighted: highlightedPin === user.id,
                          pulseScale: highlightedPin === user.id ? pulseAnim : new Animated.Value(1)
                        }))}
                        style={styles.mobileMap}
                        onUserPress={handleUserSelect}
                        highlightedUserId={highlightedPin}
                        onRegionChange={handleMapRegionChange}
                      />
                      
                      {isLoadingUsers && (
                        <View style={styles.mapLoadingOverlay}>
                          <ActivityIndicator size="small" color="#7C2B86" />
                          <Text style={styles.mapLoadingText}>Loading users...</Text>
                        </View>
                      )}
                      
                      {/* Floating Action Buttons */}
                      <View style={styles.floatingActions}>
                        <TouchableOpacity 
                          style={styles.floatingButton}
                          onPress={() => setShowFilters(!showFilters)}
                        >
                          <Ionicons name="options" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.floatingButton}
                          onPress={async () => {
                            const { status } = await Location.requestForegroundPermissionsAsync();
                            if (status === 'granted') {
                              const position = await Location.getCurrentPositionAsync();
                              setMapRegion({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                              });
                            }
                          }}
                        >
                          <Ionicons name="locate" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
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
                
                {/* Swipe-up Drawer */}
                {renderMobileDrawer()}
              </>
            ) : (
              // Mobile List View (Original Layout)
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
                        key={`map-${screenData.width}-${screenData.height}`}
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
            )}
          </View>
        )}

        {/* User Profile Modal */}
        <UserProfileModal
          visible={showUserProfile}
          onClose={() => {
            setShowUserProfile(false);
            setSelectedUser(null);  // Clear state to prevent stale data
            setSelectedUserId(null);
            setHighlightedPin(null);
          }}
          userId={selectedUser?.id}
          userName={selectedUser?.name}
          userAvatar={selectedUser?.photoUrl || selectedUser?.avatar}
        />
        </>
        )}
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
  
  // Desktop Styles
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  viewToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
  },
  desktopFilterPanel: {
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  filterPanelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  filterRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRadioActive: {
    borderColor: '#FFD6F2',
  },
  filterRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD6F2',
  },
  filterOptionText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  filterStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  desktopMainContent: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  desktopMapContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  desktopMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  desktopMapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  desktopMapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 43, 134, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  desktopMapBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  desktopMap: {
    flex: 1,
    width: '100%',
  },
  desktopGridContainer: {
    flex: 1,
  },
  desktopGridContent: {
    padding: 20,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  desktopGridItem: {
    width: '48%',
    minWidth: 300,
  },
  
  // Mobile Styles
  mobileLayout: {
    flex: 1,
  },
  mobileMapContainer: {
    flex: 1,
    position: 'relative',
  },
  mobileMap: {
    flex: 1,
    width: '100%',
  },
  floatingActions: {
    position: 'absolute',
    bottom: screenHeight * 0.45,
    right: 16,
    gap: 12,
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mobileDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 43, 134, 0.1)',
  },
  drawerHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(124, 43, 134, 0.3)',
    marginBottom: 12,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
  },
  drawerContent: {
    flex: 1,
  },
  drawerUserList: {
    padding: 16,
    gap: 8,
  },
  drawerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  drawerSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
  },
  drawerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  drawerEmptyText: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.6)',
    marginTop: 8,
  },
  miniUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  miniUserCardSelected: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  miniUserAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  miniAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  miniCompatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00D4AA',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  miniCompatText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  miniUserInfo: {
    flex: 1,
  },
  miniUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 4,
  },
  miniUserMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniUserAge: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C2B86',
  },
  miniMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(124, 43, 134, 0.4)',
  },
  miniDistance: {
    fontSize: 11,
    color: 'rgba(31, 17, 71, 0.6)',
  },
  
  // Invisible Mode Styles
  invisibleModeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  invisibleModeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  invisibleModeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B6B',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  invisibleModeMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  invisibleModeSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  goToSettingsButton: {
    backgroundColor: '#7C2B86',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  goToSettingsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backFromInvisibleButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backFromInvisibleText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
});
