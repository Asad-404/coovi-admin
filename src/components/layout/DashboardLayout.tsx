import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AppBar,
  Badge,
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
import PaymentsIcon from '@mui/icons-material/Payments'
import LogoutIcon from '@mui/icons-material/Logout'
import LockResetIcon from '@mui/icons-material/LockReset'
import MenuIcon from '@mui/icons-material/Menu'
import SettingsIcon from '@mui/icons-material/Settings'
import GroupIcon from '@mui/icons-material/Group'
import ContactsIcon from '@mui/icons-material/Contacts'
import ChangePasswordDialog from '@/components/ChangePasswordDialog'
import { clearToken } from '@/utils/auth'
import { ME_KEY, useAccess } from '@/hooks/useMe'
import type { Permission } from '@/utils/permissions'
import { usePendingCount } from '@/hooks/useOrders'
import { pendingTitle } from '@/utils/pendingOrders'

const drawerWidth = 240

// Pages are shown only to people with their permission (the API refuses the rest too)
const navItems: { label: string; to: string; icon: ReactNode; permission?: Permission; ownerOnly?: boolean }[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Products', to: '/products', icon: <Inventory2Icon />, permission: 'products.view' },
  { label: 'Orders', to: '/orders', icon: <ReceiptLongIcon />, permission: 'orders.view' },
  { label: 'Customers', to: '/customers', icon: <ContactsIcon />, permission: 'orders.view' },
  { label: 'Courier payments', to: '/courier-payments', icon: <PaymentsIcon />, permission: 'payments.view' },
  { label: 'Team', to: '/team', icon: <GroupIcon />, ownerOnly: true },
  { label: 'Settings', to: '/settings', icon: <SettingsIcon />, permission: 'settings.view' },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const { isOwner, can } = useAccess()
  const canSeeOrders = can('orders.view')

  // Re-read the signed-in person's access on every page change, so changes the owner
  // makes on the Team page show up on their next click
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ME_KEY })
  }, [location.pathname, queryClient])

  // The badge and tab title count Pending orders, checked with the API every minute
  // so a new order shows up without a page reload
  const { data: pendingCount = 0 } = usePendingCount(canSeeOrders)

  useEffect(() => {
    document.title = pendingTitle(pendingCount)
  }, [pendingCount])

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
        {navItems
          .filter((item) => (item.ownerOnly ? isOwner : !item.permission || can(item.permission)))
          .map((item) => (
            <ListItemButton
              key={item.to}
              selected={location.pathname.startsWith(item.to)}
              onClick={() => go(item.to)}
            >
              <ListItemIcon>
                {item.to === '/orders' ? (
                  <Badge badgeContent={pendingCount} color="error" aria-label={`${pendingCount} pending orders`}>
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
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
