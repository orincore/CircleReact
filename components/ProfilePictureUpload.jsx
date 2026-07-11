import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native'
import Loader from '@/components/Loader';
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/contexts/ThemeContext'
import * as ImagePicker from 'expo-image-picker'
import { ensureImagePickerCameraPermission, ensureImagePickerMediaLibraryPermission } from '@/utils/permissionGate'

const PRIMARY_BUTTON_COLOR = '#8B5CF6'

/**
 * Profile Picture Upload Component for Signup
 * Allows users to select profile picture during signup (stored locally until after signup)
 * After signup, use ProfilePhotoUpload component for S3 integration
 */
export default function ProfilePictureUpload({ currentImage, onImageSelected, size = 120 }) {
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ensureImagePickerMediaLibraryPermission()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.')
        return false
      }
    }
    return true
  }

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

  const takePhoto = async () => {
    try {
      setLoading(true)
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setLoading(false)
        return
      }

      const { status } = await ensureImagePickerCameraPermission()
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

  const removeImage = () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onImageSelected(null) },
    ])
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.avatarWrap, { width: size, height: size }]}
        onPress={showUploadOptions}
        disabled={loading}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.photoContainer,
            {
              width: size,
              height: size,
              // Squircle to match the app's avatar shape everywhere else
              // (chat list, friends list) instead of a plain circle.
              borderRadius: size * 0.32,
              borderColor: currentImage ? PRIMARY_BUTTON_COLOR : theme.border,
              backgroundColor: theme.surface,
            },
          ]}
        >
          {loading ? (
            <Loader size={36} color={PRIMARY_BUTTON_COLOR} />
          ) : currentImage ? (
            <Image source={{ uri: currentImage }} style={styles.photo} />
          ) : (
            <Ionicons name="person" size={size * 0.4} color={theme.textMuted} />
          )}
        </View>

        {/* Single tap affordance - camera badge doubles as the only "add/change" action */}
        <View
          style={[
            styles.cameraBadge,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: PRIMARY_BUTTON_COLOR,
              borderColor: theme.background,
            },
          ]}
        >
          <Ionicons name="camera" size={size * 0.15} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {currentImage ? (
        <TouchableOpacity style={styles.removeButton} onPress={removeImage} disabled={loading} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
          <Text style={styles.removeButtonText}>Remove photo</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.helperText, { color: theme.textSecondary }]}>Add a profile photo (optional)</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins',
    color: '#EF4444',
  },
  helperText: {
    fontSize: 13,
    fontFamily: 'Poppins',
    marginTop: 8,
    textAlign: 'center',
  },
})
