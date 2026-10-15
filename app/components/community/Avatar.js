'use client';

// A member's avatar: their picture when it is a real http(s) URL and loads, else their
// initials on a dark tile. Decorative (the name is always written next to it).

import { useState } from 'react';
import { initials } from '../../../lib/departures/lounge.js';
import { safeHttpUrl } from '../../../lib/safeUrl.js';

export default function Avatar({ name, src, size = 'md' }) {
  const url = safeHttpUrl(src);
  const [broken, setBroken] = useState(null);
  if (url && broken !== url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="lg-av"
        data-size={size}
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBroken(url)}
      />
    );
  }
  return (
    <span className="lg-av" data-size={size} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
