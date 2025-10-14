import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MediaCacheService from '../services/MediaCacheService';
import MediaSaveService from '../services/MediaSaveService';

/**
 * CachedMediaImage Component
 * Displays images with caching support and loading states
 */
const CachedMediaImage = ({ 
  messageId, 
  mediaUrl, 
  mediaType = 'image',
  style, 
  resizeMode = 'cover',
  placeholder = null,
  onLoad = null,
  onError = null,
  showSaveButton = true
}) => {
  const [imageSource, setImageSource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadImage();
  }, [messageId, mediaUrl]);

  const loadImage = async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      // Check cache first
      if (messageId) {
        const cached = await MediaCacheService.getCachedMedia(messageId);
        if (cached && cached.mediaUrl) {
          //console.log('📱 Using cached media URL for message:', messageId);
          setImageSource({ uri: cached.mediaUrl });
          setIsLoading(false);
          return;
        }
      }

      // Use provided URL if no cache
      if (mediaUrl) {
        //console.log('🌐 Using direct media URL for message:', messageId);
        setImageSource({ uri: mediaUrl });
        
        // Cache the URL for future use
        if (messageId) {
          await MediaCacheService.cacheMedia(messageId, {
            mediaUrl: mediaUrl,
            mediaType: 'image'
          });
        }
      } else {
        setHasError(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading cached image:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad();
  };

  const handleImageError = (error) => {
    // Check if it's a 403 error (expired S3 URL)
    const is403Error = error?.nativeEvent?.responseCode === 403 || 
                       error?.nativeEvent?.error?.includes('403') ||
                       error?.nativeEvent?.error?.includes('Forbidden');
    
    if (is403Error) {
      //console.log('⏰ S3 URL expired for message:', messageId, '- URL needs refresh');
      setErrorType('expired');
    } else {
      //console.log('❌ Image load error for message:', messageId);
      setErrorType('general');
    }
    
    setHasError(true);
    setIsLoading(false);
    if (onError) onError(error);
  };

  const handleSaveMedia = async () => {
    if (!mediaUrl || isSaving) return;
    
    try {
      setIsSaving(true);
      const success = await MediaSaveService.saveMedia(mediaUrl, mediaType, messageId);
      //console.log('💾 Save result:', success);
    } catch (error) {
      console.error('❌ Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImagePress = () => {
    setShowControls(!showControls);
  };

  if (hasError) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Ionicons name="image-outline" size={32} color="#999" />
        <Text style={styles.errorText}>
          {errorType === 'expired' ? 'Image link expired' : 'Failed to load image'}
        </Text>
        {errorType === 'expired' && (
          <Text style={styles.errorSubtext}>Refresh chat to reload</Text>
        )}
      </View>
    );
  }

  if (isLoading || !imageSource) {
    return (
      <View style={[styles.loadingContainer, style]}>
        {placeholder || <ActivityIndicator size="small" color="#7C2B86" />}
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.imageContainer, style]}>
      <TouchableOpacity 
        onPress={handleImagePress}
        style={styles.imageWrapper}
        activeOpacity={0.9}
      >
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </TouchableOpacity>
      
      {/* Save Button Overlay */}
      {showSaveButton && showControls && (
        <View style={styles.controlsOverlay}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveMedia}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons 
                name={Platform.OS === 'web' ? 'download' : 'save'} 
                size={20} 
                color="#FFFFFF" 
              />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  errorSubtext: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default CachedMediaImage;
