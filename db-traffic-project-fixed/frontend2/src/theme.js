import { createTheme } from '@mui/material/styles';

// Tamil accent text (place names, subtitles) uses Noto Sans Tamil separately
// from the Latin body typeface — Swiss/International Style keeps one
// grotesque for all Latin hierarchy (weight/size/spacing only, no font
// mixing), so the Tamil face is deliberately kept out of typography.fontFamily.
export const tamilFontFamily = "'Noto Sans Tamil', sans-serif";

const swissGrotesque = [
  'Archivo',
  '"Helvetica Neue"',
  'Helvetica',
  'Inter',
  'Arial',
  'sans-serif',
].join(',');

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0a14',
      paper: '#12121f',
    },
    primary: {
      main: '#4dd0e1',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    // A single, deliberate Swiss-poster red used only for brand/accent
    // moments (title rules, the Tamil watermark) — kept separate from
    // palette.error so it never gets confused with a signal-status color.
    accent: {
      main: '#e30613',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: swissGrotesque,
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700, letterSpacing: '-0.005em' },
    overline: { fontWeight: 600, letterSpacing: '0.12em' },
    caption: { letterSpacing: '0.02em' },
    button: { fontWeight: 700, letterSpacing: '0.03em' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0e0e1a',
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
