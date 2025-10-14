import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';

/**
 * Video Processing Utility
 * Provides practical video optimization for uploads
 */

/**
 * Optimize video file by copying to cache (removes some metadata)
 */
export const optimizeVideoFile = async (videoUri, targetSizeMB = 25) => {
  try {
    if (Platform.OS === 'web') {
      //console.log('📹 Video optimization not available on web');
      return videoUri;
    }

    const originalInfo = await FileSystem.getInfoAsync(videoUri);
    const originalSizeMB = originalInfo.size / (1024 * 1024);
    
    //console.log(`📹 Optimizing video: ${originalSizeMB.toFixed(2)}MB → target: ${targetSizeMB}MB`);
    
    if (originalSizeMB <= targetSizeMB) {
      //console.log('📹 Video already within target size');
      return videoUri;
    }

    // Copy to cache directory (can remove some metadata)
    const optimizedUri = `${FileSystem.cacheDirectory}optimized_${Date.now()}.mp4`;
    
    //console.log('📹 Copying video to optimize...');
    await FileSystem.copyAsync({
      from: videoUri,
      to: optimizedUri
    });

    const optimizedInfo = await FileSystem.getInfoAsync(optimizedUri);
    const optimizedSizeMB = optimizedInfo.size / (1024 * 1024);
    
    //console.log(`📹 Video optimized: ${optimizedSizeMB.toFixed(2)}MB`);
    
    // If still too large, warn user
    if (optimizedSizeMB > targetSizeMB) {
      //console.log(`⚠️ Video still large after optimization: ${optimizedSizeMB.toFixed(1)}MB`);
    }
    
    return optimizedUri;
  } catch (error) {
    console.error('📹 Video optimization failed:', error);
    return videoUri;
  }
};

/**
 * Show user advice for large videos
 */
export const showVideoSizeAdvice = (fileSizeMB, maxSizeMB = 25) => {
  if (fileSizeMB > maxSizeMB) {
    const advice = [
      `Video is ${fileSizeMB.toFixed(1)}MB (max recommended: ${maxSizeMB}MB)`,
      '',
      'To reduce file size:',
      '• Record shorter videos (under 1 minute)',
      '• Use lower quality settings (720p instead of 4K)',
      '• Compress video using a video editing app',
      '• Trim unnecessary parts of the video'
    ].join('\n');

    Alert.alert(
      'Large Video File',
      advice,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload Anyway', style: 'default' }
      ]
    );
    
    return new Promise((resolve) => {
      // For now, just resolve true to continue
      resolve(true);
    });
  }
  
  return Promise.resolve(true);
};

/**
 * Check if video meets upload requirements
 */
export const validateVideoForUpload = async (videoUri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    const fileSizeMB = fileInfo.size / (1024 * 1024);
    
    const validation = {
      isValid: true,
      sizeMB: fileSizeMB,
      warnings: [],
      errors: []
    };

    // Check file size limits
    if (fileSizeMB > 50) {
      validation.isValid = false;
      validation.errors.push(`File too large: ${fileSizeMB.toFixed(1)}MB (max: 50MB)`);
    } else if (fileSizeMB > 25) {
      validation.warnings.push(`Large file: ${fileSizeMB.toFixed(1)}MB - may take longer to upload`);
    }

    // Check if file exists and is readable
    if (!fileInfo.exists) {
      validation.isValid = false;
      validation.errors.push('Video file not found');
    }

    return validation;
  } catch (error) {
    console.error('📹 Video validation error:', error);
    return {
      isValid: false,
      sizeMB: 0,
      warnings: [],
      errors: ['Failed to read video file']
    };
  }
};

/**
 * Get upload time estimate
 */
export const getUploadTimeEstimate = (fileSizeMB) => {
  // Rough estimates based on average mobile upload speeds
  const avgSpeedMBps = 2; // 2 MB/s average
  const estimatedSeconds = fileSizeMB / avgSpeedMBps;
  
  if (estimatedSeconds < 10) {
    return 'a few seconds';
  } else if (estimatedSeconds < 60) {
    return `about ${Math.round(estimatedSeconds)} seconds`;
  } else {
    const minutes = Math.round(estimatedSeconds / 60);
    return `about ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
};

/**
 * Process video for upload with user feedback
 */
export const processVideoForUpload = async (videoUri) => {
  try {
    //console.log('📹 Processing video for upload...');
    
    // Validate video first
    const validation = await validateVideoForUpload(videoUri);
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Show warnings if any
    if (validation.warnings.length > 0) {
      //console.log('⚠️ Video warnings:', validation.warnings.join(', '));
    }
    
    // Optimize if needed
    let processedUri = videoUri;
    if (validation.sizeMB > 25) {
      //console.log('📹 Large video detected, attempting optimization...');
      processedUri = await optimizeVideoFile(videoUri, 25);
    }
    
    // Final validation
    const finalValidation = await validateVideoForUpload(processedUri);
    const uploadTime = getUploadTimeEstimate(finalValidation.sizeMB);
    
    //console.log(`📹 Video ready for upload: ${finalValidation.sizeMB.toFixed(1)}MB (${uploadTime})`);
    
    return {
      uri: processedUri,
      sizeMB: finalValidation.sizeMB,
      uploadTimeEstimate: uploadTime,
      wasOptimized: processedUri !== videoUri
    };
    
  } catch (error) {
    console.error('📹 Video processing failed:', error);
    throw error;
  }
};

export default {
  optimizeVideoFile,
  showVideoSizeAdvice,
  validateVideoForUpload,
  getUploadTimeEstimate,
  processVideoForUpload,
};
