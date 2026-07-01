/** @type {import('next').NextConfig} */

// Conservative security headers (matches Migrova). `frame-ancestors 'none'` +
// X-Frame-Options block clickjacking; we deliberately avoid a full content CSP
// (script-src, etc.) so we don't break Next.js's inline runtime or Mapbox — that
// can be layered in later with nonces.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    const migrova = 'https://migrova.netlify.app';
    return ['/visa', '/relocate', '/match', '/stories'].map((path) => ({
      source: path,
      destination: `${migrova}${path}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
