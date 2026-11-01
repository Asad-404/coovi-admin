import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import TuneIcon from '@mui/icons-material/Tune'
import AddFab from '@/components/phone/AddFab'
import BottomSheet from '@/components/phone/BottomSheet'
import ChipRow from '@/components/phone/ChipRow'
import PageHeader from '@/components/phone/PageHeader'
import { useIsPhone } from '@/hooks/useIsPhone'
import { productsApi } from '@/api/products'
import { getErrorMessage } from '@/api/errors'
import { useLowStockThreshold } from '@/api/settings'
import { useNotify } from '@/notify/context'
import { useAccess } from '@/hooks/useMe'
import { formatPrice } from '@/utils/format'
import { categoriesOf, filterProducts } from '@/utils/productFilters'
import type { ProductSort, StockFilter } from '@/utils/productFilters'
import type { Product } from '@/types'

const STOCK_FILTERS: StockFilter[] = ['all', 'low', 'out']

export default function ProductsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [searchParams, setSearchParams] = useSearchParams()
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const { can } = useAccess()
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<ProductSort>('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const isPhone = useIsPhone()

  // In the URL so the dashboard can link to /products?stock=low
  const stockParam = searchParams.get('stock') as StockFilter | null
  const stock: StockFilter = stockParam && STOCK_FILTERS.includes(stockParam) ? stockParam : 'all'
  const setStock = (value: StockFilter) =>
    setSearchParams(value === 'all' ? {} : { stock: value }, { replace: true })

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  })

  const lowStockThreshold = useLowStockThreshold()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      notify(`${deleteTarget?.name ?? 'Product'} deleted`)
      setDeleteTarget(null)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      setDeleteTarget(null)
      setError(getErrorMessage(err, 'Delete failed'))
    },
  })

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget._id)
    }
  }

  const visible = products ? filterProducts(products, { search, category, stock, sort }, lowStockThreshold) : undefined
  const categories = products ? categoriesOf(products) : []
  const hasFilters = Boolean(search || category || stock !== 'all')

  const categorySelect = (
    <Select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      size="small"
      displayEmpty
      sx={{ minWidth: 160 }}
      inputProps={{ 'aria-label': 'Category' }}
    >
      <MenuItem value="">All categories</MenuItem>
      {categories.map((c) => (
        <MenuItem key={c} value={c}>
          {c}
        </MenuItem>
      ))}
    </Select>
  )

  const sortSelect = (
    <Select
      value={sort}
      onChange={(e) => setSort(e.target.value as ProductSort)}
      size="small"
      sx={{ minWidth: 170 }}
      inputProps={{ 'aria-label': 'Sort' }}
    >
      <MenuItem value="newest">Newest first</MenuItem>
      <MenuItem value="name-asc">Name A–Z</MenuItem>
      <MenuItem value="price-asc">Price: low to high</MenuItem>
      <MenuItem value="price-desc">Price: high to low</MenuItem>
      <MenuItem value="stock-asc">Stock: lowest first</MenuItem>
    </Select>
  )

  const stockChips = (product: Product) => (
    <>
      <Chip
        size="small"
        label={`${product.stock} in stock`}
        color={product.stock === 0 ? 'error' : product.stock < lowStockThreshold ? 'warning' : 'success'}
      />
      {/* Switched off in the form: the shop shows it as out of stock and the API refuses orders */}
      {!product.inStock && <Chip size="small" variant="outlined" label="Not for sale" />}
      {product.inStock && product.allowPreorder && (
        <Chip size="small" variant="outlined" color="info" label="Pre-order" />
      )}
    </>
  )

  return (
    <Stack spacing={isPhone ? 1 : 3}>
      <PageHeader title="Products">
        {can('products.edit') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/products/new')}
          >
            Add Product
          </Button>
        )}
      </PageHeader>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {isPhone ? (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              placeholder="Search by name"
              aria-label="Search products"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
            />
            <IconButton onClick={() => setFiltersOpen(true)} aria-label="Category and sort">
              <TuneIcon />
            </IconButton>
          </Stack>
          <ChipRow
            label="Stock"
            sticky
            value={stock}
            onChange={setStock}
            options={[
              { value: 'all', label: 'All' },
              { value: 'low', label: `Low stock (under ${lowStockThreshold})` },
              { value: 'out', label: 'Out of stock' },
            ]}
          />
          <BottomSheet open={filtersOpen} title="Category and sort" onClose={() => setFiltersOpen(false)}>
            {categorySelect}
            {sortSelect}
            <Button variant="contained" onClick={() => setFiltersOpen(false)}>Show products</Button>
          </BottomSheet>
        </>
      ) : (
        <Stack direction="row" spacing={2}>
          <TextField
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          {categorySelect}
          <Select value={stock} onChange={(e) => setStock(e.target.value as StockFilter)} size="small" sx={{ minWidth: 150 }}>
            <MenuItem value="all">Any stock</MenuItem>
            <MenuItem value="low">Low stock (&lt; {lowStockThreshold})</MenuItem>
            <MenuItem value="out">Out of stock</MenuItem>
          </Select>
          {sortSelect}
        </Stack>
      )}

      {isLoading ? (
        <Paper sx={{ p: 2 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Stack key={i} direction="row" spacing={2} sx={{ alignItems: 'center', py: 1 }}>
              <Skeleton variant="rounded" width={48} height={48} />
              <Skeleton sx={{ flex: 1 }} height={32} />
            </Stack>
          ))}
        </Paper>
      ) : isError ? (
        <Alert severity="error">
          Could not load products — is the API running?
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            Showing {visible?.length ?? 0} of {products?.length ?? 0} products
          </Typography>
          {isPhone ? (
            <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Stack divider={<Divider />}>
                {visible?.map((product) => (
                  <Stack key={product._id} direction="row" sx={{ alignItems: 'center' }}>
                    <ButtonBase
                      disabled={!can('products.edit')}
                      onClick={() => navigate(`/products/${product.slug}/edit`)}
                      aria-label={`Edit ${product.name}`}
                      sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, p: 1.5 }}
                    >
                      <Avatar variant="rounded" src={product.images[0]} alt="" sx={{ width: 72, height: 88, flexShrink: 0 }} />
                      <Stack sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 500 }} noWrap>{product.name}</Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 0.5 }}>
                          <Typography sx={{ fontWeight: 700 }}>{formatPrice(product.price)}</Typography>
                          {product.compareAtPrice != null && product.compareAtPrice > product.price && (
                            <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                              {formatPrice(product.compareAtPrice)}
                            </Typography>
                          )}
                        </Stack>
                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>{stockChips(product)}</Stack>
                      </Stack>
                    </ButtonBase>
                    {can('products.delete') && (
                      <IconButton onClick={() => setDeleteTarget(product)} aria-label={`Delete ${product.name}`} sx={{ mr: 0.5 }}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Stack>
                ))}
                {visible?.length === 0 && (
                  <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
                    {hasFilters ? 'No products match your filters.' : 'No products yet. Tap Add product to create your first one.'}
                  </Typography>
                )}
              </Stack>
            </Paper>
          ) : (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible?.map((product) => (
                  <TableRow key={product._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Avatar
                          variant="rounded"
                          src={product.images[0]}
                          alt={product.name}
                          sx={{ width: 48, height: 48 }}
                        />
                        <Stack>
                          <Typography variant="body1">{product.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {product.nameBn ?? product.slug}
                          </Typography>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {formatPrice(product.price)}
                      {product.compareAtPrice != null && product.compareAtPrice > product.price && (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                            {formatPrice(product.compareAtPrice)}
                          </Typography>
                          <Chip size="small" color="error" label="On sale" />
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>{stockChips(product)}</Stack>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell align="right">
                      {can('products.edit') && (
                        <IconButton
                          color="primary"
                          onClick={() => navigate(`/products/${product.slug}/edit`)}
                          aria-label={`Edit ${product.name}`}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {/* Needs products.delete; others switch a product off in its form instead */}
                      {can('products.delete') && (
                        <IconButton
                          color="error"
                          onClick={() => setDeleteTarget(product)}
                          aria-label={`Delete ${product.name}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {visible?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                        {hasFilters
                          ? 'No products match your filters.'
                          : 'No products yet — click "Add Product" to create your first one.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          )}
        </>
      )}

      {isPhone && can('products.edit') && (
        <AddFab label="Add product" icon={<AddIcon />} onClick={() => navigate('/products/new')} />
      )}

      <Dialog open={deleteTarget !== null} onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}>
        <DialogTitle>Delete product?</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget?.name} will be permanently removed from the store.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
