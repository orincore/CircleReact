/**
 * Shared media compression helpers, extracted from chatMediaService.js so
 * other upload flows (meme creation) can reuse the same hardware-accelerated
 * compression instead of re-implementing it. Behavior is unchanged from the
 * original chat implementation -- only the size/quality targets are now
 * parameters instead of hardcoded constants.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
// Hardware-accelerated compression (AVAssetExportSession on iOS, MediaCodec
// on Android), not a JS-side re-encode -- see compressVideo below.
import { Video as VideoCompressor, createVideoThumbnail } from 'react-native-compressor';

const DEFAULT_IMAGE_INITIAL_QUALITY = 0.9;
const DEFAULT_IMAGE_MIN_QUALITY = 0.3;
const DEFAULT_MAX_ATTEMPTS = 5;

function resizeImageWeb(uri, maxDimension, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
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

async function resizeImageNative(uri, maxDimension, quality = 0.9) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDimension } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

/**
 * Compresses an image down to `maxSizeBytes`, progressively lowering JPEG
 * quality (never upsized, always resized to fit within `maxDimension`).
 * Returns the original uri unchanged if compression itself fails.
 */
export async function compressImage(uri, { maxSizeBytes, maxDimension, initialQuality = DEFAULT_IMAGE_INITIAL_QUALITY, minQuality = DEFAULT_IMAGE_MIN_QUALITY, maxAttempts = DEFAULT_MAX_ATTEMPTS }, onProgress) {
  try {
    if (onProgress) onProgress(0.1, 'Analyzing image...');

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

    if (originalSize <= maxSizeBytes) {
      if (onProgress) onProgress(0.5, 'Optimizing...');
      const resized = Platform.OS === 'web'
        ? await resizeImageWeb(uri, maxDimension)
        : await resizeImageNative(uri, maxDimension);
      if (onProgress) onProgress(1, 'Done');
      return resized;
    }

    if (onProgress) onProgress(0.2, 'Compressing image...');

    let quality = initialQuality;
    let compressedUri = uri;
    let compressedSize = originalSize;
    let attempts = 0;

    while (compressedSize > maxSizeBytes && quality >= minQuality && attempts < maxAttempts) {
      attempts++;
      const progress = 0.2 + (attempts / maxAttempts) * 0.6;
      if (onProgress) onProgress(progress, `Compressing (${Math.round(quality * 100)}% quality)...`);

      if (Platform.OS === 'web') {
        compressedUri = await resizeImageWeb(uri, maxDimension, quality);
        const base64Length = compressedUri.split(',')[1]?.length || 0;
        compressedSize = (base64Length * 3) / 4;
      } else {
        compressedUri = await resizeImageNative(uri, maxDimension, quality);
        const fileInfo = await FileSystem.getInfoAsync(compressedUri);
        compressedSize = fileInfo.size || 0;
      }

      quality -= 0.15;
    }

    if (onProgress) onProgress(1, 'Done');
    return compressedUri;
  } catch (error) {
    console.error('❌ Image compression failed:', error);
    return uri; // Return original on failure
  }
}

/**
 * Compresses a video toward `maxSizeBytes` using react-native-compressor's
 * hardware encoder ('auto' lets it pick resolution/bitrate, same as
 * WhatsApp-style compression). Already-small videos are left alone to save
 * battery/time. No-ops on web (no native compressor available there).
 */
export async function compressVideo(uri, { maxSizeBytes }, onProgress) {
  try {
    if (onProgress) onProgress(0.1, 'Analyzing video...');

    let originalSize = 0;
    if (Platform.OS !== 'web') {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      originalSize = fileInfo.size || 0;
    }

    if (Platform.OS === 'web') {
      if (onProgress) onProgress(1, 'Video ready');
      return { uri, wasCompressed: false, size: originalSize };
    }

    if (originalSize > 0 && originalSize <= maxSizeBytes) {
      if (onProgress) onProgress(1, 'Video ready');
      return { uri, wasCompressed: false, size: originalSize };
    }

    if (onProgress) onProgress(0.15, 'Compressing video...');

    const compressedUri = await VideoCompressor.compress(
      uri,
      { compressionMethod: 'auto' },
      (progress) => {
        if (onProgress) onProgress(0.15 + progress * 0.7, 'Compressing video...');
      }
    );

    const compressedInfo = await FileSystem.getInfoAsync(compressedUri);
    const compressedSize = compressedInfo.size || 0;

    if (onProgress) onProgress(1, 'Done');

    if (compressedSize > maxSizeBytes) {
      const sizeMB = (compressedSize / 1024 / 1024).toFixed(1);
      const maxMB = (maxSizeBytes / 1024 / 1024).toFixed(0);
      return {
        uri: compressedUri,
        wasCompressed: true,
        size: compressedSize,
        warning: `Video is ${sizeMB}MB after compression. For best results, use videos under ${maxMB}MB.`,
      };
    }

    return { uri: compressedUri, wasCompressed: true, size: compressedSize };
  } catch (error) {
    console.error('❌ Video compression failed:', error);
    return { uri, wasCompressed: false, error: error.message };
  }
}

/** Extracts a real video frame as a thumbnail image, via the same native module. */
export async function generateVideoThumbnail(videoUri) {
  try {
    if (Platform.OS === 'web') return videoUri;
    const result = await createVideoThumbnail(videoUri);
    return result?.path || videoUri;
  } catch (error) {
    console.error('❌ Video thumbnail generation failed:', error);
    return videoUri; // Fallback to video URI
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
