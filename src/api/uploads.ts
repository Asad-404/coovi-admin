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

// Every card and gallery on the shop shows a photo in an upright 3:4 frame, so other shapes get cropped
export const PHOTO_EXAMPLE = '1200 x 1600 px'
const PHOTO_RATIO = 3 / 4
const MIN_PHOTO_WIDTH = 600
// A pixel or two off the exact shape is fine
const RATIO_TOLERANCE = 0.02

const isRatio = (size: ImageSize, wanted: number): boolean =>
  Math.abs(size.width / size.height - wanted) / wanted <= RATIO_TOLERANCE

// Returns why a product photo has the wrong shape or size, or null when it is fine
export const checkPhotoSize = (name: string, size: ImageSize): string | null => {
  const measured = `${name} is ${size.width} x ${size.height} px`
  if (!isRatio(size, PHOTO_RATIO)) return `${measured}. Photos must be upright 3:4, for example ${PHOTO_EXAMPLE}`
  if (size.width < MIN_PHOTO_WIDTH) return `${measured}, too small. Use ${PHOTO_EXAMPLE}`
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

// Any 1.91:1 picture of at least 600 px wide passes, so 1200x630 and 1201x630 both work
const checkShareImageSize = (name: string, size: ImageSize): string | null => {
  const wanted = `${SHARE_IMAGE_WIDTH} x ${SHARE_IMAGE_HEIGHT} px`
  if (!isRatio(size, SHARE_IMAGE_WIDTH / SHARE_IMAGE_HEIGHT)) {
    return `${name} is ${size.width} x ${size.height} px. A share image must be a wide ${wanted} picture`
  }
  if (size.width < MIN_SHARE_IMAGE_WIDTH) {
    return `${name} is ${size.width} x ${size.height} px, too small. Use ${wanted}`
  }
  return null
}

// Returns why a picked share image should not be used, or null when it is fine.
export const checkShareImage = (file: File, size: ImageSize): string | null => {
  const problem = checkImageFile(file) ?? checkShareImageSize(file.name, size)
  if (problem) return problem
  if (file.size > MAX_SHARE_IMAGE_BYTES) {
    return `${file.name} is ${Math.round(file.size / 1024)} KB. Save it as a JPG under 300 KB so WhatsApp shows it`
  }
  return null
}

const loadImageSize = (src: string): Promise<ImageSize> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error(`Could not open ${src}`))
    img.src = src
  })

// Reads a picked image's width and height in the browser
export const readImageSize = async (file: File): Promise<ImageSize> => {
  const url = URL.createObjectURL(file)
  try {
    return await loadImageSize(url)
  } catch {
    throw new Error(`Could not read ${file.name} as an image`)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// What a product needs before customers can see it. The API refuses to publish without these too
export const MIN_PUBLISHED_PHOTOS = 3

export type PublishProblem = { field: 'photos' | 'shareImage'; message: string }

export const checkPublishNeeds = (images: string[], shareImage: string): PublishProblem | null => {
  if (new Set(images).size < MIN_PUBLISHED_PHOTOS) {
    return { field: 'photos', message: `Add at least ${MIN_PUBLISHED_PHOTOS} different photos before publishing` }
  }
  if (!shareImage) return { field: 'shareImage', message: 'Add a share image before publishing' }
  return null
}

// Opens the saved pictures, which also catches a pasted link that was never checked on upload.
// The sizes come in as a parameter so this can be tested without a browser
export const findPictureProblem = async (
  images: string[],
  shareImage: string,
  readSize: (url: string) => Promise<ImageSize> = loadImageSize,
): Promise<PublishProblem | null> => {
  for (const [i, url] of images.entries()) {
    const name = `Photo ${i + 1}`
    const size = await readSize(url).catch(() => null)
    if (!size) return { field: 'photos', message: `Could not open ${name.toLowerCase()}. Check the link or upload it again` }
    const message = checkPhotoSize(name, size)
    if (message) return { field: 'photos', message }
  }
  const size = await readSize(shareImage).catch(() => null)
  if (!size) return { field: 'shareImage', message: 'Could not open the share image. Check the link or upload it again' }
  const message = checkShareImageSize('Share image', size)
  return message ? { field: 'shareImage', message } : null
}

// Adds uploaded URLs as new lines below whatever is already in the URL box
export const appendImageUrls = (text: string, urls: string[]): string =>
  [text.trimEnd(), ...urls].filter(Boolean).join('\n')

export const parseImages = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

export const removeImageUrl = (text: string, index: number): string =>
  parseImages(text)
    .filter((_, i) => i !== index)
    .join('\n')

// The first photo is the product's thumbnail
export const moveImageUrlFirst = (text: string, index: number): string => {
  const images = parseImages(text)
  return [images[index], ...images.filter((_, i) => i !== index)].join('\n')
}

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
