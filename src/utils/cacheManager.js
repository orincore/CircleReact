import MediaCacheService from '../services/MediaCacheService';

/**
 * Cache Manager Utility
 * Provides utilities for managing media cache lifecycle
 */
class CacheManager {
  constructor() {
    this.cleanupInterval = null;
    this.cleanupIntervalMs = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Start automatic cache cleanup
   */
  startAutomaticCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        //console.log('🧹 Running automatic cache cleanup...');
        await MediaCacheService.clearExpiredCache();
        
        const stats = await MediaCacheService.getCacheStats();
        //console.log('📊 Cache stats after cleanup:', stats);
      } catch (error) {
        console.error('Error during automatic cache cleanup:', error);
      }
    }, this.cleanupIntervalMs);

    //console.log('⏰ Automatic cache cleanup started (every 1 hour)');
  }

  /**
   * Stop automatic cache cleanup
   */
  stopAutomaticCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      //console.log('⏹️ Automatic cache cleanup stopped');
    }
  }

  /**
   * Perform manual cache cleanup
   */
  async performCleanup() {
    try {
      //console.log('🧹 Performing manual cache cleanup...');
      await MediaCacheService.clearExpiredCache();
      
      const stats = await MediaCacheService.getCacheStats();
      //console.log('📊 Cache stats after manual cleanup:', stats);
      
      return stats;
    } catch (error) {
      console.error('Error during manual cache cleanup:', error);
      throw error;
    }
  }

  /**
   * Get current cache statistics
   */
  async getCacheStats() {
    try {
      const stats = await MediaCacheService.getCacheStats();
      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAllCache() {
    try {
      //console.log('🗑️ Clearing all media cache...');
      await MediaCacheService.clearAllCache();
      //console.log('✅ All cache cleared successfully');
    } catch (error) {
      console.error('Error clearing all cache:', error);
      throw error;
    }
  }

  /**
   * Optimize cache by removing least recently used items
   */
  async optimizeCache(maxItems = 50) {
    try {
      const stats = await MediaCacheService.getCacheStats();
      
      if (stats && stats.totalItems > maxItems) {
        //console.log(`🔧 Optimizing cache: ${stats.totalItems} items, target: ${maxItems}`);
        
        // For now, just clear expired items
        // In the future, we could implement LRU eviction
        await MediaCacheService.clearExpiredCache();
        
        const newStats = await MediaCacheService.getCacheStats();
        //console.log('📊 Cache optimized:', newStats);
        
        return newStats;
      }
      
      return stats;
    } catch (error) {
      console.error('Error optimizing cache:', error);
      throw error;
    }
  }

  /**
   * Preload media for a list of messages
   */
  async preloadMessages(messages) {
    try {
      //console.log(`📦 Preloading media for ${messages.length} messages...`);
      await MediaCacheService.preloadChatMedia(messages);
      //console.log('✅ Media preloading completed');
    } catch (error) {
      console.error('Error preloading messages:', error);
      throw error;
    }
  }

  /**
   * Initialize cache manager
   */
  async initialize() {
    try {
      //console.log('🚀 Initializing Cache Manager...');
      
      // Initialize media cache service
      await MediaCacheService.initialize();
      
      // Start automatic cleanup
      this.startAutomaticCleanup();
      
      // Get initial stats
      const stats = await this.getCacheStats();
      //console.log('📊 Initial cache stats:', stats);
      
      //console.log('✅ Cache Manager initialized successfully');
    } catch (error) {
      console.error('Error initializing Cache Manager:', error);
      throw error;
    }
  }

  /**
   * Cleanup on app termination
   */
  cleanup() {
    this.stopAutomaticCleanup();
    //console.log('🧹 Cache Manager cleanup completed');
  }
}

// Export singleton instance
export default new CacheManager();
