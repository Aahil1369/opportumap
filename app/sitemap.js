// /sitemap.xml: the public pages only. Signed-in pages (/profile, /messages, /saved), /admin and
// the auth callback stay out. No dates or priorities: nothing here is made up.
// The origin is the one app/layout.js uses for metadataBase.
const SITE = 'https://opportumap.netlify.app';

const PAGES = ['/', '/jobs', '/map', '/resume', '/interview', '/cover-letter', '/startups', '/community', '/contact'];

export default function sitemap() {
  return PAGES.map((path) => ({ url: `${SITE}${path}` }));
}
