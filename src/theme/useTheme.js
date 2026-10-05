import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* Theme system: stored explicit choice, else live OS preference. Mirrors public/theme-init.js (keep in sync). */
const THEME_KEY = 'rishabh-theme';

// Reads the last explicit choice from localStorage, falling back to the
// browser/OS preference if the user has never chosen one. Guarded for SSR
// (no `window`) even though this app is client-only, so it's safe to reuse.
function getPreferredTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Encapsulates all theme state + side effects so `App` just does
// `const [theme, setTheme] = useTheme()`.
export function useTheme() {
  const [theme, setThemeState] = useState(getPreferredTheme);
  // Tracks whether the *user* has explicitly picked a theme (via the toggle,
  // or because a previous session already saved one to localStorage). While
  // this is false, the site keeps following OS theme changes live.
  const explicit = useRef(typeof window !== 'undefined' && window.localStorage.getItem(THEME_KEY) !== null);

  // Public setter used by the toggle button. Accepts either a value or an
  // updater function, mirroring React's normal setState API, and marks the
  // choice as explicit + persists it.
  const setTheme = useCallback((next) => {
    setThemeState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      explicit.current = true;
      try { window.localStorage.setItem(THEME_KEY, value); } catch { /* storage may be unavailable (private mode, quota) - theme still works for this tab */ }
      return value;
    });
  }, []);

  // Applies the theme to the DOM before the browser paints, so switching
  // never flashes the previous colours. Kept in sync on <html> and <body>
  // (data-theme + class + color-scheme) so it doesn't matter which one the
  // CSS or any third-party widget happens to key off.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.dataset.theme = theme;
    body.dataset.theme = theme;
    body.classList.toggle('theme-light', theme === 'light');
    body.classList.toggle('theme-dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  // Live-follow the OS theme until the user makes an explicit choice.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = e => { if (!explicit.current) setThemeState(e.matches ? 'light' : 'dark'); };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Keep multiple open tabs in sync with each other.
  useEffect(() => {
    const onStorage = e => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        explicit.current = true;
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [theme, setTheme];
}
