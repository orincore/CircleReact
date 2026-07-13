import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MemeCard from '@/components/MemeCard';

const noop = () => {};

/**
 * Final review step before posting -- renders the draft through the actual
 * MemeCard component (same full-bleed layout, caption overlay, Like/Comment/
 * Share rail the real feed uses), not a boxed-in editor preview, so what the
 * user approves here is pixel-for-pixel what shows up in the feed.
 * Like/Comment/Share are no-ops here -- there's no real post yet to act on.
 */
export default function NudgePreview({ item, cardWidth, cardHeight, posting, progress, isFocused = true, onBack, onShare }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.overlay}>
      {cardWidth > 0 && cardHeight > 0 ? (
        <MemeCard
          item={item}
          isFocused={isFocused}
          height={cardHeight}
          width={cardWidth}
          bottomInset={insets.bottom}
          onLike={noop}
          onOpenComments={noop}
          onShare={noop}
        />
      ) : null}

      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={onBack}
        disabled={posting}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.shareButton, { top: insets.top + 8 }, posting && styles.shareButtonDisabled]}
        onPress={onShare}
        disabled={posting}
      >
        {posting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.shareButtonText}>Share</Text>}
      </TouchableOpacity>

      {posting ? (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress.pct * 100)}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 100,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20,
  },
  shareButton: {
    position: 'absolute',
    right: 16,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C2B86',
    zIndex: 20,
  },
  shareButtonDisabled: { opacity: 0.6 },
  shareButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 20,
  },
  progressFill: { height: 3, backgroundColor: '#7C2B86' },
});
