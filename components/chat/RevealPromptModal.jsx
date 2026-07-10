import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import Loader from "@/components/Loader";
import { REVEAL_INTERVAL } from "./chatConversationHelpers";
import { styles } from "./chatConversationStyles";

// Blind Date reveal-prompt modal, shown at message-count thresholds (or when
// the other side has already revealed) to nudge the user to reveal too.
function RevealPromptModal({
  visible,
  onSkip,
  isDarkMode,
  otherHasRevealed,
  blindDateMessageCount,
  isRevealSubmitting,
  onReveal,
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.revealModalOverlay}>
        <View style={[styles.revealModalContainer, { backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }]}>
          <View style={styles.revealModalIcon}>
            <Text style={{ fontSize: 48 }}>{otherHasRevealed ? '🎉' : '🎭'}</Text>
          </View>

          <Text style={[styles.revealModalTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
            {otherHasRevealed ? 'They Revealed!' : 'Time to Reveal?'}
          </Text>

          <Text style={[styles.revealModalSubtitle, { color: isDarkMode ? '#aaa' : '#666' }]}>
            {otherHasRevealed
              ? 'Your match has revealed their identity! Would you like to reveal yours too?'
              : `You've exchanged ${blindDateMessageCount} messages! Would you like to reveal your profile to your match?`
            }
          </Text>

          <Text style={[styles.revealModalNote, { color: isDarkMode ? '#888' : '#999' }]}>
            {otherHasRevealed
              ? 'Once you reveal, you\'ll both see each other\'s full profiles and can continue as friends!'
              : 'Both of you need to agree to reveal. Once revealed, you\'ll see each other\'s full profiles and can continue as friends!'
            }
          </Text>

          <TouchableOpacity
            style={[
              styles.revealBtn,
              {
                opacity: isRevealSubmitting ? 0.7 : 1,
                backgroundColor: otherHasRevealed ? '#4CAF50' : '#007AFF'
              }
            ]}
            onPress={onReveal}
            disabled={isRevealSubmitting}
          >
            {isRevealSubmitting ? (
              <Loader size={16} color="#fff" />
            ) : (
              <Text style={styles.revealBtnText}>
                {otherHasRevealed ? '🎉 Reveal & Connect!' : '✨ Reveal My Profile'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipRevealBtn}
            onPress={onSkip}
          >
            <Text style={[styles.skipRevealBtnText, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>

          {!otherHasRevealed && (
            <Text style={[styles.revealModalHint, { color: isDarkMode ? '#666' : '#999' }]}>
              We'll ask again after {REVEAL_INTERVAL} more messages
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(RevealPromptModal);
