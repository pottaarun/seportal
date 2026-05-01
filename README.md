# SE Portal — Solution Engineering Portal

A modular, full-stack portal for Cloudflare's Solution Engineering team. Built end-to-end on the Cloudflare stack (Workers, Pages, D1, KV, R2, Vectorize, Workers AI, Stream, Durable Objects, Cron) with two flagship AI experiences (AI Hub + RFx Response Generator) and a content library covering team operations, learning, and enablement.

## Quick links

| Surface | URL |
|---|---|
| Production | https://seportal-pages.pages.dev |
| API worker | https://seportal-api.arunpotta1024.workers.dev |
| Search-AI worker | https://seportal-search-ai.arunpotta1024.workers.dev |
| Cron worker | https://seportal-cron.arunpotta1024.workers.dev |
| Durable worker | https://seportal-durable.arunpotta1024.workers.dev |
| Repo | https://github.com/pottaarun/seportal |
| Cloudflare account | `181a2fdc5974aca05e555ae1dd7c080b` (Arun Org) |

## Architecture

```
seportal/
├── pages-app/                  # React Router v7 (SPA mode) on Cloudflare Pages
│   ├── app/
│   │   ├── routes/             # Each route = one tab in the top nav
│   │   │   ├── _index.tsx      # /            Dashboard (landing page, stat cards + activity feed)
│   │   │   ├── ai-hub.tsx      # /ai-hub      AI Hub — Skills/Agents Library + AI Coach & Playbook
│   │   │   ├── assets.tsx      # /assets      URL + file asset library
│   │   │   ├── scripts.tsx     # /scripts     Reusable code snippets
│   │   │   ├── events.tsx      # /events      Team events calendar
│   │   │   ├── announcements.tsx     # /announcements   Team-wide updates (with AI email generator)
│   │   │   ├── shoutouts.tsx   # /shoutouts   Peer recognition
│   │   │   ├── learning.tsx    # /learning    Learning Hub — Stream-hosted videos with transcript search
│   │   │   ├── competitions.tsx      # /competitions    Gamification + challenges
│   │   │   ├── org-chart.tsx   # /org-chart   Teams & Org (3 view modes: Teams, Hierarchy, Map)
│   │   │   │                                  Also reachable at /teams (alias for back-compat)
│   │   │   ├── rfx.tsx         # /rfx         RFx Response Generator (AI-powered RFP/RFI answers)
│   │   │   ├── feature-requests.tsx  # /feature-requests   Product feature voting
│   │   │   ├── skills-matrix.tsx     # /skills-matrix      SE skill assessments + curriculum
│   │   │   ├── my-profile.tsx  # /my-profile  Self-service profile
│   │   │   └── admin.tsx       # /admin       Admin panel (employees, groups, integrations, analytics)
│   │   ├── components/         # Shared UI (GlobalSearch, WorldMap, CustomersInteractive, etc.)
│   │   ├── contexts/           # React contexts (AdminContext)
│   │   ├── lib/                # api.ts, timeUtils.ts
│   │   ├── globals.css         # Design tokens + base styles
│   │   ├── routes/rfx.css      # Shared RFx-style design system (used by /ai-hub, /rfx, /org-chart)
│   │   └── root.tsx            # App shell with sticky top nav
│   ├── functions/api/auth/     # Pages Functions for Cloudflare Access auth
│   └── wrangler.toml
├── workers/
│   ├── api/                    # Main API worker (D1, R2, KV, Vectorize, Workers AI, Stream)
│   │   ├── src/index.ts        # ~4800 lines — all REST endpoints
│   │   ├── schema.sql          # D1 base schema
│   │   ├── migrations/         # Numbered SQL migrations
│   │   └── wrangler.toml       # bindings: DB, KV, R2, AI, VECTORIZE (cf-docs), VIDEO_VECTORIZE (videos)
│   ├── search-ai/              # Standalone semantic-search worker (cf-docs Vectorize)
│   ├── cron/                   # Scheduled jobs: */5min auto-resume stuck videos, hourly, daily
│   └── durable/                # Durable Objects for real-time collaboration (CollabRoom)
├── mcp-server/                 # Standalone MCP server for Claude Desktop integration
├── shared/types/               # Shared TypeScript types (Customer, AnalyticsEvent, etc.)
├── DESIGN.md                   # Linear-app design system reference (used as design language source)
├── CLOUDFLARE_ACCESS_SETUP.md  # Auth setup guide
└── README.md                   # You are here
```

