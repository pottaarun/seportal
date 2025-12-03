# SE Portal - Solution Engineering Portal

A modular, full-stack portal built on the Cloudflare stack with real-time collaboration, scheduled jobs, and comprehensive data management.

## Architecture

```
seportal/
├── pages-app/          # React Router (Remix) on Cloudflare Pages
│   ├── app/
│   │   ├── routes/     # Modular routes (each tab = a file)
│   │   │   ├── _index.tsx     # Dashboard
│   │   │   ├── customers.tsx  # Customers tab
│   │   │   └── analytics.tsx  # Analytics tab
│   │   ├── components/ # Shared UI components
│   │   ├── lib/       # Utilities, DB queries
│   │   └── root.tsx   # App shell/layout
│   └── wrangler.toml  # Bindings configuration
├── workers/
│   ├── api/           # API Worker for webhooks/endpoints
│   ├── durable/       # Durable Objects for real-time collab
│   └── cron/          # Scheduled jobs worker
└── shared/
    └── types/         # Shared TypeScript types
```

## Stack

- **Frontend**: React Router v7 (formerly Remix v2) with SSR
- **Backend**: Cloudflare Workers
- **Database**: D1 (SQLite)
- **Cache**: KV (Key-Value storage)
- **Storage**: R2 (Object storage)
- **Real-time**: Durable Objects with WebSockets
- **Scheduling**: Cron Triggers

## Features

### Core Portal Features
- ✅ **Assets Management**: URL and file asset repository with categorization
- ✅ **Scripts Library**: Reusable code snippets and automation scripts
- ✅ **Events Calendar**: Team events and meeting scheduling
- ✅ **Announcements**: Team-wide communication and updates
- ✅ **Shoutouts**: Peer recognition and team appreciation with likes
- ✅ **Polls**: Team surveys and voting with one-vote-per-user enforcement
- ✅ **Competitions**: Gamification and team challenges
- ✅ **Org Chart**: Visual team structure with employee photos
- ✅ **Teams**: Regional team organization (AMER, EMEA, APAC)
- ✅ **RFx Management**: RFP/RFI tracking and collaboration
- ✅ **Feature Requests**: Product feature voting and opportunity tracking (NEW)
- ✅ **My Profile**: Self-service employee profile management

### Advanced Capabilities
- ✅ **AI-Powered Search**: Semantic search across Cloudflare documentation using Vectorize
- ✅ **Global Search**: Quick navigation across all portal features
- ✅ **Admin Controls**: Role-based access for content management
- ✅ **Dark/Light Mode**: User preference themes with localStorage persistence
- ✅ **Modular architecture**: Add new tabs by adding new route files
- ✅ **Server-Side Rendering** (SSR)
- ✅ **Scheduled background jobs**
- ✅ **Webhook handlers**
- ✅ **Full Cloudflare stack integration**

## Setup

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

### 1. Install Dependencies

```bash
# Install Pages app dependencies
cd pages-app
npm install

# Install API Worker dependencies
cd ../workers/api
npm install

# Install Durable Objects Worker dependencies
cd ../durable
npm install

# Install Cron Worker dependencies
cd ../cron
npm install
```

### 2. Create Cloudflare Resources

```bash
# Login to Cloudflare
wrangler login

# Create D1 Database
wrangler d1 create seportal-db
# Copy the database_id and update all wrangler.toml files

# Create KV Namespace
wrangler kv:namespace create "seportal-kv"
# Copy the id and update all wrangler.toml files

# Create R2 Bucket
wrangler r2 bucket create seportal-storage
```

### 3. Update Bindings

Update the following files with your resource IDs:
- `pages-app/wrangler.toml`
- `workers/api/wrangler.toml`
- `workers/durable/wrangler.toml`
- `workers/cron/wrangler.toml`

Replace `"TBD"` with actual IDs from step 2.

### 4. Set Up Database Schema

```bash
cd pages-app

# Create your database schema
wrangler d1 execute seportal-db --file=./schema.sql
```

Create `pages-app/schema.sql`:
```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  payload TEXT,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Deploy Workers

```bash
# Deploy Durable Objects Worker (must be first)
cd workers/durable
wrangler deploy

# Deploy API Worker
cd ../api
wrangler deploy

# Deploy Cron Worker
cd ../cron
wrangler deploy
```

### 6. Deploy Pages App

```bash
cd pages-app
npm run build
npm run deploy
```

## Development

### Run Pages App Locally

```bash
cd pages-app
npm run dev
```

Visit `http://localhost:3000`

### Run Workers Locally

