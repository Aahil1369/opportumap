export default function NoiseSurface({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`relative ${className}`} {...rest}>
      <div className="noise-overlay" aria-hidden />
      <div className="relative">{children}</div>
    </Tag>
  );
}
