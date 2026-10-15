// /jobs metadata (the page itself is the departures board; spec §7). No job or listing totals in
// any copy (spec §1), and it never reads like a booking site.
//
// The social image is named here: this layout sets its own openGraph/twitter, which replaces the
// root's, and Next adds the file-based app/opengraph-image only at the root segment. Without
// `images`, /jobs and its shared ?job= links unfurl with no picture.
import { SOCIAL_IMAGE } from '../../lib/socialImage.js';

const TITLE = 'Jobs: where to next? · OpportuMap';
const DESCRIPTION =
  'A departures board of real roles worldwide, with pay in the local currency. Search a role, a company, a city or its airport-style code.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://opportumap.netlify.app/jobs', siteName: 'OpportuMap', type: 'website', images: [SOCIAL_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [SOCIAL_IMAGE] },
};

export default function JobsLayout({ children }) {
  return children;
}
