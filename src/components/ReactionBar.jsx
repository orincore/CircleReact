import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function ReactionBar({ 
  visible, 
  onSelectEmoji, 
  onShowMore, 
  onClose,
  position,
  existingReactions = [],
  currentUserId 
}) {
  if (!visible) return null;

  // Check if current user has already reacted with this emoji
  const hasUserReacted = (emoji) => {
    return existingReactions.some(reaction => 
      reaction.emoji === emoji && reaction.userId === currentUserId
    );
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <View style={[styles.container, position && { top: position.y, left: position.x }]}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.95)']}
          style={styles.reactionBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
        {QUICK_REACTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionButton,
              hasUserReacted(emoji) && styles.reactionButtonActive
            ]}
            onPress={() => onSelectEmoji(emoji)}
          >
            <Text style={[
              styles.reactionEmoji,
              hasUserReacted(emoji) && styles.reactionEmojiActive
            ]}>
              {emoji}
            </Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={styles.moreButton} onPress={onShowMore}>
          <Ionicons name="add" size={20} color="#7C2B86" />
        </TouchableOpacity>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    }),
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  reactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    backgroundColor: 'transparent',
  },
  reactionButtonActive: {
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    transform: [{ scale: 1.1 }],
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionEmojiActive: {
    transform: [{ scale: 1.2 }],
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.2)',
  },
});
