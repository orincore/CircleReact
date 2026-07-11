import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "./chatConversationStyles";

// Floating scroll-to-bottom button with a new-message count badge.
function ScrollToBottomButton({ visible, isDarkMode, newMessageCount, onPress, style }) {
  if (!visible) return null;

  return (
    <TouchableOpacity
      style={[styles.scrollToBottomButton, { backgroundColor: isDarkMode ? '#FFFFFF' : '#111111' }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="chevron-down" size={22} color={isDarkMode ? '#111111' : '#FFFFFF'} />
      {newMessageCount > 0 && (
        <View style={[styles.newMessageBadge, { borderColor: isDarkMode ? '#0B0B0F' : '#FFFFFF' }]}>
          <Text style={styles.newMessageBadgeText}>
            {newMessageCount > 99 ? '99+' : newMessageCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(ScrollToBottomButton);
