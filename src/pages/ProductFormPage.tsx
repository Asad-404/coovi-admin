import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { productsApi } from '@/api/products'
import { getErrorMessage } from '@/api/errors'
import { appendImageUrls, checkImageFile, getUploadErrorMessage, uploadsApi } from '@/api/uploads'
import { useNotify } from '@/notify/context'
import { slugify } from '@/utils/format'
import type { Product } from '@/types'
import { useAccess } from '@/hooks/useMe'

interface ProductFormState {
  name: string
  nameBn: string
  slug: string
  price: string
  compareAtPrice: string
  costPrice: string
  stock: string
  category: string
  size: string
  inStock: boolean
  allowPreorder: boolean
  preorderDays: string
  description: string
  descriptionBn: string
  imagesText: string
}

const emptyForm: ProductFormState = {
  name: '',
  nameBn: '',
  slug: '',
  price: '',
  compareAtPrice: '',
  costPrice: '',
  stock: '',
  category: 'Saree',
  size: 'Free Size',
  inStock: true,
  allowPreorder: false,
  preorderDays: '15',
  description: '',
  descriptionBn: '',
  imagesText: '',
}

const formFromProduct = (p: Product, costPrice: number | null | undefined): ProductFormState => ({
  name: p.name,
  nameBn: p.nameBn ?? '',
  slug: p.slug,
  price: String(p.price),
  compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
  costPrice: costPrice == null ? '' : String(costPrice),
  stock: String(p.stock),
  category: p.category,
  size: p.size ?? '',
  inStock: p.inStock,
  allowPreorder: p.allowPreorder ?? false,
  preorderDays: String(p.preorderDays ?? 15),
  description: p.description ?? '',
  descriptionBn: p.descriptionBn ?? '',
  imagesText: p.images.join('\n'),
})

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Length limits from the API's product schema
const maxLength = (n: number) => ({ htmlInput: { maxLength: n } })

const parseImages = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

export default function ProductFormPage() {
  const { slug } = useParams()
  const isEdit = Boolean(slug)

  // Edit mode: fetch the product by slug, then mount the form with it
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug as string),
    enabled: isEdit,
  })

  // The cost price is kept out of product responses; people with money access load it separately
  const { can } = useAccess()
  const canSeeCost = can('money.view')
  const cost = useQuery({
    queryKey: ['product-cost', product?._id],
    queryFn: () => productsApi.getCost(product!._id),
    enabled: canSeeCost && Boolean(product),
  })

  if (isEdit && (isLoading || (canSeeCost && cost.isLoading))) {
    return <CircularProgress />
  }
  if (isEdit && (isError || !product)) {
    return <Alert severity="error">Could not load this product — it may have been deleted.</Alert>
  }
  if (isEdit && canSeeCost && cost.isError) {
    return <Alert severity="error">Could not load this product's cost price. Try again in a moment.</Alert>
  }

  // key remounts the form (and resets its state) when a different product loads
  return <ProductForm key={product?._id ?? 'new'} product={product} costPrice={cost.data} canSeeCost={canSeeCost} />
}

interface ProductFormProps {
  product?: Product
  costPrice?: number | null
  canSeeCost: boolean
}

