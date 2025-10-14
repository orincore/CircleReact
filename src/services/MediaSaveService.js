import { Alert, Platform } from 'react-native';

// Dynamic imports to handle cases where expo-media-library might not be available
let MediaLibrary = null;
let FileSystem = null;

try {
  MediaLibrary = require('expo-media-library');
  FileSystem = require('expo-file-system/legacy');
} catch (error) {
  console.warn('Media library dependencies not available:', error.message);
}

/**
 * Media Save Service
 * Handles saving media files to device photo gallery
 */
class MediaSaveService {
  constructor() {
    this.hasPermission = false;
    this.permissionChecked = false;
  }

  /**
   * Request media library permissions
   */
  async requestPermissions() {
    try {
      if (Platform.OS === 'web' || !MediaLibrary) {
        // Web doesn't support media library or dependencies not available
        return false;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      this.permissionChecked = true;
      
      //console.log('📱 Media library permission status:', status);
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  /**
   * Check if we have media library permissions
   */
  async checkPermissions() {
    try {
      if (Platform.OS === 'web' || !MediaLibrary) {
        return false;
      }

      if (!this.permissionChecked) {
        const { status } = await MediaLibrary.getPermissionsAsync();
        this.hasPermission = status === 'granted';
        this.permissionChecked = true;
      }
      
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking media library permissions:', error);
      return false;
    }
  }

  /**
   * Download file from URL to local cache
   */
  async downloadFile(url, filename) {
    try {
      if (!FileSystem) {
        throw new Error('FileSystem not available');
      }
      
      //console.log('📥 Downloading file:', url);
      
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
      
      if (downloadResult.status === 200) {
        //console.log('✅ File downloaded successfully:', downloadResult.uri);
        return downloadResult.uri;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      throw error;
    }
  }

  /**
   * Save image to photo gallery
   */
  async saveImage(imageUrl, messageId) {
    try {
      if (Platform.OS === 'web') {
        // For web, trigger download
        return this.downloadForWeb(imageUrl, `image_${messageId}.jpg`);
      }

      // Check permissions first
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Please grant photo library access to save images.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }

      // Generate filename
      const filename = `circle_image_${messageId}_${Date.now()}.jpg`;
      
      // Download file to cache
      const localUri = await this.downloadFile(imageUrl, filename);
      
      // Save to photo library
      //console.log('📸 Attempting to save to gallery:', localUri);
      
      let asset = null;
      
      // Try different API approaches based on expo-media-library version
      try {
        //console.log('📸 Trying createAssetAsync with options');
        // New API requires options parameter
        const options = {};
        if (MediaLibrary.MediaType && MediaLibrary.MediaType.photo) {
          options.mediaType = MediaLibrary.MediaType.photo;
        }
        asset = await MediaLibrary.createAssetAsync(localUri, options);
      } catch (createError) {
        //console.log('📸 createAssetAsync with options failed:', createError.message);
        
        try {
          //console.log('📸 Trying createAssetAsync without options');
          // Try without options (older API)
          asset = await MediaLibrary.createAssetAsync(localUri);
        } catch (createError2) {
          //console.log('📸 createAssetAsync failed, trying saveToLibraryAsync:', createError2.message);
          
          // Fallback to saveToLibraryAsync if available
          if (typeof MediaLibrary.saveToLibraryAsync === 'function') {
            asset = await MediaLibrary.saveToLibraryAsync(localUri);
          } else {
            throw new Error('All MediaLibrary save methods failed');
          }
        }
      }
      
      //console.log('📸 Image saved to gallery:', asset ? (asset.id || 'success') : 'success');
      
      // Clean up cache file
      try {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      } catch (cleanupError) {
        console.warn('Warning: Failed to cleanup cache file:', cleanupError);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save image:', error);
      throw error;
    }
  }

  /**
   * Save video to photo gallery
   */
  async saveVideo(videoUrl, messageId) {
    try {
      if (Platform.OS === 'web') {
        // For web, trigger download
        return this.downloadForWeb(videoUrl, `video_${messageId}.mp4`);
      }

      // Check permissions first
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Please grant photo library access to save videos.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }

      // Generate filename
      const filename = `circle_video_${messageId}_${Date.now()}.mp4`;
      
      // Download file to cache
      const localUri = await this.downloadFile(videoUrl, filename);
      
      // Save to photo library
      //console.log('🎥 Attempting to save video to gallery:', localUri);
      
      let asset = null;
      
      // Try different API approaches based on expo-media-library version
      try {
        //console.log('🎥 Trying createAssetAsync with options');
        // New API requires options parameter
        const options = {};
        if (MediaLibrary.MediaType && MediaLibrary.MediaType.video) {
          options.mediaType = MediaLibrary.MediaType.video;
        }
        asset = await MediaLibrary.createAssetAsync(localUri, options);
      } catch (createError) {
        //console.log('🎥 createAssetAsync with options failed:', createError.message);
        
        try {
          //console.log('🎥 Trying createAssetAsync without options');
          // Try without options (older API)
          asset = await MediaLibrary.createAssetAsync(localUri);
        } catch (createError2) {
          //console.log('🎥 createAssetAsync failed, trying saveToLibraryAsync:', createError2.message);
          
          // Fallback to saveToLibraryAsync if available
          if (typeof MediaLibrary.saveToLibraryAsync === 'function') {
            asset = await MediaLibrary.saveToLibraryAsync(localUri);
          } else {
            throw new Error('All MediaLibrary save methods failed');
          }
        }
      }
      
      //console.log('🎥 Video saved to gallery:', asset ? (asset.id || 'success') : 'success');
      
      // Clean up cache file
      try {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      } catch (cleanupError) {
        console.warn('Warning: Failed to cleanup cache file:', cleanupError);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save video:', error);
      throw error;
    }
  }

  /**
   * Download file for web browsers
   */
  downloadForWeb(url, filename) {
    try {
      if (Platform.OS !== 'web') {
        return false;
      }

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      //console.log('💻 Download triggered for web:', filename);
      return true;
    } catch (error) {
      console.error('❌ Web download failed:', error);
      return false;
    }
  }

  /**
   * Save media file (auto-detect type)
   */
  async saveMedia(mediaUrl, mediaType, messageId) {
    try {
      //console.log('💾 Saving media:', { mediaUrl, mediaType, messageId });
      
      if (!mediaUrl) {
        throw new Error('Media URL is required');
      }

      let success = false;
      
      if (mediaType === 'image') {
        success = await this.saveImage(mediaUrl, messageId);
      } else if (mediaType === 'video') {
        success = await this.saveVideo(mediaUrl, messageId);
      } else {
        throw new Error(`Unsupported media type: ${mediaType}`);
      }

      if (success) {
        const platform = Platform.OS === 'web' ? 'Downloads folder' : 'photo gallery';
        Alert.alert(
          'Saved Successfully',
          `Media saved to ${platform}`,
          [{ text: 'OK' }]
        );
      }

      return success;
    } catch (error) {
      console.error('❌ Save media failed:', error);
      
      Alert.alert(
        'Save Failed',
        error.message || 'Failed to save media. Please try again.',
        [{ text: 'OK' }]
      );
      
      return false;
    }
  }

  /**
   * Check if save functionality is supported
   */
  isSaveSupported() {
    // Always supported - web uses download, mobile uses MediaLibrary
    return true;
  }

  /**
   * Get save button text based on platform
   */
  getSaveButtonText() {
    return Platform.OS === 'web' ? 'Download' : 'Save to Photos';
  }
}

// Export singleton instance
export default new MediaSaveService();
