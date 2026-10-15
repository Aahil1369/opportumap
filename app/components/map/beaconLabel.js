// The label over a role's beacon on /map (a pointer hovering it): built from DOM nodes, every job
// field set as textContent. Feeds are third-party, so nothing here is ever markup (the P0 fix's
// rule for map popups). No link: a click on the beacon opens the role's gate (JobGate).
//
//   YYZ · ON TIME
//   Software Engineer
//   Shopify
//   C$88K–102K
//   Click the beacon for its gate
//
// props: a beacon feature's properties (lib/departures/mapData.js jobsToGeoJSON). Classes are
// styled in map.css (.mt-pop*).

function line(doc, className, text) {
  const el = doc.createElement('p');
  el.className = className;
  el.textContent = String(text);
  return el;
}

export function beaconLabel(doc, props) {
  const p = props && typeof props === 'object' ? props : {};
  const text = (v) => (v == null ? '' : String(v).trim());
  const root = doc.createElement('div');
  root.className = 'mt-pop-in';
  const head = [text(p.code), text(p.status)].filter(Boolean).join(' · ');
  if (head) root.append(line(doc, 'mt-pop-k', head));
  root.append(line(doc, 'mt-pop-t', text(p.title) || 'Untitled role'));
  if (text(p.company)) root.append(line(doc, 'mt-pop-s', text(p.company)));
  root.append(line(doc, 'mt-pop-p', text(p.payText) || 'Pay not listed'));
  root.append(line(doc, 'mt-pop-h', 'Click the beacon for its gate'));
  return root;
}
