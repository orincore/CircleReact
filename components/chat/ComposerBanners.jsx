import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "./chatConversationStyles";

// Edit-message banner and reply-preview banner shown above the composer.
// Mutually exclusive in practice (you can't edit and reply at once), but
// each is independently gated by its own prop.
function ComposerBanners({
  editingMessage,
  onCancelEdit,
  replyToMessage,
  myUserId,
  conversationName,
  isDarkMode,
  onCancelReply,
}) {
  return (
    <>
      {editingMessage && (
        <View style={styles.editBanner}>
          <View style={styles.editBannerTextContainer}>
            <Text style={styles.editBannerLabel}>Editing message</Text>
            <Text
              style={styles.editBannerPreview}
              numberOfLines={1}
            >
              {editingMessage.text || ""}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelEdit}
          >
            <Text style={styles.editBannerCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Reply preview banner */}
      {replyToMessage && (
        <View style={[
          styles.replyBanner,
          { backgroundColor: isDarkMode ? '#2D2D3A' : '#F3F4F6' }
        ]}>
          <View style={styles.replyBannerBar} />
          <View style={styles.replyBannerContent}>
            <Text style={[
              styles.replyBannerLabel,
              { color: isDarkMode ? '#A78BFA' : '#7C3AED' }
            ]}>
              Replying to {replyToMessage.senderId === myUserId ? 'yourself' : conversationName}
            </Text>
            <Text style={[
              styles.replyBannerText,
              { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
              replyToMessage.isViewOnce && { fontStyle: 'italic' }
            ]} numberOfLines={1}>
              {replyToMessage.text ||
               (replyToMessage.isViewOnce
                 ? (replyToMessage.mediaType === 'video' ? 'View once video' : 'View once photo')
                 : (replyToMessage.mediaType === 'video' ? '📹 Video' : replyToMessage.mediaUrl ? '📷 Image' : 'Message')
               )}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.replyBannerClose}
            onPress={onCancelReply}
          >
            <Ionicons name="close" size={20} color={isDarkMode ? '#9CA3AF' : '#666'} />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

export default React.memo(ComposerBanners);
