import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import PingTracker from './components/PingTracker';
import PageTransition from './components/ui/PageTransition';

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
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  variable: '--font-jb-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata = {
  title: 'OpportuMap — Global Opportunities for Everyone',
  description: 'Jobs, visas, and relocation intelligence across 100 countries. Built by an immigrant kid for people who weren’t born into the passport lottery.',
  openGraph: {
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find work you can actually access. 100 countries, 33,664 roles, written for people crossing borders.',
    url: 'https://opportumap.netlify.app',
    siteName: 'OpportuMap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find work you can actually access. 100 countries, 33,664 roles.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable} ${jbMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper-bg text-paper-ink">
        <PageTransition />
        <PingTracker />
        {children}
      </body>
    </html>
  );
}
