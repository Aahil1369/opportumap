'use client';

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';

const MapInner = dynamic(() => import('./Map'), { ssr: false });

const MapWrapper = forwardRef(function MapWrapper(props, ref) {
  return <MapInner {...props} mapRef={ref} />;
});

export default MapWrapper;
