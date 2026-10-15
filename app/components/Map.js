'use client';

// The control tower's radar (spec §8, wave 2): Mapbox GL on /map. Loaded only there, lazily
// (ControlTower imports this file with next/dynamic, ssr: false), so mapbox-gl and its CSS are
// in their own chunk.
//
// - One clustered GeoJSON source ('roles', lib/departures/mapData.js jobsToGeoJSON), drawn as
//   amber circle layers on the GPU: a cluster is a beacon (a soft glow + a core, both sized by
//   how many roles it holds, never a number), a single role a small dot (remote roles, ANY
//   GATE, in --info). No DOM markers, so thousands of roles stay one canvas.
// - Clicks: a beacon opens its gate (onBeacon); a cluster zooms in to where it splits, except
//   at low zoom (the world view), where it stands for its leading country and opens that
//   country's ARRIVALS board (onCountry); anywhere else on a country opens its board too (a
//   transparent fill over Mapbox's country boundaries, queried at the click).
// - A new search hands in new data: setData replaces the whole source, so the old beacons go.
// - Pointer hover (mouse only): a label over a beacon, built from DOM nodes (beaconLabel: job
//   text is textContent, never markup) and set with setDOMContent; the country under the
//   pointer gets a thin gold outline. Nothing is queried while the map moves.
// - The canvas renders at most 2 device pixels per CSS pixel (an iPhone's 3x canvas is 2.25x
//   the pixels for no visible gain). Mapbox GL v3 has no pixelRatio option (it reads
//   window.devicePixelRatio), so while the map lives that reads Math.min(native, 2).
// - The first beacons light up once (opacity, 0.9 s); reduced motion: lit at once, and camera
//   moves are instant (respectPrefersReducedMotion).
//
// Props: beacons (FeatureCollection), onBeacon(id), onCountry(iso2), onState('ready' |
// 'error'), onReady(api: { fitBounds(bounds) }).

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { beaconLabel } from './map/beaconLabel';
import { leadingCountry } from '../../lib/departures/mapData';

const STYLE = 'mapbox://styles/mapbox/dark-v11';
const LOW_ZOOM = 3.5; // below this a cluster stands for its country
const MAX_ZOOM = 12;
const LOAD_TIMEOUT_MS = 20000;
const HIT_PAD = 10; // px around a tap: beacons are small targets on a phone
const BEACON_LAYERS = ['beacon-cluster', 'beacon-dot'];

// Palette (globals.css tokens; Mapbox paints need literal colours).
const AMBER = '#ffb547';
const SIGN = '#ffc531';
const INFO = '#9fc8ff';
const HALL = '#0a0b0d';
const LIT = { glow: 0.2, core: 1, dot: 0.95 };

/** The zoom at which the globe fills about 90% of the map's shorter side. */
function globeZoom(w, h) {
  const side = Math.max(200, Math.min(w || 0, h || 0));
  return Math.min(2.2, Math.max(0.6, Math.log2((0.9 * side * Math.PI) / 512)));
}

// Mapbox's own country polygons (worldview US, like the base style's borders).
const WORLDVIEW = ['any', ['==', ['get', 'worldview'], 'all'], ['in', 'US', ['get', 'worldview']]];
const countryIs = (iso) => ['all', WORLDVIEW, ['==', ['get', 'iso_3166_1'], iso]];

/** Point the map's reads of window.devicePixelRatio at Math.min(native, 2); returns the undo. */
function capPixelRatio() {
  try {
    let owner = window;
    let desc;
    while (owner && !(desc = Object.getOwnPropertyDescriptor(owner, 'devicePixelRatio'))) owner = Object.getPrototypeOf(owner);
    if (!desc) return () => {};
    const nativeDevicePixelRatio = desc.get ? () => desc.get.call(window) : () => desc.value;
    const own = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      enumerable: desc.enumerable,
      get: () => Math.min(nativeDevicePixelRatio() || 1, 2),
    });
    return () => {
      try {
        if (own) Object.defineProperty(window, 'devicePixelRatio', own);
        else delete window.devicePixelRatio;
      } catch {
        // left capped: the page is leaving the map anyway
      }
    };
  } catch {
    return () => {};
  }
}

