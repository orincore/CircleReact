import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  AppState,
  Platform,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import LocationMap from "../../components/LocationMap";
import { matchmakingApi } from "@/src/api/matchmaking";
import { useAuth } from "@/contexts/AuthContext";
import Toast from "@/components/Toast";
import { getSocket, closeSocket } from "@/src/api/socket";
import FriendRequestsSection from "@/src/components/FriendRequestsSection";
import FriendRequestMatchCard from "@/src/components/FriendRequestMatchCard";
import UserProfileModal from "@/src/components/UserProfileModal";
import { friendsApi } from "@/src/api/friends";

const mockMatches = [
  { id: 1, name: "Ava", age: 27, location: "2 km away", compatibility: "92%" },
  { id: 2, name: "Noah", age: 29, location: "5 km away", compatibility: "88%" },
  { id: 3, name: "Liam", age: 26, location: "1 km away", compatibility: "85%" },
];

export default function MatchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { token } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [nearbyMatches, setNearbyMatches] = useState([]);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState({ visible: false, text: "", type: "info" });
  const acceptedNotifiedRef = useRef(false);
  const livePulse = useRef(new Animated.Value(0)).current;
  const showToast = (text, type = "info") => {
    setToast({ visible: true, text, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  };

  // Realtime matchmaking via socket.io
  useEffect(() => {
    if (!token) return;
    const s = getSocket(token);
    const onProposal = (payload) => {
      const o = payload.other;
      setMatchedUser({
        id: o.id,
        firstName: o.first_name,
        lastName: o.last_name,
        age: o.age,
        location: "Nearby",
        gender: o.gender,
        avatar: "https://i.pravatar.cc/300?img=12",
        description: "Based on your interests and needs, this looks promising!",
        compatibility: "High match",
      });
      setShowModal(true);
    };
    const onAcceptedByOther = (payload) => {
      showToast(`${payload.by} has accepted to chat. Waiting for you…`, "info");
    };
    const onMatched = (payload) => {
      stopPolling();
      setIsSearching(false);
      setShowModal(false);
      setMatchedUser(null);
      showToast(payload.message || "You got a match!", "success");
      setTimeout(() => router.push({ pathname: "/secure/chat/[id]", params: { id: payload.chatId, name: payload.otherName } }), 700);
    };
    s.on('matchmaking:proposal', onProposal);
    s.on('matchmaking:accepted_by_other', onAcceptedByOther);
    s.on('matchmaking:matched', onMatched);
    return () => {
      try {
        s.off('matchmaking:proposal', onProposal);
        s.off('matchmaking:accepted_by_other', onAcceptedByOther);
        s.off('matchmaking:matched', onMatched);
      } catch {}
    };
  }, [token]);

  // Rotating searching phrases for background searching state (when modal hidden)
  const SEARCH_PHRASES = [
    "Finding someone who shares your vibe…",
    "Scanning nearby circles…",
    "Checking interests and needs…",
    "Looking for a great match near you…",
    "Lining up your perfect intro…",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    if (isSearching && !showModal) {
      const id = setInterval(() => setPhraseIdx((p) => (p + 1) % SEARCH_PHRASES.length), 1600);
      return () => clearInterval(id);
    }
  }, [isSearching, showModal]);

  // Pause/resume polling with AppState
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        stopPolling();
      } else if (state === "active") {
        // Resume ONLY if the matchmaking modal is visible (user explicitly started)
        if (showModal) startPolling();
      }
    });
    return () => {
      sub.remove();
      stopPolling();
    };
  }, [showModal]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [livePulse]);

  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await matchmakingApi.status(token);
        if (status.state === "searching") {
          setIsSearching(true);
          setMatchedUser(null);
        } else if (status.state === "proposal") {
          setIsSearching(false);
          const o = status.proposal.other;
          setMatchedUser({
            id: o.id,
            firstName: o.first_name,
            lastName: o.last_name,
            age: o.age,
            location: "Nearby",
            gender: o.gender,
            avatar: "https://i.pravatar.cc/300?img=12",
            description: "Based on your interests and needs, this looks promising!",
            compatibility: "High match",
          });
          setShowModal(true);
          if (status.proposal.acceptedByOther && !acceptedNotifiedRef.current) {
            if (status.proposal.message) showToast(status.proposal.message, "info");
            acceptedNotifiedRef.current = true;
          }
        } else if (status.state === "matched") {
          stopPolling();
          setIsSearching(false);
          setShowModal(false);
          setMatchedUser(null);
          showToast(status.message || "You got a match!", "success");
          setTimeout(() => router.push({ pathname: "/secure/chat/[id]", params: { id: status.match.chatId, name: status.match.otherName } }), 900);
        } else if (status.state === "cancelled") {
          setMatchedUser(null);
          setIsSearching(true);
          setShowModal(false);
          acceptedNotifiedRef.current = false;
          if (status.message) showToast(status.message, "info");
        } else {
          setIsSearching(false);
          setMatchedUser(null);
          setShowModal(false);
          acceptedNotifiedRef.current = false;
        }
      } catch (e) {
        // keep polling silently
      }
    }, 1200);
  };

  const handleStartMatch = async () => {
    try {
      setMatchedUser(null);
      setIsSearching(true);
      await matchmakingApi.start(token);
      setShowModal(true);
      acceptedNotifiedRef.current = false;
      startPolling();
    } catch (e) {
      setIsSearching(false);
      showToast(e?.message || "Failed to start matchmaking", "error");
    }
  };

  const handlePass = async () => {
    try {
      await matchmakingApi.decide("pass", token);
    } catch {}
  };

  const handleCloseSearching = async () => {
    // Stop matchmaking entirely
    try { await matchmakingApi.cancel(token); } catch {}
    stopPolling();
    setMatchedUser(null);
    setIsSearching(false);
    setShowModal(false);
    showToast("Search stopped", "info");
  };

  const handleStartChat = async () => {
    try {
      const res = await matchmakingApi.decide("accept", token);
      if (res?.state === "matched") {
        stopPolling();
        setIsSearching(false);
        setShowModal(false);
        setMatchedUser(null);
        showToast(res.message || "You got a match!", "success");
        setTimeout(() => router.push({ pathname: "/secure/chat/[id]", params: { id: res.match.chatId, name: res.match.otherName } }), 700);
        return;
      }
      showToast("Accepted. Waiting for the other user…", "info");
    } catch {}
  };

  const handleLocationSearch = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      showToast("Location permission denied", "error");
      return;
    }

    const position = await Location.getCurrentPositionAsync({});
    const baseLatitude = position.coords.latitude ?? 37.7749;
    const baseLongitude = position.coords.longitude ?? -122.4194;

    setMapRegion({
      latitude: baseLatitude,
      longitude: baseLongitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });

    setNearbyMatches([
      { id: "nearby-1", name: "Lina", compatibility: "96%", latitude: baseLatitude + 0.012, longitude: baseLongitude + 0.006 },
      { id: "nearby-2", name: "Ezra", compatibility: "91%", latitude: baseLatitude - 0.01, longitude: baseLongitude - 0.008 },
      { id: "nearby-3", name: "Maya", compatibility: "88%", latitude: baseLatitude + 0.006, longitude: baseLongitude - 0.012 },
    ]);

    setIsLocationModalVisible(true);
  };

  const handleLocationModalClose = () => {
    setIsLocationModalVisible(false);
  };

  // Load friend requests
  const loadFriendRequests = async () => {
    if (!token) return;
    
    try {
      console.log('Loading friend requests...');
      const response = await friendsApi.getPendingRequests(token);
      console.log('Friend requests response:', response);
      
      let requests = response.requests || [];
      
      // Keep requests empty to show the "no requests" state
      // Uncomment below to show demo request for testing:
      /*
      if (requests.length === 0) {
        console.log('No real friend requests, creating demo request');
        requests = [{
          id: 'demo-request-1',
          sender: {
            id: 'demo-sender-1',
            name: 'Alex Johnson',
            email: 'alex@example.com',
            avatar: null
          },
          message: 'Hi! I would like to connect with you.',
          created_at: new Date().toISOString(),
          status: 'pending'
        }];
      }
      */
      
      setFriendRequests(requests);
      console.log('Friend requests set:', requests);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
      setFriendRequests([]);
    }
  };

  // Load friend requests on component mount
  useEffect(() => {
    loadFriendRequests();
  }, [token]);

  const handleAcceptRequest = (request) => {
    console.log('Accepting friend request:', request);
    
    // Extract the display name the same way we do in the UI
    const displayName = (() => {
      // First try to extract name from the message "Hi [Name]! I'd like to connect with you."
      if (request.message) {
        const messageMatch = request.message.match(/Hi\s+([^!]+)!/);
        if (messageMatch && messageMatch[1]) {
          return messageMatch[1].trim();
        }
      }
      
      // If sender has a real name (not generic User ID)
      if (request.sender.name && !request.sender.name.startsWith('User ')) {
        return request.sender.name;
      }
      
      // Try to get name from email
      if (request.sender.email) {
        const emailName = request.sender.email.split('@')[0];
        // If it's not just numbers, use it
        if (!/^\d+$/.test(emailName)) {
          return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
      }
      
      // Fallback to a generic name
      return 'Anonymous User';
    })();
    
    setFriendRequests(prev => prev.filter(r => r.id !== request.id));
    showToast(`Accepted friend request from ${displayName}`, "success");
  };

  const handleRejectRequest = (request) => {
    console.log('Rejecting friend request:', request);
    
    // Extract the display name the same way we do in the UI
    const displayName = (() => {
      // First try to extract name from the message "Hi [Name]! I'd like to connect with you."
      if (request.message) {
        const messageMatch = request.message.match(/Hi\s+([^!]+)!/);
        if (messageMatch && messageMatch[1]) {
          return messageMatch[1].trim();
        }
      }
      
      // If sender has a real name (not generic User ID)
      if (request.sender.name && !request.sender.name.startsWith('User ')) {
        return request.sender.name;
      }
      
      // Try to get name from email
      if (request.sender.email) {
        const emailName = request.sender.email.split('@')[0];
        // If it's not just numbers, use it
        if (!/^\d+$/.test(emailName)) {
          return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
      }
      
      // Fallback to a generic name
      return 'Anonymous User';
    })();
    
    setFriendRequests(prev => prev.filter(r => r.id !== request.id));
    showToast(`Rejected friend request from ${displayName}`, "info");
  };

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  return (
    <LinearGradient
      colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.blurCircleLarge} />
      <View style={styles.blurCircleSmall} />

      <Toast visible={toast.visible} text={toast.text} type={toast.type} />

      <ScrollView
        contentContainerStyle={[styles.content, isLargeScreen && styles.contentLarge]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Today feels lucky</Text>
            <Text style={styles.subtitle}>Explore new matches curated for you.</Text>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options" size={22} color="#FFE8FF" />
          </TouchableOpacity>
        </View>


        <View style={[styles.matchCtaCard, isLargeScreen && styles.matchCtaCardLarge]}>
          <View style={styles.matchCtaHeader}>
            <View style={styles.liveIndicator}>
              <Animated.View
                style={[
                  styles.liveDot,
                  {
                    opacity: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  },
                ]}
              />
              <Text style={styles.liveText}>Start a live match</Text>
            </View>
            <Ionicons name="flash" size={18} color="#FF4D67" />
          </View>

          <Text style={styles.matchCtaTitle}>Ready when you are</Text>
          <Text style={styles.matchCtaSubtitle}>
            Circle is keeping an eye out for members who share your vibe. Tap the button and we’ll
            begin searching instantly.
          </Text>
          {isSearching && !showModal && (
            <View style={styles.searchingInline}>
              <Ionicons name="sparkles" size={16} color="#7C2B86" />
              <Text style={styles.searchingInlineText}>{SEARCH_PHRASES[phraseIdx]}</Text>
            </View>
          )}

          <TouchableOpacity activeOpacity={0.85} style={styles.liveMatchButton} onPress={handleStartMatch}>
            <Text style={styles.liveMatchButtonText}>Start Match</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationTitle}>Search match by location</Text>
            <Ionicons name="location" size={18} color="#7C2B86" />
          </View>
          <Text style={styles.locationDescription}>
            Pinpoint connections in cities you love or places you plan to visit next.
          </Text>
          <TouchableOpacity style={styles.locationButton} activeOpacity={0.85} onPress={handleLocationSearch}>
            <Ionicons name="search" size={18} color="#7C2B86" />
            <Text style={styles.locationButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>Your Circle score is rising</Text>
          <Text style={styles.featureDescription}>
            Keep engaging to unlock more compatible recommendations.
          </Text>
          <TouchableOpacity style={styles.featureButton}>
            <Text style={styles.featureButtonText}>Improve my matches</Text>
          </TouchableOpacity>
        </View>

        {/* Friend Requests Card */}
        <View style={styles.friendRequestsCard}>
          <View style={styles.friendRequestsHeader}>
            <Text style={styles.friendRequestsTitle}>Friend Requests</Text>
            <Ionicons name="people" size={18} color="#7C2B86" />
          </View>
          
          {friendRequests.length > 0 ? (
            <View style={styles.friendRequestsList}>
              {friendRequests.slice(0, 3).map((request) => {
                // Extract a better display name from the message
                const displayName = (() => {
                  // First try to extract name from the message "Hi [Name]! I'd like to connect with you."
                  if (request.message) {
                    const messageMatch = request.message.match(/Hi\s+([^!]+)!/);
                    if (messageMatch && messageMatch[1]) {
                      return messageMatch[1].trim();
                    }
                  }
                  
                  // If sender has a real name (not generic User ID)
                  if (request.sender.name && !request.sender.name.startsWith('User ')) {
                    return request.sender.name;
                  }
                  
                  // Try to get name from email
                  if (request.sender.email) {
                    const emailName = request.sender.email.split('@')[0];
                    // If it's not just numbers, use it
                    if (!/^\d+$/.test(emailName)) {
                      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
                    }
                  }
                  
                  // Fallback to a generic name
                  return 'Anonymous User';
                })();

                return (
                  <View key={request.id} style={styles.friendRequestItem}>
                    <TouchableOpacity 
                      style={styles.friendRequestAvatar}
                      onPress={() => handleViewProfile({
                        id: request.sender.id,
                        name: displayName,
                        email: request.sender.email,
                        avatar: request.sender.avatar
                      })}
                    >
                      <Text style={styles.friendRequestAvatarText}>
                        {displayName.charAt(0).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.friendRequestInfo}>
                      <Text style={styles.friendRequestName}>{displayName}</Text>
                      <Text style={styles.friendRequestMessage} numberOfLines={1}>
                        {request.message || 'Wants to connect'}
                      </Text>
                    </View>
                    <View style={styles.friendRequestActions}>
                      <TouchableOpacity 
                        style={styles.friendRequestReject}
                        onPress={() => handleRejectRequest(request)}
                      >
                        <Ionicons name="close" size={16} color="#FF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.friendRequestAccept}
                        onPress={() => handleAcceptRequest(request)}
                      >
                        <Ionicons name="checkmark" size={16} color="#00AA55" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {friendRequests.length > 3 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View all {friendRequests.length} requests</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noRequestsContainer}>
              <Ionicons name="people-outline" size={32} color="rgba(124, 43, 134, 0.4)" />
              <Text style={styles.noRequestsTitle}>No requests</Text>
              <Text style={styles.noRequestsDescription}>
                Your friend requests will appear here
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      <Modal animationType="fade" transparent visible={showModal && (isSearching || matchedUser !== null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={["#FF6FB5", matchedUser ? "#FFD6F2" : "#A16AE8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}
            >
              {isSearching && !matchedUser && (
                <>
                  <TouchableOpacity style={styles.modalCloseX} onPress={handleCloseSearching}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <ActivityIndicator color="#FFFFFF" size="large" />
                  <Text style={styles.modalTitle}>Searching for someone special…</Text>
                  <Text style={styles.modalSubtitle}>
                    We’re checking who’s online and excited to connect right now.
                  </Text>
                </>
              )}

              {matchedUser && (
                <View style={styles.modalMatchContainer}>
                  <View style={styles.modalAvatarWrapper}>
                    <Image
                      source={{ uri: matchedUser.avatar }}
                      style={styles.modalAvatar}
                      blurRadius={12}
                    />
                    <Ionicons name="sparkles" size={28} color="#FFFFFF" style={styles.modalAvatarIcon} />
                  </View>
                  <Text style={styles.modalTitle}>Match found!</Text>
                  <Text style={styles.modalSubtitle}>{matchedUser.compatibility}</Text>
                  <Text style={styles.modalMatchName}>
                    {`${matchedUser.firstName} ${matchedUser.lastName.charAt(0)}***`}
                  </Text>
                  <View style={styles.modalMetaRow}>
                    <View style={styles.modalMeta}>
                      <Ionicons name="calendar" size={16} color="#FFFFFF" />
                      <Text style={styles.modalMetaText}>{matchedUser.age} yrs</Text>
                    </View>
                    <View style={styles.modalMeta}>
                      <Ionicons name="location" size={16} color="#FFFFFF" />
                      <Text style={styles.modalMetaText}>{matchedUser.location}</Text>
                    </View>
                    <View style={styles.modalMeta}>
                      <Ionicons
                        name={matchedUser.gender === "female" ? "female" : matchedUser.gender === "male" ? "male" : "male-female"}
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.modalMetaText}>
                        {matchedUser.gender === "non-binary"
                          ? "Non-binary"
                          : matchedUser.gender.charAt(0).toUpperCase() + matchedUser.gender.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.modalMatchDescription}>{matchedUser.description}</Text>

                  <View style={styles.modalMatchActions}>
                    <TouchableOpacity style={styles.startChatButton} onPress={handleStartChat}>
                      <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                      <Text style={styles.startChatText}>Start chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.passButton} onPress={handlePass}>
                      <Text style={styles.passText}>Pass</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.modalDismiss}
                    onPress={() => {
                      setMatchedUser(null);
                      handlePass();
                    }}
                  >
                    <Text style={styles.modalDismissText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={isLocationModalVisible} onRequestClose={handleLocationModalClose}>
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalCard}>
            <View style={styles.mapHeader}>
              <View>
                <Text style={styles.mapTitle}>Nearby matches</Text>
                <Text style={styles.mapSubtitle}>Tap on a pin to see compatibility.</Text>
              </View>
              <TouchableOpacity style={styles.mapCloseButton} onPress={handleLocationModalClose}>
                <Ionicons name="close" size={20} color="#1F1147" />
              </TouchableOpacity>
            </View>

            {mapRegion ? (
              <LocationMap region={mapRegion} nearby={nearbyMatches} style={styles.map} />
            ) : (
              <View style={styles.mapFallback}>
                <ActivityIndicator size="large" color="#7C2B86" />
                <Text style={styles.mapFallbackText}>Loading your map…</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* User Profile Modal */}
      <UserProfileModal
        visible={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        userId={selectedUser?.id}
        userName={selectedUser?.name}
        userAvatar={selectedUser?.avatar}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 24,
    gap: 28,
  },
  contentLarge: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.78)",
    marginTop: 6,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 22,
    padding: 24,
    gap: 14,
    boxShadow: "0px 10px 24px rgba(18, 8, 43, 0.35)",
    elevation: 18,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1147",
  },
  featureDescription: {
    fontSize: 14,
    color: "rgba(31, 17, 71, 0.65)",
    lineHeight: 20,
  },
  featureButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#FFD6F2",
  },
  featureButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C2B86",
  },
  locationCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 22,
    padding: 24,
    gap: 16,
    boxShadow: "0px 10px 22px rgba(18, 8, 43, 0.22)",
    elevation: 14,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1147",
  },
  locationDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(31, 17, 71, 0.68)",
  },
  locationButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFD6F2",
  },
  locationButtonDisabled: {
    opacity: 0.65,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C2B86",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFE8FF",
  },
  matchList: {
    gap: 18,
  },
  matchCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  matchAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 214, 242, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  matchName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1147",
  },
  matchLocation: {
    fontSize: 14,
    color: "rgba(31, 17, 71, 0.55)",
  },
  matchFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compatibilityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 214, 242, 0.65)",
  },
  compatibilityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C2B86",
  },
  matchAction: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#7C2B86",
    alignItems: "center",
    justifyContent: "center",
  },
  blurCircleLarge: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 214, 242, 0.24)",
    top: -120,
    right: -60,
  },
  blurCircleSmall: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    bottom: 20,
    left: -70,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4D67",
  },
  liveDotMatched: {
    backgroundColor: "#FFD6F2",
  },
  liveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF4D67",
    letterSpacing: 0.5,
  },
  liveTextMatched: {
    color: "#FFD6F2",
  },
  matchCtaCard: {
    backgroundColor: "rgba(246, 245, 255, 0.96)",
    borderRadius: 24,
    padding: 24,
    gap: 18,
    boxShadow: "0px 10px 20px rgba(18, 8, 43, 0.28)",
    elevation: 18,
  },
  matchCtaCardLarge: {
    padding: 32,
  },
  matchCtaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchCtaTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F1147",
  },
  matchCtaSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(31, 17, 71, 0.68)",
  },
  liveMatchButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: "#FF4D67",
    boxShadow: "0px 10px 18px rgba(255, 77, 103, 0.4)",
    elevation: 14,
  },
  liveMatchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  matchedTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F1147",
  },
  matchedSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C68E4",
  },
  matchedName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1147",
  },
  matchedDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(31, 17, 71, 0.68)",
  },
  matchedActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: "#7C2B86",
    boxShadow: "0px 8px 16px rgba(124, 43, 134, 0.35)",
    elevation: 12,
  },
  startChatText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  passButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(124, 43, 134, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  passText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C2B86",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 8, 43, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    maxWidth: 420,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalGradient: {
    padding: 18,
    borderRadius: 22,
    alignItems: "center",
    gap: 12,
  },
  modalCloseX: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.82)",
    textAlign: "center",
    lineHeight: 20,
  },
  modalMatchContainer: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  modalAvatarWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.65)",
  },
  modalAvatar: {
    width: "100%",
    height: "100%",
  },
  modalAvatarIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  modalMatchName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalMatchDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  modalMatchActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalMetaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  modalMetaText: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  modalDismiss: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.65)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  modalDismissText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 8, 43, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  mapModalCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1147",
  },
  mapSubtitle: {
    fontSize: 13,
    color: "rgba(31, 17, 71, 0.68)",
    marginTop: 4,
  },
  mapCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 214, 242, 0.45)",
  },
  map: {
    width: "100%",
    height: 340,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  mapFallback: {
    height: 340,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  mapFallbackText: {
    fontSize: 15,
    color: "rgba(31, 17, 71, 0.7)",
  },
  mapContainer: {
    width: "100%",
    height: 320,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  mapBackdrop: {
    width: "100%",
    height: "100%",
  },
  pin: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -23 }, { translateY: -23 }],
    shadowColor: "rgba(18, 8, 43, 0.25)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  pinSelf: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  pinTooltip: {
    position: "absolute",
    top: -58,
    minWidth: 120,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(22, 9, 45, 0.9)",
    alignItems: "center",
    gap: 2,
  },
  pinTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pinSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
  },
  friendRequestsContainer: {
    marginBottom: 24,
    maxHeight: 400, // Limit height so it doesn't take over the page
  },

  // Friend Requests Card Styles
  friendRequestsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  friendRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  friendRequestsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
  },
  friendRequestsList: {
    gap: 12,
  },
  friendRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
  },
  friendRequestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  friendRequestAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  friendRequestInfo: {
    flex: 1,
    marginRight: 12,
  },
  friendRequestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 2,
  },
  friendRequestMessage: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.6)',
  },
  friendRequestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  friendRequestReject: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  friendRequestAccept: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 170, 85, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 170, 85, 0.3)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C2B86',
  },
  noRequestsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noRequestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(31, 17, 71, 0.8)',
  },
  noRequestsDescription: {
    fontSize: 13,
    color: 'rgba(31, 17, 71, 0.6)',
    textAlign: 'center',
  },
});
