import { useAuth } from '@/contexts/AuthContext'
import { ProfilePictureService } from '@/src/services/profilePictureService'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

/**
 * Profile Photo Manager Component
 * For settings/profile page - handles add, update, and delete with S3 integration
 */
export default function ProfilePhotoManager({ size = 150 }) {
  const { user, token, updateProfile, refreshUser } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(user?.profilePhotoUrl)

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
   * Pick and upload image
   */
  const pickAndUploadImage = async () => {
    try {
      setUploading(true)
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setUploading(false)
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri)
      } else {
        setUploading(false)
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image. Please try again.')
      setUploading(false)
    }
  }

  /**
   * Take and upload photo
   */
  const takeAndUploadPhoto = async () => {
    try {
      setUploading(true)
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setUploading(false)
        return
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.')
        setUploading(false)
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri)
      } else {
        setUploading(false)
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
      setUploading(false)
    }
  }

  /**
   * Upload image to S3
   */
  const uploadImage = async (imageUri) => {
    try {
      //console.log('📤 Uploading profile photo to S3...')

      // Upload to S3
      const newPhotoUrl = await ProfilePictureService.uploadProfilePicture(imageUri, token)

      // Update local state
      setPhotoUrl(newPhotoUrl)

      // Update user profile in database
      await updateProfile({ profilePhotoUrl: newPhotoUrl })

      // Refresh user data
      await refreshUser()

      Alert.alert('Success', 'Profile photo updated successfully!')
    } catch (error) {
      console.error('❌ Upload error:', error)
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  /**
   * Delete profile photo
   */
  const deletePhoto = async () => {
    Alert.alert(
      'Delete Profile Photo',
      'Are you sure you want to delete your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true)

              // Delete from S3
              if (photoUrl) {
                await ProfilePictureService.deleteProfilePicture(photoUrl, token)
              }

              // Update profile to remove photo URL
              await updateProfile({ profilePhotoUrl: null })

              // Update local state
              setPhotoUrl(null)

              // Refresh user data
              await refreshUser()

              Alert.alert('Success', 'Profile photo deleted successfully!')
            } catch (error) {
              console.error('❌ Delete error:', error)
              Alert.alert('Delete Failed', 'Failed to delete photo. Please try again.')
            } finally {
              setUploading(false)
            }
          },
        },
      ]
    )
  }

  /**
   * Show upload options
   */
  const showUploadOptions = () => {
    if (Platform.OS === 'web') {
      pickAndUploadImage()
    } else {
      Alert.alert('Upload Photo', 'Choose an option', [
        { text: 'Take Photo', onPress: takeAndUploadPhoto },
        { text: 'Choose from Gallery', onPress: pickAndUploadImage },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.photoContainer, { width: size, height: size, borderRadius: size / 2 }]}
        onPress={showUploadOptions}
        disabled={uploading}
      >
        {photoUrl ? (
          <>
            <Image source={{ uri: photoUrl }} style={styles.photo} />
            {/* Delete button */}
            {!uploading && (
              <TouchableOpacity style={styles.deleteButton} onPress={deletePhoto}>
                <Ionicons name="trash" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <LinearGradient
            colors={['#FFD6F2', '#E9E6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.placeholderGradient}
          >
            <View style={styles.placeholderContainer}>
              {uploading ? (
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

        {/* Upload overlay */}
        {!uploading && (
          <View style={styles.uploadOverlay}>
            <Ionicons name="camera" size={24} color="#FFFFFF" />
          </View>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.uploadButton}
        onPress={showUploadOptions}
        disabled={uploading}
      >
        <Ionicons name="cloud-upload-outline" size={20} color="#7C2B86" />
        <Text style={styles.uploadButtonText}>
          {uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
        </Text>
      </TouchableOpacity>

      {photoUrl && !uploading && (
        <TouchableOpacity style={styles.deleteTextButton} onPress={deletePhoto}>
          <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
          <Text style={styles.deleteTextButtonText}>Remove Photo</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.helperText}>
        Max size: 5MB • JPG, PNG, GIF, WebP
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
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(124, 43, 134, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  deleteTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  deleteTextButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B6B',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
})
