import React from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import { styles } from "./chatConversationStyles";

// Attach button + text input + send button row.
function ComposerInputBar({
  isDarkMode,
  canMessage,
  onAttachPress,
  isUploadingMedia,
  theme,
  composer,
  onComposerChange,
  onKeyPress,
  onSend,
}) {
  return (
    <View style={styles.composerInner}>
      {/* Media attachment button - black/white circular pill, "Room Chat" style */}
      <TouchableOpacity
        style={[styles.attachButton, !canMessage && styles.attachButtonDisabled]}
        onPress={onAttachPress}
        disabled={!canMessage || isUploadingMedia}
      >
        <View style={[
          styles.attachButtonInner,
          { backgroundColor: isDarkMode ? '#FFFFFF' : '#111111' }
        ]}>
          <Ionicons
            name="add"
            size={22}
            color={isDarkMode ? '#111111' : '#FFFFFF'}
          />
        </View>
      </TouchableOpacity>

      <TextInput
        style={[
          styles.input,
          {
            color: theme.textPrimary,
            backgroundColor: theme.surfaceSecondary,
          },
        ]}
        value={composer}
        onChangeText={onComposerChange}
        placeholder={
          canMessage
            ? "Type message..."
            : "You can only message users you are friends with"
        }
        placeholderTextColor={theme.textPlaceholder}
        multiline
        onKeyPress={onKeyPress}
        editable={canMessage && !isUploadingMedia}
      />

      <TouchableOpacity
        style={[
          styles.sendButton,
          (!composer.trim() || !canMessage || isUploadingMedia) && styles.sendButtonDisabled,
        ]}
        onPress={onSend}
        disabled={!composer.trim() || !canMessage || isUploadingMedia}
      >
        <View style={[styles.sendButtonInner, { backgroundColor: isDarkMode ? '#FFFFFF' : '#111111' }]}>
          <Feather
            name="send"
            size={17}
            color={isDarkMode ? '#111111' : '#FFFFFF'}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(ComposerInputBar);
