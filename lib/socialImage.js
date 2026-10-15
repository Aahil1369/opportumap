// The one social image: app/opengraph-image.js draws it and Next serves it at /opengraph-image.
// Next adds a file-based image only at the file's own segment (the root). A child segment that
// sets its own `openGraph` or `twitter` replaces the parent's objects, image included, so that
// layout names this image itself: `openGraph: { …, images: [SOCIAL_IMAGE] }`.
// (Pinned in scripts/departures/__tests__/chrome.test.mjs.)

export const SOCIAL_IMAGE_ALT =
  'OpportuMap: a departures board of real roles worldwide. The world is hiring. Pick your gate.';
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };
export const SOCIAL_IMAGE_TYPE = 'image/png';

/** For a segment's own openGraph/twitter metadata (resolved against the root's metadataBase). */
export const SOCIAL_IMAGE = {
  url: '/opengraph-image',
  ...SOCIAL_IMAGE_SIZE,
  type: SOCIAL_IMAGE_TYPE,
  alt: SOCIAL_IMAGE_ALT,
};
