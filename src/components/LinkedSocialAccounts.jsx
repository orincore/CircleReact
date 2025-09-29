import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  ActivityIndicator
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { socialAccountsApi } from '@/src/api/social-accounts';

const LinkedSocialAccounts = ({ userId, isOwnProfile = false }) => {
  const { token } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinkedAccounts();
  }, [userId]);

  const loadLinkedAccounts = async () => {
    try {
      setLoading(true);
      let response;
      
      if (isOwnProfile) {
        response = await socialAccountsApi.getLinkedAccounts(token);
      } else {
        response = await socialAccountsApi.getUserLinkedAccounts(userId, token);
      }
      
      setLinkedAccounts(response.accounts);
    } catch (error) {
      console.error('Failed to load linked accounts:', error);
      setLinkedAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'spotify':
        return 'musical-notes';
      case 'instagram':
        return 'camera';
      default:
        return 'link';
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'spotify':
        return '#1DB954';
      case 'instagram':
        return '#E4405F';
      default:
        return '#666';
    }
  };

  const getPlatformDisplayName = (platform) => {
    switch (platform) {
      case 'spotify':
        return 'Spotify';
      case 'instagram':
        return 'Instagram';
      default:
        return platform;
    }
  };

  const formatPlatformData = (account) => {
    if (account.platform === 'spotify' && account.platform_data) {
      const data = account.platform_data;
      const details = [];
      
      if (data.followers) {
        details.push(`${data.followers} followers`);
      }
      
      if (data.top_artists?.length > 0) {
        details.push(`Loves ${data.top_artists.slice(0, 2).map(a => a.name).join(', ')}`);
      }
      
      if (data.playlists_count) {
        details.push(`${data.playlists_count} playlists`);
      }
      
      return details.join(' • ');
    } else if (account.platform === 'instagram' && account.platform_data) {
      const data = account.platform_data;
      const details = [];
      
      if (data.media_count) {
        details.push(`${data.media_count} posts`);
      }
      
      if (data.account_type && data.account_type !== 'PERSONAL') {
        details.push(`${data.account_type.toLowerCase()} account`);
      }
      
      return details.join(' • ');
    }
    return '';
  };

  const handleAccountPress = async (account) => {
    if (account.platform_profile_url) {
      try {
        const supported = await Linking.canOpenURL(account.platform_profile_url);
        if (supported) {
          await Linking.openURL(account.platform_profile_url);
        }
      } catch (error) {
        console.error('Failed to open profile URL:', error);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Social Accounts</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#7C2B86" />
        </View>
      </View>
    );
  }

  if (linkedAccounts.length === 0) {
    return null; // Don't show section if no accounts
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social Accounts</Text>
        <Text style={styles.subtitle}>
          {isOwnProfile ? 'Your connected accounts' : 'Connected accounts'}
        </Text>
      </View>

      <View style={styles.accountsList}>
        {linkedAccounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={styles.accountCard}
            onPress={() => handleAccountPress(account)}
            activeOpacity={0.7}
          >
            <View style={styles.accountHeader}>
              <View style={styles.accountInfo}>
                {account.platform_avatar_url ? (
                  <Image 
                    source={{ uri: account.platform_avatar_url }} 
                    style={styles.accountAvatar}
                  />
                ) : (
                  <View style={[styles.platformIcon, { backgroundColor: getPlatformColor(account.platform) }]}>
                    <Ionicons 
                      name={getPlatformIcon(account.platform)} 
                      size={20} 
                      color="white" 
                    />
                  </View>
                )}
                
                <View style={styles.accountDetails}>
                  <View style={styles.accountTitleRow}>
                    <Text style={styles.platformName}>
                      {getPlatformDisplayName(account.platform)}
                    </Text>
                    {account.is_verified && (
                      <Ionicons name="checkmark-circle" size={16} color="#00D4AA" />
                    )}
                  </View>
                  
                  <Text style={styles.accountUsername}>
                    @{account.platform_username}
                  </Text>
                  
                  {account.platform_display_name !== account.platform_username && (
                    <Text style={styles.accountDisplayName}>
                      {account.platform_display_name}
                    </Text>
                  )}
                  
                  {formatPlatformData(account) && (
                    <Text style={styles.accountData}>
                      {formatPlatformData(account)}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.accountActions}>
                <Ionicons name="open-outline" size={16} color="#7C2B86" />
              </View>
            </View>

            {/* Show top artists for Spotify */}
            {account.platform === 'spotify' && account.platform_data?.top_artists?.length > 0 && (
              <View style={styles.topArtists}>
                <Text style={styles.topArtistsTitle}>Top Artists:</Text>
                <View style={styles.artistsList}>
                  {account.platform_data.top_artists.slice(0, 3).map((artist, index) => (
                    <View key={index} style={styles.artistItem}>
                      {artist.image && (
                        <Image source={{ uri: artist.image }} style={styles.artistImage} />
                      )}
                      <Text style={styles.artistName}>{artist.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  accountsList: {
    gap: 12,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  accountUsername: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '500',
    marginBottom: 2,
  },
  accountDisplayName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  accountData: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  accountActions: {
    padding: 4,
  },
  topArtists: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  topArtistsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  artistsList: {
    flexDirection: 'row',
    gap: 12,
  },
  artistItem: {
    alignItems: 'center',
    flex: 1,
  },
  artistImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    numberOfLines: 2,
  },
});

export default LinkedSocialAccounts;
