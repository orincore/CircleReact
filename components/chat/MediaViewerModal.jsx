import React from "react";
import { FlatList, Modal, TouchableOpacity, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import ChatVideoPlayer from "@/components/ChatVideoPlayer";
import { styles } from "./chatConversationStyles";

// Fullscreen media viewer + swipeable gallery for multi-media messages, plus
// the single-item view used for view-once media.
function MediaViewerModal({
  visible,
  onClose,
  currentGalleryItem,
  viewingMedia,
  onDownload,
  mediaItems,
  mediaViewerIndex,
  setMediaViewerIndex,
  mediaViewerWidth,
  resolvedViewingMediaUrl,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.mediaViewerOverlay}>
        {/* Never offer to save view-once media — the whole point is
            it's gone after this one viewing. */}
        {currentGalleryItem && !viewingMedia?.isViewOnce && (
          <TouchableOpacity
            style={styles.mediaViewerDownloadButton}
            onPress={() => onDownload(currentGalleryItem.url, currentGalleryItem.type)}
          >
            <Ionicons name="download-outline" size={26} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.mediaViewerCloseButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {/* view-once media is deliberately excluded from mediaItems
            (it's not part of the swipeable gallery), and its viewer
            open never sets mediaViewerIndex — so gate on isViewOnce
            explicitly here, otherwise a chat with any regular media
            at all would render the FlatList gallery (showing some
            unrelated stale item) instead of the actual consumed
            view-once content. */}
        {!viewingMedia?.isViewOnce && mediaItems.length > 0 ? (
          <FlatList
            data={mediaItems}
            horizontal
            pagingEnabled
            style={{ flex: 1, width: '100%' }}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(Math.max(mediaViewerIndex, 0), Math.max(mediaItems.length - 1, 0))}
            getItemLayout={(_, index) => ({ length: mediaViewerWidth, offset: mediaViewerWidth * index, index })}
            keyExtractor={(item) => String(item.id || item.url)}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            onViewableItemsChanged={({ viewableItems }) => {
              const first = viewableItems?.[0];
              if (first?.index != null) {
                setMediaViewerIndex(first.index);
              }
            }}
            renderItem={({ item }) => (
              <View style={[styles.mediaViewerPage, { width: mediaViewerWidth }]}>
                {item.type === 'video' ? (
                  <ChatVideoPlayer
                    key={(currentGalleryItem?.id === item.id ? (resolvedViewingMediaUrl || item.url) : item.url)}
                    uri={(currentGalleryItem?.id === item.id ? (resolvedViewingMediaUrl || item.url) : item.url)}
                    style={styles.mediaViewerVideo}
                    autoPlay={currentGalleryItem?.id === item.id}
                  />
                ) : (
                  <ExpoImage
                    source={{ uri: item.url }}
                    style={styles.mediaViewerImage}
                    contentFit="contain"
                    cachePolicy="disk"
                  />
                )}
              </View>
            )}
          />
        ) : (
          viewingMedia && (
            <View style={styles.mediaViewerContent}>
              {viewingMedia.type === 'video' ? (
                <ChatVideoPlayer
                  key={resolvedViewingMediaUrl || viewingMedia.url}
                  uri={resolvedViewingMediaUrl || viewingMedia.url}
                  style={styles.mediaViewerVideo}
                  autoPlay
                />
              ) : (
                <ExpoImage
                  source={{ uri: viewingMedia.url }}
                  style={styles.mediaViewerImage}
                  contentFit="contain"
                  cachePolicy="disk"
                />
              )}
            </View>
          )
        )}
      </View>
    </Modal>
  );
}

export default React.memo(MediaViewerModal);
