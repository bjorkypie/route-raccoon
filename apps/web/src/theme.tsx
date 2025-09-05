import React, { createContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

export type Mode = 'light' | 'dark';

export const ColorModeContext = createContext<{ mode: Mode; toggle: () => void }>({
  mode: 'light',
  toggle: () => {},
});

// Brand palette (fixed)
const BRAND = {
  tangelo: '#fb5012',
  smokyBlack: '#0f0a0a',
  isabelline: '#f5efed',
  blueMunsell: '#2292a4',
  citrine: '#bdbf09',
} as const;

function buildTheme(primary: string, secondary: string, mode: Mode, lightBg?: string) {
  const isLight = mode === 'light';
  const cardBg = isLight ? alpha(secondary, 0.06) : alpha(secondary, 0.18);
  const cardBorder = isLight ? `1px solid ${alpha(secondary, 0.2)}` : `1px solid ${alpha(secondary, 0.28)}`;
  return createTheme({
    palette: {
      mode,
      primary: { main: primary},
      secondary: { main: secondary },
      background: mode === 'light'
        ? { default: lightBg || BRAND.isabelline, paper: '#FFFFFF' }
        : { default: BRAND.smokyBlack, paper: '#141010' },
      text: mode === 'light'
        ? { primary: BRAND.smokyBlack, secondary: '#5b5b5b' }
        : { primary: BRAND.isabelline, secondary: '#c9c9c9' },
      warning: { main: BRAND.citrine },
      info: { main: BRAND.blueMunsell },
    },
    shape: { borderRadius: 14 },
    typography: {
      // Clean, readable body. Fun headings below.
      fontFamily: 'Roboto Mono, Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      body1: { lineHeight: 1.65, fontSize: '1rem' },
      body2: { lineHeight: 1.6 },
      h1: { fontFamily: '"Doto", Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontWeight: 700 },
      h2: { fontFamily: '"DM Serif Display", Roboto Mono, Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontWeight: 700 },
      h3: { fontFamily: '"DM Serif Display", Roboto Mono, Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontWeight: 600 },
        h4: { fontFamily: '"DM Serif Display", Roboto Mono, Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontWeight: 500 },
      h5: { fontFamily: '"DM Serif Display", Roboto Mono, Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontWeight: 500 },
      h6: { fontFamily: '"DM Serif Display", Roboto Mono, Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontWeight: 500 },
    
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999, textTransform: 'none' } } },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            backgroundColor: cardBg,
            border: cardBorder,
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            '&:hover': {
              color: BRAND.citrine,
              
            },
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          'a:hover': {
            color: BRAND.citrine,
          },
          'button:hover':{
            color: BRAND.citrine
          }
        },
      },
    },
  });
}

//

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('color-mode') as Mode) || (systemPrefersDark ? 'dark' : 'light'));
  // Fixed brand palette; no runtime extraction

  useEffect(() => {
    localStorage.setItem('color-mode', mode);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-mode', mode);
    }
  }, [mode]);

  const theme = useMemo(() => buildTheme(BRAND.blueMunsell, BRAND.tangelo, mode, BRAND.isabelline), [mode]);

  const value = useMemo(() => ({ mode, toggle: () => setMode(m => (m === 'light' ? 'dark' : 'light')) }), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
