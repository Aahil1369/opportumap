export default function Document({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M9 4h11l5 5v19H9z" />
      <path d="M20 4v5h5 M13 16h8 M13 20h6 M13 24h5" />
    </svg>
  );
}
