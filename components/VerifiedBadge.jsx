import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Pressable } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

/**
 * Instagram-style verified badge with starburst/gear background
 * Matches the exact Instagram blue verification badge design
 */
export default function VerifiedBadge({ size = 30, style, onPress }) {
  const [visible, setVisible] = React.useState(false);

  const handlePress = () => {
    if (typeof onPress === 'function') {
      onPress();
      return;
    }
    setVisible(true);
  };

  const closeModal = () => setVisible(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <View style={[styles.container, style]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            {/* Starburst/gear background shape - Instagram's signature verified badge shape */}
            <Path
              d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
              fill="#0095F6"
            />
            {/* White checkmark */}
            <Path
              d="M9.5 15.25l-3-3 1.06-1.06 1.94 1.94 5.44-5.44 1.06 1.06-6.5 6.5z"
              fill="#FFFFFF"
            />
          </Svg>
        </View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconWrapper}>
              <Svg width={48} height={48} viewBox="0 0 24 24">
                <Path
                  d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
                  fill="#0095F6"
                />
                <Path
                  d="M9.5 15.25l-3-3 1.06-1.06 1.94 1.94 5.44-5.44 1.06 1.06-6.5 6.5z"
                  fill="#FFFFFF"
                />
              </Svg>
            </View>
            <Text style={styles.modalTitle}>Verified account</Text>
            <Text style={styles.modalText}>
              Verified users are special accounts on Circle. They might be members of our
              team, trusted community leaders, or other super users who help keep the
              experience safe, high quality, and authentic.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#0B1020',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 149, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(226, 232, 240, 0.88)',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    marginTop: 4,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    backgroundColor: '#0095F6',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
