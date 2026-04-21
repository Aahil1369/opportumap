export default function Chat({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M5 6h22v16H14l-6 5v-5H5z" />
      <path d="M11 12h10 M11 16h8" />
    </svg>
  );
}