## Stack

- **Frontend**: React Router v7 (SPA mode) on Cloudflare Pages
- **API**: Cloudflare Workers (single `seportal-api` worker handles ~150 REST endpoints)
- **Database**: D1 (SQLite). Tables include `videos`, `ai_solutions`, `cf_skills`, `employees`, `groups`, `events`, `announcements`, `shoutouts`, `competitions`, `feature_requests`, `skill_assessments`, `rfx_*`, `user_*`, etc.
- **Cache + KV state**: KV namespace `seportal-kv` (`66a4c597ef8749b99263134606222f5a`)
- **Storage**: R2 bucket `seportal-storage` (file assets, photo uploads, polls archive)
- **Vector search**:
  - `cloudflare-docs` index (768d cosine) — Cloudflare documentation for RFx grounding
  - `seportal-videos` index (768d cosine) — Learning Hub video transcripts
  - `seportal-search-index` (768d cosine) — global semantic search (legacy)
- **AI models**:
  - `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for RFx answers, AI Coach chat, AI email generator, curriculum advisor, playbook coaching
  - `@cf/baai/bge-base-en-v1.5` for embeddings (768-dim)
  - Cloudflare Stream's auto-caption (Whisper) for video transcription
- **Video**: Cloudflare Stream (TUS direct upload, HLS/DASH playback, WebVTT captions)
- **Scheduling**: Cron Triggers (`*/5 * * * *`, `0 * * * *`, `0 0 * * *` and a Sunday docs sync)
- **Real-time collab**: Durable Objects with WebSockets (`CollabRoom`)
- **Auth**: Cloudflare Access (see `CLOUDFLARE_ACCESS_SETUP.md`) with localStorage fallback
- **Design system**: shared `rfx.css` (DM Serif Display headings, RFx-style panels, brand-orange CTAs, status pills)

## Routes

The top nav renders in this order, driven by `pages-app/app/root.tsx`:

| Path | Tab label | What it does |
|---|---|---|
| `/` | Dashboard | Landing page. Animated stat cards (one per surface), latest shoutouts, next event, latest announcement, recent videos, top feature requests |
| `/ai-hub` | AI Hub | Two-tab AI library: **Skills & Agents Library** (search + Starter Pack + Community), **AI Coach & Playbook** (sales-stage cards + SE Messaging Playbook). Status pills show indexed-skills count, library count, playbook artifact count, starter-pack count |
| `/assets` | Assets | URL + file assets with categorization, edit/delete (admin/owner) |
| `/scripts` | Scripts | Code snippet library with copy-to-clipboard |
| `/events` | Events | Team event calendar with RSVPs |
| `/announcements` | Announcements | Team-wide posts with **AI email generator** (auto-drafts a send-grade email from the announcement) |
| `/shoutouts` | Shoutouts | Peer recognition feed with hearts |
| `/learning` | Learning Hub | Video training library with auto-transcription, semantic transcript search, click-to-seek timestamps, "Similar videos" recommendations |
| `/competitions` | Competitions | Active challenges + leaderboards |
| `/org-chart` | Teams & Org | One tab, three view modes: **Teams** (regional groups), **Hierarchy** (manager tree), **Map** (Natural Earth world map of employee locations). `/teams` is an alias |
| `/rfx` | RFx | RFP/RFI Response Generator (single Q or batch upload) — answers grounded in indexed Cloudflare docs + completed-RFP training uploads |
| `/feature-requests` | Features | Product feature voting (one vote per user, sorted by upvotes → opportunity value → oldest) |
| `/skills-matrix` | Skills | SE skill assessments, curriculum tracker (mandatory/optional courses), AI Curriculum Advisor for gap analysis |
| `/my-profile` | My Profile | Self-service profile editor (photo, bio, location, timezone) |
| `/admin` | Admin | Employee CRUD, group management, integrations (Workday placeholder), reporting dashboards, page-view drill-down, error logs |

## Feature Spotlight — AI Hub (`/ai-hub`)

The AI Hub is the team's curated library of AI-assisted sales tools, plus a stage-driven messaging coach. Two tabs:

### Tab 1 — Skills & Agents Library (default)

**Two-column layout** (`1.6fr / 1fr`):

- **Left**: search bar (with brand-orange Search CTA + "Try" suggestions + Clear pill) → Starter Pack accordion → Community Contributions accordion. Each list item is a `SolutionCard` with type badge, upvote button, "Ask AI" hand-off, and view-detail link.
- **Right sidebar**:
  - **Solution Type** panel — RFx-categories pattern (2-col grid of pills, solid orange when selected): All / Tool / Gem / Prompt / Skill / Workflow / **Agent** (now enabled). Click an active chip to deselect.
  - **Sort By** panel — Most Upvoted / Recently Added / Most Used / A→Z
  - **What This Is** panel — explainer copy + pointer to the Coach tab

Solutions live in the `ai_solutions` D1 table with `type ∈ {tool, gem, prompt, skill, workflow, agent}`. Library accordions hide rows tagged `"playbook"` (those surface on Tab 2 instead).

### Tab 2 — AI Coach & Playbook

**Two-column layout**:

- **Left**:
  - **Sales Stage** card grid (7 stages: Running Your Business, All Stages, Account Planning & Prospecting, Qualification & Discovery, Solution Design & Proposal, Negotiation & Close, Renewals & Retention). Active stage = orange-tinted bg + accent strip on left edge.
  - **SE Messaging Playbook** section — stage-driven artifacts grouped by 6 kinds: Value Statements, Discovery Questions, Objection Handlers, Email Templates, Talk Tracks, Closing Plays. Each card has an "Ask AI Coach" button that opens a chat modal pre-populated with the artifact as context.
- **Right sidebar**:
  - **Ask the AI Coach** panel — copy + brand-orange "Open AI Coach" CTA → opens chat modal grounded in the official `cloudflare/skills` repo (via Vectorize)
  - **Knowledge Base** panel — DM Serif Display stat numbers for skills indexed + chunks available for grounding
  - **What This Is** panel — explainer

### AI Coach grounding

The coach uses RAG: query is embedded with `bge-base-en-v1.5`, top chunks retrieved from the `cloudflare-docs` Vectorize index AND from indexed `cf_skills` rows (synced from the GitHub `cloudflare/skills` repo), composed into a prompt for `llama-3.3-70b-instruct-fp8-fast`, and returned with citations. Stats are exposed via `/api/ai-hub/stats`.

### Data model

```sql
ai_solutions(id, type, title, description, content, sales_stage, product, tags, author_email,
             author_name, upvotes, uses, is_starter, is_pinned, icon, source_url, created_at, updated_at)