function ProductForm({ product, costPrice, canSeeCost }: ProductFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const isEdit = Boolean(product)

  const [form, setForm] = useState<ProductFormState>(() => (product ? formFromProduct(product, costPrice) : emptyForm))
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Product>) =>
      isEdit && product
        ? productsApi.update(product._id, data)
        : productsApi.create(data),
    onSuccess: (saved) => {
      notify(isEdit ? `${saved.name} saved` : `${saved.name} created`)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
      queryClient.invalidateQueries({ queryKey: ['product-cost'] })
      navigate('/products')
    },
    onError: (err) => setError(getErrorMessage(err, 'Save failed')),
  })

  const set = (field: keyof ProductFormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  // Auto-generate slug from the name (create mode only, until edited by hand)
  const handleNameChange = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugEdited || isEdit ? f.slug : slugify(value),
    }))
  }

  // Photos go from this browser straight to Cloudinary; the API only signs the request.
  // Each finished upload is added to the URL box right away, so one failure keeps the rest.
  const handleFilesPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    // Clear the picker so choosing the same file again still fires onChange
    e.target.value = ''
    if (files.length === 0) return

    setError('')
    const problem = files.map(checkImageFile).find(Boolean)
    if (problem) {
      setError(problem)
      return
    }

    setUploading(true)
    try {
      const signature = await uploadsApi.getSignature()
      for (const file of files) {
        const url = await uploadsApi.uploadImage(file, signature)
        setForm((f) => ({ ...f, imagesText: appendImageUrls(f.imagesText, [url]) }))
      }
      notify(files.length === 1 ? 'Photo uploaded' : `${files.length} photos uploaded`)
    } catch (err) {
      setError(getUploadErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const images = parseImages(form.imagesText)

    const price = Number(form.price)
    const stock = Number(form.stock)
    const compareAtPrice = form.compareAtPrice === '' ? null : Number(form.compareAtPrice)
    const preorderDays = Number(form.preorderDays)
    const cost = form.costPrice === '' ? null : Number(form.costPrice)

    // Same rules as the API's product schema, checked here for a friendlier message
    if (!form.name || !form.slug) {
      setError('Name and slug are required')
      return
    }
    if (!SLUG_PATTERN.test(form.slug)) {
      setError('Slug must be lowercase letters and numbers joined by single hyphens, e.g. red-silk-saree')
      return
    }
    if (!Number.isInteger(price) || price <= 0) {
      setError('Price must be a whole number of taka greater than 0')
      return
    }
    if (compareAtPrice !== null && (!Number.isInteger(compareAtPrice) || compareAtPrice <= price)) {
      setError('Original price must be a whole number higher than the price (or leave it empty for no sale)')
      return
    }
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      setError('Cost price must be 0 or more (or leave it empty if you are not sure)')
      return
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a whole number, 0 or more')
      return
    }
    if (!Number.isInteger(preorderDays) || preorderDays < 1 || preorderDays > 90) {
      setError('Pre-order wait must be a whole number of days from 1 to 90')
      return
    }
    if (images.length === 0) {
      setError('At least one image URL is required')
      return
    }
    const badImage = images.find((url) => !isHttpUrl(url))
    if (badImage) {
      setError(`Not a valid image URL: ${badImage}`)
      return
    }

    saveMutation.mutate({
      name: form.name,
      nameBn: form.nameBn || undefined,
      slug: form.slug,
      price,
      compareAtPrice,
      // Only people with money access send it; left out, the saved cost stays as it is
      ...(canSeeCost && { costPrice: cost }),
      stock,
      category: form.category || 'Saree',
      size: form.size || undefined,
      inStock: form.inStock,
      allowPreorder: form.allowPreorder,
      preorderDays,
      description: form.description || undefined,
      descriptionBn: form.descriptionBn || undefined,
      images,
    })
  }

  const imagePreviews = parseImages(form.imagesText)

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/products')}>
          Back
        </Button>
        <Typography variant="h4">
          {isEdit ? 'Edit Product' : 'Add Product'}
        </Typography>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <TextField
                label="Name (English)"
                slotProps={maxLength(120)}
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Name (Bengali)"
                slotProps={maxLength(120)}
                value={form.nameBn}
                onChange={(e) => set('nameBn', e.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <TextField
                label="Slug (URL part)"
                slotProps={maxLength(100)}
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  set('slug', e.target.value)
                }}
                helperText="Auto-generated from the name — editable"
                required
                fullWidth
              />
              <TextField
                label="Category"
                slotProps={maxLength(50)}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                fullWidth
              />
              <TextField
                label="Size"
                slotProps={maxLength(50)}
                value={form.size}
                onChange={(e) => set('size', e.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <TextField
                label="Price (BDT)"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                helperText="What the customer pays"
                required
                fullWidth
              />
              <TextField
                label="Original price (BDT)"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                type="number"
                value={form.compareAtPrice}
                onChange={(e) => set('compareAtPrice', e.target.value)}
                helperText="Optional. Higher than the price puts the product On Sale"
                fullWidth
              />
              {canSeeCost && (
                <TextField
                  label="Cost price (BDT)"
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => set('costPrice', e.target.value)}
                  helperText="What you paid for one piece. Only for profit; customers never see it"
                  fullWidth
                />
              )}
              <TextField
                label="Stock"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                type="number"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                required
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.inStock}
                    onChange={(e) => set('inStock', e.target.checked)}
                  />
                }
                label="Available for sale"
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: { md: 'center' } }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.allowPreorder}
                    onChange={(e) => set('allowPreorder', e.target.checked)}
                  />
                }
                label="Take pre-orders when out of stock"
              />
              <TextField
                label="Pre-order wait (days)"
                slotProps={{ htmlInput: { min: 1, max: 90, step: 1 } }}
                type="number"
                value={form.preorderDays}
                onChange={(e) => set('preorderDays', e.target.value)}
                helperText="Shown to the customer. Pre-ordered pieces are never added to stock"
                disabled={!form.allowPreorder}
                sx={{ maxWidth: { md: 260 } }}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Button
                component="label"
                variant="outlined"
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
              >
                {uploading ? 'Uploading…' : 'Upload photos'}
                <input type="file" accept="image/*" multiple hidden onChange={handleFilesPicked} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                JPG, PNG or WebP, up to 10 MB each
              </Typography>
            </Stack>
            <TextField
              label="Image URLs (one per line)"
              value={form.imagesText}
              onChange={(e) => set('imagesText', e.target.value)}
              multiline
              rows={4}
              helperText="Uploaded photos are added here. First image is used as the product thumbnail"
              required
            />
            {imagePreviews.length > 0 && (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {imagePreviews.map((url, i) => (
                  <Avatar
                    key={`${url}-${i}`}
                    variant="rounded"
                    src={url}
                    alt={`Image ${i + 1}`}
                    sx={{ width: 72, height: 72, outline: i === 0 ? 2 : 0, outlineColor: 'secondary.main' }}
                  />
                ))}
              </Stack>
            )}

            <TextField
              label="Description (English)"
              slotProps={maxLength(2000)}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Description (Bengali)"
              slotProps={maxLength(2000)}
              value={form.descriptionBn}
              onChange={(e) => set('descriptionBn', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={saveMutation.isPending || uploading}
                startIcon={saveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {saveMutation.isPending
                  ? 'Saving…'
                  : isEdit
                    ? 'Save Changes'
                    : 'Create Product'}
              </Button>
              <Button size="large" onClick={() => navigate('/products')}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
