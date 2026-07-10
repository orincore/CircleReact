import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { REACTION_EMOJIS } from "./chatConversationHelpers";
import { styles } from "./chatConversationStyles";

// Quick-reaction row shown on double-tap, as a Modal for the same reason
// the long-press actions sheet is one -- see the comment on
// MessageActionsSheet.
function QuickReactionRow({
  reactionTarget,
  showAllReactions,
  onClose,
  onShowAllReactions,
  onReact,
}) {
  return (
    <Modal
      visible={!!reactionTarget && !showAllReactions}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {reactionTarget && (
        <View style={styles.reactionOverlayContainer}>
          <TouchableOpacity
            style={styles.reactionOverlayBackdrop}
            activeOpacity={1}
            onPress={onClose}
          >
            <View style={styles.reactionOverlay}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionOverlayButton}
                  onPress={() => onReact(emoji)}
                >
                  <Text style={styles.reactionOverlayEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              {/* + icon to open full emoji sheet */}
              <TouchableOpacity
                style={styles.reactionOverlayButton}
                onPress={onShowAllReactions}
              >
                <Text style={[styles.reactionOverlayEmoji, { fontWeight: "600" }]}>＋</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
}

export default React.memo(QuickReactionRow);
