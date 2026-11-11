// /robots.txt. Crawlers get the public pages; the API, the admin room and the auth callback are not for them. No page lives under /lab any more;
// the /lab/ entry stays so an old link is not crawled. The origin is the one app/layout.js uses for metadataBase.
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
