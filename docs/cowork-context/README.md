# OpportuMap — Cowork Context Pack

> **Purpose of this folder:** A complete, self-contained knowledge base about **Aahil Akbar** and the **OpportuMap AI** project. It exists so that any new Claude session — including **Claude cowork (claude.ai/code on the web)** — can pick up exactly where the last one left off, with full context, without re-explaining anything.

**Last updated:** 2026-06-10
**Maintained by:** Aahil Akbar + Claude
**Repo:** https://github.com/Aahil1369/opportumap
**Live site:** https://opportumap.netlify.app
**Working branch (as of last update):** `redesign-2026-04`

---

## How to continue this from Claude cowork

1. Go to **claude.ai/code** (Claude cowork) and connect the GitHub repo **`Aahil1369/opportumap`**.
2. Tell Claude: *"Read `docs/cowork-context/` to load full context on me and OpportuMap, then continue."*
3. Claude reads these files in order (they're numbered) and is immediately caught up.
4. When you finish a work session, ask Claude to **append an entry to `99-continuation-log.md`** describing what changed. That keeps this pack a living document.

> **Tip:** This folder is committed to git, so it travels with the repo. Anything you do locally in Claude Code *or* in Claude cowork stays in sync as long as you commit + push.

---

## What's in this folder

| File | What it covers |
|------|----------------|
| [`00-quickstart.md`](./00-quickstart.md) | TL;DR — the 60-second version of everything. Read this first if you're in a hurry. |
| [`01-about-aahil.md`](./01-about-aahil.md) | Who Aahil is — background, academics, goals, ECs, skills, how he likes to work. |
| [`02-opportumap-overview.md`](./02-opportumap-overview.md) | What OpportuMap is, the vision, the pages, the value proposition. |
| [`03-tech-architecture.md`](./03-tech-architecture.md) | Full tech stack, file layout, API routes, database schema, env vars. |
| [`04-features-deep-dive.md`](./04-features-deep-dive.md) | Every feature explained in detail — how each page/tool works. |
| [`05-gotchas-and-decisions.md`](./05-gotchas-and-decisions.md) | Hard-won lessons, build traps, and locked-in technical decisions. Don't re-litigate these. |
| [`06-roadmap-and-ideas.md`](./06-roadmap-and-ideas.md) | What's next, open ideas, college-app framing. |
| [`99-continuation-log.md`](./99-continuation-log.md) | Append-only session log. Add an entry every time you do meaningful work. |

---

## Ground rules for any Claude working in this repo

- **Branch convention:** OpportuMap uses `master` as its base (not `main`). Current feature branch is `redesign-2026-04`.
- **Shell:** Aahil is on Windows 11. In Claude Code locally, bash is available — use Unix syntax.
- **Never paste secrets in chat** — Groq/Supabase keys get auto-revoked if they appear in conversation.
- **Don't commit** `.superpowers/`, `.claude/`, `.env.local`, `node_modules/`, or `.next/`.
- **Verify before claiming done** — run the build / dev server and confirm, don't assert success blindly.
