# Application Tracker — Design Spec

**Date:** 2026-04-15
**Sub-project:** 1 of 4 (Application Tracker → Salary Explorer + Skills Gap → User Dashboard → SEO + Polish + Career Path)

## Overview

A full-featured application tracking system with a 7-column Kanban board, drag-and-drop (desktop) + dropdown (mobile), slide-out detail panel, activity timeline, visual follow-up indicators, in-app bell notifications via Supabase Realtime, and daily email digest via Netlify Scheduled Functions + Resend.

## Architecture

- **Data:** Supabase Postgres (3 new tables)
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/sortable` (modern, maintained, lightweight)
- **In-app notifications:** Supabase Realtime subscription on `notifications` table — bell badge updates live in Navbar
- **Email reminders:** Netlify Scheduled Function (daily cron) → queries due reminders → sends digest via Resend API
- **Auth:** Existing Supabase Auth — tracker requires login

---

## Data Model

### Table: `applications`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `DEFAULT gen_random_uuid()` |
| `user_id` | uuid FK → auth.users | RLS: `auth.uid() = user_id` |
| `job_title` | text NOT NULL | |
| `company` | text NOT NULL | |
| `location` | text | |
| `salary` | text | Freeform — "$80k-100k", "€50k", etc. |
| `status` | text NOT NULL DEFAULT 'wishlist' | Enum: `wishlist`, `applied`, `phone_screen`, `technical`, `final_round`, `offer`, `rejected` |
| `priority` | integer DEFAULT 0 | 0 = normal, 1 = starred |
| `source` | text DEFAULT 'manual' | Values: `opportumap`, `linkedin`, `manual`, `referral`, `other` |
| `job_url` | text | Link to original posting |
| `job_description` | text | Saved JD for reference |
| `contact_name` | text | Recruiter/hiring manager name |
| `contact_email` | text | |
| `notes` | text | Plain text, not rich text |
| `resume_used` | text | Label, e.g. "v2 — tailored for Google" |
| `cover_letter_used` | text | Label |
| `follow_up_date` | timestamptz | Next reminder date |
| `applied_date` | timestamptz | When user applied |
| `position_order` | integer DEFAULT 0 | Sort order within Kanban column for drag-drop |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

### Table: `application_activity`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `DEFAULT gen_random_uuid()` |
| `application_id` | uuid FK → applications | ON DELETE CASCADE |
| `action` | text NOT NULL | e.g. `created`, `status_changed`, `note_added`, `reminder_set` |
| `detail` | text | e.g. "Moved from Applied → Phone Screen" |
| `created_at` | timestamptz DEFAULT now() | |

### Table: `notifications`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `DEFAULT gen_random_uuid()` |
| `user_id` | uuid FK → auth.users | RLS: `auth.uid() = user_id` |
| `application_id` | uuid FK → applications | Nullable, ON DELETE CASCADE, for linking to specific application |
| `type` | text NOT NULL | Values: `reminder_due`, `reminder_overdue`, `status_milestone` |
| `title` | text NOT NULL | e.g. "Follow up with Google" |
| `message` | text | Detail message |
| `read` | boolean DEFAULT false | |
| `created_at` | timestamptz DEFAULT now() | |

### RLS Policies

All three tables: SELECT, INSERT, UPDATE, DELETE restricted to `auth.uid() = user_id`. Same pattern as existing `posts`, `startup_messages` tables.

### Realtime

Enable Supabase Realtime on `notifications` table only — for live bell badge updates in Navbar. Same pattern as `startup_messages`.

---

## API Routes

### `app/api/tracker/route.js` — GET + POST

**GET** `/api/tracker` — returns all applications for authenticated user, ordered by `position_order` within each status group.

**POST** `/api/tracker` — creates new application. Body: `{ job_title, company, location?, salary?, status?, source?, job_url?, job_description?, notes? }`. Defaults status to `wishlist`. Also inserts a `created` entry into `application_activity`. Returns the created application.

### `app/api/tracker/[id]/route.js` — GET + PATCH + DELETE

**GET** `/api/tracker/[id]` — returns single application with its activity timeline from `application_activity`.

**PATCH** `/api/tracker/[id]` — updates application fields. If `status` changed, auto-inserts `status_changed` activity entry with detail like "Moved from Applied → Phone Screen". If `follow_up_date` changed, auto-inserts `reminder_set` activity entry. Updates `updated_at`.

**DELETE** `/api/tracker/[id]` — deletes application. CASCADE deletes activity entries and related notifications.

### `app/api/tracker/reorder/route.js` — PATCH

**PATCH** `/api/tracker/reorder` — batch updates `position_order` and optionally `status` for multiple cards after a drag-and-drop. Body: `{ updates: [{ id, status, position_order }] }`. Used to persist Kanban reordering.

### `app/api/notifications/route.js` — GET + PATCH

**GET** `/api/notifications` — returns all notifications for authenticated user, ordered by `created_at DESC`. Supports `?unread_only=true` query param.

**PATCH** `/api/notifications` — marks notifications as read. Body: `{ ids: [uuid] }` or `{ mark_all_read: true }`.

### `netlify/functions/reminder-digest.js` — Netlify Scheduled Function

Runs daily at 8:00 AM UTC via cron schedule (`0 8 * * *`). Configured in `netlify.toml`:

```toml
[functions."reminder-digest"]
schedule = "0 8 * * *"
```

Logic:
1. Query all `applications` where `follow_up_date` is overdue, due today, or due within 3 days
2. Group by `user_id`
3. For each user:
   - Insert notification rows into `notifications` table for any new due/overdue reminders (skip if notification already exists for that application + date)
   - Fetch user email from `auth.users`
   - Send one digest email via Resend API with overdue, due today, and upcoming sections
4. Email includes: application list grouped by urgency, stats summary (total apps, interviewing count, offer count), "Open Tracker" CTA button, unsubscribe link

Resend API key stored as `RESEND_API_KEY` in Netlify env vars (All scopes).

---

## Pages & Components

### `app/tracker/page.js` — Kanban Board

Top-level page structure:
- Navbar + `useTheme` dark/light mode (standard pattern)
- Header bar: "Application Tracker" title, summary stats ("12 applications · 3 interviews scheduled"), Filter dropdown, "+ Add Application" button
- 7-column Kanban board:
  - **Wishlist** (gray dot) → **Applied** (blue) → **Phone Screen** (purple) → **Technical** (amber) → **Final Round** (orange) → **Offer** (green) → **Rejected** (red)
  - Each column: header with colored dot, label, count badge
  - Horizontal scroll on mobile/small screens
  - Empty columns show dashed "Drop here" placeholder

Kanban interaction:
- **Desktop:** `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop between columns and reordering within columns. On drop, PATCH `/api/tracker/reorder` with updated positions and statuses.
- **Mobile:** Each card has a status dropdown menu (click/tap to move to different column). No drag-and-drop on touch devices — detected via media query or pointer type.

