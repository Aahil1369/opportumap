export default function Rocket({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M16 3c4 4 6 9 6 15l-6 4-6-4c0-6 2-11 6-15z" />
      <circle cx="16" cy="12" r="2" />
      <path d="M10 22l-3 6 5-2 M22 22l3 6-5-2" />
    </svg>
  );
}
