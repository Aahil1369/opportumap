/** @type {import('next').NextConfig} */
const nextConfig = {
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
