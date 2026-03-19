import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface UseThemeReturn {
  theme: Theme;
  toggleTheme: () => void;
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may not be available
  }
  return 'dark';
}

/**
 * Manages dark/light mode. Stores preference in localStorage.
 * Applies 'dark' or 'light' class to document.documentElement.
 * Default: dark.
 */
export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
