'use client';

// Is a board row on screen? One IntersectionObserver for every row on the page.
//   on:    on screen now (a row only flaps, and only asks the salary model, while it is)
//   first: whether it was on screen when first seen (null until the observer has looked); a row
//          that arrived on screen clacks in, one that arrived below the fold simply shows its text.

import { useEffect, useState } from 'react';

const watchers = new Map(); // element -> callback(isIntersecting)
let observer = null;

function watch(el, callback) {
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) watchers.get(entry.target)?.(entry.isIntersecting);
    });
  }
  watchers.set(el, callback);
  observer.observe(el);
  return () => {
    watchers.delete(el);
    observer.unobserve(el);
  };
}

export function useOnScreen(ref) {
  const [seen, setSeen] = useState({ on: false, first: null });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = (on) => setSeen((s) => (s.on === on && s.first !== null ? s : { on, first: s.first ?? on }));
    if (typeof IntersectionObserver === 'undefined') {
      // No observer (very old engines): rows count as off screen. Their text is all there; they
      // just never flap or ask the salary model (it could not tell which rows are seen).
      let live = true;
      Promise.resolve().then(() => live && update(false));
      return () => {
        live = false;
      };
    }
    return watch(el, update);
  }, [ref]);
  return seen;
}
