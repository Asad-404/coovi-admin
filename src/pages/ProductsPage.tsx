import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { productsApi } from '@/api/products'
import { getErrorMessage } from '@/api/errors'
import { LOW_STOCK_THRESHOLD } from '@/constants'
import { useNotify } from '@/notify/context'
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
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<ProductSort>('newest')

  // In the URL so the dashboard can link to /products?stock=low
  const stockParam = searchParams.get('stock') as StockFilter | null
  const stock: StockFilter = stockParam && STOCK_FILTERS.includes(stockParam) ? stockParam : 'all'
  const setStock = (value: StockFilter) =>
    setSearchParams(value === 'all' ? {} : { stock: value }, { replace: true })

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  })

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

  const visible = products ? filterProducts(products, { search, category, stock, sort }) : undefined
  const categories = products ? categoriesOf(products) : []
  const hasFilters = Boolean(search || category || stock !== 'all')

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Products</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/products/new')}
        >
          Add Product
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          size="small"
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </Select>
        <Select value={stock} onChange={(e) => setStock(e.target.value as StockFilter)} size="small" sx={{ minWidth: 150 }}>
          <MenuItem value="all">Any stock</MenuItem>
          <MenuItem value="low">Low stock (&lt; {LOW_STOCK_THRESHOLD})</MenuItem>
          <MenuItem value="out">Out of stock</MenuItem>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as ProductSort)} size="small" sx={{ minWidth: 170 }}>
          <MenuItem value="newest">Newest first</MenuItem>
          <MenuItem value="name-asc">Name A–Z</MenuItem>
          <MenuItem value="price-asc">Price: low to high</MenuItem>
          <MenuItem value="price-desc">Price: high to low</MenuItem>
          <MenuItem value="stock-asc">Stock: lowest first</MenuItem>
        </Select>
      </Stack>

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
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          size="small"
                          label={`${product.stock} in stock`}
                          color={product.stock === 0 ? 'error' : product.stock < LOW_STOCK_THRESHOLD ? 'warning' : 'success'}
                        />
                        {/* Switched off in the form: the shop shows it as out of stock and the API refuses orders */}
                        {!product.inStock && <Chip size="small" variant="outlined" label="Not for sale" />}
                      </Stack>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/products/${product.slug}/edit`)}
                        aria-label={`Edit ${product.name}`}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => setDeleteTarget(product)}
                        aria-label={`Delete ${product.name}`}
                      >
                        <DeleteIcon />
                      </IconButton>
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
        </>
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
