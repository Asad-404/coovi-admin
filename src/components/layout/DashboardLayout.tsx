import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AppBar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
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
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import DashboardIcon from '@mui/icons-material/Dashboard'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import PaymentsIcon from '@mui/icons-material/Payments'
import LogoutIcon from '@mui/icons-material/Logout'
import LockResetIcon from '@mui/icons-material/LockReset'
import SettingsIcon from '@mui/icons-material/Settings'
import GroupIcon from '@mui/icons-material/Group'
import ContactsIcon from '@mui/icons-material/Contacts'
import BottomSheet from '@/components/phone/BottomSheet'
import { BOTTOM_NAV_HEIGHT, SAFE_BOTTOM, TOP_BAR_HEIGHT } from '@/components/phone/layout'
import ChangePasswordDialog from '@/components/ChangePasswordDialog'
import { useIsPhone } from '@/hooks/useIsPhone'
import { clearToken } from '@/utils/auth'
import { ME_KEY, useAccess } from '@/hooks/useMe'
import type { Permission } from '@/utils/permissions'
import { usePendingCount } from '@/hooks/useOrders'
import { pendingTitle } from '@/utils/pendingOrders'
import { phoneScreen } from '@/utils/phoneScreen'
import { roleLabel } from '@/utils/permissions'

const drawerWidth = 240

// Pages are shown only to people with their permission (the API refuses the rest too)
// tab: shown in the phone's bottom tabs, under this shorter name; the rest are under More
const navItems: { label: string; to: string; icon: ReactNode; permission?: Permission; ownerOnly?: boolean; tab?: string }[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <DashboardIcon />, tab: 'Home' },
  { label: 'Orders', to: '/orders', icon: <ReceiptLongIcon />, permission: 'orders.view', tab: 'Orders' },
  { label: 'Products', to: '/products', icon: <Inventory2Icon />, permission: 'products.view', tab: 'Products' },
  { label: 'Customers', to: '/customers', icon: <ContactsIcon />, permission: 'orders.view', tab: 'Customers' },
  { label: 'Courier payments', to: '/courier-payments', icon: <PaymentsIcon />, permission: 'payments.view' },
  { label: 'Team', to: '/team', icon: <GroupIcon />, ownerOnly: true },
  { label: 'Settings', to: '/settings', icon: <SettingsIcon />, permission: 'settings.view' },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isDesktop = !useIsPhone()
  const [moreOpen, setMoreOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const { me, isOwner, can } = useAccess()
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
    setMoreOpen(false)
  }

  const allowedItems = navItems.filter((item) => (item.ownerOnly ? isOwner : !item.permission || can(item.permission)))
  const tabs = allowedItems.filter((item) => item.tab)
  const moreItems = allowedItems.filter((item) => !item.tab)
  const screen = phoneScreen(location.pathname)
  const activeTab = tabs.find((item) => location.pathname.startsWith(item.to))?.to ?? 'more'

  const drawerContent = (
    <>
      <Toolbar />
      <Divider />
      <List>
        {allowedItems.map((item) => (
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
        elevation={isDesktop ? undefined : 0}
        // Above the permanent side menu on wide screens; on a phone sheets and dialogs cover it
        sx={{ zIndex: (theme) => (isDesktop ? theme.zIndex.drawer + 1 : theme.zIndex.appBar) }}
      >
        <Toolbar sx={isDesktop ? undefined : { minHeight: `${TOP_BAR_HEIGHT}px !important`, px: 2 }}>
          {!isDesktop && screen.back && (
            <IconButton color="inherit" edge="start" onClick={() => navigate(screen.back!)} aria-label="Back" sx={{ mr: 0.5 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h6" component={isDesktop ? 'div' : 'h1'} sx={{ flexGrow: 1, pr: isDesktop ? 0 : 15 }} noWrap>
            {isDesktop ? 'Coovi Admin' : screen.title}
          </Typography>
          {isDesktop && (
            <>
              <Button color="inherit" startIcon={<LockResetIcon />} onClick={() => setPasswordOpen(true)}>
                Password
              </Button>
              <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {isDesktop && (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Bottom tabs, hidden on forms so their Save button has the room */}
      {!isDesktop && !screen.back && (
        <Box
          component="nav"
          aria-label="Main"
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            pb: SAFE_BOTTOM,
          }}
        >
          <BottomNavigation
            showLabels
            value={activeTab}
            onChange={(_, to: string) => (to === 'more' ? setMoreOpen(true) : go(to))}
            sx={{
              height: BOTTOM_NAV_HEIGHT,
              bgcolor: 'transparent',
              '& .MuiBottomNavigationAction-root': { minWidth: 0, px: 0.5, color: 'text.secondary' },
              '& .Mui-selected': { color: 'primary.main', fontWeight: 600 },
              '& .MuiBottomNavigationAction-root.Mui-selected svg': {
                bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.28),
                borderRadius: 3,
                boxSizing: 'content-box',
                px: 1.5,
              },
            }}
          >
            {tabs.map((item) => (
              <BottomNavigationAction
                key={item.to}
                value={item.to}
                label={item.tab}
                icon={
                  item.to === '/orders' ? (
                    <Badge badgeContent={pendingCount} color="error" aria-label={`${pendingCount} pending orders`}>
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )
                }
              />
            ))}
            <BottomNavigationAction value="more" label="More" icon={<MoreHorizIcon />} />
          </BottomNavigation>
        </Box>
      )}

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        {me && (
          <div>
            <Typography sx={{ fontWeight: 600 }}>{me.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {me.email}, {roleLabel(me.role)}
            </Typography>
          </div>
        )}
        <Divider />
        <List disablePadding>
          {moreItems.map((item) => (
            <ListItemButton key={item.to} selected={location.pathname.startsWith(item.to)} onClick={() => go(item.to)} sx={{ minHeight: 52, borderRadius: 2 }}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
          <ListItemButton
            onClick={() => {
              setMoreOpen(false)
              setPasswordOpen(true)
            }}
            sx={{ minHeight: 52, borderRadius: 2 }}
          >
            <ListItemIcon><LockResetIcon /></ListItemIcon>
            <ListItemText primary="Change password" />
          </ListItemButton>
          <ListItemButton onClick={logout} sx={{ minHeight: 52, borderRadius: 2 }}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Sign out" />
          </ListItemButton>
        </List>
      </BottomSheet>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />

      {/* minWidth: 0 lets wide tables scroll inside their container instead of stretching the page */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          ...(!isDesktop && {
            minHeight: '100dvh',
            // Clear of the bottom tabs; a form's own Save bar sits flush
            pb: screen.back ? 0 : `calc(${BOTTOM_NAV_HEIGHT + 16}px + ${SAFE_BOTTOM})`,
          }),
        }}
      >
        <Toolbar sx={isDesktop ? undefined : { minHeight: `${TOP_BAR_HEIGHT}px !important` }} />
        <Outlet />
      </Box>
    </Box>
  )
}