// Labels cost the most per frame while the globe turns (collision placement, measured: hiding
// them took a panning frame's p95 from ~21 ms to 14 ms at 4x CPU). The world view keeps only the
// countries (what a tap opens); cities and states come in once zoomed in; the rest stays off.
const LABELS_OFF = [
  'continent-label',
  'water-line-label',
  'water-point-label',
  'natural-line-label',
  'natural-point-label',
  'poi-label',
  'airport-label',
  'road-label-simple',
  'waterway-label',
  'settlement-subdivision-label',
];
const LABELS_FROM = { 'settlement-major-label': 4, 'state-label': 5, 'settlement-minor-label': 6 };

/** The style's base layers in the hall's colours: asphalt land, black water, quiet borders, few labels. */
function nightStyle(map) {
  const paint = (id, prop, value) => {
    if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
  };
  for (const id of LABELS_OFF) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  for (const [id, z] of Object.entries(LABELS_FROM)) if (map.getLayer(id)) map.setLayerZoomRange(id, z, 24);
  paint('land', 'background-color', '#14171b');
  paint('water', 'fill-color', HALL);
  paint('admin-0-boundary', 'line-color', '#3a3f47');
  paint('admin-0-boundary-bg', 'line-color', HALL);
  paint('country-label', 'text-color', '#9aa0a8');
  paint('country-label', 'text-halo-color', HALL);
}

function firstSymbolLayer(map) {
  return map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
}

function addLayers(map, data, reduced) {
  const before = firstSymbolLayer(map);
  map.addSource('countries', { type: 'vector', url: 'mapbox://mapbox.country-boundaries-v1' });
  map.addLayer(
    {
      id: 'country-hit',
      type: 'fill',
      source: 'countries',
      'source-layer': 'country_boundaries',
      filter: WORLDVIEW,
      paint: { 'fill-color': HALL, 'fill-opacity': 0 },
    },
    before,
  );
  map.addLayer(
    {
      id: 'country-hover',
      type: 'line',
      source: 'countries',
      'source-layer': 'country_boundaries',
      filter: countryIs(''),
      paint: { 'line-color': SIGN, 'line-opacity': 0.6, 'line-width': 1 },
    },
    before,
  );

  map.addSource('roles', { type: 'geojson', data, cluster: true, clusterRadius: 36, clusterMaxZoom: 9 });
  const fade = (ms) => ({ duration: reduced ? 0 : ms, delay: 0 });
  const start = (v) => (reduced ? v : 0);
  map.addLayer({
    id: 'beacon-glow',
    type: 'circle',
    source: 'roles',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': AMBER,
      'circle-radius': ['step', ['get', 'point_count'], 14, 10, 19, 50, 25, 200, 31],
      'circle-blur': 0.6,
      'circle-opacity': start(LIT.glow),
      'circle-opacity-transition': fade(1400),
    },
  });
  map.addLayer({
    id: 'beacon-cluster',
    type: 'circle',
    source: 'roles',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': AMBER,
      'circle-radius': ['step', ['get', 'point_count'], 6, 10, 8, 50, 10, 200, 12],
      'circle-stroke-color': HALL,
      'circle-stroke-width': 2,
      'circle-opacity': start(LIT.core),
      'circle-opacity-transition': fade(900),
      'circle-stroke-opacity': start(LIT.core),
      'circle-stroke-opacity-transition': fade(900),
    },
  });
  map.addLayer({
    id: 'beacon-dot',
    type: 'circle',
    source: 'roles',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['case', ['==', ['get', 'status'], 'ANY GATE'], INFO, AMBER],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 6, 5, 10, 6.5],
      'circle-stroke-color': HALL,
      'circle-stroke-width': 1.5,
      'circle-opacity': start(LIT.dot),
      'circle-opacity-transition': fade(900),
      'circle-stroke-opacity': start(LIT.dot),
      'circle-stroke-opacity-transition': fade(900),
    },
  });
}

