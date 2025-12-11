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
import { useTheme } from '@/contexts/ThemeContext'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'

/**
 * Profile Picture Upload Component for Signup
 * Allows users to select profile picture during signup (stored locally until after signup)
 * After signup, use ProfilePhotoUpload component for S3 integration
 */
export default function ProfilePictureUpload({ currentImage, onImageSelected, size = 120 }) {
  const [loading, setLoading] = useState(false)
  const { theme, isDarkMode } = useTheme()

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
        style={[
          styles.photoContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: theme.primary,
            backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.surface,
            shadowColor: theme.shadowColor || '#000',
          },
        ]}
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
          <View style={styles.placeholderOuter}>
            <View style={styles.placeholderInner}>
              {loading ? (
                <ActivityIndicator size="large" color={theme.primary} />
              ) : (
                <>
                  <Ionicons
                    name="person-circle-outline"
                    size={size * 0.45}
                    color={isDarkMode ? theme.textSecondary : theme.textPrimary}
                  />
                  <View
                    style={[
                      styles.cameraIconContainer,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.surface,
                      },
                    ]}
                  >
                    <Ionicons name="camera" size={size * 0.2} color="#FFFFFF" />
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.uploadButton,
          {
            borderColor: theme.primary,
            backgroundColor: isDarkMode ? 'transparent' : theme.background,
          },
        ]}
        onPress={showUploadOptions}
        disabled={loading}
      >
        <Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />
        <Text style={[styles.uploadButtonText, { color: theme.primary }]}>
          {loading ? 'Loading...' : currentImage ? 'Change Photo' : 'Add Photo'}
        </Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.helperText,
          { color: isDarkMode ? theme.textSecondary : theme.textTertiary },
        ]}
      >
        {currentImage ? 'Tap to change or remove' : 'You can add a profile picture now or later.'}
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
    borderWidth: 2,
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholderOuter: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderInner: {
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
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
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
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
})
