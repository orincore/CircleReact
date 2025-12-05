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
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { socialAccountsApi } from '@/src/api/social-accounts';

const LinkedSocialAccounts = ({ userId, isOwnProfile = false, onUpgradeRequest }) => {
  const { token } = useAuth();
  const { features = {} } = useSubscription() || {};
  const { theme, isDarkMode } = useTheme();
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to mask Instagram username for other users
  const getMaskedUsername = (username, platform) => {
    if (!username || isOwnProfile || platform !== 'instagram') {
      return username;
    }
    // Mask Instagram username: ig_orincore -> ig**********
    const prefix = username.substring(0, 2);
    const suffix = '*'.repeat(Math.max(1, username.length - 2));
    return prefix + suffix;
  };

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
      case 'instagram':
        return 'logo-instagram';
      default:
        return 'link';
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'instagram':
        return '#E4405F';
      default:
        return '#666';
    }
  };

  const getPlatformDisplayName = (platform) => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      default:
        return platform;
    }
  };

  const formatPlatformData = (account) => {
    if (account.platform === 'instagram' && account.platform_data) {
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
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#1F1147' }]}>Social Accounts</Text>
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
        <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#1F1147' }]}>Social Accounts</Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDarkMode ? 'rgba(148, 163, 184, 0.9)' : '#666' },
          ]}
        >
          {isOwnProfile ? 'Your connected accounts' : 'Connected accounts'}
        </Text>
      </View>

      <View style={styles.accountsList}>
        {linkedAccounts.map((account, index) => (
          <TouchableOpacity
            key={account.id || `account-${index}-${account.platform}`}
            style={[
              styles.accountCard,
              {
                backgroundColor: isDarkMode ? theme.surface : '#FFFFFF',
                borderColor: isDarkMode
                  ? 'rgba(148, 163, 184, 0.35)'
                  : '#E0E0E0',
                shadowColor: isDarkMode ? '#020617' : '#000',
                shadowOpacity: isDarkMode ? 0.35 : 0.1,
              },
            ]}
            onPress={() => {
              if (account.platform === 'instagram' && !isOwnProfile) {
                // Check if user has premium subscription
                if (features.instagramUsernames) {
                  // Premium user - allow access
                  handleAccountPress(account);
                } else {
                  // Free user - trigger upgrade request
                  if (onUpgradeRequest) {
                    onUpgradeRequest();
                  }
                }
              } else {
                // Own profile or other platforms - normal behavior
                handleAccountPress(account);
              }
            }}
            activeOpacity={account.platform === 'instagram' && !isOwnProfile ? 1 : 0.7}
          >
            <View style={styles.accountHeader}>
              <View style={styles.accountInfo}>
                {account.platform_avatar_url ? (
                  <Image 
                    source={{ uri: account.platform_avatar_url }} 
                    style={[
                      styles.accountAvatar,
                      {
                        borderColor: isDarkMode ? '#333' : '#CCC',
                        borderWidth: 1,
                      },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.platformIcon,
                      {
                        backgroundColor: getPlatformColor(account.platform),
                        borderColor: isDarkMode ? '#333' : '#CCC',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Ionicons 
                      name={getPlatformIcon(account.platform)} 
                      size={20} 
                      color="white" 
                    />
                  </View>
                )}
                
                <View style={styles.accountDetails}>
                  <View style={styles.accountTitleRow}>
                    <Text
                      style={[
                        styles.platformName,
                        { color: isDarkMode ? '#E5E7EB' : '#1F1147' },
                      ]}
                    >
                      {getPlatformDisplayName(account.platform)}
                    </Text>
                    {account.is_verified && (
                      <Ionicons name="checkmark-circle" size={16} color="#00D4AA" />
                    )}
                  </View>
                  
                  <Text
                    style={[
                      styles.accountUsername,
                      { color: isDarkMode ? '#A855F7' : '#7C2B86' },
                    ]}
                  >
                    @{isOwnProfile || features.instagramUsernames || account.platform !== 'instagram' 
                      ? account.platform_username 
                      : getMaskedUsername(account.platform_username, account.platform)}
                  </Text>
                  
                  {account.platform_display_name !== account.platform_username && (
                    <Text
                      style={[
                        styles.accountDisplayName,
                        { color: isDarkMode ? '#CBD5F5' : '#333' },
                      ]}
                    >
                      {account.platform_display_name}
                    </Text>
                  )}
                  
                  {formatPlatformData(account) && (
                    <Text
                      style={[
                        styles.accountData,
                        { color: isDarkMode ? 'rgba(148, 163, 184, 0.9)' : '#666' },
                      ]}
                    >
                      {formatPlatformData(account)}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.accountActions}>
                {account.platform === 'instagram' && !isOwnProfile && !features.instagramUsernames ? (
                  <Ionicons name="diamond" size={16} color="#FFD700" />
                ) : (
                  <Ionicons name="open-outline" size={16} color="#7C2B86" />
                )}
              </View>
            </View>

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
