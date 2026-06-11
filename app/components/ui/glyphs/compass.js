export default function Compass({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <circle cx="16" cy="16" r="11" />
      <path d="M19 13l-4 9-2-6-6-2z" />
    </svg>
  );
}
