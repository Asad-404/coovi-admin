import { useState } from 'react'
import type { FormEvent } from 'react'
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
import { productsApi } from '@/api/products'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import { slugify } from '@/utils/format'
import type { Product } from '@/types'

interface ProductFormState {
  name: string
  nameBn: string
  slug: string
  price: string
  compareAtPrice: string
  stock: string
  category: string
  size: string
  inStock: boolean
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
  stock: '',
  category: 'Saree',
  size: 'Free Size',
  inStock: true,
  description: '',
  descriptionBn: '',
  imagesText: '',
}

const formFromProduct = (p: Product): ProductFormState => ({
  name: p.name,
  nameBn: p.nameBn ?? '',
  slug: p.slug,
  price: String(p.price),
  compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
  stock: String(p.stock),
  category: p.category,
  size: p.size ?? '',
  inStock: p.inStock,
  description: p.description ?? '',
  descriptionBn: p.descriptionBn ?? '',
  imagesText: p.images.join('\n'),
})

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

  if (isEdit && isLoading) {
    return <CircularProgress />
  }
  if (isEdit && (isError || !product)) {
    return <Alert severity="error">Could not load this product — it may have been deleted.</Alert>
  }

  // key remounts the form (and resets its state) when a different product loads
  return <ProductForm key={product?._id ?? 'new'} product={product} />
}

function ProductForm({ product }: { product?: Product }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const isEdit = Boolean(product)

  const [form, setForm] = useState<ProductFormState>(() => (product ? formFromProduct(product) : emptyForm))
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState('')

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Product>) =>
      isEdit && product
        ? productsApi.update(product._id, data)
        : productsApi.create(data),
    onSuccess: (saved) => {
      notify(isEdit ? `${saved.name} saved` : `${saved.name} created`)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const images = parseImages(form.imagesText)

    const price = Number(form.price)
    const stock = Number(form.stock)
    const compareAtPrice = form.compareAtPrice === '' ? null : Number(form.compareAtPrice)

    if (!form.name || !form.slug) {
      setError('Name and slug are required')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Price must be a number greater than 0')
      return
    }
    if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice <= price)) {
      setError('Original price must be higher than the price (or leave it empty for no sale)')
      return
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setError('Stock must be 0 or more')
      return
    }
    if (images.length === 0) {
      setError('At least one image URL is required')
      return
    }

    saveMutation.mutate({
      name: form.name,
      nameBn: form.nameBn || undefined,
      slug: form.slug,
      price,
      compareAtPrice,
      stock,
      category: form.category || 'Saree',
      size: form.size || undefined,
      inStock: form.inStock,
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
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Name (Bengali)"
                value={form.nameBn}
                onChange={(e) => set('nameBn', e.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <TextField
                label="Slug (URL part)"
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
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                fullWidth
              />
              <TextField
                label="Size"
                value={form.size}
                onChange={(e) => set('size', e.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <TextField
                label="Price (BDT)"
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                helperText="What the customer pays"
                required
                fullWidth
              />
              <TextField
                label="Original price (BDT)"
                type="number"
                value={form.compareAtPrice}
                onChange={(e) => set('compareAtPrice', e.target.value)}
                helperText="Optional. Higher than the price puts the product On Sale"
                fullWidth
              />
              <TextField
                label="Stock"
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
                label="In stock"
              />
            </Stack>

            <TextField
              label="Image URLs (one per line)"
              value={form.imagesText}
              onChange={(e) => set('imagesText', e.target.value)}
              multiline
              rows={4}
              helperText="First image is used as the product thumbnail"
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
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Description (Bengali)"
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
                disabled={saveMutation.isPending}
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