State management: Fetch all applications on mount via GET `/api/tracker`. Store in state grouped by status. Optimistic updates on drag-drop (update local state immediately, PATCH to API in background).

### `app/components/ApplicationCard.js`

Card displayed on Kanban board. Shows:
- Job title (bold) + star icon (top-right, if priority = 1)
- Company name (indigo)
- Salary (if present)
- Source badge (bottom-left): color-coded — indigo = OpportuMap, blue = LinkedIn, green = Referral, gray = Manual
- Date (bottom-right): applied_date if in Applied+, else created_at
- Notes snippet: first line, truncated with ellipsis (only if notes exist)
- Follow-up indicator (bottom, if follow_up_date set):
  - Green dot + text: 3+ days away
  - Yellow dot + text: within 2 days (including tomorrow)
  - Red dot + text + subtle red card border: overdue
- Offer column cards get subtle green border

Click → opens ApplicationDetail panel.

### `app/components/ApplicationDetail.js` — Slide-out Panel

480px wide panel, slides in from right with dark backdrop overlay. Sections:

1. **Header:** Job title, company, star toggle, close button (✕)
2. **Status pill:** Clickable dropdown to change stage. Color matches column. Auto-logs activity on change.
3. **Quick info grid** (2x2): Salary, Location, Source badge, Job posting link ("View original ↗")
4. **Follow-up date:** Green/yellow/red indicator with date. "Edit" button opens date picker. Setting a date logs `reminder_set` activity.
5. **Contact:** Recruiter name + email (editable inline)
6. **Documents:** Resume + cover letter labels as chips (editable inline)
7. **Job description:** Collapsible, shows first 3 lines by default, "Expand ↓" to show full text
8. **Notes:** Plain textarea, click to edit, auto-saves on blur. Logs `note_added` activity.
9. **Activity timeline:** Chronological list from `application_activity`, color-coded dots matching column colors. Newest first.
10. **Bottom actions:**
    - Delete (red, with confirmation dialog)
    - "Prep Interview →" — links to `/interview?title={job_title}&company={company}`
    - "Write Cover Letter →" — links to `/cover-letter` with JD in query/state
    - "Check Visa →" — shown if location has a country, links to `/visa?country={country}`
    - "Save Changes" (indigo, primary)

### `app/components/AddApplicationModal.js`

