'use client';
import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem('opportumap_theme');
    if (saved !== null) setDark(saved === 'dark');
  }, []);
  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem('opportumap_theme', next ? 'dark' : 'light');
      return next;
    });
  };
  return { dark, toggleDark };
}
