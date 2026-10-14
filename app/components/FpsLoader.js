'use client';

import { useEffect } from 'react';

/** `?fps=1` on any page: inject the frame-rate overlay (public/om-fps.js); nothing loads otherwise. */
export default function FpsLoader() {
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('fps') !== '1' || document.getElementById('om-fps')) return;
      const script = document.createElement('script');
      script.id = 'om-fps';
      script.src = '/om-fps.js';
      script.async = true;
      document.head.appendChild(script);
    } catch {
      /* no overlay */
    }
  }, []);
  return null;
}
