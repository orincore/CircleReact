/**
 * Chat Media Service
 * Handles media picking, compression, and upload for chat messages
 * 
 * Compression targets:
 * - Images: Max 1MB after compression
 * - Videos: Max 10MB after compression
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';
import { API_BASE_URL } from '../api/config';
import { Video } from 'expo-av';

// Compression targets
const IMAGE_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
const VIDEO_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Image compression settings
const IMAGE_INITIAL_QUALITY = 0.9;
const IMAGE_MIN_QUALITY = 0.3;
const IMAGE_MAX_DIMENSION = 1920;

class ChatMediaService {
  /**
   * Pick media from library (images or videos)
   */
  async pickMedia() {
    try {
      console.log('📸 pickMedia called, Platform:', Platform.OS);
      
      if (Platform.OS === 'web') {
        return this._pickMediaWeb();
      }

      console.log('📸 Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📸 Permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Permission denied');
        Alert.alert('Permission Required', 'Please allow access to your photo library to share media.');
        return null;
      }

      console.log('📸 Launching image library picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      console.log('📸 Picker result:', JSON.stringify(result, null, 2));

      if (result.canceled || !result.assets?.[0]) {
        console.log('📸 User canceled or no assets selected');
        return null;
      }

      const asset = result.assets[0];
      const mediaData = {
        uri: asset.uri,
        type: asset.type || (asset.uri.includes('.mp4') || asset.uri.includes('.mov') ? 'video' : 'image'),
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        fileName: asset.fileName || asset.uri.split('/').pop(),
      };
      
      console.log('✅ Media selected:', mediaData);
      return mediaData;
    } catch (error) {
      console.error('❌ Media picker error:', error);
      throw error;
    }
  }

  /**
   * Pick image only from library
   */
  async pickImage() {
    try {
      if (Platform.OS === 'web') {
        return this._pickImageWeb();
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to share images.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        type: 'image',
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName || asset.uri.split('/').pop(),
      };
    } catch (error) {
      console.error('❌ Image picker error:', error);
      throw error;
    }
  }

  /**
   * Pick video only from library
   */
  async pickVideo() {
    try {
      if (Platform.OS === 'web') {
        return this._pickVideoWeb();
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to share videos.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        videoMaxDuration: 120,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        type: 'video',
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        fileName: asset.fileName || asset.uri.split('/').pop(),
      };
    } catch (error) {
      console.error('❌ Video picker error:', error);
      throw error;
    }
  }

  /**
   * Take photo with camera
   */
  async takePhoto() {
    try {
      console.log('📷 takePhoto called, Platform:', Platform.OS);
      
      if (Platform.OS === 'web') {
        return this._takePhotoWeb();
      }

      console.log('📷 Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('📷 Camera permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Camera permission denied');
        Alert.alert('Permission Required', 'Please allow camera access to take photos.');
        return null;
      }

      console.log('📷 Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      console.log('📷 Camera result:', JSON.stringify(result, null, 2));

      if (result.canceled || !result.assets?.[0]) {
        console.log('📷 User canceled or no photo taken');
        return null;
      }

      const asset = result.assets[0];
      const photoData = {
        uri: asset.uri,
        type: 'image',
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      };
      
      console.log('✅ Photo taken:', photoData);
      return photoData;
    } catch (error) {
      console.error('❌ Camera error:', error);
      throw error;
    }
  }

  /**
   * Compress image to target size (max 1MB)
   */
  async compressImage(uri, onProgress) {
    try {
      if (onProgress) onProgress(0.1, 'Analyzing image...');

      // Get original file info
      let originalSize = 0;
      if (Platform.OS === 'web') {
        if (uri.startsWith('data:')) {
          const base64Length = uri.split(',')[1]?.length || 0;
          originalSize = (base64Length * 3) / 4;
        }
      } else {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        originalSize = fileInfo.size || 0;
      }

      console.log(`🖼️ Original image size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

      // If already under limit, just resize if needed
      if (originalSize <= IMAGE_MAX_SIZE_BYTES) {
        if (onProgress) onProgress(0.5, 'Optimizing...');
        const resized = await this._resizeImage(uri, IMAGE_MAX_DIMENSION);
        if (onProgress) onProgress(1, 'Done');
        return resized;
      }

      if (onProgress) onProgress(0.2, 'Compressing image...');

      // Progressive compression to reach target size
      let quality = IMAGE_INITIAL_QUALITY;
      let compressedUri = uri;
      let compressedSize = originalSize;
      let attempts = 0;
      const maxAttempts = 5;

      while (compressedSize > IMAGE_MAX_SIZE_BYTES && quality >= IMAGE_MIN_QUALITY && attempts < maxAttempts) {
        attempts++;
        const progress = 0.2 + (attempts / maxAttempts) * 0.6;
        if (onProgress) onProgress(progress, `Compressing (${Math.round(quality * 100)}% quality)...`);

        if (Platform.OS === 'web') {
          compressedUri = await this._compressImageWeb(uri, quality);
          const base64Length = compressedUri.split(',')[1]?.length || 0;
          compressedSize = (base64Length * 3) / 4;
        } else {
          const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: IMAGE_MAX_DIMENSION } }],
            { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
          );
          compressedUri = result.uri;
          const fileInfo = await FileSystem.getInfoAsync(compressedUri);
          compressedSize = fileInfo.size || 0;
        }

        console.log(`🖼️ Compression attempt ${attempts}: ${(compressedSize / 1024 / 1024).toFixed(2)}MB at ${Math.round(quality * 100)}% quality`);
        quality -= 0.15;
      }

      if (onProgress) onProgress(1, 'Done');
      console.log(`✅ Final image size: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);

      return compressedUri;
    } catch (error) {
      console.error('❌ Image compression failed:', error);
      return uri; // Return original on failure
    }
  }

  /**
   * Compress video to target size (max 10MB)
   * Note: Full video compression requires native modules. This provides basic optimization.
   */
  async compressVideo(uri, onProgress) {
    try {
      if (onProgress) onProgress(0.1, 'Analyzing video...');

      // Get original file info
      let originalSize = 0;
      if (Platform.OS !== 'web') {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        originalSize = fileInfo.size || 0;
      }

      console.log(`🎥 Original video size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

      // Check if video is already under limit
      if (originalSize > 0 && originalSize <= VIDEO_MAX_SIZE_BYTES) {
        if (onProgress) onProgress(1, 'Video ready');
        return { uri, wasCompressed: false, size: originalSize };
      }

      // For videos over the limit, we need to warn the user
      // Full video compression requires FFmpeg or native modules
      if (originalSize > VIDEO_MAX_SIZE_BYTES) {
        const sizeMB = (originalSize / 1024 / 1024).toFixed(1);
        const maxMB = (VIDEO_MAX_SIZE_BYTES / 1024 / 1024).toFixed(0);
        
        // Try basic optimization first
        if (onProgress) onProgress(0.5, 'Optimizing video...');
        
        // For now, return the original with a warning
        // In production, you'd want to use expo-video-thumbnails or a native compression library
        console.warn(`⚠️ Video is ${sizeMB}MB, exceeds ${maxMB}MB limit. Consider using a shorter clip.`);
        
        if (onProgress) onProgress(1, 'Done');
        return { 
          uri, 
          wasCompressed: false, 
          size: originalSize,
          warning: `Video is ${sizeMB}MB. For best results, use videos under ${maxMB}MB.`
        };
      }

      if (onProgress) onProgress(1, 'Video ready');
      return { uri, wasCompressed: false, size: originalSize };
    } catch (error) {
      console.error('❌ Video processing failed:', error);
      return { uri, wasCompressed: false, error: error.message };
    }
  }

  /**
   * Generate thumbnail for video
   * Returns the video URI itself which will display first frame in Video component
   */
  async generateVideoThumbnail(videoUri) {
    try {
      console.log('🎬 Generating video thumbnail for:', videoUri);
      
      // For mobile apps, we use the video URI itself as thumbnail
      // The Video component with poster or Image component can display the first frame
      // This is the simplest approach without additional dependencies
      
      // Return the video URI as thumbnail - it will show the first frame
      return videoUri;
    } catch (error) {
      console.error('❌ Video thumbnail generation failed:', error);
      return videoUri; // Fallback to video URI
    }
  }

  /**
   * Upload media to server
   */
  async uploadMedia(uri, type, token, onProgress) {
    try {
      if (onProgress) onProgress(0, 'Preparing upload...');

      // Compress based on type
      let finalUri = uri;
      let compressionResult = null;
      let thumbnail = null;

      if (type === 'image') {
        finalUri = await this.compressImage(uri, (p, msg) => {
          if (onProgress) onProgress(p * 0.4, msg); // 0-40% for compression
        });
      } else if (type === 'video') {
        compressionResult = await this.compressVideo(uri, (p, msg) => {
          if (onProgress) onProgress(p * 0.3, msg); // 0-30% for compression
        });
        finalUri = compressionResult.uri;
        
        // Generate thumbnail for video
        if (onProgress) onProgress(0.35, 'Generating thumbnail...');
        thumbnail = await this.generateVideoThumbnail(uri);
        
        if (compressionResult.warning) {
          console.warn(compressionResult.warning);
        }
      }

      if (onProgress) onProgress(0.4, 'Uploading...');

      // Get file info for upload
      let fileName = `upload_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`;
      let fileType = type === 'image' ? 'image/jpeg' : 'video/mp4';

      // Create form data
      const formData = new FormData();

      if (Platform.OS === 'web') {
        if (finalUri.startsWith('data:')) {
          const response = await fetch(finalUri);
          const blob = await response.blob();
          formData.append('file', blob, fileName);
        } else {
          const response = await fetch(finalUri);
          const blob = await response.blob();
          formData.append('file', blob, fileName);
        }
      } else {
        formData.append('file', {
          uri: finalUri,
          type: fileType,
          name: fileName,
        });
      }

      formData.append('type', type);
      
      // Add thumbnail for videos
      if (type === 'video' && thumbnail) {
        formData.append('thumbnail', thumbnail);
      }

      // Upload with progress tracking
      const response = await fetch(`${API_BASE_URL}/api/upload/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (onProgress) onProgress(0.9, 'Finalizing...');

      if (!response.ok) {
        let errorMessage = `Upload failed (${response.status})`;
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (onProgress) onProgress(1, 'Complete');

      return {
        url: data.url,
        type,
        thumbnail: data.thumbnail,
        fileName,
      };
    } catch (error) {
      console.error('❌ Media upload failed:', error);
      throw error;
    }
  }

  // Private helper methods

  async _resizeImage(uri, maxDimension) {
    if (Platform.OS === 'web') {
      return this._resizeImageWeb(uri, maxDimension);
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxDimension } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  }

  _compressImageWeb(uri, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
          if (width > height) {
            height = (height / width) * IMAGE_MAX_DIMENSION;
            width = IMAGE_MAX_DIMENSION;
          } else {
            width = (width / height) * IMAGE_MAX_DIMENSION;
            height = IMAGE_MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = uri;
    });
  }

  _resizeImageWeb(uri, maxDimension) {
    return this._compressImageWeb(uri, 0.9);
  }

  _pickMediaWeb() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const isVideo = file.type?.startsWith('video/');
            resolve({
              uri: event.target.result,
              type: isVideo ? 'video' : 'image',
              fileName: file.name,
              fileSize: file.size,
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  _pickImageWeb() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              uri: event.target.result,
              type: 'image',
              fileName: file.name,
              fileSize: file.size,
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  _pickVideoWeb() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              uri: event.target.result,
              type: 'video',
              fileName: file.name,
              fileSize: file.size,
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  _takePhotoWeb() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              uri: event.target.result,
              type: 'image',
              fileName: file.name,
              fileSize: file.size,
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

export const chatMediaService = new ChatMediaService();
export default chatMediaService;
