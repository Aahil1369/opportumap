export default function GlobeWire({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <circle cx="16" cy="16" r="11" />
      <ellipse cx="16" cy="16" rx="5" ry="11" />
      <path d="M5 16h22 M5 12c4 1 18 1 22 0 M5 20c4-1 18-1 22 0" />
    </svg>
  );
}
