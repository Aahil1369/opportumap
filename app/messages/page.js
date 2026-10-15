import { Suspense } from 'react';
import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import GateChat, { GateChatSkeleton } from '../components/messages/GateChat';
import '../components/messages/messages.css';

// /messages — gate chat (GATE CHAT). The hall header is server-rendered; the inbox and the open
// conversation are the client island below (they need the session and the ?startup=…&with=…
// of a "Message the founder" link, read with useSearchParams, hence the Suspense boundary).
export const metadata = {
  title: 'Messages — OpportuMap',
  description: 'Gate chat: your conversations with founders, and with people interested in your startup.',
  robots: { index: false },
};

export default function MessagesPage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ label: 'Gate chat' }}
        title="Talk it over"
        accent="at the gate."
        sub="Your conversations with founders, and with people interested in your startup. New messages arrive as they're sent."
        wide
      >
        <Suspense fallback={<GateChatSkeleton />}>
          <GateChat />
        </Suspense>
        <p className="gc-foot">Only you and the person you&apos;re talking to can read a conversation. Your email is never shown.</p>
      </PageShell>
    </>
  );
}
