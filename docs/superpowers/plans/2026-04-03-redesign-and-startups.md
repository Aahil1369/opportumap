# Homepage Redesign + Startup Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the homepage of decorative noise (animated blobs, gradient hero text) in favour of dark minimal style, then build a full Startup Discovery section with filtering, individual startup profiles, upvotes, pitch deck upload, and Supabase Realtime chat.

**Architecture:** Two sequential parts — (1) homepage CSS/component edits with no new data, (2) startup section with 4 new Supabase tables, 7 API routes, 3 new components, and 3 new pages. Supabase anon key is used throughout; auth is read via `lib/supabase-server.js` in API routes, `lib/supabase-browser.js` in client components.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS 4, Supabase (anon key + RLS + Realtime), `@supabase/ssr`, Supabase Storage for pitch decks.

---

## File Map

**Modified:**
- `app/page.js` — remove blobs, strip gradient-text from hero h1, clean stat/feature cards
- `app/globals.css` — disable `.animate-blob` / `.animate-blob-alt` keyframes
- `app/components/Navbar.js` — add Startups + Messages links to NAV_LINKS

**Created:**
- `app/startups/page.js` — discovery feed with filter pills + card grid + sidebar
- `app/startups/[id]/page.js` — individual startup profile
- `app/messages/page.js` — inbox + real-time chat
- `app/components/StartupCard.js` — reusable startup card
- `app/components/StartupModal.js` — 5-step "Post a Startup" form
- `app/components/StartupChat.js` — Supabase Realtime chat component
- `app/api/startups/route.js` — GET list (filtered) / POST create
- `app/api/startups/[id]/route.js` — GET single startup
- `app/api/startups/[id]/upvote/route.js` — POST toggle upvote
- `app/api/startups/[id]/interest/route.js` — POST toggle interest
- `app/api/messages/route.js` — GET conversations / POST send message
- `app/api/messages/[startupId]/route.js` — GET messages for a conversation

---

## ⚠️ Pre-requisite: Run SQL in Supabase

Before starting Task 3, run this SQL in your Supabase Dashboard → SQL Editor:

```sql
-- Startups table
create table startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  user_name text not null,
  name text not null,
  tagline text not null,
  description text not null,
  stage text not null,
  sector text not null,
  raise_amount numeric,
  equity_offered numeric,
  team_size integer,
  location text,
  website text,
  pitch_deck_url text,
  upvote_count integer default 0,
  interest_count integer default 0,
  created_at timestamptz default now()
);

-- Upvotes (one per user per startup)
create table startup_upvotes (
  startup_id uuid references startups on delete cascade,
  user_id uuid references auth.users,
  primary key (startup_id, user_id)
);

-- Express interest
create table startup_interests (
  startup_id uuid references startups on delete cascade,
  user_id uuid references auth.users,
  created_at timestamptz default now(),
  primary key (startup_id, user_id)
);

-- Messages
create table startup_messages (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references startups on delete cascade not null,
  sender_id uuid references auth.users not null,
  receiver_id uuid references auth.users not null,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table startups enable row level security;
alter table startup_upvotes enable row level security;
alter table startup_interests enable row level security;
alter table startup_messages enable row level security;

create policy "Anyone can read startups" on startups for select using (true);
create policy "Auth users can insert startups" on startups for insert with check (auth.uid() = user_id);
create policy "Owners can update startups" on startups for update using (auth.uid() = user_id);
create policy "Owners can delete startups" on startups for delete using (auth.uid() = user_id);

create policy "Anyone can read upvotes" on startup_upvotes for select using (true);
create policy "Auth users can manage own upvotes" on startup_upvotes for all using (auth.uid() = user_id);

create policy "Anyone can read interests" on startup_interests for select using (true);
create policy "Auth users can manage own interests" on startup_interests for all using (auth.uid() = user_id);

create policy "Participants can read messages" on startup_messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Auth users can send messages" on startup_messages for insert with check (auth.uid() = sender_id);
create policy "Receivers can mark read" on startup_messages for update using (auth.uid() = receiver_id);

-- Enable Realtime on messages
alter publication supabase_realtime add table startup_messages;

-- Supabase Storage bucket for pitch decks
insert into storage.buckets (id, name, public) values ('pitch-decks', 'pitch-decks', true);
create policy "Anyone can read pitch decks" on storage.objects for select using (bucket_id = 'pitch-decks');
create policy "Auth users can upload pitch decks" on storage.objects for insert with check (bucket_id = 'pitch-decks' and auth.role() = 'authenticated');
```

---

## Task 1: Homepage Redesign — Remove Blobs + Clean Hero

**Files:**
- Modify: `app/page.js`
- Modify: `app/globals.css`

- [ ] **Step 1: Disable blob animations in globals.css**

In `app/globals.css`, change the blob animation lines so they no longer animate (set animation to `none`):

```css
/* Was: */
.animate-blob        { animation: blobMove 12s ease-in-out infinite; }
.animate-blob-alt    { animation: blobMove 15s ease-in-out infinite reverse; }

/* Change to: */
.animate-blob        { animation: none; display: none; }
.animate-blob-alt    { animation: none; display: none; }
```

- [ ] **Step 2: Open app/page.js and locate the hero section (around line 70-100)**

The hero section starts with `{/* ─── HERO ─── */}` and contains three animated blob divs inside `{/* Animated blobs */}` and a gradient overlay. Read lines 70-130 to see the exact code before editing.

- [ ] **Step 3: Remove the three blob divs from the hero**

