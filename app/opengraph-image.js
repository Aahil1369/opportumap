// The social image for every page (Open Graph; X falls back to it): the night hall, the headline
// with its one yellow phrase, and a three-row departures board. The rows are the board's static
// samples (FALLBACK_ROWS: no employer named, no NEW claimed) and there are no totals anywhere.
// Generated once at build time (next/og). Inter and JetBrains Mono come from Google Fonts as
// subsets of exactly the characters drawn; if that fetch fails the image still renders, in the
// default face.
import { ImageResponse } from 'next/og';
import { FALLBACK_ROWS } from '../lib/departures/board.js';

export const alt = 'OpportuMap: a departures board of real roles worldwide. The world is hiring. Pick your gate.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const C = {
  hall: '#0a0b0d',
  hall2: '#111316',
  tile: '#1d2026',
  rule: '#22262c',
  ink: '#f4f1e6',
  sub: '#9aa0a8',
  sign: '#ffc531',
  info: '#9fc8ff',
};

const HEAD = ['The world is hiring.', 'Pick your gate.'];
const KICKER = 'DEPARTURES';
const COLUMNS = ['LOCAL', 'TO', 'ROLE', 'PAY', 'STATUS'];
const ROWS = [FALLBACK_ROWS[0], FALLBACK_ROWS[1], FALLBACK_ROWS[5]].map((r) => r.cells);

async function googleFont(family, weight, text) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
  ).then((r) => (r.ok ? r.text() : ''));
  const src = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
  if (!src) throw new Error(`no ${family} ${weight}`);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${family} ${weight}: ${res.status}`);
  return res.arrayBuffer();
}

async function fonts() {
  const mono = [KICKER, ...COLUMNS, ...ROWS.flatMap((c) => [c.time, c.code, c.role, c.pay, c.status])].join('');
  const sans = [...HEAD, 'opportumap'].join('');
  try {
    const [inter, jb] = await Promise.all([googleFont('Inter', 800, sans), googleFont('JetBrains+Mono', 500, mono)]);
    return [
      { name: 'Inter', data: inter, weight: 800, style: 'normal' },
      { name: 'JetBrains Mono', data: jb, weight: 500, style: 'normal' },
    ];
  } catch {
    return null; // the default face (no network at build time)
  }
}

/** One split-flap tile: the character on a dark tile with the board's hairline split. */
function Tile({ ch, color }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 44,
        marginRight: 4,
        borderRadius: 4,
        background: C.tile,
        color,
        fontSize: 28,
      }}
    >
      {/* the split, under the character (drawn first) so it never cuts a stroke */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 21, height: 2, background: C.hall }} />
      {ch}
    </div>
  );
}

function Tiles({ text, color }) {
  return (
    <div style={{ display: 'flex' }}>
      {Array.from(text).map((ch, i) => (
        <Tile key={i} ch={ch} color={color} />
      ))}
    </div>
  );
}

const WIDTHS = [190, 116, 330, 190, 150];

export default async function Image() {
  const loaded = await fonts();
  const sans = loaded ? 'Inter' : undefined;
  const mono = loaded ? 'JetBrains Mono' : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '54px 72px',
          background: C.hall,
          color: C.ink,
          fontFamily: sans,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 800 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: C.sign, marginRight: 14 }} />
            opportumap
          </div>
          <div style={{ display: 'flex', fontFamily: mono, fontSize: 22, letterSpacing: 6, color: C.sign }}>{KICKER}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34, fontSize: 78, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
          <div style={{ display: 'flex' }}>{HEAD[0]}</div>
          <div style={{ display: 'flex', color: C.sign }}>{HEAD[1]}</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
            padding: '18px 26px 8px',
            borderRadius: 18,
            border: `1px solid ${C.rule}`,
            background: C.hall2,
            fontFamily: mono,
          }}
        >
          <div style={{ display: 'flex', paddingBottom: 12, fontSize: 17, letterSpacing: 3, color: C.sub }}>
            {COLUMNS.map((c, i) => (
              <div key={c} style={{ display: 'flex', width: WIDTHS[i] }}>
                {c}
              </div>
            ))}
          </div>
          {ROWS.map((r) => (
            <div key={r.code} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${C.rule}`, fontSize: 26 }}>
              <div style={{ display: 'flex', width: WIDTHS[0] }}>
                <Tiles text={r.time} color={C.ink} />
              </div>
              <div style={{ display: 'flex', width: WIDTHS[1] }}>
                <Tiles text={r.code} color={C.sign} />
              </div>
              <div style={{ display: 'flex', width: WIDTHS[2] }}>{r.role}</div>
              <div style={{ display: 'flex', width: WIDTHS[3] }}>{r.pay}</div>
              <div style={{ display: 'flex', width: WIDTHS[4], color: C.info }}>{r.status}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, ...(loaded ? { fonts: loaded } : {}) },
  );
}
