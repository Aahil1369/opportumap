// /robots.txt. Crawlers get the public pages; the API, the admin room, the auth callback and the
// lab are not for them. The origin is the one app/layout.js uses for metadataBase.
const SITE = 'https://opportumap.netlify.app';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/auth/', '/lab/'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
