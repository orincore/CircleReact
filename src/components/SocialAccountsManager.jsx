import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Linking,
  ScrollView,
  Platform,
  Modal,
  TextInput
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { socialAccountsApi } from '@/src/api/social-accounts';

const SocialAccountsManager = ({ onClose }) => {
  const { token } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkingPlatform, setLinkingPlatform] = useState(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  

  useEffect(() => {
    loadLinkedAccounts();
  }, []);

  const loadLinkedAccounts = async () => {
    try {
      setLoading(true);
      const response = await socialAccountsApi.getLinkedAccounts(token);
      setLinkedAccounts(response.accounts);
    } catch (error) {
      console.error('Failed to load linked accounts:', error);
      Alert.alert('Error', 'Failed to load linked accounts');
    } finally {
      setLoading(false);
    }
  };
  const handleLinkAccount = async (platform) => {
    try {
      setLinkingPlatform(platform);
      
      if (platform === 'instagram') {
        // Show username input modal
        setUsernameInput('');
        setShowUsernameModal(true);
      } else {
        Alert.alert('Error', 'Invalid platform');
      }
    } catch (error) {
      console.error(`Failed to link ${platform}:`, error);
      Alert.alert('Error', `Failed to verify ${platform} account`);
    } finally {
      setLinkingPlatform(null);
    }
  };

  const handleUsernameSubmit = async () => {
    if (!usernameInput.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      setShowUsernameModal(false);
      setLinkingPlatform('instagram');
      
      const result = await socialAccountsApi.verifyInstagram(usernameInput.replace('@', '').trim(), token);
      Alert.alert('Success!', 'Instagram account linked successfully!');
      setTimeout(() => loadLinkedAccounts(), 1000);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to verify Instagram account');
    } finally {
      setLinkingPlatform(null);
      setUsernameInput('');
    }
  };

  const handleInstagramVerificationSuccess = (account) => {
    console.log('Instagram account verified:', account);
    
    // Show appropriate success message
    if (account.is_reactivation) {
      Alert.alert(
        'Account Reactivated!',
        `Your Instagram account (@${account.username}) has been reactivated successfully.`,
        [{ text: 'Great!' }]
      );
    } else {
      Alert.alert(
        'Instagram Linked!',
        `Your Instagram account (@${account.username}) has been successfully linked to your Circle profile.`,
        [{ text: 'Awesome!' }]
      );
    }
    
    // Refresh linked accounts to show the new/reactivated Instagram account
    loadLinkedAccounts();
  };

  const handleUnlinkAccount = async (platform) => {
    Alert.alert(
      'Unlink Account',
      `Are you sure you want to unlink your ${platform} account? You can relink the same account later to reactivate it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await socialAccountsApi.unlinkAccount(platform, token);
              
              Alert.alert(
                'Account Unlinked', 
                response.unlinked_account?.can_reactivate 
                  ? `${platform} account (@${response.unlinked_account.username}) has been unlinked. You can relink the same account anytime to reactivate it.`
                  : `${platform} account unlinked successfully.`,
                [{ text: 'OK' }]
              );
              
              loadLinkedAccounts();
            } catch (error) {
              console.error(`Failed to unlink ${platform}:`, error);
              Alert.alert('Error', `Failed to unlink ${platform} account`);
            }
          }
        }
      ]
    );
  };

  const handleToggleVisibility = async (account, isPublic) => {
    try {
      await socialAccountsApi.updateAccountVisibility(account.id, isPublic, token);
      loadLinkedAccounts();
    } catch (error) {
      console.error('Failed to update visibility:', error);
      Alert.alert('Error', 'Failed to update account visibility');
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

  const formatPlatformData = (account) => {
    if (account.platform === 'instagram' && account.platform_data) {
      const data = account.platform_data;
      const info = [];
      
      if (data.media_count) {
        info.push(`${data.media_count} posts`);
      }
      if (data.account_type) {
        info.push(`${data.account_type} account`);
      }
      if (data.verification_method === 'webview_login') {
        info.push('Verified via login');
      }
      
      return info.join(' • ');
    }
    return '';
  };

  const isAccountLinked = (platform) => {
    return linkedAccounts.some(account => account.platform === platform);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Social Accounts</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C2B86" />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social Accounts</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Link your social accounts to show them on your profile and help others discover your interests.
        </Text>

        {/* Available Platforms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Platforms</Text>
          
          {/* Instagram */}
          <View style={styles.platformCard}>
            <View style={styles.platformHeader}>
              <View style={styles.platformInfo}>
                <View style={[styles.platformIcon, { backgroundColor: getPlatformColor('instagram') }]}>
                  <Ionicons name={getPlatformIcon('instagram')} size={24} color="white" />
                </View>
                <View>
                  <Text style={styles.platformName}>Instagram</Text>
                  <Text style={styles.platformDescription}>Manually verify your Instagram username</Text>
                </View>
              </View>
              
              {isAccountLinked('instagram') ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.unlinkButton]}
                  onPress={() => handleUnlinkAccount('instagram')}
                >
                  <Text style={styles.unlinkButtonText}>Unlink</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.linkButton]}
                  onPress={() => handleLinkAccount('instagram')}
                  disabled={linkingPlatform === 'instagram'}
                >
                  {linkingPlatform === 'instagram' ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.linkButtonText}>Link</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Linked Accounts */}
        {linkedAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Linked Accounts</Text>
            
            {linkedAccounts.map((account) => (
              <View key={account.id} style={styles.linkedAccountCard}>
                <View style={styles.linkedAccountHeader}>
                  <View style={styles.linkedAccountInfo}>
                    {account.platform_avatar_url ? (
                      <Image source={{ uri: account.platform_avatar_url }} style={styles.accountAvatar} />
                    ) : (
                      <View style={[styles.platformIcon, { backgroundColor: getPlatformColor(account.platform) }]}>
                        <Ionicons name={getPlatformIcon(account.platform)} size={20} color="white" />
                      </View>
                    )}
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountName}>{account.platform_display_name}</Text>
                      <Text style={styles.accountUsername}>@{account.platform_username}</Text>
                      {formatPlatformData(account) && (
                        <Text style={styles.accountData}>{formatPlatformData(account)}</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.accountActions}>
                    <View style={styles.visibilityToggle}>
                      <Text style={styles.visibilityLabel}>Public</Text>
                      <Switch
                        value={account.is_public}
                        onValueChange={(value) => handleToggleVisibility(account, value)}
                        trackColor={{ false: '#E0E0E0', true: '#7C2B86' }}
                        thumbColor={account.is_public ? '#FFFFFF' : '#FFFFFF'}
                      />
                    </View>
                  </View>
                </View>
                
                {account.platform_profile_url && (
                  <TouchableOpacity
                    style={styles.viewProfileButton}
                    onPress={() => Linking.openURL(account.platform_profile_url)}
                  >
                    <Ionicons name="open-outline" size={16} color="#7C2B86" />
                    <Text style={styles.viewProfileText}>View Profile</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your linked accounts help others discover shared interests and make better connections.
          </Text>
        </View>
      </ScrollView>

      {/* Username Input Modal */}
      <Modal
        visible={showUsernameModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Instagram Username</Text>
            <Text style={styles.modalDescription}>
              Enter your Instagram username (without the @ symbol)
            </Text>
            
            <TextInput
              style={styles.usernameInput}
              value={usernameInput}
              onChangeText={setUsernameInput}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowUsernameModal(false);
                  setUsernameInput('');
                  setLinkingPlatform(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleUsernameSubmit}
                disabled={!usernameInput.trim()}
              >
                <Text style={styles.submitButtonText}>Link Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 12,
  },
  platformCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 2,
  },
  platformDescription: {
    fontSize: 12,
    color: '#666',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  linkButton: {
    backgroundColor: '#7C2B86',
  },
  linkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  unlinkButton: {
    backgroundColor: '#FF4444',
  },
  unlinkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  linkedAccountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  linkedAccountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkedAccountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 2,
  },
  accountUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  accountData: {
    fontSize: 12,
    color: '#888',
  },
  accountActions: {
    alignItems: 'flex-end',
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visibilityLabel: {
    fontSize: 12,
    color: '#666',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  viewProfileText: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  usernameInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#E4405F',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SocialAccountsManager;
