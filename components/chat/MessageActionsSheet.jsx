import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { REACTION_EMOJIS } from "./chatConversationHelpers";
import { styles } from "./chatConversationStyles";

// Message actions sheet for long-press. A native Modal (like the other
// sheets in this screen -- media options, report) instead of a plain
// absolutely-positioned View: a raw View sibling of the
// KeyboardAvoidingView tree got clipped/pushed off-screen by the
// keyboard-dismiss/layout race (confirmed with a bright debug-colored
// version of the old markup -- it rendered, but squashed into a
// sliver at the very bottom instead of the full sheet). Modal
// presents in its own native layer above the keyboard and everything
// else, which sidesteps that race entirely.
function MessageActionsSheet({
  visible,
  onClose,
  actionMessage,
  isDarkMode,
  insets,
  onReactEmoji,
  onOpenAllReactions,
  onReply,
  onSelect,
  myUserId,
  onEdit,
  onDelete,
  onReport,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {actionMessage && (
        <View style={styles.actionsOverlayContainer}>
          <TouchableOpacity
            style={styles.actionsOverlayBackdrop}
            activeOpacity={1}
            onPress={onClose}
          >
            <View
              style={[
                styles.actionsSheet,
                {
                  backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                  paddingBottom: styles.actionsSheet.paddingBottom + insets.bottom,
                },
              ]}
            >
              {/* Quick-reaction row, WhatsApp-style -- react without
                  leaving the long-press menu. */}
              <View
                style={[
                  styles.actionsSheetReactionRow,
                  { borderBottomColor: isDarkMode ? '#38383A' : '#E5E7EB' },
                ]}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.actionsSheetReactionButton}
                    onPress={() => onReactEmoji(emoji)}
                  >
                    <Text style={styles.actionsSheetReactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.actionsSheetReactionButton}
                  onPress={onOpenAllReactions}
                >
                  <Text
                    style={[
                      styles.actionsSheetReactionEmoji,
                      { fontWeight: "600", color: isDarkMode ? '#F9FAFB' : '#000000' },
                    ]}
                  >
                    ＋
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Reply option */}
              <TouchableOpacity
                style={styles.actionsSheetButton}
                onPress={onReply}
              >
                <Text style={[styles.actionsSheetText, { color: '#7C3AED' }]}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionsSheetButton}
                onPress={onSelect}
              >
                <Text style={[styles.actionsSheetText, { color: isDarkMode ? '#F9FAFB' : '#111827' }]}>Select</Text>
              </TouchableOpacity>
              {myUserId &&
                actionMessage.senderId != null &&
                String(actionMessage.senderId) === myUserId &&
                !actionMessage.sharedMemeId && (
                  <TouchableOpacity
                    style={styles.actionsSheetButton}
                    onPress={onEdit}
                  >
                    <Text style={[styles.actionsSheetText, { color: isDarkMode ? '#F9FAFB' : '#111827' }]}>Edit</Text>
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                style={styles.actionsSheetButton}
                onPress={onDelete}
              >
                <Text style={[styles.actionsSheetText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
              {/* Only show Report button for messages from other users */}
              {myUserId &&
                actionMessage.senderId != null &&
                String(actionMessage.senderId) !== myUserId && (
                  <TouchableOpacity
                    style={styles.actionsSheetButton}
                    onPress={onReport}
                  >
                    <Text style={[styles.actionsSheetText, { color: '#FF6B6B' }]}>Report</Text>
                  </TouchableOpacity>
                )}
            </View>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
}

export default React.memo(MessageActionsSheet);
