import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

export default function LocationMap({ region, nearby, style, onUserPress, highlightedUserId, onRegionChange }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const hasAnimatedToInitialRegion = useRef(false);
  
  // Animate to user's actual location when it's first loaded
  useEffect(() => {
    if (region && mapRef.current && !hasAnimatedToInitialRegion.current) {
      // Check if this is a real user location (not default San Francisco)
      const isUserLocation = region.latitude !== 37.7749 || region.longitude !== -122.4194;
      
      if (isUserLocation) {
        mapRef.current.animateToRegion(region, 1000);
        hasAnimatedToInitialRegion.current = true;
      }
    }
  }, [region]);
  
  const handleUserPress = (user) => {
    //console.log('LocationMap handleUserPress called for user:', user.id, user.name);
    if (onUserPress) {
      // Use callback if provided (for showing user profile modal)
      //console.log('Calling onUserPress callback');
      onUserPress(user);
    } else {
      //console.log('No onUserPress callback, showing alert');
      // Fallback to showing user info
      Alert.alert(
        user.name,
        `Age: ${user.age}\nGender: ${user.gender}\nDistance: ${user.distance?.toFixed(1)}km away\nInterests: ${user.interests?.join(', ') || 'None listed'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Profile', onPress: () => showUserProfile(user) }
        ]
      );
    }
  };
  
  const showUserProfile = (user) => {
    // Navigate to user profile or show modal
    //console.log('Show profile for user:', user.id);
  };

  const renderCallout = (m) => {
    const isHighlighted = highlightedUserId === m.id;
    const img = m.photoUrl || "https://via.placeholder.com/320x180.png?text=Profile";
    const distance = m.distance ? `${m.distance.toFixed(1)}km away` : 'Distance unknown';
    
    return (
      <View style={styles.calloutCard}>
        <View style={[styles.calloutHeader, isHighlighted && styles.calloutHeaderHighlighted]}>
          <Image source={{ uri: img }} style={styles.calloutHeaderImage} resizeMode="cover" blurRadius={2} />
          <LinearGradient colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.35)"]} style={styles.calloutHeaderOverlay} />
          {!!m.compatibility && (
            <View style={styles.compatPill}>
              <View style={styles.compatDot} />
              <Text style={styles.compatText}>{m.compatibility}</Text>
            </View>
          )}
          <View style={styles.distancePill}>
            <Ionicons name="location" size={12} color="#FFFFFF" />
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
        </View>

        <View style={styles.calloutBody}>
          <View style={styles.row}>
            <Image source={{ uri: img }} style={styles.avatar} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.name}>
                {m.name}
              </Text>
              <Text style={styles.meta}>
                {[m.age ? String(m.age) : undefined, m.gender].filter(Boolean).join(" · ")}
              </Text>
              {m.interests && m.interests.length > 0 && (
                <Text style={styles.interests} numberOfLines={1}>
                  {m.interests.slice(0, 3).join(', ')}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                //console.log('TouchableOpacity pressed for user:', m.id);
                handleUserPress(m);
              }} 
              activeOpacity={0.7} 
              style={styles.viewBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="person" size={16} color="#FFFFFF" />
              <Text style={styles.viewBtnText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <MapView 
      ref={mapRef}
      style={[styles.map, style]} 
      initialRegion={region}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation={true}
      showsMyLocationButton={false}
    >
      <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="You" description="You're here" pinColor="#2563EB" />
      {nearby.map((m, index) => {
        // Ensure coordinates are valid numbers
        const lat = typeof m.latitude === 'number' ? m.latitude : parseFloat(m.latitude);
        const lng = typeof m.longitude === 'number' ? m.longitude : parseFloat(m.longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`Invalid coordinates for user ${m.id}:`, { lat: m.latitude, lng: m.longitude });
          return null;
        }
        
        const isHighlighted = highlightedUserId === m.id;
        
        return (
          <Marker
            key={`${m.id}-${index}`} // Ensure unique keys even if IDs are duplicated
            coordinate={{ latitude: lat, longitude: lng }}
            pinColor={isHighlighted ? "#8B5CF6" : "#16A34A"}
            onPress={() => handleUserPress(m)}
          >
            <Callout onPress={() => handleUserPress(m)}>
              {renderCallout(m)}
            </Callout>
          </Marker>
        );
      }).filter(Boolean) // Remove null entries from invalid coordinates
      }
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: 520,
  },
  calloutCard: {
    width: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  calloutHeaderHighlighted: {
    borderWidth: 3,
    borderColor: "#8B5CF6",
    borderRadius: 14,
  },
  calloutHeader: {
    height: 150,
    position: "relative",
  },
  calloutHeaderImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 300,
    height: 150,
  },
  calloutHeaderOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  compatPill: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  compatText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  calloutBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.06)",
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  meta: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  actions: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  chatBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  chatBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  distancePill: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  interests: {
    fontSize: 12,
    color: "#8B5CF6",
    marginTop: 2,
    fontStyle: "italic",
  },
  viewBtn: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  viewBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
