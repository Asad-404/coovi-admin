import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DashboardIcon from '@mui/icons-material/Dashboard'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import LogoutIcon from '@mui/icons-material/Logout'
import LockResetIcon from '@mui/icons-material/LockReset'
import MenuIcon from '@mui/icons-material/Menu'
import ChangePasswordDialog from '@/components/ChangePasswordDialog'
import { clearToken } from '@/utils/auth'

const drawerWidth = 240

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Products', to: '/products', icon: <Inventory2Icon /> },
  { label: 'Orders', to: '/orders', icon: <ReceiptLongIcon /> },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const logout = () => {
    clearToken()
    // Don't leave the previous admin's orders and customer details in memory
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  const go = (to: string) => {
    navigate(to)
    setMobileOpen(false)
  }

  const drawerContent = (
    <>
      <Toolbar />
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            selected={location.pathname.startsWith(item.to)}
            onClick={() => go(item.to)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen((o) => !o)} aria-label="Open menu" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Coovi Admin
          </Typography>
          {isDesktop ? (
            <>
              <Button color="inherit" startIcon={<LockResetIcon />} onClick={() => setPasswordOpen(true)}>
                Password
              </Button>
              <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <IconButton color="inherit" onClick={() => setPasswordOpen(true)} aria-label="Change password">
                <LockResetIcon />
              </IconButton>
              <IconButton color="inherit" onClick={logout} aria-label="Logout">
                <LogoutIcon />
              </IconButton>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? drawerWidth : undefined,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />

      {/* minWidth: 0 lets wide tables scroll inside their container instead of stretching the page */}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
