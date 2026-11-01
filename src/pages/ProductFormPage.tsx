import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StickyActions from '@/components/phone/StickyActions'
import { useIsPhone } from '@/hooks/useIsPhone'
import { productsApi } from '@/api/products'
import { getErrorMessage } from '@/api/errors'
import {
  appendImageUrls,
  checkImageFile,
  checkShareImage,
  getUploadErrorMessage,
  moveImageUrlFirst,
  parseImages,
  readImageSize,
  removeImageUrl,
  uploadsApi,
} from '@/api/uploads'
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
  shareImage: string
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
  shareImage: '',
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
  shareImage: p.shareImage ?? '',
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
  // Rarely needed fields start folded away; a problem in one opens it
  const [moreOpen, setMoreOpen] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const isPhone = useIsPhone()

  // A new product stays a draft until someone presses Publish
  const isPublished = product?.published ?? false

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Product>) =>
      isEdit && product
        ? productsApi.update(product._id, data)
        : productsApi.create(data),
    onSuccess: (saved) => {
      if (saved.published !== isPublished) {
        notify(`${saved.name} ${saved.published ? 'published' : 'unpublished'}`)
      } else {
        notify(saved.published ? `${saved.name} saved` : `${saved.name} saved as a draft`)
      }
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

  // The share image is checked for size and weight before it goes to Cloudinary
  const handleShareImagePicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    setUploading(true)
    try {
      const problem = checkImageFile(file) ?? checkShareImage(file, await readImageSize(file))
      if (problem) {
        setError(problem)
        return
      }
      const url = await uploadsApi.uploadImage(file, await uploadsApi.getSignature())
      setForm((f) => ({ ...f, shareImage: url }))
      notify('Share image uploaded')
    } catch (err) {
      setError(getUploadErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  // Enter in a text box and the save button keep the product as it is, so typing can never publish it
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    save(isPublished)
  }

  const save = (published: boolean) => {
    setError('')

    const images = parseImages(form.imagesText)

    const price = Number(form.price)
    const stock = Number(form.stock)
    const compareAtPrice = form.compareAtPrice === '' ? null : Number(form.compareAtPrice)
    const preorderDays = Number(form.preorderDays)
    const cost = form.costPrice === '' ? null : Number(form.costPrice)

    // Same rules as the API's product schema, checked here for a friendlier message
    if (!form.name) {
      setError('Name is required')
      return
    }
    if (!form.slug) {
      setMoreOpen(true)
      setError('Web address (slug) is required')
      return
    }
    if (!SLUG_PATTERN.test(form.slug)) {
      setMoreOpen(true)
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
    if (form.stock.trim() === '' || !Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a whole number, 0 or more')
      return
    }
    if (!Number.isInteger(preorderDays) || preorderDays < 1 || preorderDays > 90) {
      setError('Pre-order wait must be a whole number of days from 1 to 90')
      return
    }
    if (images.length === 0) {
      setError('Add at least one photo')
      return
    }
    const badImage = images.find((url) => !isHttpUrl(url))
    if (badImage) {
      setLinksOpen(true)
      setError(`Not a valid image URL: ${badImage}`)
      return
    }
    const shareImage = form.shareImage.trim()
    if (shareImage && !isHttpUrl(shareImage)) {
      setMoreOpen(true)
      setError(`Not a valid share image URL: ${shareImage}`)
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
      shareImage: shareImage || undefined,
      published,
    })
  }

  const imagePreviews = parseImages(form.imagesText)
  const busy = saveMutation.isPending || uploading
  const pendingPublished = saveMutation.isPending ? saveMutation.variables?.published : undefined
  const spinner = <CircularProgress size={20} color="inherit" />

  const uploadIcon = uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />
  // On a phone number boxes sit in pairs, so more of the form fits on screen
  const numberGrid = { display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, alignItems: 'start' }

  return (
    <Stack spacing={isPhone ? 2 : 3} component="form" onSubmit={handleSubmit} noValidate>
      {!isPhone && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/products')}>
            Back
          </Button>
          <Typography variant="h4">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </Typography>
        </Stack>
      )}

      {/* Photos come first: this is what sells a saree, and they are usually on this phone */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Photos</Typography>
            {imagePreviews.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1 }}>
                {imagePreviews.map((url, i) => (
                  <Box key={`${url}-${i}`} sx={{ position: 'relative' }}>
                    <Avatar
                      variant="rounded"
                      src={url}
                      alt={`Photo ${i + 1}`}
                      sx={{ width: '100%', height: 'auto', aspectRatio: '3 / 4', outline: i === 0 ? 2 : 0, outlineColor: 'secondary.main' }}
                    />
                    {i === 0 ? (
                      <Typography
                        variant="caption"
                        sx={{ position: 'absolute', left: 4, bottom: 4, px: 0.75, borderRadius: 1, bgcolor: 'secondary.main', color: 'secondary.contrastText', fontWeight: 600 }}
                      >
                        Thumbnail
                      </Typography>
                    ) : (
                      <IconButton
                        size="small"
                        aria-label={`Use photo ${i + 1} as the thumbnail`}
                        onClick={() => set('imagesText', moveImageUrlFirst(form.imagesText, i))}
                        sx={{ position: 'absolute', left: 2, bottom: 2, minWidth: 36, minHeight: 36, color: 'common.white', bgcolor: 'rgba(12,41,83,0.7)', '&:hover': { bgcolor: 'rgba(12,41,83,0.85)' } }}
                      >
                        <StarBorderIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      aria-label={`Remove photo ${i + 1}`}
                      onClick={() => set('imagesText', removeImageUrl(form.imagesText, i))}
                      sx={{ position: 'absolute', right: 2, top: 2, minWidth: 36, minHeight: 36, color: 'common.white', bgcolor: 'rgba(12,41,83,0.7)', '&:hover': { bgcolor: 'rgba(12,41,83,0.85)' } }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
              <Button component="label" variant="outlined" disabled={uploading} startIcon={uploadIcon}>
                {uploading ? 'Uploading…' : 'Upload photos'}
                <input type="file" accept="image/*" multiple hidden onChange={handleFilesPicked} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                JPG, PNG or WebP, up to 10 MB each
              </Typography>
            </Stack>
            <Accordion
              disableGutters
              elevation={0}
              expanded={linksOpen}
              onChange={(_, open) => setLinksOpen(open)}
              sx={{ bgcolor: 'transparent', '&::before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                <Typography variant="body2">Paste photo links instead</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0 }}>
                <TextField
                  label="Photo links (one per line)"
                  value={form.imagesText}
                  onChange={(e) => set('imagesText', e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  helperText="Uploaded photos are added here. The first one is the thumbnail"
                />
              </AccordionDetails>
            </Accordion>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Name and price</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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
            <Box sx={numberGrid}>
              <TextField
                label="Price (BDT)"
                slotProps={{ htmlInput: { min: 0, step: 1, inputMode: 'numeric' } }}
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                helperText="What the customer pays"
                required
              />
              <TextField
                label="Stock"
                slotProps={{ htmlInput: { min: 0, step: 1, inputMode: 'numeric' } }}
                type="number"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                helperText="Pieces you have"
                required
              />
              <TextField
                label="Original price"
                slotProps={{ htmlInput: { min: 0, step: 1, inputMode: 'numeric' } }}
                type="number"
                value={form.compareAtPrice}
                onChange={(e) => set('compareAtPrice', e.target.value)}
                helperText="Optional. Higher than the price puts it On Sale"
              />
              {canSeeCost && (
                <TextField
                  label="Cost price"
                  slotProps={{ htmlInput: { min: 0, step: 'any', inputMode: 'decimal' } }}
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => set('costPrice', e.target.value)}
                  helperText="What you paid for one. Customers never see it"
                />
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h6">Selling</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={form.inStock}
                  onChange={(e) => set('inStock', e.target.checked)}
                />
              }
              label="Available for sale"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.allowPreorder}
                  onChange={(e) => set('allowPreorder', e.target.checked)}
                />
              }
              label="Take pre-orders when out of stock"
            />
            {form.allowPreorder && (
              <TextField
                label="Pre-order wait (days)"
                slotProps={{ htmlInput: { min: 1, max: 90, step: 1, inputMode: 'numeric' } }}
                type="number"
                value={form.preorderDays}
                onChange={(e) => set('preorderDays', e.target.value)}
                helperText="Shown to the customer. Pre-ordered pieces are never added to stock"
                sx={{ maxWidth: { md: 320 }, pt: 1 }}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Description</Typography>
            <TextField
              label="Description (English)"
              slotProps={maxLength(2000)}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label="Description (Bengali)"
              slotProps={maxLength(2000)}
              value={form.descriptionBn}
              onChange={(e) => set('descriptionBn', e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </CardContent>
      </Card>

      <Accordion expanded={moreOpen} onChange={(_, open) => setMoreOpen(open)} sx={{ '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Web address, category and sharing</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              label="Slug (URL part)"
              slotProps={maxLength(100)}
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true)
                set('slug', e.target.value)
              }}
              helperText="Auto-generated from the name — editable"
              fullWidth
            />
            <Stack direction="row" spacing={2}>
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
              <Button component="label" variant="outlined" disabled={uploading} startIcon={uploadIcon}>
                {uploading ? 'Uploading…' : 'Upload share image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleShareImagePicked} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                1200 x 630 px JPG, under 300 KB. Keep the saree in the middle square
              </Typography>
            </Stack>
            <TextField
              label="Share image URL (optional)"
              value={form.shareImage}
              onChange={(e) => set('shareImage', e.target.value)}
              helperText="Shown when the product link is shared on Facebook, Messenger or WhatsApp. Empty uses the first photo"
              fullWidth
            />
            {form.shareImage.trim() && (
              <Avatar
                variant="rounded"
                src={form.shareImage.trim()}
                alt="Share image"
                sx={{ width: 191, height: 100 }}
              />
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6">Publish</Typography>
              <Chip size="small" color={isPublished ? 'success' : 'warning'} label={isPublished ? 'Published' : 'Draft'} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {isPublished
                ? 'Customers can see and order this product. Unpublish takes it off the shop without deleting it.'
                : 'Customers cannot see or order this product until you publish it.'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <StickyActions error={error} onCloseError={() => setError('')}>
        <Stack direction="row" spacing={isPhone ? 1 : 2}>
          {isPublished ? (
            <>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth={isPhone}
                disabled={busy}
                startIcon={pendingPublished === true ? spinner : undefined}
              >
                {pendingPublished === true ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                fullWidth={isPhone}
                disabled={busy}
                startIcon={pendingPublished === false ? spinner : undefined}
                onClick={() => save(false)}
              >
                {pendingPublished === false ? 'Unpublishing…' : 'Unpublish'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="submit"
                variant="outlined"
                size="large"
                fullWidth={isPhone}
                disabled={busy}
                startIcon={pendingPublished === false ? spinner : undefined}
              >
                {pendingPublished === false ? 'Saving…' : 'Save draft'}
              </Button>
              <Button
                variant="contained"
                size="large"
                fullWidth={isPhone}
                disabled={busy}
                startIcon={pendingPublished === true ? spinner : undefined}
                onClick={() => save(true)}
              >
                {pendingPublished === true ? 'Publishing…' : 'Publish'}
              </Button>
            </>
          )}
          {!isPhone && (
            <Button size="large" onClick={() => navigate('/products')}>
              Cancel
            </Button>
          )}
        </Stack>
      </StickyActions>
    </Stack>
  )
}
