import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SpotifyProfile({ spotifyData, isExpanded = false, onToggle }) {
  if (!spotifyData || !spotifyData.platform_data) {
    return null;
  }

  const data = spotifyData.platform_data;
  const displayName = spotifyData.platform_display_name || spotifyData.platform_username;
  const profileUrl = spotifyData.platform_profile_url;
  const avatarUrl = spotifyData.platform_avatar_url;

  const openSpotifyUrl = (url) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open Spotify link');
      });
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <View style={styles.container}>
      {/* Spotify Header */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#1DB954', '#1ed760']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="musical-notes" size={24} color="white" />
              <View style={styles.headerText}>
                <Text style={styles.spotifyTitle}>Spotify Profile</Text>
                <Text style={styles.spotifyUsername}>{displayName}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {avatarUrl && (
                <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
              )}
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="white" 
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{data.followers || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{data.playlists_count || 0}</Text>
              <Text style={styles.statLabel}>Playlists</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{data.subscription || 'Free'}</Text>
              <Text style={styles.statLabel}>Plan</Text>
            </View>
          </View>

          {/* Top Genres */}
          {data.top_genres && data.top_genres.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎵 Music Taste</Text>
              <View style={styles.genresContainer}>
                {data.top_genres.slice(0, 5).map((genre, index) => (
                  <View key={index} style={styles.genreChip}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Top Artists */}
          {data.top_artists && data.top_artists.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎤 Top Artists</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.artistsContainer}>
                  {data.top_artists.slice(0, 5).map((artist, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.artistCard}
                      onPress={() => openSpotifyUrl(artist.external_url)}
                    >
                      {artist.image && (
                        <Image source={{ uri: artist.image }} style={styles.artistImage} />
                      )}
                      <Text style={styles.artistName} numberOfLines={2}>
                        {artist.name}
                      </Text>
                      <Text style={styles.artistPopularity}>
                        {artist.popularity}% popular
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Top Tracks */}
          {data.top_tracks && data.top_tracks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎵 Top Tracks</Text>
              {data.top_tracks.slice(0, 3).map((track, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.trackItem}
                  onPress={() => openSpotifyUrl(track.external_url)}
                >
                  {track.image && (
                    <Image source={{ uri: track.image }} style={styles.trackImage} />
                  )}
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackName} numberOfLines={1}>
                      {track.name}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {track.artist} • {track.album}
                    </Text>
                  </View>
                  <Ionicons name="play-circle" size={24} color="#1DB954" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recently Played */}
          {data.recently_played && data.recently_played.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🕒 Recently Played</Text>
              {data.recently_played.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.recentItem}>
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.recentImage} />
                  )}
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentTrack} numberOfLines={1}>
                      {item.track}
                    </Text>
                    <Text style={styles.recentArtist} numberOfLines={1}>
                      {item.artist}
                    </Text>
                  </View>
                  <Text style={styles.recentTime}>
                    {formatTime(item.played_at)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* View Full Profile Button */}
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => openSpotifyUrl(profileUrl)}
          >
            <LinearGradient
              colors={['#1DB954', '#1ed760']}
              style={styles.buttonGradient}
            >
              <Ionicons name="open-outline" size={20} color="white" />
              <Text style={styles.buttonText}>View Full Spotify Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  spotifyTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  spotifyUsername: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  expandedContent: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  genreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  artistsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  artistCard: {
    width: 100,
    alignItems: 'center',
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  artistName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F1147',
    textAlign: 'center',
    marginBottom: 4,
  },
  artistPopularity: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 12,
    color: '#666',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentTrack: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 2,
  },
  recentArtist: {
    fontSize: 11,
    color: '#666',
  },
  recentTime: {
    fontSize: 11,
    color: '#999',
  },
  viewProfileButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
