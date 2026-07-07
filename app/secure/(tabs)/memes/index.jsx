import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useIsFocused, useLocalSearchParams, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { feedApi } from '@/src/api/feed';
import MemeCard from '@/components/MemeCard';
import CommentsSheet from '@/components/CommentsSheet';
import SharePickerModal from '@/components/SharePickerModal';

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

// Rolling-window tuning: how many cards ahead of the focused one to warm the
// cache for, and how many behind it to keep mounted before trimming. Keeps
// FlashList's `data` array (and the media it's holding onto) bounded during a
// long scroll session instead of growing forever, while still feeling
// instant in both directions around the user's current position.
const PREFETCH_AHEAD_COUNT = 6;
const KEEP_BEHIND_COUNT = 6;

function prefetchMemeMedia(meme) {
  if (!meme?.assets) return;
  for (const asset of meme.assets) {
    if (asset.asset_type === 'image' && asset.s3_url) {
      Image.prefetch(asset.s3_url).catch(() => {});
    }
  }
}

export default function MemesFeedScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  // Tab screens stay mounted in the background when the user switches tabs --
  // `focusedId` alone (scroll position within the list) doesn't change just
  // because the user left this tab, so video playback (and its audio) kept
  // going after navigating away. This tracks whether the Memes tab itself is
  // the active one, so playback can be forced off when it isn't.
  const isScreenFocused = useIsFocused();

  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focusedId, setFocusedId] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null);
  const [shareFor, setShareFor] = useState(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);

  const viewedIds = useRef(new Set());
  const prefetchedIds = useRef(new Set());
  const loadingRef = useRef(false);
  const memesRef = useRef(memes);
  const loadFeedRef = useRef(null);
  const listRef = useRef(null);
  const tokenRef = useRef(token);
  // Tracks which card is currently being timed and when that timing started,
  // so "time spent" (the ranking algorithm's dwell signal) can be measured
  // per card rather than just recording that it was seen at all.
  const dwellRef = useRef({ id: null, startedAt: 0 });

  useEffect(() => {
    memesRef.current = memes;
  }, [memes]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const flushDwell = useCallback(() => {
    const { id, startedAt } = dwellRef.current;
    dwellRef.current = { id: null, startedAt: 0 };
    if (!id || !startedAt) return;

    const elapsed = Date.now() - startedAt;
    // Ignore negligible durations (a quick flick past a card isn't a
    // meaningful "spent time here" signal, and avoids a network call per
    // fast-scroll frame).
    if (elapsed < 500) return;
    feedApi.recordViewDuration(id, elapsed, tokenRef.current).catch(() => {});
  }, []);

  // Leaving the tab (not just scrolling within it) should stop the clock --
  // otherwise time spent on another tab entirely would count as dwell time
  // on whatever card was focused when the user navigated away.
  useEffect(() => {
    if (!isScreenFocused) {
      flushDwell();
    } else if (focusedId && !dwellRef.current.id) {
      dwellRef.current = { id: focusedId, startedAt: Date.now() };
    }
  }, [isScreenFocused, focusedId, flushDwell]);

  useEffect(() => () => flushDwell(), [flushDwell]);

  const loadFeed = useCallback(async ({ append = false, isRefresh = false } = {}) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (append) setLoadingMore(true);
    else if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await feedApi.getFeed(20, token);
      const newMemes = res?.memes || [];
      setMemes(prev => (append ? [...prev, ...newMemes] : newMemes));
      if (!append) {
        setFocusedId(newMemes[0]?.id ?? null);
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
        });
      }
    } catch (e) {
      console.error('Failed to load meme feed:', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadFeedRef.current = loadFeed;
  }, [loadFeed]);

  // Skipped when a `memeId` deep link is present -- the effect below owns
  // loading in that case (shared meme first, then the rest of the feed).
  useEffect(() => {
    if (params?.memeId) return;
    loadFeed();
  }, [loadFeed, params?.memeId]);

  // Deep link from a shared meme in chat (MemeSharePreview.jsx): fetch that
  // exact meme and put it at the top of the list, instead of just opening
  // this tab at whatever random position it was last scrolled to -- tab
  // screens stay mounted across navigations, so a plain `router.push` here
  // would otherwise land on old feed state, not the shared post. Re-runs
  // whenever a new `memeId` comes in (e.g. tapping a different shared meme
  // while this tab is already mounted).
  useEffect(() => {
    const targetMemeId = params?.memeId;
    if (!targetMemeId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await feedApi.getMeme(targetMemeId, token);
        const targetMeme = res?.meme;
        if (!cancelled && targetMeme) {
          setMemes([targetMeme]);
          setFocusedId(targetMeme.id);
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
          });
        }
      } catch (e) {
        console.error('Failed to open shared meme:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (!cancelled) {
        await loadFeed({ append: true });
      }
    })();

    return () => { cancelled = true; };
  }, [params?.memeId, token, loadFeed]);

  // Double-tap the Memes tab icon to refresh. `tabPress` fires every time the
  // tab is pressed -- including while it's already the active tab -- on both
  // the JS tab bar (Android/web) and the native iOS tab bar (NativeTabs
  // explicitly documents `tabPress` as its one supported nav event), so this
  // works the same way on every platform without touching the tab bar itself.
  const navigation = useNavigation();
  const lastTabPressRef = useRef(0);
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      const now = Date.now();
      const isDoubleTap = now - lastTabPressRef.current < 350;
      lastTabPressRef.current = now;
      if (isDoubleTap && !loadingRef.current) {
        loadFeed({ isRefresh: true });
      }
    });
    return unsubscribe;
  }, [navigation, loadFeed]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length === 0) return;
    const top = viewableItems[0];
    if (!top?.item) return;

    setFocusedId(top.item.id);

    if (dwellRef.current.id !== top.item.id) {
      flushDwell();
      dwellRef.current = { id: top.item.id, startedAt: Date.now() };
    }

    if (!viewedIds.current.has(top.item.id)) {
      viewedIds.current.add(top.item.id);
      feedApi.recordView(top.item.id, token).catch(() => {});
    }

    const currentMemes = memesRef.current;
    const index = top.index ?? currentMemes.findIndex(m => m.id === top.item.id);
    if (index < 0) return;

    // Warm the image cache for the next few cards so they're already loaded
    // by the time the user scrolls to them.
    for (let i = index + 1; i <= index + PREFETCH_AHEAD_COUNT && i < currentMemes.length; i++) {
      const meme = currentMemes[i];
      if (meme && !prefetchedIds.current.has(meme.id)) {
        prefetchedIds.current.add(meme.id);
        prefetchMemeMedia(meme);
      }
    }

    // Fetch the next page early, well before the user hits the physical end.
    if (currentMemes.length - index <= PREFETCH_AHEAD_COUNT && !loadingRef.current) {
      loadFeedRef.current?.({ append: true });
    }

    // Rolling trim: drop cards well behind the current position so the list
    // (and any media/players it's still holding onto) doesn't grow unbounded
    // over a long scroll session. FlashList v2 maintains scroll position
    // automatically when items are removed from the front.
    if (index > KEEP_BEHIND_COUNT) {
      const trimCount = index - KEEP_BEHIND_COUNT;
      setMemes(prev => (prev.length > trimCount ? prev.slice(trimCount) : prev));
    }
  }).current;

  const handleLike = useCallback((meme) => {
    const wasLiked = meme.liked_by_me;
    setMemes(prev => prev.map(m => m.id === meme.id
      ? { ...m, liked_by_me: !wasLiked, like_count: m.like_count + (wasLiked ? -1 : 1) }
      : m
    ));

    const call = wasLiked ? feedApi.unlike(meme.id, token) : feedApi.like(meme.id, token);
    call.catch(() => {
      // revert optimistic update on failure
      setMemes(prev => prev.map(m => m.id === meme.id
        ? { ...m, liked_by_me: wasLiked, like_count: meme.like_count }
        : m
      ));
    });
  }, [token]);

  const handleEndReached = useCallback(() => {
    if (!loadingRef.current) loadFeed({ append: true });
  }, [loadFeed]);

  const handleCommentPosted = useCallback((memeId) => {
    setMemes(prev => prev.map(m => m.id === memeId ? { ...m, comment_count: m.comment_count + 1 } : m));
  }, []);

  const handleCommentDeleted = useCallback((memeId) => {
    setMemes(prev => prev.map(m => m.id === memeId ? { ...m, comment_count: Math.max(0, m.comment_count - 1) } : m));
  }, []);

  if (cardHeight === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: '#000' }]}
        onLayout={(e) => {
          setCardHeight(e.nativeEvent.layout.height);
          setCardWidth(e.nativeEvent.layout.width);
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" style={styles.centerLoader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.connectRequestsButton, { top: insets.top + 8 }]}
        onPress={() => router.push('/secure/(tabs)/memes/connect-requests')}
      >
        <Ionicons name="people-circle-outline" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {loading ? (
        <View style={[styles.centerLoader, styles.fill]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : memes.length === 0 ? (
        <View style={[styles.centerLoader, styles.fill]}>
          <Text style={styles.emptyText}>No memes yet. Check back soon!</Text>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={memes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemeCard
              item={item}
              isFocused={isScreenFocused && item.id === focusedId}
              height={cardHeight}
              width={cardWidth}
              bottomInset={insets.bottom}
              onLike={() => handleLike(item)}
              onOpenComments={() => setCommentsFor(item)}
              onShare={() => setShareFor(item.id)}
            />
          )}
          estimatedItemSize={cardHeight}
          refreshing={refreshing}
          onRefresh={() => loadFeed({ isRefresh: true })}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onEndReached={handleEndReached}
          onEndReachedThreshold={2}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : null}
        />
      )}

      {commentsFor ? (
        <CommentsSheet
          visible
          meme={commentsFor}
          onClose={() => setCommentsFor(null)}
          onCommentPosted={() => handleCommentPosted(commentsFor.id)}
          onCommentDeleted={() => handleCommentDeleted(commentsFor.id)}
        />
      ) : null}

      {shareFor ? (
        <SharePickerModal
          visible
          memeId={shareFor}
          onClose={() => setShareFor(null)}
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
  connectRequestsButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  fill: {
    flex: 1,
  },
  centerLoader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
