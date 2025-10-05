import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountBlockedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const status = params.status || 'suspended'; // 'suspended' or 'deleted'
  const reason = params.reason || 'No reason provided';
  const username = params.username || '';
  const email = params.email || '';
  const suspensionEndsAt = params.suspensionEndsAt;

  const handleContactSupport = async () => {
    const subject = encodeURIComponent(`Account ${status === 'deleted' ? 'Deletion' : 'Suspension'} Appeal - ${username}`);
    const body = encodeURIComponent(
      `Hello Circle Support Team,\n\n` +
      `I am writing to appeal my account ${status === 'deleted' ? 'deletion' : 'suspension'}.\n\n` +
      `Account Details:\n` +
      `Username: ${username}\n` +
      `Email: ${email}\n` +
      `Status: ${status === 'deleted' ? 'Deleted' : 'Suspended'}\n` +
      `Reason: ${reason}\n\n` +
      `Please review my account and provide assistance.\n\n` +
      `Thank you,\n` +
      `${username}`
    );

    const mailtoUrl = `mailto:support@circle.com?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Fallback for web
        if (Platform.OS === 'web') {
          window.location.href = mailtoUrl;
        } else {
          alert('Unable to open email app. Please contact support@circle.com');
        }
      }
    } catch (error) {
      console.error('Error opening email:', error);
      alert('Unable to open email app. Please contact support@circle.com');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@circle:isAuthenticated',
        '@circle:access_token',
        '@circle:user'
      ]);
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
      router.replace('/');
    }
  };

  return (
    <LinearGradient colors={['#1F1147', '#0D0524']} style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, status === 'deleted' ? styles.deletedIcon : styles.suspendedIcon]}>
          <Ionicons 
            name={status === 'deleted' ? 'trash' : 'ban'} 
            size={64} 
            color="#FFFFFF" 
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          Account {status === 'deleted' ? 'Deleted' : 'Suspended'}
        </Text>

        {/* Message */}
        <Text style={styles.message}>
          {status === 'deleted' 
            ? 'Your account has been permanently deleted and you can no longer access Circle.'
            : 'Your account has been temporarily suspended and you cannot access Circle at this time.'
          }
        </Text>

        {/* Reason Card */}
        <View style={styles.reasonCard}>
          <View style={styles.reasonHeader}>
            <Ionicons name="information-circle" size={20} color="#FFD6F2" />
            <Text style={styles.reasonTitle}>Reason</Text>
          </View>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>

        {/* Suspension End Date */}
        {status === 'suspended' && suspensionEndsAt && (
          <View style={styles.infoCard}>
            <Ionicons name="time" size={20} color="#FFD6F2" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Suspension Ends</Text>
              <Text style={styles.infoValue}>
                {new Date(suspensionEndsAt).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Permanent Suspension */}
        {status === 'suspended' && !suspensionEndsAt && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={20} color="#FF9800" />
            <Text style={styles.warningText}>
              This is a permanent suspension
            </Text>
          </View>
        )}

        {/* Contact Support Button */}
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={handleContactSupport}
        >
          <Ionicons name="mail" size={20} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Contact Support</Text>
        </TouchableOpacity>

        {/* Support Email */}
        <Text style={styles.supportText}>
          Or email us at: support@circle.com
        </Text>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  suspendedIcon: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
  },
  deletedIcon: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  reasonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD6F2',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C2B86',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    marginTop: 8,
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  supportText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
    marginBottom: 24,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'underline',
  },
});
