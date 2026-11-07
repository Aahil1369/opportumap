// /map, the control tower (spec §8, wave 2). The hall header renders on the server; the search,
// the radar (Mapbox, loaded lazily) and the boards it opens are one client island
// (ControlTower). The tower fills the small viewport under the navbar (100svh), and Lenis stays
// off here: the map takes the wheel and the drag (data-lenis-prevent; SmoothScroll skips /map).

import Navbar from '../components/Navbar';
import GateSign from '../components/kit/GateSign';
import ControlTower from '../components/map/ControlTower';
import '../components/map/map.css';
import { SOCIAL_IMAGE } from '../../lib/socialImage.js';

const TITLE = 'Map — OpportuMap';
const DESCRIPTION =
  'The control tower: real roles worldwide as beacons on a night map. Pick a country for its arrivals board, a beacon for the role’s gate.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://opportumap.netlify.app/map', siteName: 'OpportuMap', type: 'website', images: [SOCIAL_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [SOCIAL_IMAGE] },
};

export default function MapPage() {
  return (
    <div className="mt-page">
      <Navbar />
      <main className="mt" data-lenis-prevent="">
        <header className="mt-head">
          <GateSign letter="B" label="Map" />
          <h1 className="mt-title">
            The control <em className="mt-accent">tower.</em>
          </h1>
          <p className="mt-sub">Every beacon is a real role. Pick a country to read its arrivals.</p>
        </header>
        <ControlTower />
      </main>
    </div>
  );
}
