// The one social image: app/opengraph-image.js draws it and Next serves it at /opengraph-image.
// Every page that inherits it gets Next's cache-busting hash of that file (/opengraph-image?<hash>),
// so a redrawn image is fetched again by the sites that unfurl links. Next adds a file-based image
// only at the file's own segment (the root): a child segment that sets its own `openGraph` or
// `twitter` replaces the parent's objects, image included. Such a segment names the image itself,
// as Next resolved it for its parent, hash included:
//
//   export async function generateMetadata(_props, parent) {
//     const images = socialImages(await parent);
//     return { …, openGraph: { …, images }, twitter: { …, images } };
//   }
//
// (Pinned in scripts/departures/__tests__/chrome.test.mjs and 15b-k.test.mjs.)

export const SOCIAL_IMAGE_ALT =
  'OpportuMap: a departures board of real roles worldwide. The world is hiring. Pick your gate.';
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };
export const SOCIAL_IMAGE_TYPE = 'image/png';

/** The same image without Next's hash: what socialImages falls back to (resolved against metadataBase). */
export const SOCIAL_IMAGE = {
  url: '/opengraph-image',
  ...SOCIAL_IMAGE_SIZE,
  type: SOCIAL_IMAGE_TYPE,
  alt: SOCIAL_IMAGE_ALT,
};

/**
 * The social image for a segment with its own openGraph/twitter: the images Next resolved for
 * the segments above it (generateMetadata's `parent`: the root's app/opengraph-image, with its
 * ?<hash>), as copies (Next freezes `parent` in development). None resolved: [SOCIAL_IMAGE].
 */
export function socialImages(parent) {
  const images = parent?.openGraph?.images;
  if (!Array.isArray(images) || images.length === 0) return [SOCIAL_IMAGE];
  return images.map((image) => (image && typeof image === 'object' ? { ...image } : { url: String(image) }));
}
