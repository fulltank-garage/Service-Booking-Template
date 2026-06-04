import { createTheme } from '@mui/material/styles'

export const colors = {
  background: '#FFFFFF',
  text: '#111827',
  primaryPink: '#FF008C',
  accentYellow: '#F5FF00',
  softGray: '#F3F4F6',
  border: '#E5E7EB',
}

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    background: { default: colors.background, paper: colors.background },
    primary: { main: colors.primaryPink, contrastText: colors.background },
    secondary: { main: colors.accentYellow, contrastText: colors.text },
    error: { main: colors.primaryPink, contrastText: colors.background },
    warning: { main: colors.accentYellow, contrastText: colors.text },
    info: { main: colors.primaryPink, contrastText: colors.background },
    success: { main: colors.primaryPink, contrastText: colors.background },
    text: { primary: colors.text, secondary: colors.text },
    divider: colors.border,
  },
  shape: { borderRadius: 6.4 },
  typography: {
    fontFamily: '"Roboto", "Noto Sans Thai", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
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
        root: {
          borderRadius: 12,
          minHeight: 42,
          paddingInline: 18,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
          '&.Mui-focusVisible': { boxShadow: 'none' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', boxShadow: 'none' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        },
        icon: {
          color: colors.primaryPink,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: colors.border,
          color: colors.text,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
  },
})