Modal opened by "+ Add Application" button. Fields:
- Job title (required)
- Company (required)
- Location (optional)
- Salary (optional, freeform text)
- Job URL (optional)
- Source dropdown: OpportuMap / LinkedIn / Referral / Manual / Other (default: Manual)
- Status dropdown: Wishlist (default) / Applied / Phone Screen / Technical / Final Round / Offer / Rejected
- Notes (optional textarea)

Submit → POST `/api/tracker` → adds card to board → closes modal.

### `app/components/NotificationBell.js`

Added to Navbar, visible only when logged in. Shows:
- Bell icon with red badge showing unread count
- Click opens dropdown:
  - Header: "Notifications" + "Mark all read" link
  - List of notifications: colored dot (red = overdue, yellow = due, green = upcoming), title, detail, relative time
  - Unread items have subtle indigo background, read items are faded
  - Click a notification → navigates to `/tracker` and opens that application's detail panel via query param `?app={id}`
  - Footer: "View all notifications →" (for future full notifications page)
- Supabase Realtime subscription: listens for INSERT on `notifications` where `user_id = auth.uid()`. On new row, increment badge count and prepend to dropdown list.
- Initial load: GET `/api/notifications?unread_only=true` to get badge count on mount.

### Changes to `app/components/Navbar.js`

- Add `{ href: '/tracker', label: 'Tracker', icon: '📋' }` to NAV_LINKS (after Saved, before Community)
- Import and render `NotificationBell` component next to Tools dropdown (only when `user` is not null)

### Changes to `app/components/JobCard.js`

- Add "+ Track" button next to existing Apply and Save buttons
- On click:
  - If not logged in → open AuthModal
  - If logged in → POST `/api/tracker` with `{ job_title, company, location, salary, source: 'opportumap', job_url, job_description }` and `status: 'wishlist'`
  - On success → show toast: "Added to Wishlist" with "View in Tracker →" link
  - Change button to "✓ Tracked" (green) — clicking opens `/tracker?app={id}`
- Track whether job is already tracked: on mount (when logged in), check if any application exists with matching `job_url`. Store tracked application IDs in a Set for quick lookup.

---

## New Dependencies

- `@dnd-kit/core` — drag-and-drop engine
- `@dnd-kit/sortable` — sortable preset for Kanban columns
- `@dnd-kit/utilities` — CSS utilities for drag transforms
- `resend` — email sending SDK (used only in Netlify scheduled function)

---

## Environment Variables

New:
- `RESEND_API_KEY` — Resend API key for sending email digests. Must be set in Netlify env vars scoped to **All scopes** (including Functions).

---

## File Structure (new files)

```
app/
  tracker/
    page.js                          — Kanban board page
  api/
    tracker/
      route.js                       — GET (list) + POST (create)
      [id]/
        route.js                     — GET + PATCH + DELETE single application
      reorder/
        route.js                     — PATCH batch reorder after drag-drop
    notifications/
      route.js                       — GET + PATCH notifications
  components/
    ApplicationCard.js               — Kanban card component
    ApplicationDetail.js             — Slide-out detail panel
    AddApplicationModal.js           — Manual add form
    NotificationBell.js              — Bell icon + dropdown + Realtime subscription

netlify/
  functions/
    reminder-digest.js               — Scheduled function for daily email digest
```

## Modified Files

```
app/components/Navbar.js             — Add Tracker to NAV_LINKS, render NotificationBell
app/components/JobCard.js            — Add "+ Track" button
netlify.toml                         — Add scheduled function config
```

---

## Error Handling

- All API routes: verify auth via `await createClient()` + `getUser()`. Return 401 if not authenticated.
- All API routes: return `Response.json()` with appropriate status codes (200, 201, 400, 404, 500).
- Drag-and-drop: optimistic UI — revert local state if PATCH `/api/tracker/reorder` fails.
- Scheduled function: wrap in try/catch, log errors. If Resend fails for one user, continue to next user. Don't let one failure block the batch.
- "+ Track" on JobCard: if POST fails, show error toast and revert button state.

---

## Dark/Light Mode

Full `useTheme` support on `/tracker` page following the established pattern:
- `bg` / `text` / `sub` / `card` / `input` / `divider` theme tokens
- Same as `/startups`, `/community`, `/jobs` pages

---

## Deployment

1. Push to GitHub `master` → Netlify auto-deploys
2. Run SQL to create tables + RLS policies in Supabase dashboard
3. Enable Realtime on `notifications` table in Supabase dashboard
4. Add `RESEND_API_KEY` to Netlify env vars (All scopes)
5. Sign up for Resend (free tier: 100 emails/day, 3,000/month) and verify sender domain or use default `onboarding@resend.dev` for testing
