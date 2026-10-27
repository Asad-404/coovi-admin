import axios, { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import apiClient from './client'
import {
  MAX_IMAGE_BYTES,
  MAX_SHARE_IMAGE_BYTES,
  appendImageUrls,
  checkImageFile,
  checkShareImage,
  getUploadErrorMessage,
  uploadsApi,
} from './uploads'

afterEach(() => vi.restoreAllMocks())

const SIGNATURE = {
  cloudName: 'demo-cloud',
  apiKey: '123456789012345',
  timestamp: 1700000000,
  folder: 'coovi/products',
  signature: 'abc123',
}

const photo = (name = 'saree.jpg', type = 'image/jpeg') => new File(['x'], name, { type })

describe('checkShareImage', () => {
  const sized = (bytes: number, type = 'image/jpeg') => new File([new Uint8Array(bytes)], 'share.jpg', { type })
  const WIDE = { width: 1200, height: 630 }

  it('accepts a 1200 x 630 JPG under 300 KB', () => {
    expect(checkShareImage(sized(100 * 1024), WIDE)).toBeNull()
  })

  it('accepts a picture a pixel or two off the exact size', () => {
    expect(checkShareImage(sized(1000), { width: 1201, height: 630 })).toBeNull()
  })

  it('rejects a tall saree photo', () => {
    expect(checkShareImage(sized(1000), { width: 800, height: 1200 })).toMatch(/800 x 1200 px.*1200 x 630/)
  })

  it('rejects a wide picture that is too small', () => {
    expect(checkShareImage(sized(1000), { width: 400, height: 210 })).toMatch(/too small/)
  })

  it('rejects a file over 300 KB', () => {
    expect(checkShareImage(sized(MAX_SHARE_IMAGE_BYTES + 1), WIDE)).toMatch(/under 300 KB/)
  })

  it('rejects a file that is not an image', () => {
    expect(checkShareImage(sized(1000, 'application/pdf'), WIDE)).toMatch(/not an image/)
  })
})

describe('checkImageFile', () => {
  it('accepts a normal photo', () => {
    expect(checkImageFile(photo())).toBeNull()
  })

  it('rejects a file that is not an image', () => {
    expect(checkImageFile(photo('price-list.pdf', 'application/pdf'))).toBe('price-list.pdf is not an image')
  })

  it('rejects a photo above 10 MB', () => {
    const big = photo('huge.jpg')
    Object.defineProperty(big, 'size', { value: MAX_IMAGE_BYTES + 1 })
    expect(checkImageFile(big)).toBe('huge.jpg is larger than 10 MB')
  })
})

describe('appendImageUrls', () => {
  it('adds new URLs below the existing ones', () => {
    expect(appendImageUrls('https://a.test/1.jpg\n', ['https://a.test/2.jpg'])).toBe(
      'https://a.test/1.jpg\nhttps://a.test/2.jpg',
    )
  })

  it('starts the list when the box is empty', () => {
    expect(appendImageUrls('', ['https://a.test/1.jpg', 'https://a.test/2.jpg'])).toBe(
      'https://a.test/1.jpg\nhttps://a.test/2.jpg',
    )
  })
})

describe('uploadsApi', () => {
  it('asks our API for the signature', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: SIGNATURE } })
    expect(await uploadsApi.getSignature()).toEqual(SIGNATURE)
    expect(post).toHaveBeenCalledWith('/uploads/signature')
  })

  it('sends the signed file to Cloudinary and returns the https URL', async () => {
    const post = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/saree.jpg' } })
    const file = photo()

    expect(await uploadsApi.uploadImage(file, SIGNATURE)).toBe(
      'https://res.cloudinary.com/demo-cloud/image/upload/saree.jpg',
    )

    const [url, body] = post.mock.calls[0] as [string, FormData]
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload')
    expect(body.get('file')).toBe(file)
    expect(body.get('api_key')).toBe('123456789012345')
    expect(body.get('timestamp')).toBe('1700000000')
    expect(body.get('folder')).toBe('coovi/products')
    expect(body.get('signature')).toBe('abc123')
  })
})

describe('getUploadErrorMessage', () => {
  const axiosError = (data: unknown) =>
    new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, { status: 400, data } as AxiosResponse)

  it("shows Cloudinary's own reason", () => {
    expect(getUploadErrorMessage(axiosError({ error: { message: 'Invalid Signature' } }))).toBe(
      'Upload failed: Invalid Signature',
    )
  })

  it("shows our API's message", () => {
    expect(getUploadErrorMessage(axiosError({ message: 'Image upload is not configured on the server' }))).toBe(
      'Image upload is not configured on the server',
    )
  })
})
