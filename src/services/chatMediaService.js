/**
 * Chat Media Service
 * Handles media picking, compression, and upload for chat messages
 * 
 * Compression targets:
 * - Images: Max 1MB after compression
 * - Videos: Max 10MB after compression
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';
import { API_BASE_URL } from '../api/config';
import { ensureImagePickerCameraPermission, ensureImagePickerMediaLibraryPermission } from '@/utils/permissionGate';
import {
  compressImage as compressImageShared,
  compressVideo as compressVideoShared,
  generateVideoThumbnail as generateVideoThumbnailShared,
  formatFileSize as formatFileSizeShared,
} from '@/src/utils/mediaCompression';

// Compression targets
const IMAGE_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
const VIDEO_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Image compression settings
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
      const { status } = await ensureImagePickerMediaLibraryPermission();
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

      const { status } = await ensureImagePickerMediaLibraryPermission();
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

      const { status } = await ensureImagePickerMediaLibraryPermission();
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
      const { status } = await ensureImagePickerCameraPermission();
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
   * Compress image to target size (max 1MB). Delegates to the shared
   * mediaCompression util (also used by memeUploadService.js).
   */
  async compressImage(uri, onProgress) {
    return compressImageShared(uri, { maxSizeBytes: IMAGE_MAX_SIZE_BYTES, maxDimension: IMAGE_MAX_DIMENSION }, onProgress);
  }

  /**
   * Compress video to target size (max 10MB) using react-native-compressor,
   * which drives the device's own hardware video encoder (AVAssetExportSession
   * on iOS, MediaCodec on Android) — the same class of compression WhatsApp
   * uses, not a JS-side re-encode. Delegates to the shared mediaCompression
   * util (also used by memeUploadService.js).
   */
  async compressVideo(uri, onProgress) {
    return compressVideoShared(uri, { maxSizeBytes: VIDEO_MAX_SIZE_BYTES }, onProgress);
  }

  /**
   * Generate a real video thumbnail (an actual extracted frame), via the
   * same hardware-backed react-native-compressor module. Delegates to the
   * shared mediaCompression util (also used by memeUploadService.js).
   */
  async generateVideoThumbnail(videoUri) {
    return generateVideoThumbnailShared(videoUri);
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

      if (Platform.OS === 'web') {
        const formData = new FormData();
        const response0 = await fetch(finalUri);
        const blob = await response0.blob();
        formData.append('file', blob, fileName);
        formData.append('type', type);
        if (type === 'video' && thumbnail) {
          formData.append('thumbnail', thumbnail);
        }

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
      }

      // Native (iOS/Android): use FileSystem.uploadAsync instead of
      // fetch + FormData. Expo's global fetch override (installed by the
      // `expo` package) converts FormData via winter/fetch/convertFormData.ts,
      // which only recognizes RN FormData parts shaped with a nested
      // .file/.blob/.string key — but RN's own FormData.getParts() returns
      // uri-based parts as {uri, type, name, ...} directly (no .file
      // wrapper), so that converter silently produced `undefined` for the
      // file entry and threw "Unsupported FormDataPart implementation".
      // uploadAsync bypasses fetch/FormData entirely via a native multipart
      // upload task, so it isn't affected by that gap.
      const uploadResult = await FileSystem.uploadAsync(
        `${API_BASE_URL}/api/upload/media`,
        finalUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: fileType,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          parameters: {
            type,
            ...(type === 'video' && thumbnail ? { thumbnail } : {}),
          },
        }
      );

      if (onProgress) onProgress(0.9, 'Finalizing...');

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        let errorMessage = `Upload failed (${uploadResult.status})`;
        try {
          const error = JSON.parse(uploadResult.body);
          errorMessage = error.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = JSON.parse(uploadResult.body);

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
    return formatFileSizeShared(bytes);
  }
}

export const chatMediaService = new ChatMediaService();
export default chatMediaService;
