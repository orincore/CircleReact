import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Loader from '@/components/Loader';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/contexts/AuthContext';
import { feedApi } from '@/src/api/feed';
import AnonymousAvatar from '@/components/AnonymousAvatar';

const SWIPE_DELETE_THRESHOLD = 70;

/** Swipe left or right past the threshold to delete -- own comments/replies
 * only. Same gesture shape as SwipeableMessage (chat-conversation.jsx): a Pan
 * gesture driving a translateX Animated.Value, spring back on release either
 * way, fire the callback once the threshold is crossed. */
function SwipeToDelete({ children, canDelete, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const hasTriggered = useRef(false);

  // Gesture callbacks run as UI-thread worklets under the new Gesture
  // Handler/Reanimated architecture -- they can't touch a plain (non-shared)
  // Animated.Value or call an arbitrary JS function directly (see
  // SwipeableMessage in chat-conversation.jsx, which this mirrors exactly).
  // Every plain-JS side effect below is wrapped in runOnJS(...)().
  const resetTriggerFlag = useCallback(() => {
    hasTriggered.current = false;
  }, []);

  const updatePosition = useCallback((translationX) => {
    translateX.setValue(translationX);
  }, [translateX]);

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
  }, [translateX]);

  const handleGestureEnd = useCallback((translationX) => {
    if (!hasTriggered.current && Math.abs(translationX) >= SWIPE_DELETE_THRESHOLD) {
      hasTriggered.current = true;
      onDelete();
    }
    resetPosition();
  }, [onDelete, resetPosition]);

  const pan = Gesture.Pan()
    .enabled(canDelete)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .minDistance(10)
    .onStart(() => {
      'worklet';
      runOnJS(resetTriggerFlag)();
    })
    .onUpdate((e) => {
      'worklet';
      runOnJS(updatePosition)(e.translationX);
    })
    .onEnd((e) => {
      'worklet';
      runOnJS(handleGestureEnd)(e.translationX);
    });

  if (!canDelete) {
    return <>{children}</>;
  }

  // Two separate icons pinned to each edge (not one centered-across-the-row
  // backdrop -- that read as floating above the comment's text instead of at
  // a side). Same positioning trick as SwipeableMessage's reply icons
  // (chat-conversation.jsx): fixed-size circle, `top:'50%'` + negative
  // marginTop to center vertically regardless of row height, `left`/`right`
  // pinned near the edge. Swiping right (positive translateX) uncovers the
  // left edge, so the left icon is the one that should fade in there.
  const leftIconOpacity = translateX.interpolate({
    inputRange: [0, 20, SWIPE_DELETE_THRESHOLD],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const rightIconOpacity = translateX.interpolate({
    inputRange: [-SWIPE_DELETE_THRESHOLD, -20, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  return (
    <View>
      <Animated.View style={[styles.deleteIconContainer, styles.deleteIconLeft, { opacity: leftIconOpacity }]} pointerEvents="none">
        <View style={styles.deleteIconCircle}>
          <Ionicons name="trash" size={16} color="#FFFFFF" />
        </View>
      </Animated.View>
      <Animated.View style={[styles.deleteIconContainer, styles.deleteIconRight, { opacity: rightIconOpacity }]} pointerEvents="none">
        <View style={styles.deleteIconCircle}>
          <Ionicons name="trash" size={16} color="#FFFFFF" />
        </View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={{ transform: [{ translateX }], backgroundColor: '#FFFFFF' }}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// Instagram-style compact relative time ("now", "5m", "2h", "3d", "4w").
function formatCommentTime(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(dateString).toLocaleDateString();
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** One comment or reply row -- avatar, alias, text, meta row (time + Reply
 * link), wrapped in swipe-to-delete when it's the viewer's own. Shared
 * between top-level comments and their nested replies (indented via
 * `isReply`) so the two never drift out of sync visually. */
function CommentContent({ comment, isReply, onAliasPress, onReply, onDelete }) {
  const isDeleted = comment.status === 'deleted';

  return (
    <SwipeToDelete canDelete={comment.is_own && !isDeleted} onDelete={() => onDelete(comment)}>
      <View style={[styles.commentRow, isReply && styles.replyRow]}>
        {comment.avatar ? (
          <Image source={{ uri: comment.avatar }} style={[styles.avatarImage, isReply && styles.avatarImageSmall]} />
        ) : (
          <AnonymousAvatar seed={comment.alias} size={isReply ? 28 : 36} shape="square" />
        )}
        <View style={styles.commentBody}>
          <Text style={styles.commentLine}>
            {comment.is_own || isDeleted ? (
              <Text style={styles.alias}>{comment.alias} </Text>
            ) : (
              <Text style={styles.alias} onPress={() => onAliasPress(comment)}>
                {comment.alias}{' '}
              </Text>
            )}
            <Text style={[styles.commentText, isDeleted && styles.deletedText]}>
              {isDeleted ? 'Comment deleted' : comment.text}
            </Text>
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatCommentTime(comment.created_at)}</Text>
            {comment.is_own ? <Text style={styles.metaText}>You</Text> : null}
            {!isDeleted && (
              <Text style={styles.metaText} onPress={() => onReply(comment)}>Reply</Text>
            )}
          </View>
        </View>
      </View>
    </SwipeToDelete>
  );
}

export default function CommentsSheet({ visible, meme, onClose, onCommentPosted, onCommentDeleted }) {
  const { token } = useAuth();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, alias }
  const [expandedReplies, setExpandedReplies] = useState({}); // commentId -> bool
  const inputRef = useRef(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // The actual on-screen keyboard height (px), used to push the input row up
  // by exactly that much -- see the comment on the keyboard-listener effect
  // below for why this replaced KeyboardAvoidingView.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Whether the user has dragged the sheet open to full screen -- separate
  // from `keyboardVisible` so that closing the keyboard restores whichever
  // of these two the user had actually chosen, rather than always collapsing.
  const [expanded, setExpanded] = useState(false);

  // Collapsed = the sheet's normal resting height. Full = dragged open (or
  // forced open while typing) almost to the top, leaving a small peek of the
  // meme behind it like a real full-screen sheet rather than covering the
  // status bar entirely.
  const collapsedHeight = screenHeight * 0.6;
  const fullHeight = screenHeight - insets.top - 12;

  // PanResponder is created once (via useRef) and its callbacks close over
  // these -- keep the latest values in a ref so the drag math and onClose
  // call always use current numbers/props instead of the ones from mount.
  const liveRef = useRef({ collapsedHeight, fullHeight, onClose });
  liveRef.current = { collapsedHeight, fullHeight, onClose };

  const sheetHeight = useRef(new Animated.Value(collapsedHeight)).current;
  const dragStartHeightRef = useRef(collapsedHeight);

  const animateTo = (toValue) => {
    Animated.spring(sheetHeight, {
      toValue,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  // Sheet height always reflects "expanded (dragged open) OR typing" --
  // whichever is true wins, so finishing typing restores the pre-typing
  // expanded/collapsed state instead of always snapping back down.
  useEffect(() => {
    animateTo(expanded || keyboardVisible ? fullHeight : collapsedHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, keyboardVisible, fullHeight, collapsedHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation((value) => {
          dragStartHeightRef.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const { collapsedHeight: collapsed, fullHeight: full } = liveRef.current;
        const nextHeight = clamp(dragStartHeightRef.current - gestureState.dy, collapsed * 0.35, full);
        sheetHeight.setValue(nextHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { collapsedHeight: collapsed, fullHeight: full, onClose: close } = liveRef.current;
        const draggedHeight = clamp(dragStartHeightRef.current - gestureState.dy, collapsed * 0.35, full);

        if (draggedHeight < collapsed * 0.5 && gestureState.dy > 0) {
          close?.();
          return;
        }

        const midpoint = (collapsed + full) / 2;
        const shouldExpand = gestureState.vy < -0.5 || draggedHeight > midpoint;
        setExpanded(shouldExpand);
      },
    })
  ).current;

  useEffect(() => {
    if (visible && meme?.id) {
      loadComments();
    }
    if (visible) {
      setExpanded(false);
      setReplyingTo(null);
      setExpandedReplies({});
    }
  }, [visible, meme?.id]);

  // Grow the sheet while typing -- otherwise the keyboard eats into the same
  // fixed box, leaving almost no room to see the comment list (or the
  // comment you just posted) above the keyboard.
  //
  // The input row's own bottom padding is pushed up by the *real* keyboard
  // height from this same event, instead of using KeyboardAvoidingView.
  // KeyboardAvoidingView measures its own distance to the keyboard assuming a
  // stable layout, but this sheet's height is simultaneously animating (via
  // `sheetHeight` above) in response to the very same keyboard-show event --
  // the two animations raced, and KeyboardAvoidingView sometimes measured
  // against a stale (pre-grow) height, under-padding enough that the input
  // row ended up hidden behind the keyboard entirely. Driving the padding
  // directly off the keyboard's own reported height sidesteps that race.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadComments = async () => {
    try {
      setLoading(true);
      const res = await feedApi.getComments(meme.id, 50, 0, token);
      setComments(res?.comments || []);
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;

    try {
      setPosting(true);
      const res = await feedApi.postComment(meme.id, trimmed, replyingTo?.commentId || null, token);
      const newComment = res?.comment;
      if (newComment) {
        if (newComment.parent_comment_id) {
          // A reply -- nest it under its top-level parent instead of the root list.
          setComments(prev => prev.map(c => c.id === newComment.parent_comment_id
            ? { ...c, replies: [...(c.replies || []), newComment] }
            : c
          ));
          setExpandedReplies(prev => ({ ...prev, [newComment.parent_comment_id]: true }));
        } else {
          setComments(prev => [{ ...newComment, replies: [] }, ...prev]);
        }
        onCommentPosted?.();
      }
      setText('');
      setReplyingTo(null);
      // Dismiss the keyboard so the newly-posted comment (prepended at the
      // top of the list) is immediately visible instead of hidden behind it.
      Keyboard.dismiss();
    } catch (e) {
      console.error('Failed to post comment:', e);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleReply = (comment) => {
    setReplyingTo({ commentId: comment.id, alias: comment.alias });
    inputRef.current?.focus();
  };

  const handleDelete = (comment) => {
    Alert.alert(
      'Delete comment?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await feedApi.deleteComment(meme.id, comment.id, token);
              setComments(prev => prev.map(c => {
                if (c.id === comment.id) return { ...c, status: 'deleted', text: null };
                if (c.replies?.some(r => r.id === comment.id)) {
                  return {
                    ...c,
                    replies: c.replies.map(r => r.id === comment.id ? { ...r, status: 'deleted', text: null } : r),
                  };
                }
                return c;
              }));
              onCommentDeleted?.();
            } catch (e) {
              console.error('Failed to delete comment:', e);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleConnectRequest = (comment) => {
    if (comment.is_own) return;

    Alert.alert(
      `Connect with ${comment.alias}?`,
      'Sends a request to connect. If accepted, you can chat -- your real identities stay hidden until you both choose to reveal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send request',
          onPress: async () => {
            try {
              await feedApi.createConnectRequest(comment.id, token);
              Alert.alert('Request sent', `A connect request was sent to ${comment.alias}.`);
            } catch (e) {
              // You already revealed identities with this person on a past
              // meme -- there's no anonymous cycle left to start, so just
              // offer to open the chat you already have instead of a
              // dead-end error.
              if (e?.details?.alreadyConnected && e.details.chat_id) {
                Alert.alert(
                  'Already connected',
                  'You already know this person from a previous connect. Want to open your chat with them?',
                  [
                    { text: 'Not now', style: 'cancel' },
                    { text: 'Open chat', onPress: () => { onClose?.(); router.push(`/secure/chat-conversation?id=${e.details.chat_id}`); } },
                  ]
                );
                return;
              }
              const message = e?.message || 'Failed to send connect request.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
          <View {...panResponder.panHandlers} style={styles.dragHandleZone}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.keyboardAvoider}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Comments</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerLoader}>
                <Loader size={16} color="#7C2B86" />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>No comments yet. Say something!</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const replies = item.replies || [];
                  const isExpanded = !!expandedReplies[item.id];
                  const visibleReplies = isExpanded ? replies : [];
                  const hiddenCount = replies.length - visibleReplies.length;

                  return (
                    <View>
                      <CommentContent
                        comment={item}
                        onAliasPress={handleConnectRequest}
                        onReply={handleReply}
                        onDelete={handleDelete}
                      />
                      {visibleReplies.map(reply => (
                        <CommentContent
                          key={reply.id}
                          comment={reply}
                          isReply
                          onAliasPress={handleConnectRequest}
                          onReply={handleReply}
                          onDelete={handleDelete}
                        />
                      ))}
                      {hiddenCount > 0 && (
                        <TouchableOpacity
                          style={styles.viewRepliesButton}
                          onPress={() => setExpandedReplies(prev => ({ ...prev, [item.id]: true }))}
                        >
                          <View style={styles.repliesLine} />
                          <Text style={styles.viewRepliesText}>
                            View {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            )}

            {replyingTo && (
              <View style={styles.replyingBar}>
                <Text style={styles.replyingText}>Replying to {replyingTo.alias}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.inputRow, keyboardHeight > 0 && { paddingBottom: keyboardHeight + 8 }]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={replyingTo ? `Reply to ${replyingTo.alias}...` : 'Add a comment...'}
                placeholderTextColor="#999"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!text.trim() || posting) && styles.sendButtonDisabled]}
                onPress={handlePost}
                disabled={!text.trim() || posting}
              >
                <View style={styles.sendButtonInner}>
                  {posting ? (
                    <Loader size={16} color="#FFFFFF" />
                  ) : (
                    <Feather name="send" size={17} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  keyboardAvoider: {
    flex: 1,
  },
  // Dedicated drag target above the header (rather than the grabber bar
  // alone, which is too small to reliably grab) -- drag up to expand the
  // sheet to near-full-screen, down to collapse it, or down further/fast to
  // close it. `onStartShouldSetPanResponder`/`onMoveShouldSetPanResponder`
  // live on this zone only so it never intercepts the FlatList's scroll or
  // the close button's tap.
  dragHandleZone: {
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: 'center',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  centerLoader: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  // `flex: 1` so the list (not a gap after the input row) absorbs any extra
  // space when there are few/no comments -- without it the sheet's height
  // left a large empty white gap below the input box instead of the list
  // growing to fill it. `emptyWrap` (below) then centers the empty-state
  // message within that now-properly-filled space.
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  replyRow: {
    marginLeft: 40,
    marginBottom: 14,
  },
  commentBody: {
    flex: 1,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  avatarImageSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  commentLine: {
    fontSize: 14,
    lineHeight: 19,
  },
  alias: {
    fontWeight: '700',
    color: '#111',
  },
  commentText: {
    color: '#222',
  },
  deletedText: {
    color: '#AAA',
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  deleteIconContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    zIndex: 1,
  },
  deleteIconLeft: {
    left: 8,
  },
  deleteIconRight: {
    right: 8,
  },
  deleteIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 40,
    marginBottom: 12,
    gap: 8,
  },
  repliesLine: {
    width: 20,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#CCC',
  },
  viewRepliesText: {
    fontSize: 12.5,
    color: '#999',
    fontWeight: '600',
  },
  replyingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
  },
  replyingText: {
    fontSize: 12,
    color: '#7C2B86',
    fontWeight: '600',
  },
  // Fixed (not safe-area-derived) bottom padding: this sheet is a full-screen
  // Modal, and `useSafeAreaInsets()`'s bottom value here inherited the *tab
  // bar's* bottom inset from the underlying Memes screen context (same value
  // MemeCard uses to clear the tab bar -- see index.jsx/MemeCard.jsx), which
  // is much larger than the actual home-indicator-only space this modal
  // needs. The value here is a deliberate visual gap (not a safe-area
  // calculation) so the pill doesn't sit flush against the screen's rounded
  // bottom edge.
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendButtonInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
