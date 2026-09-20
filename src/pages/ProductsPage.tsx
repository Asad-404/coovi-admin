import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { productsApi } from '@/api/products'
import { formatPrice } from '@/utils/format'
import type { Product } from '@/types'

export default function ProductsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [error, setError] = useState('')

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      setDeleteTarget(null)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Delete failed')
      } else {
        setError('Delete failed')
      }
    },
  })

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget._id)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Products</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/products/new')}
        >
          Add Product
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {isLoading ? (
        <CircularProgress />
      ) : isError ? (
        <Alert severity="error">
          Could not load products — is the API running?
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
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
              {products?.map((product) => (
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
                  <TableCell>{formatPrice(product.price)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={`${product.stock} in stock`}
                      color={product.stock === 0 ? 'error' : product.stock < 6 ? 'warning' : 'success'}
                    />
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
              {products?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                      No products yet — click "Add Product" to create your first one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete product?</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget?.name} will be permanently removed from the store.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
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
