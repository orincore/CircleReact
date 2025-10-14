import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Media Cache Service
 * Caches media URLs, thumbnails, and metadata to avoid repeated S3 API calls
 */
class MediaCacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cachePrefix = 'media_cache_';
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.maxMemoryCacheSize = 100; // Maximum items in memory cache
  }

  /**
   * Generate cache key for media item
   */
  generateCacheKey(messageId, mediaType = 'media') {
    return `${this.cachePrefix}${messageId}_${mediaType}`;
  }

  /**
   * Get cached media data
   */
  async getCachedMedia(messageId, mediaType = 'media') {
    try {
      const cacheKey = this.generateCacheKey(messageId, mediaType);
      
      // Check memory cache first (fastest)
      if (this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey);
        if (this.isValidCache(cached)) {
          //console.log('📱 Media cache HIT (memory):', messageId);
          return cached.data;
        } else {
          // Remove expired item from memory
          this.memoryCache.delete(cacheKey);
        }
      }

      // Check persistent storage
      const cachedString = await AsyncStorage.getItem(cacheKey);
      if (cachedString) {
        const cached = JSON.parse(cachedString);
        if (this.isValidCache(cached)) {
          //console.log('💾 Media cache HIT (storage):', messageId);
          // Add back to memory cache for faster access
          this.addToMemoryCache(cacheKey, cached);
          return cached.data;
        } else {
          // Remove expired item from storage
          await AsyncStorage.removeItem(cacheKey);
        }
      }

      //console.log('❌ Media cache MISS:', messageId);
      return null;
    } catch (error) {
      console.error('Error getting cached media:', error);
      return null;
    }
  }

  /**
   * Cache media data
   */
  async cacheMedia(messageId, mediaData, ttl = this.defaultTTL) {
    try {
      const cacheKey = this.generateCacheKey(messageId, 'media');
      const cacheItem = {
        data: {
          mediaUrl: mediaData.mediaUrl,
          mediaType: mediaData.mediaType,
          thumbnail: mediaData.thumbnail,
          fileName: mediaData.fileName,
          fileSize: mediaData.fileSize,
          dimensions: mediaData.dimensions
        },
        timestamp: Date.now(),
        ttl: ttl,
        messageId: messageId
      };

      // Store in memory cache
      this.addToMemoryCache(cacheKey, cacheItem);

      // Store in persistent storage
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      
      //console.log('✅ Media cached successfully:', messageId);
    } catch (error) {
      console.error('Error caching media:', error);
    }
  }

  /**
   * Cache thumbnail separately (for video thumbnails)
   */
  async cacheThumbnail(messageId, thumbnailUrl, ttl = this.defaultTTL) {
    try {
      const cacheKey = this.generateCacheKey(messageId, 'thumbnail');
      const cacheItem = {
        data: { thumbnailUrl },
        timestamp: Date.now(),
        ttl: ttl,
        messageId: messageId
      };

      this.addToMemoryCache(cacheKey, cacheItem);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      
      //console.log('🖼️ Thumbnail cached successfully:', messageId);
    } catch (error) {
      console.error('Error caching thumbnail:', error);
    }
  }

  /**
   * Get cached thumbnail
   */
  async getCachedThumbnail(messageId) {
    const cached = await this.getCachedMedia(messageId, 'thumbnail');
    return cached?.thumbnailUrl || null;
  }

  /**
   * Check if cached item is still valid
   */
  isValidCache(cacheItem) {
    if (!cacheItem || !cacheItem.timestamp || !cacheItem.ttl) {
      return false;
    }
    
    const now = Date.now();
    const expiryTime = cacheItem.timestamp + cacheItem.ttl;
    return now < expiryTime;
  }

  /**
   * Add item to memory cache with size limit
   */
  addToMemoryCache(key, item) {
    // Remove oldest items if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, item);
  }

  /**
   * Preload media for chat messages
   */
  async preloadChatMedia(messages) {
    const mediaMessages = messages.filter(msg => msg.mediaUrl && msg.mediaType);
    
    for (const message of mediaMessages) {
      const cached = await this.getCachedMedia(message.id);
      if (!cached) {
        // Cache the media data we already have
        await this.cacheMedia(message.id, {
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
          thumbnail: message.thumbnail
        });
      }
    }
    
    //console.log(`📦 Preloaded ${mediaMessages.length} media items for chat`);
  }

  /**
   * Clear expired cache items
   */
  async clearExpiredCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mediaCacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      let clearedCount = 0;
      for (const key of mediaCacheKeys) {
        const cachedString = await AsyncStorage.getItem(key);
        if (cachedString) {
          const cached = JSON.parse(cachedString);
          if (!this.isValidCache(cached)) {
            await AsyncStorage.removeItem(key);
            this.memoryCache.delete(key);
            clearedCount++;
          }
        }
      }
      
      //console.log(`🧹 Cleared ${clearedCount} expired media cache items`);
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Clear all media cache
   */
  async clearAllCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mediaCacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      await AsyncStorage.multiRemove(mediaCacheKeys);
      this.memoryCache.clear();
      
      //console.log(`🗑️ Cleared all media cache (${mediaCacheKeys.length} items)`);
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mediaCacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      let totalSize = 0;
      let validItems = 0;
      let expiredItems = 0;
      
      for (const key of mediaCacheKeys) {
        const cachedString = await AsyncStorage.getItem(key);
        if (cachedString) {
          totalSize += cachedString.length;
          const cached = JSON.parse(cachedString);
          if (this.isValidCache(cached)) {
            validItems++;
          } else {
            expiredItems++;
          }
        }
      }
      
      return {
        totalItems: mediaCacheKeys.length,
        validItems,
        expiredItems,
        memoryItems: this.memoryCache.size,
        estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Initialize cache service
   */
  async initialize() {
    try {
      // Clear expired items on startup
      await this.clearExpiredCache();
      
      const stats = await this.getCacheStats();
      //console.log('📊 Media cache initialized:', stats);
    } catch (error) {
      console.error('Error initializing media cache:', error);
    }
  }
}

// Export singleton instance
export default new MediaCacheService();