/** The lights come on (once): the transitions set in addLayers carry them up. */
function lightUp(map) {
  map.setPaintProperty('beacon-glow', 'circle-opacity', LIT.glow);
  for (const id of ['beacon-cluster', 'beacon-dot']) {
    const v = id === 'beacon-dot' ? LIT.dot : LIT.core;
    map.setPaintProperty(id, 'circle-opacity', v);
    map.setPaintProperty(id, 'circle-stroke-opacity', v);
  }
}

const box = (p, pad) => [
  [p.x - pad, p.y - pad],
  [p.x + pad, p.y + pad],
];

/** Of the beacons hit, the one nearest the point. */
function nearest(map, hits, point) {
  let best = null;
  let bestD = Infinity;
  for (const f of hits) {
    const at = map.project(f.geometry.coordinates);
    const d = (at.x - point.x) ** 2 + (at.y - point.y) ** 2;
    if (d < bestD) {
      best = f;
      bestD = d;
    }
  }
  return best;
}

export default function Map({ beacons, onBeacon, onCountry, onState, onReady }) {
  const box$ = useRef(null);
  const map$ = useRef(null);
  const loaded = useRef(false);
  const lit = useRef(false);
  const data = useRef(beacons);
  const on = useRef({});
  // The handlers as of this render; the map's listeners read them from here.
  useEffect(() => {
    on.current = { onBeacon, onCountry, onState, onReady };
  });

  useEffect(() => {
    const container = box$.current;
    if (!container) return undefined;
    const restore = capPixelRatio();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let map;
    try {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      map = new mapboxgl.Map({
        container,
        style: STYLE,
        projection: 'globe',
        center: [12, 26],
        zoom: globeZoom(container.clientWidth, container.clientHeight),
        minZoom: 0.4,
        maxZoom: MAX_ZOOM,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        respectPrefersReducedMotion: true,
        performanceMetricsCollection: false,
        fadeDuration: reduce ? 0 : 300,
        attributionControl: true,
      });
    } catch {
      restore();
      on.current.onState?.('error');
      return undefined;
    }
    map$.current = map;
    if (process.env.NODE_ENV !== 'production') container.__omMap = map; // dev-only probe for browser checks
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    let failed = false;
    const fail = () => {
      if (failed || loaded.current) return;
      failed = true;
      on.current.onState?.('error');
    };
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS);
    // Before 'load', a style or token failure is fatal; a tile (sourceId) failing never is.
    map.on('error', (e) => {
      if (!loaded.current && !e?.sourceId) fail();
    });

    map.on('style.load', () => {
      map.setFog({
        color: HALL,
        'high-color': '#16181c',
        'space-color': HALL,
        'horizon-blend': 0.04,
        'star-intensity': 0,
      });
    });

    map.on('load', () => {
      if (failed) return;
      clearTimeout(timer);
      loaded.current = true;
      nightStyle(map);
      addLayers(map, data.current, reduce);
      if (data.current.features.length) {
        lit.current = true;
        requestAnimationFrame(() => lightUp(map));
      }
      on.current.onState?.('ready');
      on.current.onReady?.({
        fitBounds(bounds) {
          if (!bounds) return;
          map.fitBounds(bounds, { padding: 64, maxZoom: 9, duration: reduce ? 0 : 900 });
        },
      });
    });

    // ── Clicks ──
    const source = () => map.getSource('roles');
    const zoomInto = (f) => {
      source()?.getClusterExpansionZoom(f.properties.cluster_id, (err, zoom) => {
        if (err || zoom == null) return;
        map.easeTo({ center: f.geometry.coordinates, zoom: Math.min(zoom + 0.25, MAX_ZOOM), duration: reduce ? 0 : 600 });
      });
    };
    const cluster = (f) => {
      if (map.getZoom() >= LOW_ZOOM) {
        zoomInto(f);
        return;
      }
      source()?.getClusterLeaves(f.properties.cluster_id, 500, 0, (err, leaves) => {
        const iso = err ? null : leadingCountry((leaves || []).map((l) => l.properties?.iso2));
        if (iso) on.current.onCountry?.(iso);
        else zoomInto(f);
      });
    };
    map.on('click', (e) => {
      if (!loaded.current) return;
      const hits = map.queryRenderedFeatures(box(e.point, HIT_PAD), { layers: BEACON_LAYERS });
      if (hits.length) {
        const f = nearest(map, hits, e.point);
        if (f.properties.cluster) cluster(f);
        else on.current.onBeacon?.(String(f.properties.id));
        return;
      }
      const iso = map.queryRenderedFeatures(e.point, { layers: ['country-hit'] })[0]?.properties?.iso_3166_1;
      if (typeof iso === 'string' && /^[A-Z]{2}$/.test(iso)) on.current.onCountry?.(iso.toLowerCase());
    });

    // ── Hover (a mouse; touch has no hover) ──
    const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: false,
      offset: 12,
      maxWidth: '260px',
      className: 'mt-pop',
    });
    let raf = 0;
    let point = null;
    let shownId = null;
    let shownIso = '';
    const canvas = map.getCanvas();
    const showCountry = (iso) => {
      if (iso === shownIso) return;
      shownIso = iso;
      if (map.getLayer('country-hover')) map.setFilter('country-hover', countryIs(iso));
    };
    const hidePopup = () => {
      if (shownId === null) return;
      shownId = null;
      popup.remove();
    };
    const hover = () => {
      raf = 0;
      if (!point || !loaded.current || map.isMoving()) return;
      const hits = map.queryRenderedFeatures(box(point, 6), { layers: BEACON_LAYERS });
      const f = hits.length ? nearest(map, hits, point) : null;
      if (f) {
        canvas.style.cursor = 'pointer';
        showCountry('');
        if (f.properties.cluster) {
          hidePopup();
          return;
        }
        const id = String(f.properties.id);
        if (id !== shownId) {
          shownId = id;
          popup.setLngLat(f.geometry.coordinates).setDOMContent(beaconLabel(document, f.properties)).addTo(map);
        }
        return;
      }
      hidePopup();
      const iso = map.queryRenderedFeatures(point, { layers: ['country-hit'] })[0]?.properties?.iso_3166_1;
      const country = typeof iso === 'string' ? iso : '';
      showCountry(country);
      canvas.style.cursor = country ? 'pointer' : '';
    };
    if (hoverable) {
      map.on('mousemove', (e) => {
        point = e.point;
        if (!raf) raf = requestAnimationFrame(hover);
      });
      map.on('mouseout', () => {
        point = null;
        hidePopup();
        showCountry('');
        canvas.style.cursor = '';
      });
      map.on('movestart', () => {
        hidePopup();
        canvas.style.cursor = '';
      });
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      popup.remove();
      map.remove();
      map$.current = null;
      loaded.current = false;
      lit.current = false;
      restore();
    };
    // The map is built once per mount (ControlTower remounts it to retry); handlers are read from `on`.
  }, []);

  // A new search: the whole source is replaced (the old beacons go). The first beacons light up.
  useEffect(() => {
    data.current = beacons;
    const map = map$.current;
    if (!map || !loaded.current) return;
    map.getSource('roles')?.setData(beacons);
    if (!lit.current && beacons.features.length) {
      lit.current = true;
      requestAnimationFrame(() => lightUp(map));
    }
  }, [beacons]);

  return <div ref={box$} className="mt-canvas" />;
}
