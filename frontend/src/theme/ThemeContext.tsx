import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'custom';

export interface CustomColors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  accent: string;
  accentRust: string;
  accentPatina: string;
  accentBronze: string;
  text: string;
  textMuted: string;
  textDim: string;
  parchment: string;
  parchmentDark: string;
  canvasBg: string;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
  resetCustomColors: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'sp-theme';
const CUSTOM_STORAGE_KEY = 'sp-custom-theme';

const CSS_VAR_MAP: Record<keyof CustomColors, string> = {
  bg: '--marble-midnight',
  surface: '--marble-900',
  surface2: '--marble-800',
  border: '--marble-700',
  accent: '--accent-gold',
  accentRust: '--accent-rust',
  accentPatina: '--accent-patina',
  accentBronze: '--accent-bronze',
  text: '--ink',
  textMuted: '--ink-muted',
  textDim: '--ink-dim',
  parchment: '--parchment',
  parchmentDark: '--parchment-dark',
  canvasBg: '--canvas-bg',
};

export const DEFAULT_CUSTOM_COLORS: CustomColors = {
  bg: '#0e0c0a',
  surface: '#151311',
  surface2: '#1e1b17',
  border: '#2b2722',
  accent: '#c7a663',
  accentRust: '#a85c32',
  accentPatina: '#5b8a82',
  accentBronze: '#8c7b5e',
  text: '#e9e3d7',
  textMuted: '#9b9489',
  textDim: '#6b655d',
  parchment: '#f4f0e6',
  parchmentDark: '#d8d0c0',
  canvasBg: '#121214',
};

export function hexToRgbVar(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '';
  return `${r} ${g} ${b}`;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark' || stored === 'custom') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getInitialCustomColors(): CustomColors {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_COLORS;
  const stored = window.localStorage.getItem(CUSTOM_STORAGE_KEY);
  if (!stored) return DEFAULT_CUSTOM_COLORS;
  try {
    const parsed = JSON.parse(stored) as Partial<CustomColors>;
    return { ...DEFAULT_CUSTOM_COLORS, ...parsed };
  } catch {
    return DEFAULT_CUSTOM_COLORS;
  }
}

export function applyCustomColors(root: HTMLElement, colors: CustomColors) {
  (Object.keys(CSS_VAR_MAP) as (keyof CustomColors)[]).forEach(key => {
    const value = hexToRgbVar(colors[key]);
    if (value) root.style.setProperty(CSS_VAR_MAP[key], value);
  });
}

export function clearCustomColors(root: HTMLElement) {
  (Object.values(CSS_VAR_MAP)).forEach(variable => root.style.removeProperty(variable));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [customColors, setCustomColorsState] = useState<CustomColors>(getInitialCustomColors);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      clearCustomColors(root);
    } else if (theme === 'dark') {
      root.classList.remove('light');
      clearCustomColors(root);
    } else {
      root.classList.remove('light');
      applyCustomColors(root, customColors);
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, customColors]);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggleTheme = () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  const setCustomColors = (colors: CustomColors) => {
    setCustomColorsState(colors);
    window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(colors));
  };
  const resetCustomColors = () => setCustomColors(DEFAULT_CUSTOM_COLORS);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, customColors, setCustomColors, resetCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
