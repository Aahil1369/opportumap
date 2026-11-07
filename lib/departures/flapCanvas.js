// Pixel budgets for the split-flap canvases (app/components/kit/FlapText.js), kept pure so they are
// unit-tested. A 2D canvas holds 4 bytes a pixel; iOS Safari refuses a canvas over 16,777,216
// pixels (4096 x 4096) and caps what all of a page's canvases may hold together. The canvas only
// paints tiles mid-flip (76 ms a flap) over DOM text that stays sharp, so it draws at most
// MAX_DPR device pixels per CSS pixel, and within these budgets:
//   a board's flip layer   MAX_LAYER_PX   2048 x 2048 = 4.2 Mpx (16 MB)
//   one tile atlas         MAX_ATLAS_PX   2048 x 1024 = 2.1 Mpx (8 MB; FlapText keeps up to 4)

export const MAX_DPR = 2;
export const MAX_LAYER_PX = 2048 * 2048;
export const MAX_ATLAS_PX = 2048 * 1024;
export const ATLAS_COLS = 32;
export const ATLAS_MIN_ROWS = 4; // 128 tiles: more than one plate's walks through the drum need at once
export const ATLAS_MAX_ROWS = 16; // 512 tiles: what a board's small tiles always get

/**
 * Device pixels per CSS pixel for the flip layer over a cssW x cssH host: the screen's ratio, at
 * most MAX_DPR, and lower still for a host so big its canvas would pass MAX_LAYER_PX.
 */
export function layerScale(cssW, cssH, devicePixelRatio) {
  const ratio = Number(devicePixelRatio) > 0 ? Number(devicePixelRatio) : 1;
  const dpr = Math.min(MAX_DPR, ratio);
  const area = Number(cssW) * Number(cssH);
  if (!(area > 0)) return dpr;
  return Math.min(dpr, Math.sqrt(MAX_LAYER_PX / area));
}

/**
 * The atlas grid for tiles of w x h device pixels: ATLAS_COLS columns and as many rows as fit
 * MAX_ATLAS_PX, never fewer than ATLAS_MIN_ROWS nor more than ATLAS_MAX_ROWS.
 */
export function atlasGrid(w, h) {
  const tile = Math.max(1, Math.round(Number(w) || 0)) * Math.max(1, Math.round(Number(h) || 0));
  const rows = Math.floor(MAX_ATLAS_PX / (ATLAS_COLS * tile));
  return { cols: ATLAS_COLS, rows: Math.min(ATLAS_MAX_ROWS, Math.max(ATLAS_MIN_ROWS, rows)) };
}
