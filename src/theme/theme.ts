import { createTheme } from '@mui/material/styles'

export const colors = {
  warmWhite: '#FBFAF7',
  surface: '#FFFFFF',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  teal: '#0F766E',
  coral: '#F97363',
  line: '#E7E2D8',
}

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    background: { default: colors.warmWhite, paper: colors.surface },
    primary: { main: colors.teal, contrastText: '#FFFFFF' },
    secondary: { main: colors.coral, contrastText: '#FFFFFF' },
    text: { primary: colors.ink, secondary: colors.muted },
    divider: colors.line,
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Noto Sans Thai", "Roboto", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    h1: { fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1.08, fontWeight: 850, letterSpacing: 0 },
    h2: { fontSize: 'clamp(1.45rem, 2.4vw, 2.2rem)', lineHeight: 1.15, fontWeight: 820, letterSpacing: 0 },
    h3: { fontSize: '1.2rem', lineHeight: 1.25, fontWeight: 800, letterSpacing: 0 },
    body1: { fontSize: '1rem', lineHeight: 1.7, letterSpacing: 0 },
    body2: { fontSize: '0.92rem', lineHeight: 1.6, letterSpacing: 0 },
    button: { fontWeight: 760, textTransform: 'none', letterSpacing: 0 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 18, minHeight: 42, paddingInline: 18 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})
