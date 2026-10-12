import axios from 'axios'
import apiClient from './client.ts'
import { getErrorMessage } from './errors.ts'

// Cloudinary's free plan rejects images above 10 MB
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export interface UploadSignature {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  signature: string
}

// Returns why a picked file cannot be uploaded, or null when it is fine
export const checkImageFile = (file: File): string | null => {
  if (!file.type.startsWith('image/')) return `${file.name} is not an image`
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than 10 MB`
  return null
}

// Adds uploaded URLs as new lines below whatever is already in the URL box
export const appendImageUrls = (text: string, urls: string[]): string =>
  [text.trimEnd(), ...urls].filter(Boolean).join('\n')

export const uploadsApi = {
  // POST /uploads/signature -> { success, data: UploadSignature } — valid for about an hour
  getSignature: async (): Promise<UploadSignature> => {
    const res = await apiClient.post('/uploads/signature')
    return res.data.data
  },

  // Sends the file straight to Cloudinary and returns its public https URL.
  // Plain axios, not apiClient: our admin token must not be sent to Cloudinary.
  uploadImage: async (file: File, sig: UploadSignature): Promise<string> => {
    const body = new FormData()
    body.append('file', file)
    body.append('api_key', sig.apiKey)
    body.append('timestamp', String(sig.timestamp))
    body.append('folder', sig.folder)
    body.append('signature', sig.signature)

    const res = await axios.post(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, body)
    return res.data.secure_url
  },
}

// Cloudinary reports problems as { error: { message } }, unlike our API's { message }
export const getUploadErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const cloudinaryMessage: string | undefined = err.response?.data?.error?.message
    if (cloudinaryMessage) return `Upload failed: ${cloudinaryMessage}`
  }
  return getErrorMessage(err, 'Upload failed')
}
