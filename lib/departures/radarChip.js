// The control tower's HUD chip (app/components/map/ControlTower.js): what the radar is doing, in a
// few words. The HUD is the page's one live region, so a screen reader hears a search start, land,
// or come up empty from here. Pure, and tested (scripts/departures/__tests__/15b-m.test.mjs).
//
//   radarChip({ busy, empty, ok, label }) -> { key, text } | null (no chip)
//     busy: a search is on its way; empty: it landed with nothing on the map; ok: it landed;
//     label: the search's words ('' while there are none yet). busy wins over empty, empty over ok.

export function radarChip({ busy = false, empty = false, ok = false, label = '' } = {}) {
  if (busy) return { key: 'RADAR', text: label ? `Scanning for ${label}…` : 'Scanning…' };
  if (empty) return { key: 'RADAR', text: label ? `Nothing on the radar for "${label}"` : 'Nothing on the radar' };
  if (ok && label) return { key: 'ON RADAR', text: label };
  return null;
}
