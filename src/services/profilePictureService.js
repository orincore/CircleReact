import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { Platform } from 'react-native'

/**
 * Profile Picture Service
 * Handles profile picture upload to S3 after signup
 */
export class ProfilePictureService {
  /**
   * Upload profile picture to S3
   * @param {string} imageUri - Local image URI
   * @param {string} token - Auth token
   * @returns {Promise<string>} S3 URL of uploaded image
   */
  static async uploadProfilePicture(imageUri, token) {
    try {
      console.log('📸 Starting profile picture upload...')
      console.log('Image URI:', imageUri)

      // 1. Compress and resize image
      const compressedImage = await this.compressImage(imageUri)
      console.log('✅ Image compressed')

      // 2. Upload using XMLHttpRequest (works on all platforms)
      const result = await this.uploadWithXHR(compressedImage.uri, token)
      console.log('✅ Profile picture uploaded to S3:', result.url)

      return result.url
    } catch (error) {
      console.error('❌ Failed to upload profile picture:', error)
      throw error
    }
  }

  /**
   * Upload using fetch with blob (works on all platforms without deprecated APIs)
   * @param {string} uri - Image URI
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Upload result
   */
  static async uploadWithXHR(uri, token) {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.circle.orincore.com'
      const uploadUrl = `${API_BASE_URL}/api/upload/profile-photo`

      console.log('📤 Upload configuration:', {
        url: uploadUrl,
        hasToken: !!token,
        tokenLength: token?.length,
        platform: Platform.OS,
        uri,
      })

      // Extract filename and type
      const filename = uri.split('/').pop() || `photo-${Date.now()}.jpg`
      const match = /\.(\w+)$/.exec(filename)
      const type = match ? `image/${match[1]}` : 'image/jpeg'

      console.log('📤 File info:', { uri, type, name: filename })

      // Create FormData
      const formData = new FormData()
      
      // For React Native, append file with proper structure
      formData.append('photo', {
        uri,
        type,
        name: filename,
      })

      console.log('📤 Starting fetch upload...')

      // Use fetch instead of XMLHttpRequest - more reliable on React Native
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let fetch set it with boundary
        },
        body: formData,
      })

      console.log('📥 Upload response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      })

      const responseText = await response.text()
      console.log('📥 Response body:', responseText)

      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`
        try {
          const error = JSON.parse(responseText)
          errorMessage = error.error || errorMessage
        } catch (e) {
          // Response is not JSON
        }
        throw new Error(errorMessage)
      }

      const result = JSON.parse(responseText)
      console.log('✅ Upload successful:', result)
      return result

    } catch (error) {
      console.error('❌ Upload failed:', {
        message: error.message,
        name: error.name,
      })
      throw error
    }
  }

  /**
   * Compress and resize image
   * @param {string} uri - Image URI
   * @returns {Promise<{uri: string}>} Compressed image
   */
  static async compressImage(uri) {
    try {
      const manipulatedImage = await manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 800 } }], // Resize to 800x800
        { compress: 0.8, format: SaveFormat.JPEG } // 80% quality JPEG
      )
      return manipulatedImage
    } catch (error) {
      console.error('Failed to compress image:', error)
      // Return original if compression fails
      return { uri }
    }
  }

  /**
   * Update user profile with new picture URL
   * @param {string} photoUrl - S3 URL of uploaded image
   * @param {Function} updateProfile - Update profile function from AuthContext
   * @returns {Promise<void>}
   */
  static async updateUserProfile(photoUrl, updateProfile) {
    try {
      console.log('🔄 Updating user profile with new photo URL...')
      await updateProfile({ profilePhotoUrl: photoUrl })
      console.log('✅ User profile updated')
    } catch (error) {
      console.error('❌ Failed to update user profile:', error)
      throw error
    }
  }

  /**
   * Delete profile picture from S3
   * @param {string} photoUrl - S3 URL of image to delete
   * @param {string} token - Auth token
   * @returns {Promise<void>}
   */
  static async deleteProfilePicture(photoUrl, token) {
    try {
      console.log('🗑️ Deleting profile picture from S3...')
      
      // Extract S3 key from URL
      const key = this.extractS3KeyFromUrl(photoUrl)
      
      if (!key) {
        throw new Error('Invalid S3 URL')
      }

      await uploadApi.deleteFile(key, token)
      console.log('✅ Profile picture deleted from S3')
    } catch (error) {
      console.error('❌ Failed to delete profile picture:', error)
      throw error
    }
  }

  /**
   * Extract S3 key from URL
   * @param {string} url - S3 URL
   * @returns {string|null} S3 key
   */
  static extractS3KeyFromUrl(url) {
    try {
      // Handle different S3 URL formats
      const patterns = [
        // https://media.orincore.com/Circle/avatars/userId/avatar-timestamp.jpg
        /https:\/\/[^/]+\/(.+)/,
        // https://bucket.s3.region.amazonaws.com/key
        /https:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com\/(.+)/,
      ]

      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) {
          return decodeURIComponent(match[1].split('?')[0]) // Remove query params
        }
      }

      return null
    } catch (error) {
      console.error('Error extracting S3 key:', error)
      return null
    }
  }

  /**
   * Validate image file
   * @param {string} uri - Image URI
   * @returns {Promise<boolean>} True if valid
   */
  static async validateImage(uri) {
    try {
      // Basic URI validation
      if (!uri || typeof uri !== 'string') {
        throw new Error('Invalid image URI')
      }

      // File size will be validated by backend
      // No need for frontend validation with deprecated API
      return true
    } catch (error) {
      console.error('Image validation failed:', error)
      throw error
    }
  }
}