ai_solution_upvotes(id, solution_id, user_email, created_at)         -- UNIQUE(solution_id, user_email)
ai_solution_uses(id, solution_id, user_email, user_name, action, created_at)
cf_skills(id, name, description, content, source_url, github_repo, github_branch, github_path,
          chunks_count, byte_size, status, last_error, last_indexed_at, created_at, updated_at)
cf_skill_vectors(id, skill_id, chunk_index, ...)
```

### Key endpoints

- `GET /api/ai-hub/solutions` — list (filters: `stage`, `type`, `tag`, `q`, `sort`)
- `GET /api/ai-hub/solutions/:id`
- `POST /api/ai-hub/solutions` — contribute
- `POST /api/ai-hub/solutions/:id/upvote` — toggle (one vote per user)
- `POST /api/ai-hub/solutions/:id/use` — track view/copy/etc. (drives `Most Used` sort)
- `GET /api/ai-hub/stats` — returns `{library, library_starters, library_community, playbook, total, starters, community, by_stage, by_type, skills: {count, indexed, chunks, last_indexed_at}}`
- `POST /api/ai-hub/chat` — Ask the AI Coach (RAG over `cf_skills` + general)
- `GET /api/ai-hub/skills` — admin knowledge base management
- `POST /api/ai-hub/skills/sync` — re-sync from `cloudflare/skills` GitHub repo
- `POST /api/ai-hub/skills/:id/index` — chunk + embed + upsert vectors

## Feature Spotlight — Learning Hub (`/learning`)

Video training library where SEs upload, watch, and discover recorded playbooks, demos, and deep dives. Every video is automatically transcribed and indexed for semantic search — users can ask "how do I handle the we-already-have-an-incumbent objection?" and get the exact video + timestamp where that topic was discussed.

### Upload flow (no request-size limits)

1. Browser requests a one-time direct-upload URL from the API worker (which calls Stream's `direct_upload` endpoint with the `STREAM_API_TOKEN` secret).
2. Browser uploads bytes **directly to Cloudflare Stream** via TUS (`tus-js-client`) — no file ever passes through our Worker, so videos can be any size.
3. Browser notifies the API worker that upload is complete.
4. API worker schedules a background job via `ctx.waitUntil` that:
   - Polls Stream until transcoding finishes (HLS/DASH manifests ready)
   - Triggers Stream's auto-caption generation (Whisper-based)
   - Downloads the WebVTT, parses cues with timestamps
   - Chunks the transcript into 30-second windows
   - Embeds each chunk with `@cf/baai/bge-base-en-v1.5` (768-dim)
   - Upserts vectors into `seportal-videos` Vectorize with `{video_id, chunk_index, start_seconds, snippet, title, category}`
   - Updates `transcription_status` and `transcription_progress` columns the UI polls

If a job dies (worker redeploy, unhandled error), the cron worker's `*/5min` job calls `POST /api/admin/resume-stuck-videos` which finds zombie videos (status not done, `updated_at` > 5 min) and re-kicks them — exponential backoff, 10 retries max.

### Search + recommendations

- **Semantic search**: query → embed → `VIDEO_VECTORIZE.query(embedding, {topK: 50, returnMetadata: true})` → group by `video_id` → return top videos with the matching snippet and timestamp.
- **Recommendations**: for the currently playing video, embed its title+description+transcript-excerpt and run the same query, excluding the source. Falls back to same-category popularity if no vector siblings exist yet.

### Endpoints

- `POST /api/videos/upload-url` — request Stream direct-upload URL
- `POST /api/videos/:id/finalize` — kick off background transcription + vectorization
- `GET /api/videos[?category=...]` — list
- `GET /api/videos/:id` — single video with full transcript
- `GET /api/videos/:id/status` — poll transcription progress (UI polls every ~3s during processing)
- `PUT /api/videos/:id` — update title/description/category
- `DELETE /api/videos/:id` — remove from Stream, Vectorize, and D1
- `POST /api/videos/:id/view` — record a view
- `POST /api/videos/search` — semantic search
- `GET /api/videos/:id/recommendations?limit=5` — similar videos
- `POST /api/videos/:id/reprocess` — admin: re-transcribe + re-vectorize
- `POST /api/admin/resume-stuck-videos` — called by cron */5min

## Feature Spotlight — RFx Response Generator (`/rfx`)

AI-powered RFP/RFI answer generator backed by indexed Cloudflare documentation + optional completed-RFP training uploads. Two tabs (`Answer RFx` / `Training & Sources`), two answer modes (`Single Question` / `Upload & Answer` for batch over .txt/.md/.docx/.xlsx). Answers are scoped to selected Product Categories (Application Security, Network Services, Developer Platform, Application Performance, SASE, Workplace Security).

Powered by `llama-3.3-70b-instruct-fp8-fast` with a RAG prompt over the `cloudflare-docs` Vectorize index. Tracks `rfx_stats` so the header shows live counts of indexed-doc chunks and questions answered.

The shared design language (DM Serif Display title, status pill bar, RFx panels with subtle drop shadows, solid-orange CTAs) was extracted into `pages-app/app/routes/rfx.css` and is now reused by `/ai-hub` and `/org-chart`.

## Feature Spotlight — Teams & Org (`/org-chart`)

Single tab, three view modes:

- **Teams** — employees grouped by regional/functional team. Color-coded per group, filterable.
- **Hierarchy** — manager → reports tree, auto-expanded two levels deep
- **Map** — Natural Earth world map with employees pinned by location

Default view depends on the URL: `/org-chart` lands on Hierarchy, `/teams` lands on Teams. `?view=teams|tree|map` deep-links any view. Both pages used to be separate tabs (`/teams` + `/org-chart`); merged in commit `1bb4d99`.

## Feature Spotlight — Feature Requests (`/feature-requests`)

Product feature voting with opportunity-value tracking. Submitters specify product name + feature description + estimated USD opportunity value. One upvote per user (UNIQUE constraint at the DB level). Sort: upvotes DESC → opportunity value DESC → oldest first.

## Setup

### Prerequisites

- Node.js 18+
- Cloudflare account (multi-account: pin to `Arun Org` via `CLOUDFLARE_ACCOUNT_ID`)
- Wrangler 4.84+ (`npm install -D wrangler@latest`)
- For Cloudflare WARP / corporate TLS: ensure `NODE_EXTRA_CA_CERTS` points at the WARP root cert (run `clearskies fix-tokens` if you have it)

### One-time install

```bash
# Pages app
cd pages-app && npm install && cd ..

