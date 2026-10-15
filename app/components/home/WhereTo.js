'use client';

// Beat 6, "Where to?": a real search box (16px, so iOS does not zoom) whose text also flaps onto
// a one-row board above it, letter by letter. Enter goes to /jobs?q=… (a plain GET form without
// JS). Passport Control hands visas and moving over to Migrova, the sibling app.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlapText from '../kit/FlapText';

const TILES = 18;

export default function WhereTo() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const go = (e) => {
    e.preventDefault();
    const text = q.trim();
    router.push(text ? `/jobs?q=${encodeURIComponent(text)}` : '/jobs');
  };

  return (
    <section className="hp-beat wt" aria-labelledby="wt-label">
      <form className="wt-form" action="/jobs" method="get" role="search" onSubmit={go}>
        <label id="wt-label" htmlFor="wt-q" className="wt-label">
          WHERE TO?
        </label>
        <div className="wt-board" aria-hidden="true">
          <FlapText text={q} width={TILES} />
        </div>
        <input
          id="wt-q"
          className="wt-input"
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="A city, a code or a role: Toronto, BER, data engineer"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={80}
        />
        <button type="submit" className="wt-go">
          ENTER ▸ BOARD
        </button>
      </form>
      <a className="wt-pc" href="https://migrova.netlify.app" target="_blank" rel="noopener">
        <span className="wt-pc-sign">
          <span aria-hidden="true">🛂 </span>PASSPORT CONTROL → <span className="wt-pc-name">Migrova</span>
        </span>
        <span className="wt-pc-sub">
          Visas and moving help, from our sibling app<span className="sr-only"> (opens in a new tab)</span>
        </span>
      </a>
    </section>
  );
}
