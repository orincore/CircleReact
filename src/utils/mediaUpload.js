import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';
import MediaCacheService from '../services/MediaCacheService';
import { processVideoForUpload } from './videoProcessor';

// Compression settings
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1920;
const IMAGE_QUALITY = 0.8;

/**
 * Compress image before upload
 */
export const compressImage = async (uri) => {
  try {
    //console.log('🖼️ Compressing image:', uri);
    
    // For browser, use canvas compression
    if (Platform.OS === 'web' && uri.startsWith('data:')) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > IMAGE_MAX_WIDTH || height > IMAGE_MAX_HEIGHT) {
            if (width > height) {
              height = (height / width) * IMAGE_MAX_WIDTH;
              width = IMAGE_MAX_WIDTH;
            } else {
              width = (width / height) * IMAGE_MAX_HEIGHT;
              height = IMAGE_MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with quality
          const compressedUri = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
          //console.log(`✅ Image compressed (browser)`);
          resolve(compressedUri);
        };
        img.onerror = reject;
        img.src = uri;
      });
    }
    
    // For mobile, use ImageManipulator preserving aspect ratio
    // Only set the max dimension, not both, to avoid distortion
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: IMAGE_MAX_WIDTH } }],
      { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
    const fileSizeKB = fileInfo.size / 1024;
    
    //console.log(`✅ Image compressed: ${fileSizeKB.toFixed(2)} KB`);
    
    return manipResult.uri;
  } catch (error) {
    console.error('❌ Image compression failed:', error);
    // Return original URI if compression fails
    return uri;
  }
};

/**
 * Pick image from library (with browser support)
 */
export const pickImage = async () => {
  try {
    // Browser support
    if (Platform.OS === 'web') {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              // Crop to 1:1 center square on web to prevent stretching
              try {
                const cropped = cropSquareWeb(event.target.result);
                resolve({
                  uri: cropped,
                  type: 'image',
                  fileName: file.name,
                  fileSize: file.size,
                });
              } catch {
                resolve({
                  uri: event.target.result,
                  type: 'image',
                  fileName: file.name,
                  fileSize: file.size,
                });
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        
        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    // Mobile support
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  } catch (error) {
    console.error('❌ Image picker error:', error);
    throw error;
  }
};

/**
 * Pick video from library (with browser support)
 */
export const pickVideo = async () => {
  try {
    // Browser support
    if (Platform.OS === 'web') {
      return new Promise((resolve, reject) => {
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
            reader.onerror = reject;
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        
        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    // Mobile support
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.5, // Medium quality
      videoMaxDuration: 60, // 60 seconds max
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  } catch (error) {
    console.error('❌ Video picker error:', error);
    throw error;
  }
};

/**
 * Take photo with camera (with browser support)
 */
export const takePhoto = async () => {
  try {
    // Browser support - use file input with camera capture
    if (Platform.OS === 'web') {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Use rear camera if available
        
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
            reader.onerror = reject;
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        
        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    // Mobile support
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access camera was denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  } catch (error) {
    console.error('❌ Camera error:', error);
    throw error;
  }
};

/**
 * Upload media to S3 via backend
 */
export const uploadMediaToS3 = async (uri, type, token) => {
  try {
    //console.log(`📤 Uploading ${type} to S3...`);
    
    // Define file size limits (in bytes)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
    
    // Compress media based on type
    let finalUri = uri;
    if (type === 'image') {
      finalUri = await compressImage(uri);
    } else if (type === 'video') {
      // Process video for upload
      //console.log('📹 Processing video file...');
      
      try {
        const videoResult = await processVideoForUpload(uri);
        finalUri = videoResult.uri;
        
        if (videoResult.wasOptimized) {
          //console.log(`📹 Video optimized: ${videoResult.sizeMB.toFixed(1)}MB (${videoResult.uploadTimeEstimate})`);
        } else {
          //console.log(`📹 Video ready: ${videoResult.sizeMB.toFixed(1)}MB (${videoResult.uploadTimeEstimate})`);
        }
      } catch (videoError) {
        console.error('📹 Video processing failed:', videoError);
        throw new Error(`Video processing failed: ${videoError.message}`);
      }
    }
    
    // Get file info
    let fileInfo = { size: 0 };
    let fileName = 'upload.jpg';
    
    if (Platform.OS === 'web') {
      // For web, extract filename from data URL or use default
      fileName = type === 'image' ? 'upload.jpg' : 'upload.mp4';
      // Estimate size from data URL length (rough approximation)
      if (finalUri.startsWith('data:')) {
        const base64Length = finalUri.split(',')[1]?.length || 0;
        fileInfo.size = (base64Length * 3) / 4; // Base64 to bytes conversion
      }
    } else {
      // For mobile
      fileInfo = await FileSystem.getInfoAsync(finalUri);
      fileName = finalUri.split('/').pop();
    }
    
    // Validate file size
    const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    const fileSizeMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    
    //console.log(`📊 File size: ${fileSizeMB}MB (max: ${maxSizeMB}MB)`);
    
    if (fileInfo.size > maxSize) {
      const message = type === 'video' 
        ? `Video too large (${fileSizeMB}MB). Please choose a shorter video or compress it. Maximum size is ${maxSizeMB}MB.`
        : `Image too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB.`;
      throw new Error(message);
    }
    
    const fileType = type === 'image' ? 'image/jpeg' : 'video/mp4';
    
    // Create form data
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      // For web, convert data URL to blob
      if (finalUri.startsWith('data:')) {
        // Convert data URL to blob
        const response = await fetch(finalUri);
        const blob = await response.blob();
        formData.append('file', blob, fileName || 'upload.jpg');
      } else {
        // Regular URL
        const response = await fetch(finalUri);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      }
    } else {
      // For mobile
      formData.append('file', {
        uri: finalUri,
        type: fileType,
        name: fileName,
      });
    }
    
    formData.append('type', type);
    
    // Upload to backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `Upload failed (${response.status})`;
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (parseError) {
          // Handle specific HTTP status codes without reading response body again
          if (response.status === 413) {
            errorMessage = 'File too large for server. Please choose a smaller file or compress it.';
          } else if (response.status === 408 || response.status === 504) {
            errorMessage = 'Upload timeout. Please try again with a smaller file.';
          } else {
            console.error('❌ Could not parse error response:', parseError);
            errorMessage = `Upload failed (${response.status}). Please try again.`;
          }
        }
        throw new Error(errorMessage);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ Failed to parse success response as JSON:', jsonError);
        throw new Error('Server returned invalid response. Upload may have failed.');
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Upload timeout. Please try again with a smaller file.');
      }
      throw fetchError;
    }
    //console.log('✅ Upload successful:', data.url);
    
    const uploadResult = {
      url: data.url,
      type: type,
      size: fileInfo.size,
      thumbnail: data.thumbnail, // For videos
      fileName: fileName,
      dimensions: type === 'image' ? { width: fileInfo.width, height: fileInfo.height } : null
    };

    // Cache the uploaded media data for future use
    // Generate a temporary messageId for caching (will be replaced with actual messageId later)
    const tempCacheId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await MediaCacheService.cacheMedia(tempCacheId, {
      mediaUrl: uploadResult.url,
      mediaType: uploadResult.type,
      thumbnail: uploadResult.thumbnail,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.size,
      dimensions: uploadResult.dimensions
    });
    
    // Store temp cache ID for later reference
    uploadResult.tempCacheId = tempCacheId;
    
    return uploadResult;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
};

/**
 * Get file size in human-readable format
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
