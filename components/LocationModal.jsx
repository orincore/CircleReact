import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import LocationMap from './LocationMap';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isLargeScreen = screenWidth >= 768; // Tablet/Desktop breakpoint

export default function LocationModal({
  visible,
  onClose,
  mapRegion,
  nearbyUsers,
  onUserPress,
  loading = false,
}) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistance, setFilterDistance] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedPin, setHighlightedPin] = useState(null);
  
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: screenHeight,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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

  const filteredUsers = nearbyUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.interests?.some(interest => 
                           interest.toLowerCase().includes(searchQuery.toLowerCase())
                         );
    
    const matchesDistance = filterDistance === 'all' || 
                           (filterDistance === 'nearby' && user.distance <= 5) ||
                           (filterDistance === 'close' && user.distance <= 2);
    
    return matchesSearch && matchesDistance;
  });

  const handleUserSelect = (user) => {
    console.log('LocationModal handleUserSelect called for user:', user.id, user.name);
    setSelectedUserId(user.id);
    setHighlightedPin(user.id);
    
    // Call the parent callback to show user profile modal
    if (onUserPress) {
      console.log('LocationModal calling onUserPress callback');
      onUserPress(user);
    } else {
      console.log('LocationModal: No onUserPress callback provided');
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setFilterDistance('all');
    setSelectedUserId(null);
    setHighlightedPin(null);
    setShowFilters(false);
    onClose();
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
  };

  const renderFilters = () => (
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
            Within 5km
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, filterDistance === 'close' && styles.filterChipActive]}
          onPress={() => setFilterDistance('close')}
        >
          <Text style={[styles.filterText, filterDistance === 'close' && styles.filterTextActive]}>
            Within 2km
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.95)']}
            style={styles.modalContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {Platform.OS !== 'web' && (
              <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
            )}
            
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Nearby Matches</Text>
                <Text style={styles.headerSubtitle}>
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'person' : 'people'} nearby
                </Text>
              </View>
              
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  <Ionicons name="options" size={20} color="#7C2B86" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Ionicons name="close" size={24} color="#7C2B86" />
                </TouchableOpacity>
              </View>
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
            <View style={styles.contentContainer}>
              {/* Map Section */}
              <View style={styles.mapSection}>
                <View style={styles.mapHeader}>
                  <Text style={styles.mapTitle}>Location Map</Text>
                  <View style={styles.mapCountBadge}>
                    <Ionicons name="location" size={14} color="#FFFFFF" />
                    <Text style={styles.mapCountText}>{filteredUsers.length}</Text>
                  </View>
                </View>
                
                {mapRegion && nearbyUsers.length > 0 ? (
                  <LocationMap
                    region={mapRegion}
                    nearby={nearbyUsers.map(user => ({
                      ...user,
                      isHighlighted: highlightedPin === user.id,
                      pulseScale: highlightedPin === user.id ? pulseAnim : new Animated.Value(1)
                    }))}
                    style={styles.map}
                    onUserPress={handleUserSelect}
                    highlightedUserId={highlightedPin}
                  />
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
              <View style={styles.listSection}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>People Nearby</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filteredUsers.length}</Text>
                  </View>
                </View>

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#7C2B86" />
                    <Text style={styles.loadingText}>Finding people nearby...</Text>
                  </View>
                ) : filteredUsers.length > 0 ? (
                  <ScrollView 
                    style={styles.usersList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.usersListContent}
                  >
                    {filteredUsers.map(renderUserItem)}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color="rgba(124, 43, 134, 0.3)" />
                    <Text style={styles.emptyStateTitle}>No matches found</Text>
                    <Text style={styles.emptyStateText}>
                      {searchQuery ? 'Try adjusting your search or filters' : 'No people found in this area'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    height: screenHeight * 0.95,
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 43, 134, 0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F1147',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.6)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
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
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.2)',
  },
  filterChipActive: {
    backgroundColor: '#7C2B86',
    borderColor: '#7C2B86',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    flexDirection: isLargeScreen ? 'row' : 'column',
  },
  mapSection: {
    flex: isLargeScreen ? 1 : 0,
    height: isLargeScreen ? 'auto' : 300,
    margin: 16,
    marginRight: isLargeScreen ? 8 : 16,
    marginBottom: isLargeScreen ? 16 : 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
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
  listSection: {
    flex: 1,
    margin: 16,
    marginLeft: isLargeScreen ? 8 : 16,
    marginTop: isLargeScreen ? 16 : 8,
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
    color: '#1F1147',
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
  userItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: isLargeScreen ? 16 : 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
    position: 'relative',
    overflow: 'hidden',
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
    color: 'rgba(31, 17, 71, 0.6)',
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
    color: 'rgba(31, 17, 71, 0.8)',
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
