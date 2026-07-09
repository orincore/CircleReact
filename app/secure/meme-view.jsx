import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Loader from '@/components/Loader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { feedApi } from '@/src/api/feed';
import MemeCard from '@/components/MemeCard';
import CommentsSheet from '@/components/CommentsSheet';
import SharePickerModal from '@/components/SharePickerModal';

/**
 * Standalone single-meme viewer, reached by tapping a shared-meme preview in
 * a chat (MemeSharePreview.jsx). Deliberately NOT part of the (tabs) group:
 * (tabs) is a single persistent route in the outer stack rather than a
 * screen that gets freshly pushed each time, so pushing into it from
 * chat-conversation (a sibling stack screen) collapsed chat-conversation out
 * of the navigation history instead of stacking on top of it -- back then
 * fell through to the tab navigator's own back behavior (landing on
 * whichever tab, or looping) instead of returning to the chat. A plain
 * sibling stack screen doesn't have that problem: router.back() here always
 * pops back to exactly the chat-conversation screen that pushed it, with its
 * message list and scroll position untouched.
 */
export default function MemeViewScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { memeId } = useLocalSearchParams();

  const [meme, setMeme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardHeight, setCardHeight] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await feedApi.getMeme(memeId, token);
        if (!cancelled) setMeme(res?.meme || null);
      } catch (e) {
        console.error('Failed to load shared meme:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [memeId, token]);

  const handleLike = useCallback(() => {
    setMeme((prev) => {
      if (!prev) return prev;
      const wasLiked = prev.liked_by_me;
      const call = wasLiked ? feedApi.unlike(prev.id, token) : feedApi.like(prev.id, token);
      call.catch(() => {
        // revert optimistic update on failure
        setMeme((cur) => cur ? { ...cur, liked_by_me: wasLiked, like_count: prev.like_count } : cur);
      });
      return { ...prev, liked_by_me: !wasLiked, like_count: prev.like_count + (wasLiked ? -1 : 1) };
    });
  }, [token]);

  const handleCommentPosted = useCallback(() => {
    setMeme((prev) => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev);
  }, []);

  const handleCommentDeleted = useCallback(() => {
    setMeme((prev) => prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : prev);
  }, []);

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        setCardHeight(e.nativeEvent.layout.height);
        setCardWidth(e.nativeEvent.layout.width);
      }}
    >
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {loading || cardHeight === 0 ? (
        <Loader size={36} color="#FFFFFF" style={styles.centerLoader} />
      ) : !meme ? (
        <View style={styles.centerLoader}>
          <Text style={styles.emptyText}>Meme no longer available</Text>
        </View>
      ) : (
        <MemeCard
          item={meme}
          isFocused
          height={cardHeight}
          width={cardWidth}
          bottomInset={insets.bottom}
          onLike={handleLike}
          onOpenComments={() => setShowComments(true)}
          onShare={() => setShowShare(true)}
        />
      )}

      {showComments && meme ? (
        <CommentsSheet
          visible
          meme={meme}
          onClose={() => setShowComments(false)}
          onCommentPosted={handleCommentPosted}
          onCommentDeleted={handleCommentDeleted}
        />
      ) : null}

      {showShare && meme ? (
        <SharePickerModal
          visible
          memeId={meme.id}
          onClose={() => setShowShare(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
