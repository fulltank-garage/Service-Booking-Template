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
    background: {
      default: colors.warmWhite,
      paper: colors.surface,
    },
    primary: {
      main: colors.teal,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.coral,
      contrastText: '#FFFFFF',
    },
    text: {
      primary: colors.ink,
      secondary: colors.muted,
    },
    divider: colors.line,
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: '"Noto Sans Thai", "Roboto", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontSize: 'clamp(2.25rem, 5vw, 4.6rem)',
      lineHeight: 1.06,
      fontWeight: 800,
      letterSpacing: 0,
    },
    h2: {
      fontSize: 'clamp(1.75rem, 3vw, 3rem)',
      lineHeight: 1.12,
      fontWeight: 800,
      letterSpacing: 0,
    },
    h3: {
      fontSize: 'clamp(1.35rem, 2vw, 2rem)',
      lineHeight: 1.18,
      fontWeight: 750,
      letterSpacing: 0,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.75,
      letterSpacing: 0,
    },
    body2: {
      fontSize: '0.92rem',
      lineHeight: 1.65,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 750,
      textTransform: 'none',
      letterSpacing: 0,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          minHeight: 46,
          paddingInline: 22,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
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
