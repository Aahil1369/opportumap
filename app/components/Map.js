'use client';

import { useEffect, useRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getVisaStatus, VISA_COLORS } from '../data/visaData';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function addMarkers(mapInstance, jobs, dark, nationality, markerMap) {
  jobs.forEach((job, i) => {
    const status = getVisaStatus(nationality, job.country);
    const color = VISA_COLORS[status]?.hex || '#6366f1';
    const emoji = VISA_COLORS[status]?.emoji || '';
    const label = VISA_COLORS[status]?.label || '';

    // Size pin by match score: 10px (no match) → 22px (100% match)
    const score = job.matchScore || 0;
    const size = nationality && score > 0 ? Math.round(10 + (score / 100) * 12) : 12;
    const opacity = nationality && score === 0 ? 0.45 : 1;

    const el = document.createElement('div');
    el.className = 'job-marker';
    el.style.animationDelay = `${i * 0.05}s`;
    el.style.backgroundColor = color;
    el.style.boxShadow = `0 0 0 0 ${color}99`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.opacity = opacity;

    const popup = new mapboxgl.Popup({
      offset: 20,
      closeButton: false,
      maxWidth: '240px',
      className: dark ? 'popup-dark' : 'popup-light',
    }).setHTML(`
      <div class="popup-inner">
        <p class="popup-title">${job.title}</p>
        <p class="popup-company">${job.company}</p>
        <p class="popup-location">${job.location}</p>
        <p class="popup-salary">${job.salary}</p>
        ${nationality ? `<p class="popup-visa">${emoji} ${label}${score > 0 ? ` · <span style="color:#6366f1">${score}% match</span>` : ''}</p>` : ''}
        ${job.url ? `<a class="popup-link" href="${job.url}" target="_blank" rel="noopener noreferrer">View job →</a>` : ''}
      </div>
    `);

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([job.lng, job.lat])
      .setPopup(popup)
      .addTo(mapInstance);

    markerMap.current[job.id] = marker;
  });
}

export default function Map({ dark, jobs, nationality, mapRef: ref }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLoaded = useRef(false);
  const pendingJobs = useRef([]);
  const darkRef = useRef(dark);
  const nationalityRef = useRef(nationality);
  const markerMap = useRef({});

  useImperativeHandle(ref, () => ({
    flyToJob(job) {
      if (!map.current) return;
      map.current.flyTo({ center: [job.lng, job.lat], zoom: 6, duration: 1200, essential: true });
      setTimeout(() => {
        const marker = markerMap.current[job.id];
        if (marker) marker.togglePopup();
      }, 1300);
    },
  }));

  useEffect(() => { darkRef.current = dark; }, [dark]);
  useEffect(() => { nationalityRef.current = nationality; }, [nationality]);

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 20],
      zoom: 2,
      projection: 'globe',
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.current.on('load', () => {
      mapLoaded.current = true;
      if (pendingJobs.current.length > 0) {
        addMarkers(map.current, pendingJobs.current, darkRef.current, nationalityRef.current, markerMap);
        pendingJobs.current = [];
      }
    });
  }, []);

  // Re-render markers when jobs or nationality changes
  useEffect(() => {
    if (!jobs?.length) return;
    if (mapLoaded.current && map.current) {
      // Remove old markers
      Object.values(markerMap.current).forEach((m) => m.remove());
      markerMap.current = {};
      addMarkers(map.current, jobs, dark, nationality, markerMap);
    } else {
      pendingJobs.current = jobs;
    }
  }, [jobs, nationality]);

  useEffect(() => {
    if (!map.current || !mapLoaded.current) return;
    Object.values(markerMap.current).forEach((m) => m.remove());
    markerMap.current = {};
    map.current.setStyle(dark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
    map.current.once('styledata', () => {
      if (jobs?.length) addMarkers(map.current, jobs, dark, nationality, markerMap);
    });
  }, [dark]);

  return <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />;
}