Find and remove this entire block (the animated blobs div inside the hero):
```jsx
{/* Animated blobs */}
<div className="absolute inset-0 pointer-events-none overflow-hidden">
  <div className="animate-blob absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.15] bg-indigo-600 blur-[120px]" />
  <div className="animate-blob-alt absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full opacity-[0.12] bg-purple-600 blur-[100px]" />
  <div className="animate-blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.08] bg-cyan-500 blur-[100px]" />
</div>
```

- [ ] **Step 4: Strip gradient-text from the hero headline**

Find the `<h1>` element. The inner `<span>` currently uses `gradient-text` class. Change it to use `text-indigo-400` instead:

```jsx
{/* Before: */}
<span className="gradient-text">anywhere in the world</span>

{/* After: */}
<span className="text-indigo-400">anywhere in the world</span>
```

- [ ] **Step 5: Clean up the hero badge — remove the pulse animation dot**

Find the badge div near the top of the hero. Remove `animate-pulse` from the dot span:

```jsx
{/* Before: */}
<span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />

{/* After: */}
<span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
```

- [ ] **Step 6: Verify in browser**

Run: `npm run dev` (if not already running)

Open `http://localhost:3000`. The hero should now show:
- No large glowing blobs in the background
- "anywhere in the world" in solid indigo-400 (not gradient)
- The subtle grid overlay is still present (that's fine, it stays)
- The rest of the page is unchanged

- [ ] **Step 7: Commit**

```bash
git add app/page.js app/globals.css
git commit -m "style: remove hero blobs and gradient text, dark minimal redesign"
```

---

## Task 2: Navbar — Add Startups + Messages Links

**Files:**
- Modify: `app/components/Navbar.js`

- [ ] **Step 1: Add Startups and Messages to NAV_LINKS**

Find the `NAV_LINKS` array at the top of `app/components/Navbar.js` (line 10-15). Replace it:

```js
const NAV_LINKS = [
  { href: '/jobs', label: 'Jobs', icon: '💼' },
  { href: '/map', label: 'Map', icon: '🌍' },
  { href: '/startups', label: 'Startups', icon: '🚀' },
  { href: '/saved', label: 'Saved', icon: '♥' },
  { href: '/community', label: 'Community', icon: '💬' },
  { href: '/messages', label: 'Messages', icon: '✉️' },
];
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000`. The navbar should now show "Startups" and "Messages" links between Map and Saved. Both links 404 for now — that's expected until pages are built.

- [ ] **Step 3: Commit**

```bash
git add app/components/Navbar.js
git commit -m "feat: add Startups and Messages to navbar"
```

---

## Task 3: API — Startups List + Create

**Files:**
- Create: `app/api/startups/route.js`

- [ ] **Step 1: Create the file**

```js
import { createClient as createServerClient } from '../../../../lib/supabase-server.js';
import { supabase } from '../../../../lib/supabase.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');
  const sector = searchParams.get('sector');
  const sort = searchParams.get('sort') || 'newest';

  let query = supabase.from('startups').select('*');
  if (stage) query = query.eq('stage', stage);
  if (sector) query = query.eq('sector', sector);
  if (sort === 'trending') query = query.order('upvote_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query.limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ startups: data ?? [] });
}

export async function POST(request) {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, tagline, description, stage, sector, raise_amount, equity_offered, team_size, location, website, pitch_deck_url } = body;
  if (!name || !tagline || !description || !stage || !sector) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';

  const { data, error } = await supabase.from('startups').insert({
    user_id: user.id,
    user_name: userName,
    name, tagline, description, stage, sector,
    raise_amount: raise_amount || null,
    equity_offered: equity_offered || null,
    team_size: team_size || null,
    location: location || null,
    website: website || null,
    pitch_deck_url: pitch_deck_url || null,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ startup: data });
}
```

- [ ] **Step 2: Verify GET works**

With dev server running, open `http://localhost:3000/api/startups` in browser.
Expected: `{"startups":[]}` (empty array — no startups yet, no error)

- [ ] **Step 3: Commit**

```bash
git add app/api/startups/route.js
git commit -m "feat: add GET/POST /api/startups"
```

---

## Task 4: API — Single Startup + Upvote + Interest

**Files:**
- Create: `app/api/startups/[id]/route.js`
- Create: `app/api/startups/[id]/upvote/route.js`
- Create: `app/api/startups/[id]/interest/route.js`

- [ ] **Step 1: Create single startup route**

```js
// app/api/startups/[id]/route.js
import { supabase } from '../../../../../lib/supabase.js';

export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await supabase.from('startups').select('*').eq('id', id).single();
  if (error) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ startup: data });
}
```

- [ ] **Step 2: Create upvote toggle route**

```js
// app/api/startups/[id]/upvote/route.js
import { createClient as createServerClient } from '../../../../../../lib/supabase-server.js';
import { supabase } from '../../../../../../lib/supabase.js';

export async function POST(request, { params }) {
  const { id } = await params;
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if already upvoted
  const { data: existing } = await supabase
    .from('startup_upvotes')
    .select('startup_id')
    .eq('startup_id', id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    // Remove upvote
    await supabase.from('startup_upvotes').delete().eq('startup_id', id).eq('user_id', user.id);
    await supabase.from('startups').update({ upvote_count: supabase.rpc('greatest', {}) }).eq('id', id);
    const { data: { upvote_count } } = await supabase.from('startups').select('upvote_count').eq('id', id).single();
    // Decrement manually
    await supabase.from('startups').update({ upvote_count: Math.max(0, (upvote_count ?? 1) - 1) }).eq('id', id);
    const { data: updated } = await supabase.from('startups').select('upvote_count').eq('id', id).single();
    return Response.json({ upvoted: false, count: updated?.upvote_count ?? 0 });
  } else {
    // Add upvote
    await supabase.from('startup_upvotes').insert({ startup_id: id, user_id: user.id });
    const { data: current } = await supabase.from('startups').select('upvote_count').eq('id', id).single();
    await supabase.from('startups').update({ upvote_count: (current?.upvote_count ?? 0) + 1 }).eq('id', id);
    const { data: updated } = await supabase.from('startups').select('upvote_count').eq('id', id).single();
    return Response.json({ upvoted: true, count: updated?.upvote_count ?? 1 });
  }
}
```

- [ ] **Step 3: Create interest toggle route**

```js
// app/api/startups/[id]/interest/route.js
import { createClient as createServerClient } from '../../../../../../lib/supabase-server.js';
import { supabase } from '../../../../../../lib/supabase.js';

export async function POST(request, { params }) {
  const { id } = await params;
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('startup_interests')
    .select('startup_id')
    .eq('startup_id', id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    await supabase.from('startup_interests').delete().eq('startup_id', id).eq('user_id', user.id);
    const { data: current } = await supabase.from('startups').select('interest_count').eq('id', id).single();
    await supabase.from('startups').update({ interest_count: Math.max(0, (current?.interest_count ?? 1) - 1) }).eq('id', id);
    const { data: updated } = await supabase.from('startups').select('interest_count').eq('id', id).single();
    return Response.json({ interested: false, count: updated?.interest_count ?? 0 });
  } else {
    await supabase.from('startup_interests').insert({ startup_id: id, user_id: user.id });
    const { data: current } = await supabase.from('startups').select('interest_count').eq('id', id).single();
    await supabase.from('startups').update({ interest_count: (current?.interest_count ?? 0) + 1 }).eq('id', id);
    const { data: updated } = await supabase.from('startups').select('interest_count').eq('id', id).single();
    return Response.json({ interested: true, count: updated?.interest_count ?? 1 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/startups/
git commit -m "feat: add startup detail, upvote, and interest API routes"
```

---

## Task 5: API — Messages (Conversations + Send + Thread)

**Files:**
- Create: `app/api/messages/route.js`
- Create: `app/api/messages/[startupId]/route.js`

- [ ] **Step 1: Create conversations + send route**

```js
// app/api/messages/route.js
import { createClient as createServerClient } from '../../../../lib/supabase-server.js';
import { supabase } from '../../../../lib/supabase.js';

export async function GET(request) {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all messages where user is sender or receiver
  const { data: messages, error } = await supabase
    .from('startup_messages')
    .select('*, startups(id, name, user_id)')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Group into conversations by startup_id + other_user_id
  const convMap = {};
  for (const msg of messages ?? []) {
    const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
    const key = `${msg.startup_id}::${otherId}`;
    if (!convMap[key]) {
      convMap[key] = {
        startup_id: msg.startup_id,
        startup_name: msg.startups?.name ?? 'Unknown',
        startup_founder_id: msg.startups?.user_id,
        other_user_id: otherId,
        last_message: msg.content,
        last_at: msg.created_at,
        unread: 0,
      };
    }
    if (!msg.read && msg.receiver_id === user.id) convMap[key].unread++;
  }

  return Response.json({ conversations: Object.values(convMap) });
}

export async function POST(request) {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { startupId, receiverId, content } = await request.json();
  if (!startupId || !receiverId || !content?.trim()) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data, error } = await supabase.from('startup_messages').insert({
    startup_id: startupId,
    sender_id: user.id,
    receiver_id: receiverId,
    content: content.trim(),
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ message: data });
}
```

- [ ] **Step 2: Create thread route**

```js
// app/api/messages/[startupId]/route.js
import { createClient as createServerClient } from '../../../../../lib/supabase-server.js';
import { supabase } from '../../../../../lib/supabase.js';

export async function GET(request, { params }) {
  const { startupId } = await params;
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const otherId = searchParams.get('with');
  if (!otherId) return Response.json({ error: 'Missing with param' }, { status: 400 });

  // Mark received messages as read
  await supabase
    .from('startup_messages')
    .update({ read: true })
    .eq('startup_id', startupId)
    .eq('receiver_id', user.id)
    .eq('sender_id', otherId);

  const { data, error } = await supabase
    .from('startup_messages')
    .select('*')
    .eq('startup_id', startupId)
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data ?? [] });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/messages/
git commit -m "feat: add messages API (conversations, send, thread)"
```

---

## Task 6: StartupCard Component

**Files:**
- Create: `app/components/StartupCard.js`

- [ ] **Step 1: Create the component**

```js
// app/components/StartupCard.js
'use client';

import Link from 'next/link';

const STAGE_COLORS = {
  'idea':       'bg-zinc-800 text-zinc-400 border-zinc-700',
  'pre-seed':   'bg-indigo-950 text-indigo-400 border-indigo-800',
  'seed':       'bg-indigo-950 text-indigo-300 border-indigo-700',
  'series-a':   'bg-violet-950 text-violet-300 border-violet-700',
  'series-b+':  'bg-purple-950 text-purple-300 border-purple-700',
};

const SECTOR_EMOJIS = {
  'AI': '🤖', 'Fintech': '💳', 'HealthTech': '🏥', 'CleanTech': '🌱',
  'SaaS': '☁️', 'EdTech': '📚', 'Other': '💡',
};

function formatRaise(amount) {
  if (!amount) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function StartupCard({ startup, featured = false, dark }) {
  const stageClass = STAGE_COLORS[startup.stage] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  const emoji = SECTOR_EMOJIS[startup.sector] || '💡';

  return (
    <Link href={`/startups/${startup.id}`}
      className={`block rounded-xl border p-4 transition-all hover:border-indigo-500/40 group ${
        featured
          ? dark ? 'bg-[#111118] border-indigo-500/30' : 'bg-white border-indigo-300'
          : dark ? 'bg-[#111118] border-[#1e1e2e]' : 'bg-white border-zinc-200'
      }`}>
      {featured && (
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded mb-2 inline-block ${dark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
          ✦ FEATURED
        </div>
      )}
      <div className="flex gap-3 items-start">
        <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-lg ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-indigo-50 border border-indigo-100'}`}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-bold truncate ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>{startup.name}</p>
              <p className={`text-xs mt-0.5 line-clamp-2 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{startup.tagline}</p>
            </div>
            <div className={`text-xs flex-shrink-0 font-semibold ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              ▲ {startup.upvote_count ?? 0}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${stageClass}`}>
              {startup.stage}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-[#1a1a1a] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
              {startup.sector}
            </span>
            {startup.location && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-[#1a1a1a] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
                {startup.location}
              </span>
            )}
            {startup.raise_amount && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${dark ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {formatRaise(startup.raise_amount)}{startup.equity_offered ? ` · ${startup.equity_offered}%` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/StartupCard.js
git commit -m "feat: add StartupCard component"
```

---

## Task 7: StartupModal Component (5-step Post Form)

**Files:**
- Create: `app/components/StartupModal.js`

- [ ] **Step 1: Create the component**

```js
// app/components/StartupModal.js
'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase-browser';

const STAGES = ['idea', 'pre-seed', 'seed', 'series-a', 'series-b+'];
const SECTORS = ['AI', 'Fintech', 'HealthTech', 'CleanTech', 'SaaS', 'EdTech', 'Other'];
const TOTAL_STEPS = 5;

export default function StartupModal({ dark, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', tagline: '', description: '',
    stage: '', sector: '',
    raise_amount: '', equity_offered: '', team_size: '', location: '',
    website: '', linkedin: '',
    pitch_deck_url: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const ui = {
    bg: dark ? 'bg-[#0e0e18]' : 'bg-white',
    border: dark ? 'border-[#1e1e2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#1a1a28] border-[#2a2a3e] text-zinc-100 placeholder-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-900',
    pill: (a) => a ? 'bg-indigo-600 text-white border-indigo-600' : dark ? 'bg-[#1a1a28] text-zinc-400 border-[#2a2a3e] hover:border-indigo-500' : 'bg-white text-zinc-500 border-zinc-200 hover:border-indigo-400',
  };

  const handlePitchDeck = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setUploading(true);
    try {
      const supabase = createClient();
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const { data, error } = await supabase.storage.from('pitch-decks').upload(fileName, file, { upsert: true });
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('pitch-decks').getPublicUrl(data.path);
        set('pitch_deck_url', publicUrl);
      }
    } catch {}
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/startups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          raise_amount: form.raise_amount ? Number(form.raise_amount) : null,
          equity_offered: form.equity_offered ? Number(form.equity_offered) : null,
          team_size: form.team_size ? Number(form.team_size) : null,
        }),
      });
      const data = await res.json();
      if (data.startup) { onSuccess(data.startup); onClose(); }
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 rounded-2xl border shadow-2xl ${ui.bg} ${ui.border}`}>
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 border-b ${ui.border}`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-bold ${ui.text}`}>Post your startup</h2>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${ui.sub}`}>Step {step} of {TOTAL_STEPS}</span>
              <button onClick={onClose} className={`text-xs px-2 py-0.5 rounded-lg ${dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}>✕</button>
            </div>
          </div>
          <div className={`h-1 rounded-full mt-3 ${dark ? 'bg-[#1a1a28]' : 'bg-zinc-100'}`}>
            <div className="h-1 rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: Name + tagline */}
          {step === 1 && (
            <>
              <p className={`text-sm ${ui.sub}`}>What's your startup called?</p>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Startup name</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. NeuralHire"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>One-line tagline</label>
                <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. AI recruiter that replaces the whole hiring funnel"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Description (2-4 sentences)</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="What problem do you solve? How? What's your traction?"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${ui.input}`} />
              </div>
            </>
          )}

          {/* Step 2: Stage + sector */}
          {step === 2 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Where are you in your journey?</p>
              <div>
                <label className={`text-xs font-medium mb-2 block ${ui.sub}`}>Funding stage</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <button key={s} onClick={() => set('stage', s)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${ui.pill(form.stage === s)}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium mb-2 block ${ui.sub}`}>Sector</label>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((s) => (
                    <button key={s} onClick={() => set('sector', s)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${ui.pill(form.sector === s)}`}>{s}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Raise + team */}
          {step === 3 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Funding ask and team details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Raising ($)</label>
                  <input value={form.raise_amount} onChange={(e) => set('raise_amount', e.target.value)} placeholder="500000" type="number"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Equity (%)</label>
                  <input value={form.equity_offered} onChange={(e) => set('equity_offered', e.target.value)} placeholder="10" type="number"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Team size</label>
                  <input value={form.team_size} onChange={(e) => set('team_size', e.target.value)} placeholder="3" type="number"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Location</label>
                  <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="San Francisco, CA"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Links */}
          {step === 4 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Where can investors learn more?</p>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Website</label>
                <input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://yourstartup.com"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>LinkedIn / Twitter (optional)</label>
                <input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/company/yourstartup"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
            </>
          )}

          {/* Step 5: Pitch deck + review */}
          {step === 5 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Upload your pitch deck (optional) and review.</p>
              <label className={`flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dark ? 'border-[#2a2a3e] bg-[#1a1a28] hover:border-indigo-500' : 'border-zinc-300 bg-zinc-50 hover:border-indigo-400'}`}>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handlePitchDeck(e.target.files?.[0])} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className={`text-xs ${ui.sub}`}>Uploading...</p>
                  </div>
                ) : form.pitch_deck_url ? (
                  <p className="text-xs text-green-400 font-medium">✓ Pitch deck uploaded</p>
                ) : (
                  <div className="text-center">
                    <p className="text-lg">📊</p>
                    <p className={`text-xs ${ui.sub}`}>Upload pitch deck (PDF)</p>
                  </div>
                )}
              </label>
              <div className={`rounded-xl border p-4 ${ui.border}`}>
                <p className={`text-xs font-semibold mb-2 ${ui.text}`}>Review</p>
                <p className={`text-xs ${ui.sub}`}>{form.name} · {form.stage} · {form.sector}</p>
                {form.raise_amount && <p className={`text-xs mt-1 ${ui.sub}`}>Raising ${Number(form.raise_amount).toLocaleString()}{form.equity_offered ? ` · ${form.equity_offered}% equity` : ''}</p>}
                {form.location && <p className={`text-xs mt-1 ${ui.sub}`}>{form.location}{form.team_size ? ` · ${form.team_size} people` : ''}</p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${dark ? 'border-[#2a2a3e] text-zinc-300 hover:bg-[#1a1a28]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!form.name || !form.tagline || !form.description) || step === 2 && (!form.stage || !form.sector)}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
              {submitting ? 'Posting...' : 'Post Startup 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/StartupModal.js
git commit -m "feat: add StartupModal 5-step post form"
```

---

## Task 8: StartupChat Component (Supabase Realtime)

**Files:**
- Create: `app/components/StartupChat.js`

- [ ] **Step 1: Create the component**

```js
// app/components/StartupChat.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase-browser';

function timeStr(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StartupChat({ startupId, receiverId, currentUser, dark }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Load messages on mount
  useEffect(() => {
    if (!startupId || !receiverId) return;
    fetch(`/api/messages/${startupId}?with=${receiverId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
  }, [startupId, receiverId]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!startupId || !currentUser) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${startupId}:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'startup_messages',
          filter: `startup_id=eq.${startupId}`,
        },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [startupId, currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      startup_id: startupId,
      content: input.trim(),
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startupId, receiverId, content: optimistic.content }),
    });
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const inputCls = dark
    ? 'bg-[#1a1a28] border-[#2a2a3e] text-zinc-100 placeholder-zinc-600'
    : 'bg-zinc-50 border-zinc-300 text-zinc-900';

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className={`text-xs text-center mt-8 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex gap-2 items-end ${isMine ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isMine ? 'bg-indigo-600 text-white' : dark ? 'bg-[#2a2a3e] text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>
                {isMine ? 'Y' : 'F'}
              </div>
              <div className={`max-w-xs rounded-2xl px-3 py-2 ${isMine
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : dark ? 'bg-[#1a1a28] border border-[#2a2a3e] text-zinc-200 rounded-bl-sm' : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-200' : dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {timeStr(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`px-4 py-3 border-t ${dark ? 'border-[#1e1e2e]' : 'border-zinc-200'}`}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Write a message..."
            rows={1}
            className={`flex-1 px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${inputCls}`}
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
            ↑
          </button>
        </div>
        <p className={`text-[10px] mt-1.5 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/StartupChat.js
git commit -m "feat: add StartupChat component with Supabase Realtime"
```

---

## Task 9: Startups Discovery Page

**Files:**
- Create: `app/startups/page.js`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p app/startups
```

- [ ] **Step 2: Create the page**

```js
// app/startups/page.js
'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StartupCard from '../components/StartupCard';
import StartupModal from '../components/StartupModal';
import { useTheme } from '../hooks/useTheme';
import { createClient } from '../../lib/supabase-browser';

const STAGES = ['idea', 'pre-seed', 'seed', 'series-a', 'series-b+'];
const SECTORS = ['AI', 'Fintech', 'HealthTech', 'CleanTech', 'SaaS', 'EdTech', 'Other'];

const SECTOR_COUNTS = { 'AI': 0, 'Fintech': 0, 'HealthTech': 0, 'CleanTech': 0, 'SaaS': 0, 'EdTech': 0, 'Other': 0 };

export default function StartupsPage() {
  const { dark, toggleDark } = useTheme();
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('');
  const [sector, setSector] = useState('');
  const [sort, setSort] = useState('newest');
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);
  const [sectorCounts, setSectorCounts] = useState(SECTOR_COUNTS);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stage) params.set('stage', stage);
    if (sector) params.set('sector', sector);
    params.set('sort', sort);
    fetch(`/api/startups?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.startups ?? [];
        setStartups(list);
        // compute sector counts
        const counts = { ...SECTOR_COUNTS };
        list.forEach((s) => { if (counts[s.sector] !== undefined) counts[s.sector]++; });
        setSectorCounts(counts);
        setLoading(false);
      });
  }, [stage, sector, sort]);

  const bg = dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]';
  const text = dark ? 'text-zinc-100' : 'text-zinc-900';
  const sub = dark ? 'text-zinc-400' : 'text-zinc-500';
  const card = dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200';
  const divider = dark ? 'border-[#1e1e2e]' : 'border-zinc-200';
  const pillBase = 'text-xs px-3 py-1 rounded-full border transition-all cursor-pointer';
  const pillActive = 'bg-indigo-600 text-white border-indigo-600';
  const pillInactive = dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500' : 'border-zinc-300 text-zinc-500 hover:border-indigo-400';

  const totalRaise = startups.reduce((s, x) => s + (x.raise_amount || 0), 0);
  const formatRaise = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${(n/1_000).toFixed(0)}K`;

  const featured = startups.find((s) => s.upvote_count > 0) || startups[0];

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      {showModal && <StartupModal dark={dark} onClose={() => setShowModal(false)} onSuccess={(s) => setStartups((prev) => [s, ...prev])} />}

      {/* Header */}
      <div className={`border-b ${divider}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Startup Discovery</p>
              <h1 className={`text-3xl font-black tracking-tight ${text}`}>Find your next investment.</h1>
              <p className={`text-sm mt-1 ${sub}`}>{startups.length} startups seeking funding · updated daily</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                + Post Startup
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={() => setSort(sort === 'trending' ? 'newest' : 'trending')}
              className={`${pillBase} ${sort === 'trending' ? pillActive : pillInactive}`}>
              🔥 Trending
            </button>
            {STAGES.map((s) => (
              <button key={s} onClick={() => setStage(stage === s ? '' : s)}
                className={`${pillBase} ${stage === s ? pillActive : pillInactive}`}>{s}</button>
            ))}
            <div className={`w-px h-5 self-center ${dark ? 'bg-[#2a2a3e]' : 'bg-zinc-300'}`} />
            {SECTORS.map((s) => (
              <button key={s} onClick={() => setSector(sector === s ? '' : s)}
                className={`${pillBase} ${sector === s ? pillActive : pillInactive}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex gap-6">

        {/* Cards */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : startups.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">🚀</p>
              <p className={`text-sm font-semibold ${text}`}>No startups yet</p>
              <p className={`text-xs mt-1 ${sub}`}>Be the first to post your startup.</p>
              <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                Post Startup
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {featured && (
                <StartupCard startup={featured} featured dark={dark} />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {startups.filter((s) => s.id !== featured?.id).map((s) => (
                  <StartupCard key={s.id} startup={s} dark={dark} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-52 flex-shrink-0 space-y-4">
          <div className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${text}`}>Hot Sectors</p>
            <div className="space-y-2">
              {Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).map(([sec, count]) => (
                <button key={sec} onClick={() => setSector(sector === sec ? '' : sec)}
                  className={`w-full flex justify-between items-center text-xs transition-all ${sector === sec ? 'text-indigo-400' : sub} hover:text-indigo-400`}>
                  <span>{sec}</span>
                  <span className="font-semibold">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${text}`}>This Week</p>
            <div>
              <p className={`text-2xl font-black ${text}`}>{startups.length}</p>
              <p className={`text-xs ${sub}`}>startups listed</p>
            </div>
            {totalRaise > 0 && (
              <div className="mt-3">
                <p className="text-2xl font-black text-emerald-400">{formatRaise(totalRaise)}</p>
                <p className={`text-xs ${sub}`}>total sought</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/startups`. Expected:
- Clean dark page with "Find your next investment." headline
- Filter pills row showing stages and sectors
- Empty state with "Post Startup" CTA (since no startups exist yet)
- Sidebar with sector counts (all 0) and stats
- "Post Startup" button opens the 5-step modal

- [ ] **Step 4: Commit**

```bash
git add app/startups/page.js
git commit -m "feat: add startups discovery page"
```

---

## Task 10: Individual Startup Profile Page

**Files:**
- Create: `app/startups/[id]/page.js`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "app/startups/[id]"
```

- [ ] **Step 2: Create the page**

```js
// app/startups/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useTheme } from '../../hooks/useTheme';
import { createClient } from '../../../lib/supabase-browser';

const SECTOR_EMOJIS = {
  'AI': '🤖', 'Fintech': '💳', 'HealthTech': '🏥', 'CleanTech': '🌱',
  'SaaS': '☁️', 'EdTech': '📚', 'Other': '💡',
};

function formatRaise(amount) {
  if (!amount) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function StartupDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { dark, toggleDark } = useTheme();
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [interested, setInterested] = useState(false);
  const [interestCount, setInterestCount] = useState(0);
  const [upvoting, setUpvoting] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    fetch(`/api/startups/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.startup) {
          setStartup(d.startup);
          setUpvoteCount(d.startup.upvote_count ?? 0);
          setInterestCount(d.startup.interest_count ?? 0);
        }
        setLoading(false);
      });
  }, [id]);

  const handleUpvote = async () => {
    if (!user) return;
    setUpvoting(true);
    const res = await fetch(`/api/startups/${id}/upvote`, { method: 'POST' });
    const data = await res.json();
    if (data.count !== undefined) { setUpvoted(data.upvoted); setUpvoteCount(data.count); }
    setUpvoting(false);
  };

  const handleInterest = async () => {
    if (!user) return;
    setInterestLoading(true);
    const res = await fetch(`/api/startups/${id}/interest`, { method: 'POST' });
    const data = await res.json();
    if (data.count !== undefined) { setInterested(data.interested); setInterestCount(data.count); }
    setInterestLoading(false);
  };

  const bg = dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]';
  const text = dark ? 'text-zinc-100' : 'text-zinc-900';
  const sub = dark ? 'text-zinc-400' : 'text-zinc-500';
  const card = dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200';
  const divider = dark ? 'border-[#1e1e2e]' : 'border-zinc-200';

  if (loading) return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!startup) return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-3xl">🔍</p>
        <p className={`text-sm ${text}`}>Startup not found</p>
        <Link href="/startups" className="text-indigo-400 text-xs">← Back to startups</Link>
      </div>
    </div>
  );

  const emoji = SECTOR_EMOJIS[startup.sector] || '💡';
  const isOwner = user?.id === startup.user_id;

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <Link href="/startups" className={`text-xs mb-6 block ${sub} hover:text-indigo-400 transition-colors`}>← Back to startups</Link>

        <div className="flex gap-8 flex-col lg:flex-row">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Header */}
            <div className="flex gap-4 items-start">
              <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-indigo-50 border border-indigo-100'}`}>
                {emoji}
              </div>
              <div>
                <h1 className={`text-2xl font-black tracking-tight ${text}`}>{startup.name}</h1>
                <p className={`text-sm mt-1 ${sub}`}>{startup.tagline}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${dark ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>{startup.stage}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${dark ? 'bg-[#1a1a1a] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>{startup.sector}</span>
                  {startup.location && <span className={`text-xs px-2 py-0.5 rounded ${dark ? 'bg-[#1a1a1a] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>{startup.location}{startup.team_size ? ` · ${startup.team_size} people` : ''}</span>}
                </div>
              </div>
            </div>

            {/* About */}
            <div className={`rounded-xl border p-5 ${card}`}>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${sub}`}>About</p>
              <p className={`text-sm leading-relaxed ${text}`}>{startup.description}</p>
            </div>

            {/* Pitch deck */}
            {startup.pitch_deck_url ? (
              <div className={`rounded-xl border p-5 ${card}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${sub}`}>Pitch Deck</p>
                {interested || isOwner ? (
                  <a href={startup.pitch_deck_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all w-fit">
                    📊 View Pitch Deck →
                  </a>
                ) : (
                  <div className={`text-center py-6 rounded-xl border-2 border-dashed ${dark ? 'border-[#2a2a3e]' : 'border-zinc-300'}`}>
                    <p className="text-2xl mb-2">🔒</p>
                    <p className={`text-xs ${sub}`}>Express interest to unlock the pitch deck</p>
                    <button onClick={handleInterest}
                      className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                      Express Interest to Unlock
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right panel */}
          <div className="lg:w-56 flex-shrink-0 space-y-3">
            {/* Funding info */}
            <div className={`rounded-xl border p-4 ${card}`}>
              {startup.raise_amount ? (
                <>
                  <p className="text-2xl font-black text-emerald-400">{formatRaise(startup.raise_amount)}</p>
                  <p className={`text-xs ${sub}`}>raising</p>
                  {startup.equity_offered && (
                    <>
                      <p className={`text-lg font-bold mt-3 ${text}`}>{startup.equity_offered}% equity</p>
                    </>
                  )}
                </>
              ) : (
                <p className={`text-xs ${sub}`}>Funding ask not disclosed</p>
              )}
              <button onClick={handleUpvote} disabled={upvoting || !user}
                className={`mt-3 w-full py-2 rounded-xl border text-sm font-semibold transition-all ${
                  upvoted
                    ? dark ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white'
                    : dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-zinc-300 text-zinc-500 hover:border-indigo-400'
                }`}>
                ▲ {upvoteCount} {upvoted ? 'Upvoted' : 'Upvote'}
              </button>
            </div>

            {/* Actions */}
            {!isOwner && (
              <>
                <Link href={`/messages?startup=${id}&with=${startup.user_id}`}
                  className="block w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold text-center transition-all">
                  💬 Message Founder
                </Link>
                <button onClick={handleInterest} disabled={interestLoading}
                  className={`w-full py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    interested
                      ? dark ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 bg-indigo-50'
                      : dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500' : 'border-zinc-300 text-zinc-500 hover:border-indigo-400'
                  }`}>
                  {interested ? '⭐ Interested' : '⭐ Express Interest'} {interestCount > 0 ? `· ${interestCount}` : ''}
                </button>
              </>
            )}
            {startup.website && (
              <a href={startup.website} target="_blank" rel="noopener noreferrer"
                className={`block w-full py-2.5 rounded-xl border text-sm font-semibold text-center transition-all ${dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-zinc-600' : 'border-zinc-300 text-zinc-500 hover:border-zinc-400'}`}>
                🔗 Visit Website
              </a>
            )}
            <p className={`text-xs text-center ${sub}`}>
              Posted by {startup.user_name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/startups/[id]/page.js"
git commit -m "feat: add individual startup profile page"
```

---

## Task 11: Messages Page (Inbox + Real-Time Chat)

**Files:**
- Create: `app/messages/page.js`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p app/messages
```

- [ ] **Step 2: Create the page**

```js
// app/messages/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import StartupChat from '../components/StartupChat';
import { useTheme } from '../hooks/useTheme';
import { createClient } from '../../lib/supabase-browser';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MessagesPage() {
  const { dark, toggleDark } = useTheme();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // { startup_id, other_user_id, startup_name }

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch('/api/messages')
      .then((r) => r.json())
      .then((d) => {
        const convs = d.conversations ?? [];
        setConversations(convs);
        // Auto-select from query params (coming from startup page "Message Founder" button)
        const startupId = searchParams.get('startup');
        const withId = searchParams.get('with');
        if (startupId && withId) {
          const existing = convs.find((c) => c.startup_id === startupId && c.other_user_id === withId);
          setActive(existing ?? { startup_id: startupId, other_user_id: withId, startup_name: 'Startup' });
        } else if (convs.length > 0) {
          setActive(convs[0]);
        }
        setLoading(false);
      });
  }, [user, searchParams]);

  const bg = dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]';
  const text = dark ? 'text-zinc-100' : 'text-zinc-900';
  const sub = dark ? 'text-zinc-400' : 'text-zinc-500';
  const card = dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200';
  const divider = dark ? 'border-[#1e1e2e]' : 'border-zinc-200';

  if (!user) return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-3xl">🔒</p>
        <p className={`text-sm ${text}`}>Sign in to view messages</p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
        <h1 className={`text-2xl font-black tracking-tight mb-5 ${text}`}>Messages</h1>
        <div className={`rounded-2xl border overflow-hidden flex ${card}`} style={{ height: '65vh' }}>
          {/* Conversation list */}
          <div className={`w-64 flex-shrink-0 border-r ${divider} flex flex-col`}>
            <div className={`px-4 py-3 border-b ${divider}`}>
              <p className={`text-xs font-bold uppercase tracking-widest ${sub}`}>Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loading && conversations.length === 0 && (
                <p className={`text-xs text-center py-8 px-4 ${sub}`}>No messages yet. Find a startup and say hello!</p>
              )}
              {conversations.map((conv) => {
                const isActive = active?.startup_id === conv.startup_id && active?.other_user_id === conv.other_user_id;
                return (
                  <button key={`${conv.startup_id}::${conv.other_user_id}`}
                    onClick={() => setActive(conv)}
                    className={`w-full text-left px-4 py-3 border-b transition-all ${divider} ${
                      isActive ? dark ? 'bg-indigo-500/10' : 'bg-indigo-50' : dark ? 'hover:bg-white/5' : 'hover:bg-zinc-50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-400' : text}`}>{conv.startup_name}</p>
                      {conv.unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${sub}`}>{conv.last_message}</p>
                    <p className={`text-[10px] mt-1 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>{timeAgo(conv.last_at)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {active ? (
              <>
                <div className={`px-5 py-3 border-b ${divider} flex items-center gap-3`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-base ${dark ? 'bg-[#1a1a28]' : 'bg-indigo-50'}`}>🚀</div>
                  <div>
                    <p className={`text-sm font-bold ${text}`}>{active.startup_name}</p>
                    <p className={`text-xs ${sub}`}>Real-time chat</p>
                  </div>
                </div>
                <StartupChat
                  startupId={active.startup_id}
                  receiverId={active.other_user_id}
                  currentUser={user}
                  dark={dark}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-4xl mb-3">💬</p>
                  <p className={`text-sm ${text}`}>Select a conversation</p>
                  <p className={`text-xs mt-1 ${sub}`}>or find a startup to message</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify full flow in browser**

1. Open `http://localhost:3000/startups` — should show discovery page
2. Click "Post Startup" — 5-step modal should open
3. Fill in all steps and submit — new startup appears in feed
4. Click the startup card — detail page opens at `/startups/[id]`
5. Click "Message Founder" — navigates to `/messages?startup=...&with=...`
6. Type a message and send — message appears instantly via Realtime
7. Open a second browser tab / incognito window, log in as a different user — messages appear in real-time

- [ ] **Step 4: Commit**

```bash
git add app/messages/page.js app/components/StartupChat.js
git commit -m "feat: add messages inbox and real-time chat page"
```

---

## Task 12: Push to GitHub + Netlify Deploy

- [ ] **Step 1: Final check — make sure all files are staged**

```bash
git status
```

Expected: all modified/new files should be committed. `git status` should show "nothing to commit, working tree clean".

- [ ] **Step 2: Push to GitHub**

```bash
git push origin master
```

Expected: Netlify auto-deploys from the push. Check Netlify dashboard for build status.

- [ ] **Step 3: Verify production**

Once Netlify deploy completes (usually 1-2 min):
- Check homepage — no blobs, clean hero
- Check `/startups` — discovery page loads
- Check `/messages` — inbox loads (empty for new users)

---

## Self-Review

**1. Spec coverage:**
- ✅ Homepage redesign (blobs removed, gradient text stripped) → Task 1
- ✅ Navbar with Startups + Messages → Task 2
- ✅ API: list, create, single, upvote, interest → Tasks 3–4
- ✅ API: messages (conversations, send, thread) → Task 5
- ✅ StartupCard component → Task 6
- ✅ StartupModal 5-step form with pitch deck upload → Task 7
- ✅ StartupChat Supabase Realtime → Task 8
- ✅ Discovery page with filter pills + sidebar → Task 9
- ✅ Individual startup page with gated pitch deck → Task 10
- ✅ Messages inbox with real-time chat → Task 11
- ✅ DB schema + RLS + Realtime + Storage → Pre-requisite SQL

**2. Placeholder scan:** No TBDs found. All code blocks are complete.

**3. Type consistency:**
- `startup.user_id` used consistently in all places
- `startup_id`, `sender_id`, `receiver_id` field names match across API routes and components
- `createClient` imported from correct path in each file (browser vs server)
- `active.startup_id` and `active.other_user_id` match the conversation object shape from `/api/messages`
