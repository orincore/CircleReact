import React, { useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import MemeSharePreview from "@/components/MemeSharePreview";
import AnimatedMessageBubble from "@/components/chat/AnimatedMessageBubble";
import SwipeableMessage from "@/components/chat/SwipeableMessage";
import { styles } from "./chatConversationStyles";

const MessageBubble = React.memo(function MessageBubble({
  message,
  isMine,
  senderName,
  onReact,
  onDoubleTap,
  onLongPress,
  isSelected,
  isEditing,
  selectionMode,
  onToggleSelect,
  replyToMessage,
  isDarkMode,
  onReplyTap,
  isHighlighted,
  onMediaPress,
  viewedOnceMessages,
  onSwipeReply,
  myUserId,
}) {
  const viewedOnceMessagesSet = viewedOnceMessages instanceof Set ? viewedOnceMessages : new Set();
  // Determine tick style based on message status
  let tickIconName = null;
  let tickColor = "#808080"; // default grey

  if (isMine) {
    if (message.status === "read") {
      tickIconName = "checkmark-done"; // double tick
      tickColor = "#34B7F1"; // blue
    } else if (message.status === "delivered") {
      tickIconName = "checkmark-done"; // double tick
    } else if (message.status === "sent") {
      tickIconName = "checkmark"; // single tick
    } else if (message.status === "sending" || message.isOptimistic) {
      tickIconName = "time-outline"; // clock for sending
      tickColor = "#A0A0A0";
    } else if (message.status === "failed") {
      tickIconName = "alert-circle"; // error icon for failed
      tickColor = "#FF4444";
    }
  }

  // Group reactions by emoji for display
  const reactionCounts = {};
  const myReactionEmojis = new Set();
  (message.reactions || []).forEach((r) => {
    if (!r || !r.emoji) return;
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    if (myUserId && r.userId === myUserId) myReactionEmojis.add(r.emoji);
  });

  const lastTapRef = useRef(0);

  // Bubble backgrounds invert between light/dark mode via AnimatedMessageBubble
  // (mine: near-black in light mode / white in dark mode; theirs: the reverse),
  // so text color must invert right along with it to stay readable.
  const bubbleTextStyle = isMine
    ? [styles.myMessageText, isDarkMode && styles.myMessageTextDark]
    : [styles.theirMessageText, isDarkMode && styles.theirMessageTextDark];
  const bubbleIconColor = isMine
    ? (isDarkMode ? "#111111" : "#fff")
    : (isDarkMode ? "#E5E7EB" : "#374151");

  const handlePress = () => {
    // In selection mode, tapping toggles selection instead of reacting
    if (selectionMode && onToggleSelect) {
      onToggleSelect(message.id);
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      if (onDoubleTap) onDoubleTap(message);
    }
    lastTapRef.current = now;
  };

  const formatTime = () => {
    if (!message.createdAt) return "";
    try {
      const d =
        typeof message.createdAt === "number"
          ? new Date(message.createdAt)
          : new Date(message.createdAt);
      // A malformed/unparseable createdAt doesn't throw here -- it silently
      // produces NaN fields below (e.g. "NaN:NaN AM") instead of an error,
      // so this needs an explicit check rather than relying on the catch.
      if (Number.isNaN(d.getTime())) return "";
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const hoursStr = hours.toString().padStart(2, "0");
      return `${hoursStr}:${minutes} ${ampm}`;
    } catch {
      return "";
    }
  };

  // Replied-to message is resolved once by the parent (an O(1) Map lookup)
  // and handed down directly, instead of every bubble scanning the entire
  // message list on every render.
  const repliedMessage = message.reply_to_id ? replyToMessage : null;

  return (
    <View
      style={[
        styles.messageRow,
        isMine ? styles.messageRowMine : styles.messageRowTheirs,
      ]}
    >
      {/* Swipe-to-reply is scoped to just the bubble itself (not the full
          row, which spans the whole screen width with empty space beside a
          short message) — SwipeableMessage used to wrap the entire Pressable
          row, so swiping anywhere in that empty space also triggered reply.
          Tap/long-press are handled inside SwipeableMessage's GestureDetector
          (not a Pressable here) since nesting a Pressable ancestor around a
          GestureDetector descendant is what broke long-press in the first
          place -- see the comment on SwipeableMessage itself
          (components/chat/SwipeableMessage.jsx). */}
      <SwipeableMessage
        isMine={isMine}
        message={message}
        onSwipeReply={onSwipeReply}
        onPress={handlePress}
        onLongPress={() => {
          if (onLongPress) onLongPress(message);
        }}
      >
      <AnimatedMessageBubble
        isMine={isMine}
        isHighlighted={isHighlighted}
        style={[
          styles.messageBubble,
          isMine ? styles.myMessageBubble : styles.theirMessageBubble,
          isSelected && styles.messageBubbleSelected,
          isEditing && styles.messageBubbleEditing,
          isHighlighted && styles.messageBubbleHighlighted,
        ]}
      >
        {/* Sender name + time header row, "Room Chat" style */}
        <View style={styles.bubbleHeaderRow}>
          <Text style={[bubbleTextStyle, styles.bubbleSenderName]} numberOfLines={1}>
            {senderName}
          </Text>
          <View style={styles.bubbleHeaderRight}>
            {isMine && tickIconName ? (
              <Ionicons
                name={tickIconName}
                size={13}
                color={tickColor}
                style={{ marginRight: 4 }}
              />
            ) : null}
            <Text style={[styles.bubbleTimeText, { color: bubbleIconColor }]}>
              {formatTime()}
              {message.isEdited ? ' · edited' : ''}
            </Text>
          </View>
        </View>

        {/* Reply preview inside bubble - tappable to scroll to original message */}
        {repliedMessage && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onReplyTap && onReplyTap(message.reply_to_id)}
            style={[
              styles.replyPreviewInBubble,
              isMine
                ? (isDarkMode ? styles.replyPreviewInBubbleMineDark : styles.replyPreviewInBubbleMine)
                : (isDarkMode ? styles.replyPreviewInBubbleTheirsDark : styles.replyPreviewInBubbleTheirs),
            ]}
          >
            <View style={[
              styles.replyPreviewBar,
              isMine
                ? (isDarkMode ? styles.replyPreviewBarMineDark : styles.replyPreviewBarMine)
                : styles.replyPreviewBarTheirs,
            ]} />
            <View style={styles.replyPreviewContent}>
              <View style={styles.replyPreviewNameRow}>
                <Ionicons
                  name="arrow-undo-outline"
                  size={12}
                  color={bubbleIconColor}
                  style={styles.replyPreviewNameIcon}
                />
                <Text style={[
                  styles.replyPreviewName,
                  isMine
                    ? (isDarkMode ? styles.replyPreviewNameMineDark : styles.replyPreviewNameMine)
                    : (isDarkMode ? styles.replyPreviewNameTheirsDark : styles.replyPreviewNameTheirs),
                ]} numberOfLines={1}>
                  {repliedMessage.senderId === message.senderId ? 'You' : 'Them'}
                </Text>
              </View>
              <Text style={[
                styles.replyPreviewText,
                isMine
                  ? (isDarkMode ? styles.replyPreviewTextMineDark : styles.replyPreviewTextMine)
                  : (isDarkMode ? styles.replyPreviewTextTheirsDark : styles.replyPreviewTextTheirs),
                repliedMessage.isViewOnce && { fontStyle: 'italic' }
              ]} numberOfLines={1}>
                {repliedMessage.text ||
                 (repliedMessage.isViewOnce
                   ? (repliedMessage.mediaType === 'video' ? 'View once video' : 'View once photo')
                   : (repliedMessage.mediaType === 'video' ? '📹 Video' : repliedMessage.mediaUrl ? '📷 Image' : 'Message')
                 )}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {/* Shared meme preview -- takes priority over regular media/text since a
            shared-meme message never has its own mediaUrl/text set. */}
        {message.sharedMemeId && (
          <MemeSharePreview memeId={message.sharedMemeId} />
        )}
        {/* Media content (image or video) */}
        {message.mediaUrl && !message.isViewOnce && (
          <TouchableOpacity
            style={styles.mediaContainer}
            activeOpacity={0.9}
            onPress={() => onMediaPress && onMediaPress(message.mediaUrl, message.mediaType, message.isViewOnce, message.id)}
          >
            {message.mediaType === 'video' ? (
              <View style={styles.videoContainer}>
                <ExpoImage
                  source={{ uri: message.thumbnail || message.mediaUrl }}
                  style={styles.mediaImage}
                  contentFit="cover"
                  cachePolicy="disk"
                />
                <View style={styles.videoPlayOverlay}>
                  <View style={styles.videoPlayButton}>
                    <Ionicons name="play" size={24} color="#fff" />
                  </View>
                </View>
              </View>
            ) : (
              <ExpoImage
                source={{ uri: message.mediaUrl }}
                style={styles.mediaImage}
                contentFit="cover"
                cachePolicy="disk"
              />
            )}
          </TouchableOpacity>
        )}
        {/* View Once Media - never render an actual preview; the real media_url
            is server-stripped from history entirely (see chat.repo.ts) and only
            ever handed out once, at tap time, via the view-once consume flow. */}
        {message.isViewOnce && message.mediaType && (
          (message.viewOnceViewed || viewedOnceMessagesSet.has(message.id)) ? (
            <Text style={[
              bubbleTextStyle,
              styles.viewOnceMessageText,
              { opacity: 0.6 }
            ]}>
              <Ionicons name="eye-off-outline" size={14} color={bubbleIconColor} />
              {' '}Opened
            </Text>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onMediaPress && onMediaPress(message.mediaUrl, message.mediaType, message.isViewOnce, message.id)}
            >
              <Text style={[
                bubbleTextStyle,
                styles.viewOnceMessageText
              ]}>
                <Ionicons name="eye-off" size={14} color={bubbleIconColor} />
                {' '}{message.mediaType === 'video' ? 'View once video' : 'View once photo'}
              </Text>
            </TouchableOpacity>
          )
        )}
        {/* Text content */}
        {message.text ? (
          <Text style={bubbleTextStyle}>
            {message.text}
          </Text>
        ) : null}
        {Object.keys(reactionCounts).length > 0 && (
          <View style={styles.reactionSummaryRow}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                activeOpacity={0.6}
                style={[
                  styles.reactionBubble,
                  myReactionEmojis.has(emoji) && styles.reactionBubbleMine,
                ]}
                onPress={() => onReact && onReact(message.id, emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 && (
                  <Text style={styles.reactionCount}>{count}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </AnimatedMessageBubble>
      </SwipeableMessage>
    </View>
  );
});

export default MessageBubble;
