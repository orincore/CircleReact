/**
 * Meme Upload Service
 * Handles picking, compressing, and uploading user-created memes (photo
 * carousel or single video), reusing the same hardware-accelerated
 * compression chatMediaService.js already uses (see mediaCompression.js).
 */
import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';
import { API_BASE_URL } from '../api/config';
import { ensureImagePickerMediaLibraryPermission } from '@/utils/permissionGate';
import {
  compressImage,
  compressVideo as compressVideoShared,
  generateVideoThumbnail as generateVideoThumbnailShared,
} from '@/src/utils/mediaCompression';
import { feedApi } from '@/src/api/feed';

const MAX_IMAGES = 10;
// Full-feed display quality is higher than chat's targets (1MB/10MB) --
// these mirror the server's own limits (60MB/file, 2048px resize-inside).
const IMAGE_MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const IMAGE_MAX_DIMENSION = 2048;
const VIDEO_MAX_SIZE_BYTES = 45 * 1024 * 1024; // headroom under the server's 60MB/file cap
const VIDEO_MAX_DURATION_SECONDS = 90;

class MemeUploadService {
  /**
   * Pick up to MAX_IMAGES photos for a carousel post.
   */
  async pickImages() {
    try {
      if (Platform.OS === 'web') {
        return this._pickImagesWeb();
      }

      const { status } = await ensureImagePickerMediaLibraryPermission();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to post nudges.');
        return [];
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.length) return [];

      return result.assets.map((asset) => ({
        uri: asset.uri,
        type: 'image',
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName || asset.uri.split('/').pop(),
      }));
    } catch (error) {
      console.error('❌ Meme image picker error:', error);
      throw error;
    }
  }

  /**
   * Pick a single video for a video post.
   */
  async pickVideo() {
    try {
      if (Platform.OS === 'web') {
        return this._pickVideoWeb();
      }

      const { status } = await ensureImagePickerMediaLibraryPermission();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to post nudges.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        videoMaxDuration: VIDEO_MAX_DURATION_SECONDS,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return null;

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
      console.error('❌ Meme video picker error:', error);
      throw error;
    }
  }

  /**
   * Compresses each picked image, reporting overall progress across the
   * whole batch (not per-image), so a 10-photo carousel's progress bar
   * still reads as one continuous operation.
   */
  async compressImages(uris, onProgress) {
    const results = [];
    for (let i = 0; i < uris.length; i++) {
      const compressedUri = await compressImage(
        uris[i],
        { maxSizeBytes: IMAGE_MAX_SIZE_BYTES, maxDimension: IMAGE_MAX_DIMENSION },
        (p, msg) => {
          if (onProgress) onProgress((i + p) / uris.length, msg);
        }
      );
      results.push(compressedUri);
    }
    return results;
  }

  async compressVideo(uri, onProgress) {
    return compressVideoShared(uri, { maxSizeBytes: VIDEO_MAX_SIZE_BYTES }, onProgress);
  }

  async generateVideoThumbnail(videoUri) {
    return generateVideoThumbnailShared(videoUri);
  }

  async fetchGenres(token) {
    try {
      const { genres } = await feedApi.getGenres(token);
      return genres;
    } catch (error) {
      console.error('❌ Failed to fetch genres, using fallback list:', error);
      // Offline-resilience fallback only -- the server's constant list is
      // always the source of truth, this just keeps the picker usable.
      return [
        { value: 'comedy', label: 'Comedy' },
        { value: 'relatable', label: 'Relatable' },
        { value: 'wholesome', label: 'Wholesome' },
        { value: 'dark_humor', label: 'Dark Humor' },
        { value: 'animals', label: 'Animals' },
        { value: 'gaming', label: 'Gaming' },
        { value: 'anime', label: 'Anime' },
        { value: 'sports', label: 'Sports' },
        { value: 'desi', label: 'Desi' },
        { value: 'tech', label: 'Tech' },
        { value: 'politics', label: 'Politics' },
        { value: 'random', label: 'Random' },
      ];
    }
  }

  /**
   * Uploads a meme (photo carousel or video) with caption/genres.
   * `media` is either { images: [uri,...] } or { video: uri, thumbnail: uri|null }.
   *
   * Sent via XMLHttpRequest, not fetch, on native -- same fix as
   * photoGalleryService.js: Expo's fetch-polyfill FormData encoder rejects
   * React Native's `{ uri, name, type }` file parts ("Unsupported
   * FormDataPart implementation"). Unlike chatMediaService's single-file
   * FileSystem.uploadAsync workaround, this upload can carry up to 10 image
   * files plus an optional thumbnail in one request, which
   * FileSystem.uploadAsync (single-file only) can't do -- XHR handles
   * multi-file FormData natively and reports real upload progress.
   */
  async uploadMeme({ media, caption, genres }, token, onProgress) {
    const formData = new FormData();
    const appendFile = (field, uri, name, type) => formData.append(field, { uri, name, type });

    if (Platform.OS === 'web') {
      // Web: FormData needs real Blob/File objects, not RN-style {uri,name,type}.
      if (media.images) {
        for (let i = 0; i < media.images.length; i++) {
          const response = await fetch(media.images[i]);
          const blob = await response.blob();
          formData.append('media', blob, `photo-${i}.jpg`);
        }
      } else if (media.video) {
        const response = await fetch(media.video);
        const blob = await response.blob();
        formData.append('media', blob, 'video.mp4');
        if (media.thumbnail) {
          const thumbResponse = await fetch(media.thumbnail);
          const thumbBlob = await thumbResponse.blob();
          formData.append('thumbnail', thumbBlob, 'thumbnail.jpg');
        }
      }
    } else {
      if (media.images) {
        media.images.forEach((uri, i) => appendFile('media', uri, `photo-${i}.jpg`, 'image/jpeg'));
      } else if (media.video) {
        appendFile('media', media.video, 'video.mp4', 'video/mp4');
        if (media.thumbnail) {
          appendFile('thumbnail', media.thumbnail, 'thumbnail.jpg', 'image/jpeg');
        }
      }
    }

    formData.append('caption', caption || '');
    formData.append('genres', JSON.stringify(genres));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/feed/memes`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      // Don't set Content-Type -- XHR derives the multipart boundary from FormData.

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(event.loaded / event.total, 'Uploading...');
          }
        };
      }

      xhr.onload = () => {
        const { status, responseText } = xhr;
        if (status >= 200 && status < 300) {
          try {
            resolve(JSON.parse(responseText));
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
          return;
        }

        let errorMessage = `Upload failed with status ${status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch {}
        reject(new Error(errorMessage));
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  }

  // Private web helpers

  _pickImagesWeb() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;

      input.onchange = (e) => {
        const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES);
        if (files.length === 0) return resolve([]);

        Promise.all(
          files.map(
            (file) =>
              new Promise((res) => {
                const reader = new FileReader();
                reader.onload = (event) => res({ uri: event.target.result, type: 'image', fileName: file.name });
                reader.onerror = () => res(null);
                reader.readAsDataURL(file);
              })
          )
        ).then((results) => resolve(results.filter(Boolean)));
      };

      input.oncancel = () => resolve([]);
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
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (event) => resolve({ uri: event.target.result, type: 'video', fileName: file.name });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}

export const memeUploadService = new MemeUploadService();
export default memeUploadService;
