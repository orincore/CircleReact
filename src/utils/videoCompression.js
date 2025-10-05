import { Platform, Alert } from 'react-native';

/**
 * Video Compression Utility
 * Provides video compression and optimization for chat media
 */

/**
 * Check if video compression is available
 */
export const isVideoCompressionAvailable = () => {
  // Video compression requires additional libraries like expo-av or react-native-video-processing
  // For now, we'll use basic file size checking and user guidance
  return false;
};

/**
 * Get video compression recommendations based on file size
 */
export const getVideoCompressionAdvice = (fileSizeMB, durationSeconds) => {
  const advice = {
    shouldCompress: false,
    recommendations: [],
    maxRecommendedSize: 50, // MB
  };

  if (fileSizeMB > 50) {
    advice.shouldCompress = true;
    advice.recommendations.push('File is too large for upload (max 50MB)');
    
    if (durationSeconds > 60) {
      advice.recommendations.push('Consider trimming video to under 1 minute');
    }
    
    advice.recommendations.push('Try recording at lower quality (720p instead of 4K)');
    advice.recommendations.push('Use a video compression app before uploading');
  } else if (fileSizeMB > 25) {
    advice.recommendations.push('Large file - may take longer to upload');
    advice.recommendations.push('Consider compressing for faster sharing');
  }

  return advice;
};

/**
 * Show video compression advice to user
 */
export const showVideoCompressionAdvice = (fileSizeMB, durationSeconds, fileName) => {
  const advice = getVideoCompressionAdvice(fileSizeMB, durationSeconds);
  
  if (advice.shouldCompress) {
    const message = [
      `Video "${fileName}" is ${fileSizeMB.toFixed(1)}MB (max: ${advice.maxRecommendedSize}MB)`,
      '',
      'Suggestions:',
      ...advice.recommendations.map(rec => `• ${rec}`)
    ].join('\n');

    Alert.alert(
      'Video Too Large',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload Anyway', style: 'destructive' }
      ]
    );
    
    return false; // Don't proceed with upload
  } else if (advice.recommendations.length > 0) {
    const message = [
      `Video: ${fileSizeMB.toFixed(1)}MB`,
      '',
      ...advice.recommendations
    ].join('\n');

    Alert.alert(
      'Upload Tip',
      message,
      [{ text: 'Continue', style: 'default' }]
    );
  }
  
  return true; // Proceed with upload
};

/**
 * Estimate upload time based on file size
 */
export const estimateUploadTime = (fileSizeMB, connectionSpeed = 'average') => {
  // Rough estimates in seconds
  const speeds = {
    slow: 1, // 1 MB/s
    average: 3, // 3 MB/s  
    fast: 10, // 10 MB/s
  };
  
  const speed = speeds[connectionSpeed] || speeds.average;
  const estimatedSeconds = fileSizeMB / speed;
  
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
 * Get optimal video settings recommendations
 */
export const getOptimalVideoSettings = () => {
  return {
    resolution: '1080p (1920x1080)',
    maxDuration: '60 seconds',
    format: 'MP4 (H.264)',
    bitrate: '5-8 Mbps',
    frameRate: '30 fps',
    tips: [
      'Record in good lighting for better compression',
      'Avoid excessive camera movement',
      'Keep videos under 1 minute when possible',
      'Use landscape orientation for better viewing'
    ]
  };
};

/**
 * Basic video file validation
 */
export const validateVideoFile = (file) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Check file size
  if (file.fileSize > 50 * 1024 * 1024) {
    validation.isValid = false;
    validation.errors.push('File size exceeds 50MB limit');
  }

  // Check duration if available
  if (file.duration && file.duration > 300000) { // 5 minutes in milliseconds
    validation.warnings.push('Long videos may take time to upload');
  }

  // Check dimensions if available
  if (file.width && file.height) {
    const aspectRatio = file.width / file.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      validation.warnings.push('Unusual aspect ratio - may not display optimally');
    }
  }

  return validation;
};

export default {
  isVideoCompressionAvailable,
  getVideoCompressionAdvice,
  showVideoCompressionAdvice,
  estimateUploadTime,
  getOptimalVideoSettings,
  validateVideoFile,
};
