import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import PingTracker from './components/PingTracker';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata = {
  title: 'OpportuMap — Global Opportunities for Everyone',
  description: 'Find jobs, visas, and relocation intel across 100+ countries. AI-powered country matching, visa probability scoring, and career tools. Built for people from everywhere.',
  openGraph: {
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find jobs you can actually get, visas you can actually land, from wherever you are.',
    url: 'https://opportumap.netlify.app',
    siteName: 'OpportuMap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find jobs you can actually get, visas you can actually land, from wherever you are.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PingTracker />
        {children}
      </body>
    </html>
  );
}
