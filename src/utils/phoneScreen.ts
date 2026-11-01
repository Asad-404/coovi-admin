// What the phone's top bar shows for a page. Forms are full-screen tasks:
// they get a back arrow and hide the bottom tabs, so their Save button has the room.
export interface PhoneScreen {
  title: string
  back?: string
}

const TITLES: Record<string, string> = {
  '/dashboard': 'Coovi',
  '/products': 'Products',
  '/orders': 'Orders',
  '/customers': 'Customers',
  '/courier-payments': 'Courier payments',
  '/team': 'Team',
  '/settings': 'Settings',
}

export const phoneScreen = (pathname: string): PhoneScreen => {
  if (pathname === '/orders/new') return { title: 'Add order', back: '/orders' }
  if (pathname === '/products/new') return { title: 'Add product', back: '/products' }
  if (/^\/products\/[^/]+\/edit$/.test(pathname)) return { title: 'Edit product', back: '/products' }
  return { title: TITLES[pathname] ?? 'Coovi' }
}
