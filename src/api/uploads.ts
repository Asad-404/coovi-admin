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

// Share image: the wide picture Facebook, Messenger and WhatsApp show when a product link is shared.
// 1200x630 is Facebook's recommended size; WhatsApp often skips preview images above about 300 KB
export const SHARE_IMAGE_WIDTH = 1200
export const SHARE_IMAGE_HEIGHT = 630
export const MAX_SHARE_IMAGE_BYTES = 300 * 1024
// Below this Facebook shows a small thumbnail instead of the big preview
const MIN_SHARE_IMAGE_WIDTH = 600

export interface ImageSize {
  width: number
  height: number
}

// Returns why a picked share image should not be used, or null when it is fine.
// Any 1.91:1 picture of at least 600 px wide passes, so 1200x630 and 1201x630 both work
export const checkShareImage = (file: File, size: ImageSize): string | null => {
  const problem = checkImageFile(file)
  if (problem) return problem
  const wanted = `${SHARE_IMAGE_WIDTH} x ${SHARE_IMAGE_HEIGHT} px`
  const ratio = size.width / size.height
  const wantedRatio = SHARE_IMAGE_WIDTH / SHARE_IMAGE_HEIGHT
  if (Math.abs(ratio - wantedRatio) / wantedRatio > 0.02) {
    return `${file.name} is ${size.width} x ${size.height} px. A share image must be a wide ${wanted} picture`
  }
  if (size.width < MIN_SHARE_IMAGE_WIDTH) {
    return `${file.name} is ${size.width} x ${size.height} px, too small. Use ${wanted}`
  }
  if (file.size > MAX_SHARE_IMAGE_BYTES) {
    return `${file.name} is ${Math.round(file.size / 1024)} KB. Save it as a JPG under 300 KB so WhatsApp shows it`
  }
  return null
}

// Reads a picked image's width and height in the browser
export const readImageSize = (file: File): Promise<ImageSize> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not read ${file.name} as an image`))
    }
    img.src = url
  })

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
