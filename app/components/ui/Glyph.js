import GlobeWire from './glyphs/globe-wire';
import Passport from './glyphs/passport';
import Document from './glyphs/document';
import Microphone from './glyphs/microphone';
import Suitcase from './glyphs/suitcase';
import Compass from './glyphs/compass';
import MapPin from './glyphs/map-pin';
import Rocket from './glyphs/rocket';
import Envelope from './glyphs/envelope';
import Bookmark from './glyphs/bookmark';
import Chat from './glyphs/chat';
import Spark from './glyphs/spark';

const MAP = {
  'globe-wire': GlobeWire,
  'passport': Passport,
  'document': Document,
  'microphone': Microphone,
  'suitcase': Suitcase,
  'compass': Compass,
  'map-pin': MapPin,
  'rocket': Rocket,
  'envelope': Envelope,
  'bookmark': Bookmark,
  'chat': Chat,
  'spark': Spark,
};

export default function Glyph({ name, size = 32, stroke = 1.2, className = '' }) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <span className={`inline-flex ${className}`}><Cmp size={size} stroke={stroke} /></span>;
}
