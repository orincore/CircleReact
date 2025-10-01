import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'

/**
 * Profile Picture Upload Component for Signup
 * Allows users to select profile picture during signup (stored locally until after signup)
 * After signup, use ProfilePhotoUpload component for S3 integration
 */
export default function ProfilePictureUpload({ currentImage, onImageSelected, size = 120 }) {
  const [loading, setLoading] = useState(false)

  /**
   * Request permissions
   */
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload photos.'
        )
        return false
      }
    }
    return true
  }

  /**
   * Pick image from gallery
   */
  const pickImage = async () => {
    try {
      setLoading(true)
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setLoading(false)
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Take photo with camera
   */
  const takePhoto = async () => {
    try {
      setLoading(true)
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setLoading(false)
        return
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.')
        setLoading(false)
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Show upload options
   */
  const showUploadOptions = () => {
    if (Platform.OS === 'web') {
      pickImage()
    } else {
      Alert.alert('Upload Photo', 'Choose an option', [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  /**
   * Remove current image
   */
  const removeImage = () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onImageSelected(null),
      },
    ])
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.photoContainer, { width: size, height: size, borderRadius: size / 2 }]}
        onPress={showUploadOptions}
        disabled={loading}
      >
        {currentImage ? (
          <>
            <Image source={{ uri: currentImage }} style={styles.photo} />
            {/* Remove button overlay */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removeImage}
              disabled={loading}
            >
              <Ionicons name="close-circle" size={28} color="#FF6B6B" />
            </TouchableOpacity>
          </>
        ) : (
          <LinearGradient
            colors={['#FFD6F2', '#E9E6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.placeholderGradient}
          >
            <View style={styles.placeholderContainer}>
              {loading ? (
                <ActivityIndicator size="large" color="#7C2B86" />
              ) : (
                <>
                  <Ionicons name="person" size={size * 0.4} color="#7C2B86" />
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={size * 0.2} color="#FFFFFF" />
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.uploadButton}
        onPress={showUploadOptions}
        disabled={loading}
      >
        <Ionicons name="cloud-upload-outline" size={18} color="#7C2B86" />
        <Text style={styles.uploadButtonText}>
          {loading ? 'Loading...' : currentImage ? 'Change Photo' : 'Add Photo'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.helperText}>
        {currentImage ? 'Tap to change or remove' : 'Optional - Add a profile picture'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  photoContainer: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 3,
    borderColor: '#7C2B86',
    position: 'relative',
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: '15%',
    right: '15%',
    backgroundColor: '#7C2B86',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFD6F2',
    borderRadius: 20,
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  helperText: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
})
