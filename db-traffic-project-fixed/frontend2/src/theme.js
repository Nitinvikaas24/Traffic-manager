import { createTheme } from '@mui/material/styles';

// Latin text stays on one grotesque (Archivo) — hierarchy comes from weight,
// size and spacing only. Tamil gets its own faces, kept out of
// typography.fontFamily so they never leak into Latin copy:
//   - tamilFontFamily        body/labels (Noto Sans Tamil)
//   - tamilBrushFontFamily   handwritten brush display, the poster-style titles
//   - tamilDisplayFontFamily chunky rounded display for headings and buttons
export const tamilFontFamily = "'Noto Sans Tamil', sans-serif";
export const tamilBrushFontFamily = "'Kavivanar', 'Noto Sans Tamil', cursive";
export const tamilDisplayFontFamily = "'Baloo Thambi 2', 'Noto Sans Tamil', sans-serif";

// The Chennai-poster palette: turmeric sun, rust-brown script, temple-wall
// terracotta, cream paper and dark ink. Shared by the login scene and the theme.
export const chennai = {
  sun: '#FFC21A',
  sunDeep: '#F5A800',
  rust: '#B4441F',
  terracotta: '#D9693B',
  cream: '#F4EEDF',
  paper: '#FFFBF0',
  ink: '#231815',
};

const swissGrotesque = [
  'Archivo',
  '"Helvetica Neue"',
  'Helvetica',
  'Inter',
  'Arial',
  'sans-serif',
].join(',');

const divider = 'rgba(255, 226, 170, 0.10)';

// Temple-wall "kavi" stripes (rust and cream) — a thin ribbon under the app bars
const templeStripes = `repeating-linear-gradient(90deg, ${chennai.rust} 0 14px, ${chennai.cream} 14px 28px)`;

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#14110f',
      paper: '#1d1916',
    },
    primary: {
      main: chennai.sun,
      light: '#FFD56B',
      dark: chennai.sunDeep,
      contrastText: '#241a08',
    },
    secondary: {
      main: chennai.terracotta,
      contrastText: '#ffffff',
    },
    // Status colors stay semantic (and match the map's signal markers)
    success: {
      main: '#1fb98a',
      contrastText: '#06231a',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    info: {
      main: '#2e90fa',
    },
    text: {
      primary: '#f6efe3',
      secondary: 'rgba(246, 239, 227, 0.64)',
    },
    // Brand/accent moments only (title rules, the Tamil script) — kept apart
    // from palette.error so it is never confused with a signal-status color.
    accent: {
      main: chennai.terracotta,
    },
    divider,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: swissGrotesque,
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700, letterSpacing: '-0.005em' },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700 },
    overline: { fontWeight: 700, letterSpacing: '0.12em' },
    caption: { letterSpacing: '0.02em' },
    button: { fontWeight: 700, letterSpacing: '0.01em', textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { scrollbarColor: 'rgba(255, 194, 26, 0.35) transparent', scrollbarWidth: 'thin' },
        '::selection': { background: 'rgba(255, 194, 26, 0.35)' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${divider}`,
        },
        rounded: { borderRadius: 14 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#191410',
          backgroundImage: templeStripes,
          backgroundSize: '100% 5px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom',
          border: 0,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
        containedPrimary: {
          boxShadow: 'none',
          '&:hover': { backgroundColor: '#FFD04D', boxShadow: '0 6px 18px rgba(255, 194, 26, 0.25)' },
        },
        outlinedPrimary: {
          borderColor: 'rgba(255, 194, 26, 0.55)',
          '&:hover': { borderColor: chennai.sun, backgroundColor: 'rgba(255, 194, 26, 0.08)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, borderRadius: 8 },
        outlined: { backgroundColor: 'rgba(255, 255, 255, 0.02)' },
        avatar: { backgroundColor: chennai.sun, color: '#241a08', fontSize: 12 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 226, 170, 0.18)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 194, 26, 0.5)' },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderLeft: '3px solid transparent',
          borderBottom: '1px solid rgba(255, 226, 170, 0.06)',
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 194, 26, 0.10)',
            borderLeftColor: chennai.sun,
          },
          '&.Mui-selected:hover': { backgroundColor: 'rgba(255, 194, 26, 0.16)' },
        },
      },
    },
    MuiTab: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&.MuiTableRow-hover:hover': { backgroundColor: 'rgba(255, 194, 26, 0.06)' } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: 'rgba(246, 239, 227, 0.64)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 18 } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: '#2a231d', border: `1px solid ${divider}`, fontSize: 12 } },
    },
  },
});

export default theme;
