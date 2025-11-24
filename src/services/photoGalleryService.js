import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com';
const MAX_PHOTOS = 5;
const MAX_IMAGE_SIZE = 1920; // Max width/height
const COMPRESSION_QUALITY = 0.8;

/**
 * Photo Gallery Service
 * Handles photo uploads with compression and gallery management
 */
class PhotoGalleryService {
  /**
   * Compress image before upload
   */
  async compressImage(uri) {
    try {
      //console.log('🗜️ Compressing image:', uri);
      
      // For web, handle differently
      if (Platform.OS === 'web') {
        return uri; // Web compression handled by backend
      }

      // Get image info
      const imageInfo = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      // Resize if needed
      const manipulateActions = [];
      
      // Check if image needs resizing
      if (imageInfo.width > MAX_IMAGE_SIZE || imageInfo.height > MAX_IMAGE_SIZE) {
        manipulateActions.push({
          resize: {
            width: imageInfo.width > imageInfo.height ? MAX_IMAGE_SIZE : undefined,
            height: imageInfo.height > imageInfo.width ? MAX_IMAGE_SIZE : undefined,
          }
        });
      }

      // Compress image
      const compressedImage = await ImageManipulator.manipulateAsync(
        uri,
        manipulateActions,
        {
          compress: COMPRESSION_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      

      return compressedImage.uri;
    } catch (error) {
      console.error('❌ Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  }

  /**
   * Pick image from gallery
   */
  async pickImage() {
    try {
      if (Platform.OS === 'web') {
        // For web, use HTML file input
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          
          input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
              const blobUrl = URL.createObjectURL(file);
              resolve({ uri: blobUrl, cancelled: false, file });
            } else {
              resolve({ cancelled: true });
            }
          };
          
          input.click();
        });
      } else {
        // For mobile, use ImagePicker
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Permission to access media library was denied');
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
          return { uri: result.assets[0].uri, cancelled: false };
        }

        return { cancelled: true };
      }
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  /**
   * Upload photo to gallery
   */
  async uploadPhoto(uri, token) {
    try {
      //console.log('📤 Uploading photo to gallery...');
      //console.log('📤 Upload URL:', `${API_BASE_URL}/api/users/photos`);

      // Compress image first
      const compressedUri = await this.compressImage(uri);

      const formData = new FormData();

      if (Platform.OS === 'web') {
        // For web, convert blob URL to blob
        const response = await fetch(compressedUri);
        const blob = await response.blob();
        formData.append('photo', blob, 'photo.jpg');
      } else {
        // For mobile
        const filename = compressedUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('photo', {
          uri: compressedUri,
          name: filename,
          type,
        });
      }

      //console.log('📤 Sending upload request...');
      const uploadResponse = await fetch(`${API_BASE_URL}/api/users/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      //console.log('📤 Upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        // Try to get error message
        const contentType = uploadResponse.headers.get('content-type');
        //console.log('📤 Response content-type:', contentType);
        
        let errorMessage = 'Failed to upload photo';
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            // Server returned HTML or plain text
            const errorText = await uploadResponse.text();
            console.error('❌ Server response (non-JSON):', errorText.substring(0, 200));
            
            if (uploadResponse.status === 404) {
              errorMessage = 'Photo upload endpoint not found. Backend needs to be set up.';
            } else if (uploadResponse.status === 522) {
              errorMessage = 'Backend server is down or not responding. Please check if your server is running.';
            } else if (uploadResponse.status >= 500) {
              errorMessage = 'Server error. Check if database table exists or if server is running properly.';
            } else {
              errorMessage = `Upload failed with status ${uploadResponse.status}`;
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      const data = await uploadResponse.json();
      //console.log('✅ Photo uploaded successfully:', data.photoUrl);
      
      return data.photoUrl;
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      throw error;
    }
  }

  /**
   * Get user's photo gallery
   */
  async getPhotos(token) {
    try {
      //console.log('📸 Fetching photos from:', `${API_BASE_URL}/api/users/photos`);
      
      const response = await fetch(`${API_BASE_URL}/api/users/photos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      //console.log('📸 Photo fetch response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch photos:', response.status, errorText.substring(0, 200));
        
        // Handle specific error codes
        if (response.status === 404) {
          console.warn('⚠️ Photo endpoint not found. Backend may not be updated yet.');
          return [];
        }
        
        if (response.status === 522) {
          console.error('❌ Backend server is down or not responding (Cloudflare 522)');
          return [];
        }
        
        if (response.status >= 500) {
          console.error('❌ Server error:', response.status);
          return [];
        }
        
        throw new Error(`Failed to fetch photos: ${response.status}`);
      }

      const data = await response.json();
      //console.log('✅ Photos fetched:', data.photos?.length || 0);
      return data.photos || [];
    } catch (error) {
      console.error('❌ Error fetching photos:', error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  }

  /**
   * Delete photo from gallery
   */
  async deletePhoto(photoUrl, token) {
    try {
      console.log('🗑️ Deleting photo:', photoUrl);

      const response = await fetch(`${API_BASE_URL}/api/users/photos`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoUrl }),
      });

      console.log('🗑️ Delete response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to delete photo';
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            console.error('❌ Server response (non-JSON):', errorText.substring(0, 200));
            
            if (response.status === 404) {
              errorMessage = 'Photo not found. It may have already been deleted.';
            } else if (response.status === 403) {
              errorMessage = 'You do not have permission to delete this photo.';
            } else if (response.status === 500) {
              errorMessage = 'Server error. Please try again later.';
            } else {
              errorMessage = `Delete failed with status ${response.status}`;
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing delete response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Photo deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting photo:', error);
      throw error;
    }
  }

  /**
   * Check if user can upload more photos
   */
  canUploadMore(currentPhotoCount) {
    return currentPhotoCount < MAX_PHOTOS;
  }

  /**
   * Get remaining photo slots
   */
  getRemainingSlots(currentPhotoCount) {
    return Math.max(0, MAX_PHOTOS - currentPhotoCount);
  }
}

export default new PhotoGalleryService();
export { MAX_PHOTOS };
