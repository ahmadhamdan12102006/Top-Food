import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

export const useDarkMode = () => {
  const { isDark, toggleTheme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [isDark]);

  return { isDark, toggleTheme };
};
