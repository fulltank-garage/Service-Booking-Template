import { createTheme } from '@mui/material/styles'

export const colors = {
  background: '#FFFFFF',
  text: '#111827',
  primaryPink: '#FF008C',
  accentYellow: '#F5FF00',
  softGray: '#F3F4F6',
  border: '#E5E7EB',
}

export const overlay = {
  backgroundColor: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(14px)',
  transition: 'opacity 340ms ease',
}

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: colors.background,
      paper: colors.background,
    },
    primary: {
      main: colors.primaryPink,
      contrastText: colors.background,
    },
    secondary: {
      main: colors.accentYellow,
      contrastText: colors.text,
    },
    error: {
      main: colors.primaryPink,
      contrastText: colors.background,
    },
    warning: {
      main: colors.accentYellow,
      contrastText: colors.text,
    },
    info: {
      main: colors.primaryPink,
      contrastText: colors.background,
    },
    success: {
      main: colors.primaryPink,
      contrastText: colors.background,
    },
    text: {
      primary: colors.text,
      secondary: colors.text,
    },
    divider: colors.border,
  },
  shape: {
    borderRadius: 6.4,
  },
  typography: {
    fontFamily: '"Roboto", "Noto Sans Thai", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
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
          borderRadius: 12,
          minHeight: 46,
          paddingInline: 22,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: overlay.backgroundColor,
          backdropFilter: overlay.backdropFilter,
          WebkitBackdropFilter: overlay.backdropFilter,
          transition: overlay.transition,
          '.MuiPopover-root &': {
            backgroundColor: 'transparent',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `1px solid ${colors.border}`,
          borderRadius: 19.2,
          backgroundImage: 'none',
          boxShadow: 'none',
        },
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
          minHeight: 56,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          maxHeight: 320,
          marginTop: 6,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          boxShadow: 'none',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 44,
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
