import Navbar from '../../components/Navbar';
import PageShell from '../../components/kit/PageShell';
import GateSign from '../../components/kit/GateSign';
import StatusPill from '../../components/kit/StatusPill';
import AirportCode from '../../components/kit/AirportCode';
import KitLab from './KitLab';

// The Departures kit on one page (sample content), for browser checks of the hall chrome, the
// board glyphs, SignatureMoment and Dialog. Not indexed.
export const metadata = {
  title: 'Kit lab · OpportuMap',
  robots: { index: false },
};

const GATES = [
  ['A', 'Jobs', '/jobs'],
  ['B', 'Map', '/map'],
  ['C', 'Security', '/resume'],
  ['D', 'Simulator', '/interview'],
  ['E', 'Hangar', '/startups'],
  ['F', 'Airmail', '/cover-letter'],
];

const label = 'font-mono text-[11px] font-medium tracking-[0.22em] text-sign';

export default function KitLabPage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ letter: 'A', label: 'Jobs' }}
        title="Where to"
        accent="next?"
        sub="The Departures kit: gate signs, status pills, city codes, a board and a dialog. Sample content, not live listings."
        wide
      >
        <section aria-labelledby="k-gates" className="space-y-3">
          <h2 id="k-gates" className={label}>GATE SIGNS</h2>
          <div className="flex flex-wrap gap-2.5">
            {GATES.map(([letter, name, href]) => (
              <GateSign key={letter} letter={letter} label={name} href={href} />
            ))}
            <GateSign label="Lounge" href="/community" />
            <GateSign label="Passport control → Migrova ↗" href="https://migrova.netlify.app" target="_blank" rel="noopener noreferrer" />
          </div>
        </section>

        <section aria-labelledby="k-status" className="mt-10 space-y-3">
          <h2 id="k-status" className={label}>STATUS</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            {['BOARDING', 'NEW', 'ON TIME', 'ANY GATE', 'CANCELLED'].map((s) => (
              <StatusPill key={s} status={s} />
            ))}
          </div>
        </section>

        <section aria-labelledby="k-codes" className="mt-10 space-y-3">
          <h2 id="k-codes" className={label}>CITY CODES</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            {['YYZ', 'BER', 'DXB', 'BLR', 'ICN', 'ANY', 'x'].map((c) => (
              <AirportCode key={c} code={c} />
            ))}
          </div>
        </section>

        <KitLab />
      </PageShell>
    </>
  );
}
