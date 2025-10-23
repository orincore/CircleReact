import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { announcementsApi, } from '@/src/api/announcements';
import { useAuth } from '@/contexts/AuthContext';
import {
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';

export default function AnnouncementBanner({ placement = 'global' }) {
  const { token } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const autoSlideTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await announcementsApi.getActive(token, {
        placement,
        // audience and country typically derived on server from token profile; pass if known
        appVersion: Constants.expoConfig?.version || undefined,
      });
      let list = Array.isArray(resp?.announcements) ? resp.announcements : [];
      // Fallback: if nothing for this placement, try global fetch
      if ((!list || list.length === 0) && placement) {
        const respGlobal = await announcementsApi.getActive(token);
        const globalList = Array.isArray(respGlobal?.announcements) ? respGlobal.announcements : [];
        list = globalList;
      }
      // Trust server-side filtering for schedule/placement/audience
      setItems(list);
    } catch (e) {
      setItems([]);
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token, placement]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-slide functionality
  const startAutoSlide = useCallback(() => {
    if (items.length <= 1) return;
    
    autoSlideTimer.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % items.length;
        flatListRef.current?.scrollToIndex({ 
          index: nextIndex, 
          animated: true 
        });
        return nextIndex;
      });
    }, 4000); // Auto-slide every 4 seconds
  }, [items.length]);

  const stopAutoSlide = useCallback(() => {
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
      autoSlideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (items.length > 1) {
      startAutoSlide();
    }
    return () => stopAutoSlide();
  }, [items.length, startAutoSlide, stopAutoSlide]);

  const onScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setCurrentIndex(pageNum);
  };

  const handleOpen = (url) => {
    if (!url) return;
    if (url.startsWith('/')) {
      try { router.push(url); } catch {}
      return;
    }
    if (Platform.OS === 'web') {
      try { window.open(url, '_blank'); } catch {}
    } else {
      try { Linking.openURL(url); } catch {}
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FFE8FF" />
        <Text style={styles.loadingText}>Loading announcements…</Text>
      </View>
    );
  }

  if (!items || items.length === 0) return null;

const heroHeight = Math.min(420, Math.max(200, Math.round(width * 9 / 16)));

  const renderAnnouncementItem = ({ item: a, index }) => {
    const hasImg = !!a?.imageUrl;
    return (
      <View key={a.id} style={[styles.heroWrapper, { width }]}>
        <View style={[styles.heroCard, { height: heroHeight }]}>
          {/* Background image (full visibility, letterboxed) */}
          {hasImg ? (
            <>
         <Image source={{ uri: a.imageUrl }} style={styles.heroImageCover} resizeMode="cover" />

              {/* Subtle gradient for text readability only */}
              <LinearGradient 
                colors={["transparent", "transparent", "rgba(0,0,0,0.4)"]} 
                style={styles.heroOverlay} 
              />
            </>
          ) : (
            <LinearGradient 
              colors={["#7C2B86", "#A16AE8", "#FF6FB5"]} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.heroBg} 
            />
          )}

          <View style={styles.heroContent}>
            {!!a?.title && (
              <Text style={styles.heroTitle} numberOfLines={1}>{a.title}</Text>
            )}
            <Text style={styles.heroMessage} numberOfLines={3}>{a?.message}</Text>

            <View style={styles.heroActions}>
              {Array.isArray(a?.buttons) && a.buttons.length > 0 ? (
                a.buttons.slice(0, 2).map((b, idx) => (
                  <TouchableOpacity key={idx} style={styles.ctaPrimary} onPress={() => handleOpen(b.url)} activeOpacity={0.92}>
                    <Text style={styles.ctaPrimaryText}>{b.label || 'Explore'}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#0B0A12" />
                  </TouchableOpacity>
                ))
              ) : a?.linkUrl ? (
                <TouchableOpacity style={styles.ctaPrimary} onPress={() => handleOpen(a.linkUrl)} activeOpacity={0.92}>
                  <Text style={styles.ctaPrimaryText}>Explore</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0B0A12" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderAnnouncementItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScrollBeginDrag={stopAutoSlide}
        onScrollEndDrag={startAutoSlide}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />
      
      {/* Pagination dots */}
      {items.length > 1 && (
        <View style={styles.paginationContainer}>
          {items.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  loadingText: {
    color: '#FFE8FF',
    fontSize: 13,
  },
  // Hero banner styles
  heroWrapper: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroCard: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageCover: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 10,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMessage: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFD6F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  ctaPrimaryText: {
    color: '#1F1147',
    fontWeight: '800',
    fontSize: 13,
  },
  // Pagination styles
  paginationContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
