# Homepage Redesign + Startup Section Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strip the homepage of decorative noise (blobs, gradient text, glowing pills) and replace with dark minimal Vercel/Raycast-style design; add a full Startup Discovery section where founders post startups and investors browse, upvote, and chat in real-time.

**Architecture:** Two independent efforts — (1) homepage redesign via CSS/component edits with no new data, (2) startup section with new Supabase tables, API routes, discovery page, individual startup pages, and Supabase Realtime chat.

**Tech Stack:** Next.js App Router, Tailwind CSS 4, Supabase (anon key + RLS), Supabase Realtime for chat, Groq for AI features, pdf-parse for pitch deck extraction.

---

## Part 1: Homepage Redesign

### Design Tokens (dark minimal)

| Element | Before | After |
|---|---|---|
| Background | `#080810` with animated blobs | `#080810` no blobs |
| Hero headline | Gradient text (`gradient-text`) | Plain `text-zinc-100` |
| Hero badge | Glowing indigo pill with pulse dot | Flat border pill, no glow |
| Stat cards | Glowing indigo gradient numbers | Clean bordered cards, plain numbers |
| Feature cards | Gradient icon backgrounds | Flat `bg-[#111118]` border cards |
| CTA buttons | `bg-indigo-600` gradient shimmer | `bg-indigo-600` solid, no shimmer |
| Grid overlay | Stays (subtle, tasteful) | Stays |
| Testimonials | Gradient card borders | Plain `border-[#1e1e2e]` |

### What changes in `app/page.js`
- Remove the three `animate-blob` / `animate-blob-alt` divs
- Hero `<h1>`: remove `gradient-text` from the `<span>`, use `text-indigo-400` instead
- Badge: remove `animate-pulse` dot and glow shadow, keep the border pill
- STATS section: replace glowing stat numbers with plain text in bordered row
- FEATURES grid: replace `from-X-500 to-Y-500` gradient icon wrappers with flat `bg-[#111118] border border-[#1e1e2e]` containers
- TESTIMONIALS: remove gradient borders, use flat `border-[#1e1e2e]`
- Tools strip and HOW_IT_WORKS: already clean, no changes needed

### What changes in `app/globals.css`
- Remove or disable `.animate-blob`, `.animate-blob-alt` keyframes
- Remove `.gradient-text` class (or keep for Navbar logo only)

### Navbar (`app/components/Navbar.js`)
- Add "Startups" link pointing to `/startups`
- Keep existing links

---

## Part 2: Startup Section

### Database Schema

**Table: `startups`**
```sql
create table startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  user_name text not null,
  name text not null,
  tagline text not null,
  description text not null,
  stage text not null, -- 'idea' | 'pre-seed' | 'seed' | 'series-a' | 'series-b+'
  sector text not null, -- 'AI' | 'Fintech' | 'HealthTech' | 'CleanTech' | 'SaaS' | 'EdTech' | 'Other'
  raise_amount numeric, -- in USD
  equity_offered numeric, -- percentage
  team_size integer,
  location text,
  website text,
  pitch_deck_url text,
  upvote_count integer default 0,
  interest_count integer default 0,
  created_at timestamptz default now()
);
```

**Table: `startup_upvotes`**
```sql
create table startup_upvotes (
  startup_id uuid references startups on delete cascade,
  user_id uuid references auth.users,
  primary key (startup_id, user_id)
);
```

**Table: `startup_interests`**
```sql
create table startup_interests (
  startup_id uuid references startups on delete cascade,
  user_id uuid references auth.users,
  created_at timestamptz default now(),
  primary key (startup_id, user_id)
);
```

**Table: `startup_messages`**
```sql
create table startup_messages (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references startups on delete cascade not null,
  sender_id uuid references auth.users not null,
  receiver_id uuid references auth.users not null,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);
```

**RLS Policies:**
- `startups`: anyone can SELECT; authenticated users can INSERT their own; owner can UPDATE/DELETE
- `startup_upvotes`: authenticated users can INSERT/DELETE their own rows; anyone can SELECT count
- `startup_interests`: authenticated users can INSERT/DELETE their own; owner can SELECT
- `startup_messages`: sender or receiver can SELECT/INSERT; no one else

**Realtime:** Enable Realtime on `startup_messages` table for live chat.

