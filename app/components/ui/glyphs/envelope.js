export default function Envelope({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <rect x="4" y="8" width="24" height="16" rx="1" />
      <path d="M4 9l12 9 12-9" />
    </svg>
  );
}
