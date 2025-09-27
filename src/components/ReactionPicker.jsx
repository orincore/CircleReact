import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Gestures': ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏'],
  'Objects': ['🔥', '⭐', '🌟', '✨', '⚡', '💥', '💯', '💢', '💨', '💦', '💤', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'],
};

export default function ReactionPicker({ visible, onClose, onSelectEmoji, position }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.95)']}
            style={styles.picker}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.title}>Choose Reaction</Text>
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <View key={category} style={styles.category}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <View style={styles.emojiGrid}>
                    {emojis.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={styles.emojiButton}
                        onPress={() => {
                          onSelectEmoji(emoji);
                          onClose();
                        }}
                      >
                        <Text style={styles.emoji}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxHeight: '70%',
  },
  picker: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C2B86',
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollView: {
    maxHeight: 400,
  },
  category: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
    marginBottom: 8,
    marginLeft: 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
    backgroundColor: 'rgba(255, 214, 242, 0.1)',
  },
  emoji: {
    fontSize: 22,
  },
});
