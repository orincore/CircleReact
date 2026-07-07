import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { feedApi } from '@/src/api/feed';

const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Connected',
  declined: 'Declined',
  expired: 'Expired',
};

export default function ConnectRequestsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await feedApi.getConnectRequests(token);
      setIncoming(res?.incoming || []);
      setOutgoing(res?.outgoing || []);
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

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleRespond = async (request, accept) => {
    if (respondingId) return;
    try {
      setRespondingId(request.id);
      const res = await feedApi.respondToConnectRequest(request.id, accept, token);
      await load();

      if (accept && res?.request?.chat_id) {
        router.push({
          pathname: '/secure/chat-conversation',
          params: {
            id: res.request.chat_id,
            name: 'Anonymous connection',
            isMemeConnect: 'true',
          },
        });
      }
    } catch (e) {
      console.error('Failed to respond to connect request:', e);
    } finally {
      setRespondingId(null);
    }
  };

  const openChat = (request) => {
    if (!request.chat_id) return;
    router.push({
      pathname: '/secure/chat-conversation',
      params: {
        id: request.chat_id,
        name: 'Anonymous connection',
        isMemeConnect: 'true',
      },
    });
  };

  const renderIncoming = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Someone wants to connect</Text>
      <Text style={styles.cardStatus}>{STATUS_LABEL[item.status] || item.status}</Text>
      {item.status === 'pending' ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={() => handleRespond(item, false)}
            disabled={respondingId === item.id}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleRespond(item, true)}
            disabled={respondingId === item.id}
          >
            {respondingId === item.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.acceptText}>Accept</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : item.status === 'accepted' ? (
        <TouchableOpacity style={styles.openChatBtn} onPress={() => openChat(item)}>
          <Text style={styles.openChatText}>Open chat</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderOutgoing = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your connect request</Text>
      <Text style={styles.cardStatus}>{STATUS_LABEL[item.status] || item.status}</Text>
      {item.status === 'accepted' ? (
        <TouchableOpacity style={styles.openChatBtn} onPress={() => openChat(item)}>
          <Text style={styles.openChatText}>Open chat</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connect Requests</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#7C2B86" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <Text style={styles.sectionTitle}>Incoming</Text>
          {incoming.length === 0 ? (
            <Text style={styles.emptyText}>No incoming requests.</Text>
          ) : (
            incoming.map(item => <View key={item.id}>{renderIncoming({ item })}</View>)
          )}

          <Text style={styles.sectionTitle}>Sent</Text>
          {outgoing.length === 0 ? (
            <Text style={styles.emptyText}>No sent requests.</Text>
          ) : (
            outgoing.map(item => <View key={item.id}>{renderOutgoing({ item })}</View>)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 13,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#F8F4FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  cardStatus: {
    fontSize: 12,
    color: '#7C2B86',
    marginTop: 2,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: '#F0F0F0',
  },
  acceptBtn: {
    backgroundColor: '#7C2B86',
  },
  declineText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  openChatBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  openChatText: {
    color: '#7C2B86',
    fontWeight: '700',
    fontSize: 13,
  },
});
