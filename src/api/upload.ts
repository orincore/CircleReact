import { API_BASE_URL } from './config'

export interface UploadResult {
  success: boolean
  url: string
  key: string
  size?: number
  contentType?: string
  message: string
}

export interface PresignedUrlResult {
  success: boolean
  url: string
  expiresIn: number
}

/**
 * Upload API Service
 * Handles file uploads to S3 via backend
 */
export const uploadApi = {
  /**
   * Upload profile photo
   * @param file - Image file to upload
   * @param token - Authentication token
   * @returns Upload result with S3 URL
   */
  async uploadProfilePhoto(
    file: File | { uri: string; type: string; name: string },
    token: string
  ): Promise<UploadResult> {
    try {
      const formData = new FormData()
      const uploadUrl = `${API_BASE_URL}/api/upload/profile-photo`

     
      // Handle both web File and React Native file objects
      if ('uri' in file) {
        // React Native
        formData.append('photo', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any)
      } else {
        // Web
        formData.append('photo', file)
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let browser/RN set it with boundary
        },
        body: formData,
      })

      

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Upload failed:', errorText)
        try {
          const error = JSON.parse(errorText)
          throw new Error(error.error || 'Failed to upload profile photo')
        } catch {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
        }
      }

      const result = await response.json()
      //console.log('✅ Upload successful:', result)
      return result
    } catch (error: any) {
      console.error('❌ Upload error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      })
      throw error
    }
  },

  /**
   * Upload chat media (image or video)
   * @param file - Media file to upload
   * @param chatId - ID of the chat
   * @param token - Authentication token
   * @returns Upload result with S3 URL
   */
  async uploadChatMedia(
    file: File | { uri: string; type: string; name: string },
    chatId: string,
    token: string
  ): Promise<UploadResult> {
    const formData = new FormData()

    // Handle both web File and React Native file objects
    if ('uri' in file) {
      // React Native
      formData.append('media', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any)
    } else {
      // Web
      formData.append('media', file)
    }

    formData.append('chatId', chatId)

    const response = await fetch(`${API_BASE_URL}/api/upload/chat-media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload media')
    }

    return response.json()
  },

  /**
   * Delete a file from S3
   * @param key - S3 file key
   * @param token - Authentication token
   */
  async deleteFile(key: string, token: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/upload/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete file')
    }

    return response.json()
  },

  /**
   * Get presigned URL for private file access
   * @param key - S3 file key
   * @param token - Authentication token
   * @returns Presigned URL with expiration
   */
  async getPresignedUrl(key: string, token: string): Promise<PresignedUrlResult> {
    const response = await fetch(
      `${API_BASE_URL}/api/upload/presigned-url?key=${encodeURIComponent(key)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get presigned URL')
    }

    return response.json()
  },
}

/**
 * Helper function to validate file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in megabytes
 * @returns true if valid, throws error if invalid
 */
export function validateFileSize(
  file: File | { uri: string; type: string; name: string; size?: number },
  maxSizeMB: number
): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024
  const fileSize = 'size' in file ? (file.size ?? 0) : 0

  if (fileSize > maxBytes) {
    throw new Error(`File size exceeds maximum allowed size of ${maxSizeMB}MB`)
  }

  return true
}

/**
 * Helper function to validate file type
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if valid, throws error if invalid
 */
export function validateFileType(
  file: File | { uri: string; type: string; name: string },
  allowedTypes: string[]
): boolean {
  const fileType = 'type' in file ? file.type : ''

  if (!allowedTypes.includes(fileType)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`)
  }

  return true
}

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

/**
 * Allowed video MIME types
 */
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']

/**
 * File size limits in MB
 */
export const FILE_SIZE_LIMITS = {
  PROFILE_PHOTO: 5,
  CHAT_IMAGE: 10,
  CHAT_VIDEO: 50,
  POST_IMAGE: 10,
}
