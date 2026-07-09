import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import Loader from '@/components/Loader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getSocket } from '@/src/api/socket';
import { feedApi } from '@/src/api/feed';

// Same brand chrome as the rest of the secure app (notifications, chat list)
// so this reads as part of one design system rather than a bolted-on screen.
const BRAND_GRADIENT = ['#7C2B86', '#5D5FEF'];

function AnonAvatar({ uri, size = 52 }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Ionicons name="person" size={size * 0.5} color="#FFFFFF" />
    </View>
  );
}

function StatusPill({ status, theme }) {
  const config = {
    pending: { label: 'Pending', bg: theme.primaryLight, color: theme.primary },
    declined: { label: 'Declined', bg: theme.error + '1A', color: theme.error },
  }[status] || { label: status, bg: theme.border, color: theme.textMuted };

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Text style={[styles.pillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

export default function ConnectRequestsScreen() {
  const { token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await feedApi.getConnectRequests(token);
      // Accepted requests now live in the chat list's Blind Connect tab, not
      // here -- showing them in both places would be confusing about where
      // "the real" version of the connection lives.
      setIncoming((res?.incoming || []).filter(r => r.status !== 'accepted'));
      setOutgoing((res?.outgoing || []).filter(r => r.status !== 'accepted'));
    } catch (e) {
      console.error('Failed to load connect requests:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates: a new request arriving, or one of mine getting responded
  // to, refreshes this screen instantly instead of needing a manual pull.
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    const onChanged = () => load();
    socket.on('meme_connect:request_created', onChanged);
    socket.on('meme_connect:responded', onChanged);

    return () => {
      socket.off('meme_connect:request_created', onChanged);
      socket.off('meme_connect:responded', onChanged);
    };
  }, [token, load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleRespond = async (request, accept) => {
    if (respondingId) return;
    try {
      setRespondingId(request.id);
      const res = await feedApi.respondToConnectRequest(request.id, accept, token);

      if (accept && res?.request?.chat_id) {
        router.push({
          pathname: '/secure/chat-conversation',
          params: {
            id: res.request.chat_id,
            // Same masked-initials style as blind-connect chats (e.g.
            // "A***** S*******"), not a fixed "Anonymous connection" label.
            name: res.request.maskedName || 'Anonymous',
            avatar: request.avatar || '',
            isMemeConnect: 'true',
          },
        });
      }

      await load();
    } catch (e) {
      console.error('Failed to respond to connect request:', e);
    } finally {
      setRespondingId(null);
    }
  };

  const renderCard = (item, kind) => {
    const isPending = item.status === 'pending';
    return (
      <View
        key={item.id}
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor },
        ]}
      >
        <AnonAvatar uri={item.avatar} />
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {kind === 'incoming' ? 'Someone wants to connect' : 'Your connect request'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {kind === 'incoming' ? 'From a comment you posted' : 'Waiting for them to respond'}
          </Text>
          <View style={styles.cardFooter}>
            <StatusPill status={item.status} theme={theme} />
            {kind === 'incoming' && isPending && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => handleRespond(item, false)}
                  disabled={respondingId === item.id}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: theme.primary }]}
                  onPress={() => handleRespond(item, true)}
                  disabled={respondingId === item.id}
                  activeOpacity={0.8}
                >
                  {respondingId === item.id ? (
                    <Loader size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Accept</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = (text) => (
    <View style={styles.emptyBox}>
      <Ionicons name="people-circle-outline" size={28} color={theme.textMuted} />
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>{text}</Text>
    </View>
  );

  const headerTopPadding = (insets.top || (Platform.OS === 'android' ? 24 : 0)) + (Platform.OS === 'web' ? 20 : 12);
  const totalCount = incoming.length + outgoing.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={BRAND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: headerTopPadding }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Connect Requests</Text>
            <Text style={styles.headerSubtitle}>
              {totalCount} pending{totalCount !== 1 ? '' : ''}
            </Text>
          </View>
          <View style={styles.headerIconButton} />
        </View>
      </LinearGradient>

      <View style={styles.sheetShadowWrap}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          {loading ? (
            <View style={styles.centerLoader}>
              <Loader size={36} color={theme.primary} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[theme.primary]}
                  tintColor={theme.primary}
                />
              }
            >
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Incoming</Text>
              {incoming.length === 0
                ? renderEmpty('No incoming requests right now.')
                : incoming.map(item => renderCard(item, 'incoming'))}

              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Sent</Text>
              {outgoing.length === 0
                ? renderEmpty('No requests sent yet.')
                : outgoing.map(item => renderCard(item, 'outgoing'))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#3D1240',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    zIndex: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  sheetShadowWrap: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 10,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C2B86',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
  },
  acceptBtn: {
    borderWidth: 0,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
