export default function Suitcase({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <rect x="5" y="10" width="22" height="16" rx="1" />
      <path d="M12 10V6h8v4 M5 17h22" />
    </svg>
  );
}
