import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const GiverRequestModal = ({ 
  visible, 
  onClose, 
  onAccept, 
  onDecline,
  requestData 
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null); // 'accept' or 'decline'

  if (!requestData) return null;

  const {
    receiverUsername,
    receiverFirstName,
    receiverPhoto,
    prompt,
    similarityScore,
  } = requestData;

  const handleAccept = async () => {
    setAction('accept');
    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleDecline = async () => {
    setAction('decline');
    setLoading(true);
    try {
      await onDecline();
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Help Request
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Masked Profile */}
            <View style={styles.profileSection}>
              <View style={[styles.avatarContainer, { backgroundColor: theme.card }]}>
                {receiverPhoto ? (
                  <Image
                    source={{ uri: receiverPhoto }}
                    style={styles.avatar}
                  />
                ) : (
                  <Ionicons name="person" size={50} color={theme.textSecondary} />
                )}
                <View style={styles.maskOverlay}>
                  <Ionicons name="eye-off" size={30} color="#fff" />
                </View>
              </View>
              <Text style={[styles.username, { color: theme.text }]}>
                {receiverFirstName || 'Someone'}
              </Text>
              <View style={styles.matchBadge}>
                <Ionicons name="flash" size={16} color="#FFD700" />
                <Text style={[styles.matchText, { color: theme.textSecondary }]}>
                  {Math.round((similarityScore || 0.85) * 100)}% Match
                </Text>
              </View>
            </View>

            {/* Request Prompt */}
            <View style={[styles.promptCard, { backgroundColor: theme.card }]}>
              <View style={styles.promptHeader}>
                <Ionicons name="chatbubble-ellipses" size={20} color={theme.primary} />
                <Text style={[styles.promptLabel, { color: theme.textSecondary }]}>
                  They need help with:
                </Text>
              </View>
              <Text style={[styles.promptText, { color: theme.text }]}>
                "{prompt}"
              </Text>
            </View>

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: theme.card }]}>
              <Ionicons name="shield-checkmark" size={18} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Your identity will remain hidden until both parties agree to reveal
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.declineButton,
                  { 
                    borderColor: theme.border,
                    opacity: loading && action === 'decline' ? 0.7 : 1,
                  }
                ]}
                onPress={handleDecline}
                disabled={loading}
              >
                {loading && action === 'decline' ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={20} color={theme.text} />
                    <Text style={[styles.buttonText, { color: theme.text }]}>
                      Decline
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.acceptButton,
                  { 
                    backgroundColor: theme.primary,
                    opacity: loading && action === 'accept' ? 0.7 : 1,
                  }
                ]}
                onPress={handleAccept}
                disabled={loading}
              >
                {loading && action === 'accept' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={[styles.buttonText, { color: '#fff' }]}>
                      Accept & Help
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  maskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  promptCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  promptText: {
    fontSize: 16,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  declineButton: {
    borderWidth: 1,
  },
  acceptButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GiverRequestModal;
