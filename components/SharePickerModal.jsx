import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { friendsApi } from '@/src/api/friends';
import { feedApi } from '@/src/api/feed';
import AnonymousAvatar from '@/components/AnonymousAvatar';

const GRID_COLUMNS = 3;

export default function SharePickerModal({ visible, memeId, onClose }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]); // [{ key, label, chatId?, friendId? }]
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTargets();
      setSearch('');
      setSelectedKeys(new Set());
    }
  }, [visible]);

  const loadTargets = async () => {
    try {
      setLoading(true);
      const [friendsRes, connectRes] = await Promise.all([
        friendsApi.getFriendsList(token),
        feedApi.getConnectRequests(token),
      ]);

      const friendTargets = (friendsRes?.friends || []).map(f => ({
        key: `friend-${f.id}`,
        label: f.name || 'Friend',
        friendId: f.id,
        // Existing 1:1 chat if there is one (friends.routes.ts's /list
        // already resolves this) -- needed both to skip re-creating a chat on
        // send and to look up this contact's share count below.
        chatId: f.chat_id || null,
        // Friends aren't anonymous, so their real (unblurred) photo is fine here.
        photoUrl: f.profile_photo_url || null,
      }));

      const acceptedRequests = [
        ...(connectRes?.incoming || []),
        ...(connectRes?.outgoing || []),
      ].filter(r => r.status === 'accepted' && r.chat_id);

      const connectTargets = acceptedRequests.map(r => ({
        key: `chat-${r.chat_id}`,
        label: 'Anonymous connection',
        chatId: r.chat_id,
        isAnonymous: true,
        // Server-side-blurred version of the other party's real photo (see
        // anonAvatar.service.ts) -- null if they have no photo, in which case
        // we fall back to the synthetic AnonymousAvatar below.
        photoUrl: r.avatar || null,
      }));

      const allTargets = [...friendTargets, ...connectTargets];

      // Sort by how many memes have been shared with each contact so far --
      // the person you share memes with most floats to the top instead of a
      // fixed friends-then-connections order.
      const chatIds = allTargets.map(t => t.chatId).filter(Boolean);
      let counts = {};
      if (chatIds.length > 0) {
        try {
          const countsRes = await feedApi.getShareCounts(chatIds, token);
          counts = countsRes?.counts || {};
        } catch (e) {
          console.error('Failed to load share counts:', e);
        }
      }
      const withCounts = allTargets.map(t => ({ ...t, shareCount: (t.chatId && counts[t.chatId]) || 0 }));
      withCounts.sort((a, b) => b.shareCount - a.shareCount);

      setTargets(withCounts);
    } catch (e) {
      console.error('Failed to load share targets:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTargets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(t => t.label.toLowerCase().includes(q));
  }, [targets, search]);

  const toggleSelected = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSend = async () => {
    if (sending || selectedKeys.size === 0) return;
    setSending(true);

    const selectedTargets = targets.filter(t => selectedKeys.has(t.key));
    const results = await Promise.allSettled(selectedTargets.map(async (target) => {
      let chatId = target.chatId;
      if (!chatId && target.friendId) {
        const chatApi = (await import('@/src/api/chat')).chatApi;
        const res = await chatApi.createChatWithUser(target.friendId, token);
        chatId = res?.chat?.id;
      }
      if (!chatId) throw new Error('Could not resolve chat');
      await feedApi.shareMeme(memeId, chatId, token);
    }));

    setSending(false);

    const failedCount = results.filter(r => r.status === 'rejected').length;
    if (failedCount > 0) {
      console.error('Failed to share meme with some targets:', results.filter(r => r.status === 'rejected'));
      Alert.alert(
        'Error',
        failedCount === selectedTargets.length
          ? 'Failed to share. Please try again.'
          : `Sent to ${selectedTargets.length - failedCount} of ${selectedTargets.length}. Some failed -- please try again.`
      );
      if (failedCount === selectedTargets.length) return;
    }

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Share to</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="small" color="#7C2B86" />
            </View>
          ) : (
            <FlatList
              data={filteredTargets}
              key={GRID_COLUMNS}
              numColumns={GRID_COLUMNS}
              keyExtractor={(item) => item.key}
              style={styles.grid}
              contentContainerStyle={styles.gridContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {targets.length === 0 ? 'No friends or connections yet to share with.' : 'No matches.'}
                </Text>
              }
              renderItem={({ item }) => {
                const isSelected = selectedKeys.has(item.key);
                return (
                  <TouchableOpacity
                    style={styles.cell}
                    onPress={() => toggleSelected(item.key)}
                    disabled={sending}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatarWrap, isSelected && styles.avatarWrapSelected]}>
                      {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
                      ) : item.isAnonymous ? (
                        <AnonymousAvatar seed={item.chatId} size={64} shape="square" />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={26} color="#7C2B86" />
                        </View>
                      )}
                      {isSelected ? (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cellLabel} numberOfLines={1}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.sendButton, selectedKeys.size === 0 && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={selectedKeys.size === 0 || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>
                  {selectedKeys.size > 0 ? `Send (${selectedKeys.size})` : 'Send'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    height: '68%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    height: '100%',
  },
  centerLoader: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  grid: {
    flex: 1,
    marginTop: 8,
  },
  gridContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 24,
    width: '100%',
  },
  cell: {
    flex: 1 / GRID_COLUMNS,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  avatarWrap: {
    width: 64,
    height: 64,
  },
  avatarWrapSelected: {
    opacity: 0.85,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F0E4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
  },
  checkBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7C2B86',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 76,
  },
  // Fixed (not safe-area-derived) bottom padding, matching CommentsSheet.jsx's
  // input row exactly -- useSafeAreaInsets() in this Modal inherits the tab
  // bar's bottom inset from the underlying Memes screen context, which is
  // much larger than the actual home-indicator-only space needed here.
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sendButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: '#7C2B86',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCB8D1',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
