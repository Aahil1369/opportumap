'use client';
import { useState } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('opportumap_theme');
    return saved !== null ? saved === 'dark' : true;
  });
  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem('opportumap_theme', next ? 'dark' : 'light');
      return next;
    });
  };
  return { dark, toggleDark };
}
