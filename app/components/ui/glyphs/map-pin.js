export default function MapPin({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M16 3c-5 0-9 4-9 9 0 7 9 17 9 17s9-10 9-17c0-5-4-9-9-9z" />
      <circle cx="16" cy="12" r="3" />
    </svg>
  );
}