```bash
# API Worker
cd workers/api
npm run dev

# Durable Objects Worker
cd workers/durable
npm run dev

# Cron Worker (test manually)
cd workers/cron
npm run dev
```

### Test Webhooks

```bash
# Test Salesforce webhook
curl -X POST https://your-worker.workers.dev/webhooks/salesforce \
  -H "Content-Type: application/json" \
  -d '{"event": "opportunity.created", "data": {}}'

# Test Slack webhook
curl -X POST https://your-worker.workers.dev/webhooks/slack \
  -H "Content-Type: application/json" \
  -d '{"type": "event_callback", "event": {}}'
```

### Test Real-time Collaboration

```javascript
// Connect to a collaboration room
const ws = new WebSocket('wss://your-worker.workers.dev/room/my-room');

ws.onopen = () => {
  // Send an update
  ws.send(JSON.stringify({
    type: 'update',
    payload: { text: 'Hello from client!' }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

## Adding New Features

### Add a New Tab/Route

1. Create a new file in `pages-app/app/routes/`:

```tsx
// pages-app/app/routes/projects.tsx
import type { Route } from "./+types/projects";

export async function loader({ context }: Route.LoaderArgs) {
  // Fetch data from D1, KV, or API
  return { projects: [] };
}

export default function Projects({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2>Projects</h2>
      {/* Your UI here */}
    </div>
  );
}
```

2. Add link to navigation in `pages-app/app/root.tsx`

That's it! The route is automatically available at `/projects`

### Add a New Webhook Handler

Edit `workers/api/src/index.ts`:

```typescript
if (pathname === '/webhooks/github') {
  const payload = await request.json();
  // Handle GitHub webhook
  await env.DB.prepare('INSERT INTO webhook_logs ...').run();
  return new Response(JSON.stringify({ success: true }));
}
```

### Add a New Scheduled Job

Edit `workers/cron/src/index.ts` and add your job logic, then update `workers/cron/wrangler.toml`:

```toml
[triggers]
crons = [
  "0 */6 * * *",  # Your new schedule
  # ... existing schedules
]
```

## Monitoring

- View cron job logs: `wrangler tail seportal-cron`
- View API logs: `wrangler tail seportal-api`
- Check health: `https://your-worker.workers.dev/api/status`

## Type Safety

All workers and pages share types from `shared/types/index.ts`. Import them:

```typescript
import type { Customer, AnalyticsEvent } from '../../../shared/types';
```

## Feature Spotlight: Feature Requests

The Feature Requests tab allows SEs to submit and vote on product feature requests with opportunity tracking.

### How It Works

**Submitting Requests:**
- Product name (e.g., Workers, R2, D1)
- Feature description
- Opportunity value in USD (potential deal value)
- Automatically captures submitter info and timestamp

**Voting System:**
- One upvote per user per feature (enforced at database level)
- Toggle upvote/un-upvote functionality
- Visual feedback for voted state

**Smart Sorting:**
Feature requests are automatically sorted by:
1. **Upvotes** (DESC) - Most upvoted features appear first
2. **Opportunity Value** (DESC) - When upvotes are equal, higher dollar opportunities take priority
3. **Created Date** (ASC) - When both upvotes and value are equal, oldest requests appear first

### Database Schema

```sql
-- Feature requests
CREATE TABLE feature_requests (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  feature TEXT NOT NULL,
  opportunity_value REAL NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Upvote tracking (UNIQUE constraint enforces one vote per user)
CREATE TABLE feature_request_upvotes (
  id TEXT PRIMARY KEY,
  feature_request_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feature_request_id, user_email)
);
```

### API Endpoints

- `GET /api/feature-requests` - Get all requests (sorted)
- `POST /api/feature-requests` - Create new request
- `POST /api/feature-requests/:id/upvote` - Toggle upvote
- `POST /api/feature-requests/user-upvotes` - Get user's upvoted requests
- `DELETE /api/feature-requests/:id` - Delete request (admin only)

## Changelog

### December 3, 2025
- ✨ Added Feature Requests tab with upvoting functionality
- ✨ Implemented opportunity value tracking for features
- ✨ Smart sorting: upvotes → opportunity value → oldest first
- 🔒 Enforced one vote per user per feature at database level
- 📝 Updated route configuration system

## Next Steps

1. ✅ Authentication (Cloudflare Access integrated)
2. Add more advanced analytics dashboards
3. Implement notification system for feature updates
4. Add error monitoring (Sentry, etc.)
5. Set up CI/CD with GitHub Actions

## Support

For issues or questions, contact: **Arun Potta** (apotta@cloudflare.com)

## Questions?

Check the [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) and [React Router docs](https://reactrouter.com/).
