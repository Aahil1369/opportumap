import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import PingTracker from './components/PingTracker';
import PageTransition from './components/ui/PageTransition';
import SmoothScroll from './components/motion/SmoothScroll';
import FpsLoader from './components/FpsLoader';
import SiteFooter from './components/SiteFooter';

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  // No explicit weights → next/font serves Inter's variable font (one file for the
  // whole 400–700 range we use, instead of four static weight files).
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  variable: '--font-jb-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

// No job or listing totals in any copy (spec §1): a count goes stale and reads like a claim.
export const metadata = {
  // Social images (app/opengraph-image.js) and canonical URLs resolve against the live site.
  metadataBase: new URL('https://opportumap.netlify.app'),
  title: 'OpportuMap — Global Opportunities for Everyone',
  description: 'Real roles from around the world, with pay in the local currency. Built by an immigrant kid for people who weren’t born into the passport lottery.',
  openGraph: {
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find work you can actually reach: real roles worldwide, pay in the local currency, written for people crossing borders.',
    url: 'https://opportumap.netlify.app',
    siteName: 'OpportuMap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find work you can actually reach: real roles worldwide, pay in the local currency.',
  },
};

// The night navbar is on every page: the browser chrome around it is the hall's black.
export const viewport = { themeColor: '#0a0b0d' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable} ${jbMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-hall text-ink">
        <SmoothScroll />
        <PageTransition />
        <PingTracker />
        <FpsLoader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
