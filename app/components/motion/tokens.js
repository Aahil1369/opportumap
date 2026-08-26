// Shared motion tokens so every animation reads as one system.
// "expo-out" style easing gives the smooth, decelerating managent.tech feel.
export const EASE = [0.22, 1, 0.36, 1];

export const DUR = {
  fast: 0.4,
  base: 0.6,
  slow: 0.9,
};

// Default translate distance for reveals (px).
export const RISE = 24;

// Stagger gap between siblings (s).
export const STAGGER = 0.09;

// Standard in-view viewport config: play once, trigger a bit before fully visible.
export const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' };
