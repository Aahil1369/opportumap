'use client';

// The homepage board for everyone, personalised for a signed-in visitor with a profile: their
// roles (the same query and countries /jobs uses) re-flap into the board's rows in place. Same
// DOM, no page swap; until (or unless) they arrive, the server's rows stay. The row builder (and
// its city table) loads only on this path.

import { useEffect, useState } from 'react';
import HomeBoard from './HomeBoard';
import { loadHomeProfile } from './homeProfile';

const JOB_TYPES = {
  'Software Engineering': 'software engineer',
  'Data Science / ML': 'data scientist machine learning',
  'Product Management': 'product manager',
  Design: 'UX designer',
  'DevOps / Cloud': 'devops cloud engineer',
  Research: 'research engineer',
  'Finance / Fintech': 'fintech engineer',
};

/** The profile's search, as /jobs builds it: its first job type, then up to three skills. */
export function profileQuery(profile) {
  const parts = [];
  const type = profile?.jobTypes?.[0];
  if (type && JOB_TYPES[type]) parts.push(JOB_TYPES[type]);
  if (typeof profile?.skills === 'string') {
    parts.push(...profile.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3));
  }
  return parts.slice(0, 5).join(' ') || 'software engineer';
}

const ISO2 = /^[a-z]{2}$/;

export default function PersonalBoard({ rows, columns, caption }) {
  const [mine, setMine] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const profile = await loadHomeProfile();
      if (!live || !profile) return;
      const countries = (profile.preferredCountries || []).filter((c) => ISO2.test(c));
      const url = `/api/jobs?q=${encodeURIComponent(profileQuery(profile))}${countries.length ? `&countries=${countries.join(',')}` : ''}`;
      const [res, board] = await Promise.all([fetch(url), import('../../../lib/departures/board')]);
      if (!res.ok) return;
      const { jobs } = await res.json();
      if (!live || !Array.isArray(jobs) || !jobs.length) return;
      // Their chosen countries share the whole board; without a choice it stays a varied board.
      const perCountry = countries.length ? Math.max(2, Math.ceil(rows.length / countries.length)) : 2;
      setMine(board.boardRowsFrom(jobs, { now: new Date(), profile, fill: rows, perCountry }));
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [rows]);

  return <HomeBoard rows={mine || rows} columns={columns} caption={mine ? 'YOUR DEPARTURES' : caption} />;
}
