import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./chatConversationStyles";

// Blind Date "message blocked" info modal, explaining why a personal-info
// message got blocked pre-reveal.
function BlockedInfoModal({ visible, onClose, isDarkMode, blockedInfoMessage }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.blockedModalOverlay}>
        <View
          style={[
            styles.blockedModalContainer,
            { backgroundColor: isDarkMode ? "#1a1a2e" : "#ffffff" },
          ]}
        >
          <View style={styles.blockedModalTag}>
            <Text style={styles.blockedModalTagText}>Blind Connect safety</Text>
          </View>

          <View style={styles.blockedModalIconWrapper}>
            <Text style={styles.blockedModalIcon}>🔒</Text>
          </View>

          <Text
            style={[
              styles.blockedModalTitle,
              { color: isDarkMode ? "#fff" : "#000" },
            ]}
            numberOfLines={1}
          >
            No personal info yet
          </Text>
          <Text
            style={[
              styles.blockedModalSubtitle,
              { color: isDarkMode ? "#aaa" : "#666" },
            ]}
          >
            {blockedInfoMessage ||
              "In Blind Connect chats, messages with personal details like phone numbers, social media or email are blocked until both of you choose to reveal your profiles."}
          </Text>
          <TouchableOpacity
            style={styles.blockedModalButton}
            onPress={onClose}
          >
            <Text style={styles.blockedModalButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(BlockedInfoModal);
