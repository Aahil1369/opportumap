// The homepage is the departures board (spec §6). A server component: the board's rows come from
// the live feeds at ISR time (every 10 minutes), so the final text of every board is in the HTML;
// the motion layers on after hydration in small client islands. When the feeds are down or slow,
// the board is a static sample (FALLBACK_ROWS) and says so. Beats, top to bottom: the board, the
// prediction, the window, the gates, your row, where to.
import Link from 'next/link';
import Navbar from './components/Navbar';
import PersonalBoard from './components/home/PersonalBoard';
import { FounderBeat, PredictionBeat } from './components/home/HomeBoard';
import NightWindow from './components/home/NightWindow';
import GateWalk from './components/home/GateWalk';
import WhereTo from './components/home/WhereTo';
import { fetchLiveJobs } from '../lib/jobsFeed';
import { BOARD_COLUMNS, FALLBACK_ROWS, FOUNDER_ROW, boardRowsFrom } from '../lib/departures/board';
import { HOME_SEARCH } from '../lib/departures/homeSearch';
import './components/home/home.css';

export const revalidate = 600;

const TITLE = 'OpportuMap — The world is hiring. Pick your gate.';
const DESCRIPTION =
  'Real roles from around the world on one departures board, in local time and local pay. Built by an immigrant kid for people crossing borders.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://opportumap.netlify.app', siteName: 'OpportuMap', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

// The board's search (HOME_SEARCH: "software" in Adzuna countries across the continents keeps the
// roles close to who reads this) is /jobs' default board too: one data-cache entry for both.
const FEED_TIMEOUT_MS = 6000;

async function boardRows() {
  try {
    // The feeds' cache windows match the page's, so the board is rebuilt every 10 minutes.
    const jobs = await fetchLiveJobs({
      query: HOME_SEARCH.query,
      countries: [...HOME_SEARCH.countries],
      timeoutMs: FEED_TIMEOUT_MS,
      revalidate,
    });
    return boardRowsFrom(jobs, { now: new Date() });
  } catch {
    return FALLBACK_ROWS;
  }
}

export default async function Home() {
  const rows = await boardRows();
  const samples = rows.filter((r) => r.fallback).length;
  const allSamples = samples === rows.length;
  const lifted = rows.find((r) => /\d/.test(r.cells.pay)) || rows[0];

  return (
    <>
      <Navbar />
      <main className="om-hall hp">
        <section className="hp-hero" aria-labelledby="hp-title">
          <p className="hp-kicker">
            DEPARTURES · <span lang="ur" dir="rtl">روانگی</span> · <span lang="fr">DÉPARTS</span>
          </p>
          <h1 id="hp-title" className="hp-h1">
            The world is hiring. <em>Pick your gate.</em>
          </h1>
          <p className="hp-text hp-lede">
            Real roles from around the world, in local time and local pay. Tap a row to open its gate.
          </p>
          <PersonalBoard rows={rows} columns={BOARD_COLUMNS} caption={allSamples ? 'DEPARTURES · SAMPLE' : 'DEPARTURES'} />
          <p className="hp-after">
            {samples > 0 && (
              <span>
                {allSamples ? 'These rows are samples' : 'Some rows are samples'}: the live feeds were slow just now.{' '}
              </span>
            )}
            <Link href="/jobs" className="hp-more">
              See every role on the board →
            </Link>
          </p>
        </section>

        <section className="hp-beat hp-predict" aria-labelledby="pb-title">
          <div className="hp-copy">
            <p className="hp-kicker">PAY · PREDICTED</p>
            <h2 id="pb-title" className="hp-h2">
              Know the pay <em>before you board.</em>
            </h2>
            <p className="hp-text">
              One role lifts off the board. Our salary model reads the role and the city and estimates
              the pay in the local currency. It is labelled a prediction, because it is one.
            </p>
          </div>
          <PredictionBeat row={lifted} />
        </section>

        <NightWindow rows={rows} />

        <GateWalk />

        <section className="hp-beat hp-founder" aria-labelledby="fd-title">
          <div className="hp-copy">
            <p className="hp-kicker">ARRIVED</p>
            <h2 id="fd-title" className="hp-h2">
              One row on this board <em>already made it.</em>
            </h2>
          </div>
          <FounderBeat rows={rows} founder={FOUNDER_ROW} columns={BOARD_COLUMNS} />
        </section>

        <WhereTo />
      </main>
    </>
  );
}
