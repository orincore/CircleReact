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
import { useAuth } from '../src/contexts/AuthContext'
import {
  uploadApi,
  validateFileSize,
  validateFileType,
  ALLOWED_IMAGE_TYPES,
  FILE_SIZE_LIMITS,
} from '../src/api/upload'

/**
 * Profile Photo Upload Component
 * Allows users to upload and update their profile photo
 */
export default function ProfilePhotoUpload({ currentPhotoUrl, onUploadSuccess }) {
  const { token, user, updateUser } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl)

  /**
   * Request camera/gallery permissions
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
      const hasPermission = await requestPermissions()
      if (!hasPermission) return

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0])
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image. Please try again.')
    }
  }

  /**
   * Take photo with camera
   */
  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions()
      if (!hasPermission) return

      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    }
  }

  /**
   * Upload image to S3
   */
  const uploadImage = async (asset) => {
    try {
      setUploading(true)

      // Prepare file object
      const file = {
        uri: asset.uri,
        type: asset.type === 'image' ? 'image/jpeg' : asset.mimeType || 'image/jpeg',
        name: asset.fileName || `profile-${Date.now()}.jpg`,
      }

      // Validate file (optional - backend also validates)
      try {
        validateFileType(file, ALLOWED_IMAGE_TYPES)
        // Note: asset.fileSize might not be available, backend will validate
      } catch (validationError) {
        Alert.alert('Invalid File', validationError.message)
        setUploading(false)
        return
      }

      console.log('📤 Uploading profile photo...')

      // Upload to S3 via backend
      const result = await uploadApi.uploadProfilePhoto(file, token)

      console.log('✅ Profile photo uploaded:', result)

      // Update local state
      setPhotoUrl(result.url)

      // Update user context
      if (updateUser) {
        updateUser({ ...user, profilePhotoUrl: result.url })
      }

      // Callback to parent component
      if (onUploadSuccess) {
        onUploadSuccess(result.url)
      }

      Alert.alert('Success', 'Profile photo updated successfully!')
    } catch (error) {
      console.error('❌ Upload error:', error)
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  /**
   * Show upload options
   */
  const showUploadOptions = () => {
    if (Platform.OS === 'web') {
      // On web, directly open file picker
      pickImage()
    } else {
      // On mobile, show action sheet
      Alert.alert('Upload Photo', 'Choose an option', [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.photoContainer}
        onPress={showUploadOptions}
        disabled={uploading}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="person" size={60} color="#7C2B86" />
          </View>
        )}

        {/* Upload overlay */}
        <View style={styles.uploadOverlay}>
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="camera" size={24} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.uploadButton}
        onPress={showUploadOptions}
        disabled={uploading}
      >
        <Ionicons name="cloud-upload-outline" size={20} color="#7C2B86" />
        <Text style={styles.uploadButtonText}>
          {uploading ? 'Uploading...' : 'Change Photo'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.helperText}>
        Max size: {FILE_SIZE_LIMITS.PROFILE_PHOTO}MB • JPG, PNG, GIF, WebP
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  photoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 3,
    borderColor: '#7C2B86',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFD6F2',
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(124, 43, 134, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFD6F2',
    borderRadius: 20,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C2B86',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
})
