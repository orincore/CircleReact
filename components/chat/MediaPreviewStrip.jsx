import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import Loader from "@/components/Loader";
import { styles } from "./chatConversationStyles";

// Pending-media preview row shown above the composer before sending.
function MediaPreviewStrip({
  visible,
  isDarkMode,
  selectedMedia,
  onCancel,
  onTrimVideo,
  onRemoveMedia,
  onAddMoreMedia,
  theme,
  onSendMedia,
  isUploadingMedia,
}) {
  if (!visible) return null;

  return (
    <View style={[styles.mediaPreviewContainer, { backgroundColor: isDarkMode ? '#1F1F2E' : '#F9FAFB' }]}>
      <View style={styles.mediaPreviewHeader}>
        <Text style={[styles.mediaPreviewTitle, { color: isDarkMode ? '#FFFFFF' : '#1F2937' }]}>
          {selectedMedia.length} {selectedMedia.length === 1 ? 'item' : 'items'} selected
        </Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mediaPreviewScroll}
        contentContainerStyle={styles.mediaPreviewScrollContent}
      >
        {selectedMedia.map((media, index) => (
          <View key={index} style={styles.mediaPreviewItem}>
            <Image
              source={{ uri: media.uri }}
              style={styles.mediaPreviewImage}
              resizeMode="cover"
            />
            {media.type === 'video' && (
              <View style={styles.mediaPreviewVideoIcon}>
                <Ionicons name="play-circle" size={24} color="#fff" />
              </View>
            )}
            {media.type === 'video' && (
              <TouchableOpacity
                style={styles.mediaPreviewTrim}
                onPress={() => onTrimVideo(index)}
              >
                <Ionicons name="cut-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.mediaPreviewRemove}
              onPress={() => onRemoveMedia(index)}
            >
              <Ionicons name="close-circle" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.mediaPreviewAddMore, { borderColor: isDarkMode ? '#374151' : '#D1D5DB' }]}
          onPress={onAddMoreMedia}
        >
          <Ionicons name="add" size={28} color={theme.primary} />
          <Text style={[styles.mediaPreviewAddMoreText, { color: theme.primary }]}>Add</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.mediaPreviewActions}>
        <TouchableOpacity
          style={[styles.mediaPreviewSendButton, { backgroundColor: theme.primary }]}
          onPress={onSendMedia}
          disabled={isUploadingMedia}
        >
          {isUploadingMedia ? (
            <Loader size={16} color="#fff" />
          ) : (
            <>
              <Feather name="send" size={18} color="#fff" />
              <Text style={styles.mediaPreviewSendText}>Send</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(MediaPreviewStrip);