### File Structure

```
app/
  startups/
    page.js              -- discovery feed with filters + sidebar
    [id]/
      page.js            -- individual startup profile
  messages/
    page.js              -- inbox + real-time chat
  components/
    StartupCard.js        -- reusable card for discovery feed
    StartupModal.js       -- multi-step "Post a Startup" form (5 steps)
    StartupChat.js        -- real-time chat component (Supabase Realtime)
  api/
    startups/
      route.js           -- GET (list + filter) / POST (create)
      [id]/
        route.js         -- GET single startup
        upvote/
          route.js       -- POST toggle upvote
        interest/
          route.js       -- POST toggle interest
    messages/
      route.js           -- GET conversations / POST send message
      [startupId]/
        route.js         -- GET messages for a specific startup conversation
```

### Page Designs

**`/startups` — Discovery Page**
- Header: "Startup Discovery" label, "Find your next investment." headline, stats (X startups, $XM sought)
- Filter pills row: Stage, Sector, Raising range, Location, Trending toggle
- Layout: main card grid (2-col) + right sidebar (trending sectors, weekly stats)
- Featured startup: spans full width, amber border highlight, "FEATURED" tag
- Each card: emoji/logo, name, tagline, stage badge, sector tag, location, raise/equity pill, upvote count, "View →" button
- "Post a Startup" button in navbar and page header (opens `StartupModal`)
- Auth gate: must be signed in to upvote, express interest, or message

**`/startups/[id]` — Startup Profile**
- Header: logo, name, tagline, stage/sector/location tags
- Body: About section, pitch deck viewer/download (gated — must express interest first)
- Right panel: raise amount (green), equity %, upvote count, "Message Founder" CTA (indigo), "Express Interest" button, website link
- Upvote triggers `startup_upvotes` upsert; counter updates optimistically

**`/messages` — Inbox + Real-Time Chat**
- Left: conversation list (grouped by startup), unread badge, last message preview
- Right: chat thread — messages with sender avatar, timestamp
- Input bar at bottom with send button
- Realtime: `supabase.channel('messages').on('postgres_changes', ...)` subscribed to `startup_messages` filtered by `startup_id + receiver_id = currentUser`
- New messages appear instantly without refresh

### `StartupModal.js` — Post a Startup (5 steps)

| Step | Fields |
|---|---|
| 1 | Name, tagline |
| 2 | Stage, sector |
| 3 | Raise amount, equity %, team size, location |
| 4 | Website, social links |
| 5 | Pitch deck PDF upload (optional), review + submit |

Pitch deck: upload to Supabase Storage bucket `pitch-decks`, store public URL in `startups.pitch_deck_url`.

### API Routes

**`GET /api/startups`** — query params: `stage`, `sector`, `min_raise`, `max_raise`, `location`, `sort` (trending|newest|raise). Returns array of startups with upvote/interest counts.

**`POST /api/startups`** — authenticated. Body: all startup fields. Returns created startup.

**`GET /api/startups/[id]`** — single startup with counts.

**`POST /api/startups/[id]/upvote`** — toggle upvote. Returns `{ upvoted: bool, count: number }`.

**`POST /api/startups/[id]/interest`** — toggle interest. Returns `{ interested: bool, count: number }`.

**`GET /api/messages`** — returns all conversations for current user (grouped by startup, with last message + unread count).

**`POST /api/messages`** — body: `{ startupId, receiverId, content }`. Inserts to `startup_messages`. Supabase Realtime propagates to receiver.

**`GET /api/messages/[startupId]`** — returns all messages in a startup conversation between current user and the founder.

---

## Self-Review

1. **Spec coverage:** Homepage redesign (blobs, gradient text, cards) ✅ · Startup discovery page ✅ · Individual startup page ✅ · Real-time chat ✅ · Post a startup modal ✅ · Upvote / interest ✅ · DB schema + RLS ✅
2. **Placeholder scan:** No TBDs. All fields, routes, and table names are explicit.
3. **Scope:** Two subsystems but tightly related (same codebase, same design language). Manageable as one plan with clearly separated tasks.
4. **Ambiguity:** Pitch deck gating — decision: show "View Deck" button always, but clicking it requires the user to have expressed interest (checked via `startup_interests` table on the client before showing the PDF URL). Founders always see their own deck.
