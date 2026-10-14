'use client';

// Step-0 prototype: a homepage-sized board (12 rows) that re-flaps between two sets of sample
// roles every 4 s, so the owner can judge the look and the frame rate (?fps=1) on his iPhone.
// The loop pauses when the board is off screen or the tab is hidden, and has a Pause button
// (auto-updating content needs one); with reduced motion it starts paused.

import { useEffect, useRef, useState } from 'react';
import FlapBoard from '../../components/kit/FlapBoard';
import { usePrefersReducedMotion } from '../../components/kit/FlapText';

const COLUMNS = [
  { key: 'local', label: 'LOCAL', width: 5 },
  { key: 'code', label: 'CODE', width: 3, tone: 'sign' },
  { key: 'role', label: 'ROLE', width: 18 },
  { key: 'pay', label: 'PAY', width: 11, line: 2 },
  { key: 'status', label: 'STATUS', width: 8, tone: 'status', line: 2 },
];

// Sample roles (not live listings): LOCAL is each city's clock at one instant (12:40 UTC for
// the first set, 12:44 for the second, mid-October), pay is in the local currency.
const SETS = [
  [
    ['08:40', 'YYZ', 'Software Engineer', 'C$88K–102K', 'BOARDING'],
    ['14:40', 'BER', 'Data Engineer', '€62K–75K', 'ON TIME'],
    ['16:40', 'DXB', 'Product Designer', 'AED 18K/MO', 'ON TIME'],
    ['20:40', 'SIN', 'ML Engineer', 'S$9K–12K/MO', 'NEW'],
    ['13:40', 'LIS', 'Frontend Developer', '€45K–55K', 'ANY GATE'],
    ['13:40', 'LHR', 'Backend Engineer', '£65K–80K', 'ON TIME'],
    ['18:10', 'BLR', 'Data Scientist', '₹18L–26L', 'NEW'],
    ['14:40', 'AMS', 'DevOps Engineer', '€58K–70K', 'ON TIME'],
    ['21:40', 'NRT', 'iOS Engineer', '¥7M–9.5M', 'BOARDING'],
    ['23:40', 'SYD', 'Cloud Architect', 'A$150K–175K', 'ON TIME'],
    ['09:40', 'GRU', 'Mobile Developer', 'R$14K/MO', 'ANY GATE'],
    ['15:40', 'NBO', 'Product Manager', 'KSH 380K/MO', 'NEW'],
  ],
  [
    ['05:44', 'YVR', 'Frontend Developer', 'C$80K–95K', 'ON TIME'],
    ['14:44', 'MUC', 'Embedded Engineer', '€68K–82K', 'BOARDING'],
    ['20:44', 'KUL', 'QA Engineer', 'RM6K–9K/MO', 'NEW'],
    ['05:44', 'SFO', 'Staff Engineer', '$210K–260K', 'ON TIME'],
    ['13:44', 'DUB', 'Platform Engineer', '€70K–85K', 'ANY GATE'],
    ['14:44', 'WAW', 'Java Developer', 'PLN 22K/MO', 'BOARDING'],
    ['06:44', 'MEX', 'UX Designer', 'MX$45K/MO', 'NEW'],
    ['14:44', 'CPH', 'Data Analyst', 'DKK 42K/MO', 'ON TIME'],
    ['21:44', 'ICN', 'Game Developer', '₩55M–70M', 'ON TIME'],
    ['14:44', 'JNB', 'Security Analyst', 'R650K–780K', 'ANY GATE'],
    ['17:44', 'LHE', 'Flutter Developer', 'PKR 350K/MO', 'NEW'],
    ['07:44', 'DFW', 'Data Engineer', '$120K–145K', 'BOARDING'],
  ],
];

const BOARDS = SETS.map((set) =>
  set.map(([local, code, role, pay, status], i) => ({
    id: `slot-${i + 1}`, // rows keep their slot, so a re-flap flips cells in place
    cells: { local, code, role, pay, status },
  })),
);
const EVERY_MS = 4000;

const BTN =
  'rounded-lg px-4 py-2.5 font-[family-name:var(--font-jb-mono)] text-[14px] font-medium tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sign)]';

export default function FlapLab() {
  const reduced = usePrefersReducedMotion();
  const [userPaused, setUserPaused] = useState(null); // null: follow reduced motion
  const paused = userPaused ?? reduced;
  const [set, setSet] = useState(0);
  const ref = useRef(null);

  // The hall is black all the way out, iOS overscroll included (globals.css still paints <html>
  // paper until Task 3 makes the whole site dark).
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.background;
    root.style.background = 'var(--hall)';
    return () => {
      root.style.background = before;
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    let timer = 0;
    let onScreen = true;
    const sync = () => {
      window.clearInterval(timer);
      timer = 0;
      if (onScreen && document.visibilityState === 'visible') {
        timer = window.setInterval(() => setSet((s) => (s + 1) % BOARDS.length), EVERY_MS);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(ref.current);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      io.disconnect();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [paused]);

  return (
    <div ref={ref}>
      <FlapBoard caption="DEPARTURES" columns={COLUMNS} rows={BOARDS[set]} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setUserPaused(!paused)}
          className={`${BTN} bg-[var(--sign)] text-[var(--sign-ink)]`}
        >
          {paused ? 'RESUME BOARD' : 'PAUSE BOARD'}
        </button>
        <button
          type="button"
          onClick={() => setSet((s) => (s + 1) % BOARDS.length)}
          className={`${BTN} border border-[var(--rule)] bg-[var(--hall-3)] text-[var(--ink)]`}
        >
          RE-FLAP NOW
        </button>
      </div>
    </div>
  );
}
