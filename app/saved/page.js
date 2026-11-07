// /saved, the itinerary (spec §8, wave 2). The hall header renders on the server; the board of
// saved roles is a client island (Itinerary): the roles live on this device (localStorage), so
// they can only be read in the browser.

import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import Itinerary from './Itinerary';
import './saved.css';

const TITLE = 'Saved — OpportuMap';
const DESCRIPTION = 'Your itinerary: the roles you saved, on one board, with their pay and their gate.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false },
};

export default function SavedPage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ label: 'ITINERARY' }}
        title="Your"
        accent="itinerary."
        sub="The roles you saved, on one board. Tap a row to open its gate."
        wide
      >
        <Itinerary />
      </PageShell>
    </>
  );
}
