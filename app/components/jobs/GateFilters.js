'use client';

// The board's gate chips (spec §7): ANY GATE (remote roles only), saved, newest first, the
// country (the countries on the board) and the role type (one at a time). Chips are toggle
// buttons (aria-pressed); the country is a native select (16px, the phone's own picker). On a
// phone they are one rail that scrolls sideways (so the board starts on the first screen), and
// Lenis leaves it alone (data-lenis-prevent); on a wide screen they wrap.

const NAMES = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();
const countryName = (iso2) => NAMES?.of(iso2.toUpperCase()) || iso2.toUpperCase();

export default function GateFilters({ types, filters, countries, newest, onChange, onNewest, onClear }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const active =
    filters.type !== 'all' || filters.remote || filters.saved || filters.country !== 'all' || newest;

  return (
    <div className="gf" role="group" aria-label="Filter the board" data-lenis-prevent>
      {active && (
        <button type="button" className="gf-clear" onClick={onClear}>
          Clear
        </button>
      )}
      <button type="button" className="gf-chip" aria-pressed={filters.remote} onClick={() => set({ remote: !filters.remote })}>
        <span className="gf-lamp" aria-hidden="true" />
        Any gate
        <span className="sr-only"> (remote roles only)</span>
      </button>
      <button type="button" className="gf-chip" aria-pressed={filters.saved} onClick={() => set({ saved: !filters.saved })}>
        Saved
      </button>
      <button type="button" className="gf-chip" aria-pressed={newest} onClick={() => onNewest(!newest)}>
        Newest first
      </button>
      <label className="gf-select">
        <span className="gf-select-label">Country</span>
        <select value={filters.country} onChange={(e) => set({ country: e.target.value })}>
          <option value="all">All</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
          {filters.country !== 'all' && !countries.includes(filters.country) && (
            <option value={filters.country}>{countryName(filters.country)}</option>
          )}
        </select>
      </label>
      <span className="gf-rule" aria-hidden="true" />
      <div className="gf-types" role="group" aria-label="Role type">
        {[{ value: 'all', label: 'All roles' }, ...types].map((t) => (
          <button
            key={t.value}
            type="button"
            className="gf-chip"
            aria-pressed={filters.type === t.value}
            onClick={() => set({ type: t.value })}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
