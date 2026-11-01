import { createTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

// Phones: thumb-sized controls, and dialogs that rise from the bottom edge
const onPhone = (theme: Theme) => theme.breakpoints.down('md')
const NAVY = '#0c2953'

const theme = createTheme({
  palette: {
    primary: {
      main: NAVY,
    },
    secondary: {
      main: '#06b5e4',
      contrastText: NAVY,
    },
    text: {
      primary: '#13233a',
      secondary: '#51617a',
    },
    // Softer than MUI's pure white so the admin is easier on the eyes
    background: {
      default: '#e9edf3',
      paper: '#fbfcfe',
    },
    divider: 'rgba(12, 41, 83, 0.14)',
  },
  typography: {
    // Made in Bangladesh, with Latin and Bengali letters that match: customers' names come in both
    fontFamily: '"Hind Siliguri", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    // gap, not margins: lets a child run to the screen edge with a negative margin
    MuiStack: {
      defaultProps: { useFlexGap: true },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 500,
          [onPhone(theme)]: { minHeight: 44 },
        }),
        sizeSmall: ({ theme }) => ({
          [onPhone(theme)]: { minHeight: 38 },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          [onPhone(theme)]: { minWidth: 44, minHeight: 44 },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        container: ({ theme }) => ({
          [onPhone(theme)]: { alignItems: 'flex-end' },
        }),
        paper: ({ theme }) => ({
          [onPhone(theme)]: {
            '&&': { margin: 0, width: '100%', maxWidth: '100%', maxHeight: '92dvh', borderRadius: '20px 20px 0 0' },
            '&&.MuiDialog-paperFullScreen': { height: '100dvh', maxHeight: 'none', borderRadius: 0 },
          },
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          [onPhone(theme)]: {
            flexWrap: 'wrap',
            gap: 8,
            padding: 16,
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            '& > .MuiButton-root': { flex: '1 1 auto', marginLeft: 0 },
          },
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          [onPhone(theme)]: {
            flexWrap: 'wrap',
            '& .MuiAlert-message': { flex: '1 1 0', minWidth: 0 },
            // Buttons get their own line; a lone close X stays beside the text
            '& .MuiAlert-action:has(.MuiButton-root)': { flexBasis: '100%', marginLeft: 0, padding: 0, justifyContent: 'flex-end' },
          },
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#f1f4f8',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#e9edf3',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
})

export default theme