# Workers
cd workers/api && npm install && cd ../..
cd workers/durable && npm install && cd ../..
cd workers/cron && npm install && cd ../..
cd workers/search-ai && npm install && cd ../..

# (optional) MCP server
cd mcp-server && npm install && npm run build && cd ..
```

### Cloudflare resources (already created on `Arun Org`)

| Resource | Identifier |
|---|---|
| D1 database | `seportal-db` (id in `workers/api/wrangler.toml`) |
| KV namespace | `seportal-kv` |
| R2 bucket | `seportal-storage` |
| Vectorize: docs | `cloudflare-docs` (768d cosine) |
| Vectorize: videos | `seportal-videos` (768d cosine) |
| Vectorize: search | `seportal-search-index` (768d cosine) |

To recreate from scratch:

```bash
wrangler d1 create seportal-db
wrangler kv namespace create seportal-kv
wrangler r2 bucket create seportal-storage
wrangler vectorize create cloudflare-docs --dimensions=768 --metric=cosine
wrangler vectorize create seportal-videos --dimensions=768 --metric=cosine
wrangler vectorize create seportal-search-index --dimensions=768 --metric=cosine
```

### Secrets

Set on `seportal-api`:

```bash
wrangler secret put STREAM_API_TOKEN --config workers/api/wrangler.toml   # Stream > Edit scope
# Optional integrations
wrangler secret put GITHUB_TOKEN     --config workers/api/wrangler.toml   # for cf_skills sync
wrangler secret put OPENAI_API_KEY   --config workers/api/wrangler.toml   # currently unused — Workers AI is primary
```

### Database schema

Initial schema:

```bash
wrangler d1 execute seportal-db --remote --file=workers/api/schema.sql
```

Migrations (apply in order if not already applied — all are idempotent or guarded):

```bash
wrangler d1 execute seportal-db --remote --file=workers/api/migrations/archive_and_remove_polls.sql
wrangler d1 execute seportal-db --remote --file=workers/api/migrations/add_learning_hub.sql
wrangler d1 execute seportal-db --remote --file=workers/api/migrations/add_retry_columns.sql
wrangler d1 execute seportal-db --remote --file=workers/api/migrations/add_transcription_progress.sql
wrangler d1 execute seportal-db --remote --file=workers/api/migrations/add_vtt_to_videos.sql
```

Before running `archive_and_remove_polls.sql` against a database that has poll data, hit `GET /api/admin/archive-polls` to back up to R2 (`archives/polls-<timestamp>.json`).

### Deploy

```bash
# Pages
cd pages-app && npm run deploy

