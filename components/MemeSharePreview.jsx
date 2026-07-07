import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { feedApi } from '@/src/api/feed';

/**
 * Compact preview card rendered in place of a chat message's text when
 * `shared_meme_id` is set. Tapping deep-links into the Memes tab with this
 * meme's id as a route param -- the feed screen fetches it directly and
 * prepends it to the top of the list, rather than just opening the tab at
 * whatever random position it was last scrolled to.
 */
export default function MemeSharePreview({ memeId }) {
  const { token } = useAuth();
  const router = useRouter();
  const [meme, setMeme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
  }, [memeId]);

  if (loading) {
    return (
      <View style={[styles.card, styles.center]}>
        <ActivityIndicator size="small" color="#7C2B86" />
      </View>
    );
  }

  if (!meme) {
    return (
      <View style={[styles.card, styles.center]}>
        <Text style={styles.unavailableText}>Meme no longer available</Text>
      </View>
    );
  }

  const thumbAsset = meme.assets.find(a => a.asset_type === 'image' || a.asset_type === 'thumbnail');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/secure/(tabs)/memes', params: { memeId } })}
    >
      {thumbAsset ? (
        <Image source={{ uri: thumbAsset.s3_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.center]}>
          <Ionicons name="image-outline" size={20} color="#999" />
        </View>
      )}
      <View style={styles.textCol}>
        <Text style={styles.label}>Shared a meme</Text>
        {meme.caption ? (
          <Text style={styles.caption} numberOfLines={2}>{meme.caption}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    padding: 8,
    gap: 10,
    minWidth: 180,
    maxWidth: 240,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EEE',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C2B86',
  },
  caption: {
    fontSize: 12,
    color: '#444',
    marginTop: 2,
  },
  unavailableText: {
    fontSize: 12,
    color: '#999',
    padding: 8,
  },
});