# Workers (each from repo root)
wrangler deploy --config workers/api/wrangler.toml
wrangler deploy --config workers/cron/wrangler.toml
wrangler deploy --config workers/durable/wrangler.toml
wrangler deploy --config workers/search-ai/wrangler.toml
```

If the deploy command needs the account pinned (multi-account login):

```bash
CLOUDFLARE_ACCOUNT_ID="181a2fdc5974aca05e555ae1dd7c080b" \
NODE_EXTRA_CA_CERTS="$HOME/.cache/clearskies/cloudflare-ca-bundle.pem" \
wrangler deploy --config workers/api/wrangler.toml
```

## Development

### Pages app

```bash
cd pages-app && npm run dev    # http://localhost:3000
```

The app talks to the **deployed** API worker by default. To point at a local API worker, set `VITE_API_URL` in `.env.local`.

### Workers

```bash
cd workers/api && npm run dev      # local dev with miniflare
cd workers/cron && npm run dev --test-scheduled    # then GET http://localhost:8787/__scheduled
```

## Cron jobs

`workers/cron` is wired up with three schedules:

| Schedule | Job |
|---|---|
| `*/5 * * * *` | Auto-resume stuck video transcriptions (`POST /api/admin/resume-stuck-videos`) + health probes |
| `0 * * * *` | Hourly maintenance |
| `0 0 * * *` | Daily reports + Workday sync placeholder |

`workers/api` also has a Sunday cron at `0 2 * * SUN` for the Cloudflare-docs re-sync into Vectorize.

## Auth

Cloudflare Access is configured for `seportal-pages.pages.dev`. The Pages Function at `pages-app/functions/api/auth/user.ts` reads the `Cf-Access-Authenticated-User-Email` header and returns the user identity. The frontend auto-logs-in from this on first paint, falling back to localStorage if Access isn't configured. See `CLOUDFLARE_ACCESS_SETUP.md` for the full setup guide.

## Design system

The shared design language lives in `pages-app/app/routes/rfx.css` (originally extracted from `/rfx` and now reused by `/ai-hub` and `/org-chart`). Key building blocks:

| Class | Use |
|---|---|
| `.rfx-page` | Page wrapper (full width, capped by `main`'s 1680px max) |
| `.rfx-header` | Hero block: serif title + subtitle + status pill row |
| `.rfx-title` | 56px DM Serif Display, `letter-spacing: -0.03em` |
| `.rfx-h` / `.rfx-h-sm` | Section headings (28px / 20px DM Serif Display) |
| `.rfx-tabs` / `.rfx-tabs-grid` / `.rfx-btn--seg` / `.rfx-btn--seg-active` | Segmented tab strip |
| `.rfx-layout` | 2-col grid (`1.6fr / 1fr`), collapses to single column at <1024px |
| `.rfx-panel` | 16px-radius card, subtle drop shadow, 28px padding |
| `.rfx-btn` / `.rfx-btn--primary` / `.rfx-btn--subtle` / `.rfx-btn--danger` | Button variants |
| `.rfx-categories` | 2-col grid for category-button groups (RFx Product Categories pattern) |
| `.rfx-pill` / `.rfx-pill--ok` / `.rfx-pill--warn` / `.rfx-pill--bad` | Status pills |
| `.rfx-dropzone` | File-upload drop target |

Global tokens (in `globals.css`):

- Brand orange `#F6821F` (Cloudflare orange) — single chromatic accent
- Surface stack: `--bg-primary` / `--bg-secondary` / `--bg-tertiary` / `--bg-elevated`
- Text stack: `--text-primary` / `--text-secondary` / `--text-tertiary`
- Inter for body, DM Serif Display for headings, Inter font features `'cv01', 'ss03'` enabled globally (Linear-inspired)
- `main { max-width: 1680px }` — content-rich pages get room to breathe on wide monitors

`DESIGN.md` at the repo root captures the Linear.app design principles that informed the typography/spacing/elevation choices in `rfx.css`.

## Adding a new tab

1. Create `pages-app/app/routes/<name>.tsx`. If the page has rich content, wrap in `<div className="rfx-page">` and use the design tokens above.
2. Register it in `pages-app/app/routes.ts`:
   ```ts
   route("<name>", "routes/<name>.tsx"),
   ```
3. Add a nav entry in `pages-app/app/root.tsx` (`NAV_ITEMS`).
4. If the page needs new D1 tables, add a migration in `workers/api/migrations/` and apply with `wrangler d1 execute --remote --file=...`.
5. If the page needs new API endpoints, add them in `workers/api/src/index.ts`.
6. `npm run build` (pages-app), `npm run deploy` (pages-app), and `wrangler deploy --config workers/api/wrangler.toml` (worker).

## Monitoring

- API worker logs: `wrangler tail seportal-api`
- Cron logs: `wrangler tail seportal-cron`
- Pages deployment list: `wrangler pages deployment list --project-name seportal-pages`
- D1 row counts: `wrangler d1 execute seportal-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"`

## Changelog

### April 30, 2026
- ✨ Enable **Agents** solution type in AI Hub (chip selectable + form option)
- 🐛 Fix Dashboard "AI Hub" stat-card count to use library-only number (was including playbook artifacts the user can't see in the library)
- 🎨 Widen page max-width 1400→1680 so AI Hub doesn't look squished on wide monitors
- 🔁 Restore Dashboard as the landing page; AI Hub moves to `/ai-hub`
- 💎 Apply RFx 2-column layout to both AI Hub tabs (search + lists left, type filter sidebar right with orange-selected category pattern)
- ✨ Split AI Hub into two tabs: **Skills & Agents Library** (default) / **AI Coach & Playbook**
- 🤝 **Merge Teams and Org Chart** into a single "Teams & Org" tab with three view modes (Teams / Hierarchy / Map)
- 🎨 Restyle AI Hub with the RFx design language (serif title + status pills + RFx panels). Imports `rfx.css` so all three AI tools share one design system
- 🐛 Override `globals.css` button defaults that were clipping text on stage cards
- 🐛 Fix sales-stage card overflow: subtitles bled into adjacent grid cells
- 💎 First pass at AI Hub Linear redesign

### April 21, 2026
- ✨ Add **Learning Hub** tab: video training library with auto-transcription and semantic search
- 🎬 Integrate Cloudflare Stream for unlimited-size video uploads (direct-to-Stream via TUS, bypasses Worker body limits)
- 🧠 Whisper auto-captions via Stream's native caption generation, vectorized into `seportal-videos`
- 🔍 Semantic transcript search + "Similar videos" recommendations powered by `bge-base-en-v1.5`
- ⚠️ **Polls tab retired** — data archived to R2 via `GET /api/admin/archive-polls`, then tables dropped via `migrations/archive_and_remove_polls.sql`
- ✨ Add **AI Hub** with SE Messaging Playbook section (stage-aware coaching with `cloudflare/skills` grounding)
- 🤖 Upgrade primary AI model to `llama-3.3-70b-instruct-fp8-fast` and improve RFx prompt strategy
- ✨ Per-user page-view drill-down in Admin > Page Views
- ✨ AI email generator for announcements
- ✨ Tab analytics, user profile onboarding, error logging
- 🌎 Replace org-chart map with Natural Earth world map (accurate continent outlines)
- ✨ Course assignments + AI Curriculum Advisor (gap analysis)
- ✨ Workday integration placeholder + reporting dashboards + admin integrations tab

### December 3, 2025
- ✨ Add **Feature Requests** tab with upvoting and opportunity-value tracking
- 🔒 One vote per user enforced at DB level
- 📝 Smart sort: upvotes → opportunity value → oldest first

### Earlier
- ✅ Cloudflare Access auth integration
- ✅ Dark/light mode with localStorage persistence
- ✅ Global semantic search across all surfaces
- ✅ Admin role + owner permissions on assets
- ✅ Real-time collaboration via Durable Objects (CollabRoom)

## Support

For issues or questions, contact **Arun Potta** (apotta@cloudflare.com). Bug reports also accepted via the in-app pill in the top nav.
