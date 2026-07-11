export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
}

const API_BASE = 'https://seportal-api.arunpotta1024.workers.dev';

// Consider a docs crawl "stuck" if its processed-page count hasn't advanced for
// this long while the run is still marked running.
const DOCS_STUCK_MINUTES = 15;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('Cron Worker - Use scheduled triggers', { status: 200 });
  },

  // Scheduled event handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;

    console.log(`Cron triggered at ${new Date().toISOString()} with schedule: ${cron}`);

    try {
      // Route to appropriate job based on schedule
      if (cron === '0 * * * *') {
        // Runs every hour
        await runHourlyJobs(env);
      } else if (cron === '0 0 * * *') {
        // Runs daily at midnight
        await runDailyJobs(env);
      } else if (cron === '*/5 * * * *') {
        // Runs every 5 minutes
        await runFrequentJobs(env);
      }

      // Log successful execution
      await env.KV.put(`cron:last_run:${cron}`, new Date().toISOString());
    } catch (error) {
      console.error('Cron job failed:', error);

      // Store error for monitoring
      await env.KV.put(`cron:last_error:${cron}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        error: String(error),
      }));
    }
  },
};

async function runHourlyJobs(env: Env): Promise<void> {
  console.log('Running hourly jobs...');

  // Generate hourly analytics (best-effort; isolated so a failure here doesn't
  // abort the whole hourly run).
  try {
    const stats = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM events WHERE created_at > datetime("now", "-1 hour")'
    ).first();

    await env.KV.put('stats:hourly', JSON.stringify({
      timestamp: new Date().toISOString(),
      eventCount: stats?.count || 0,
    }));
  } catch (err) {
    console.error('Hourly analytics failed:', err);
  }

  console.log('Hourly jobs completed');
}

async function runDailyJobs(env: Env): Promise<void> {
  console.log('Running daily jobs...');

  // Generate daily report (best-effort; isolated so a failure here can't block
  // the Workday sync below).
  try {
    const dailyStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users
      FROM events
      WHERE created_at > datetime("now", "-1 day")
    `).first();

    const reportDate = new Date().toISOString().split('T')[0];
    await env.R2.put(`reports/daily/${reportDate}.json`, JSON.stringify({
      date: reportDate,
      stats: dailyStats,
      generated_at: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Daily report failed:', err);
  }

  // Workday sync (if enabled)
  try {
    const syncEnabled = await env.KV.get('workday:sync_enabled');
    if (syncEnabled === 'true') {
      console.log('Triggering scheduled Workday sync...');
      const syncRes = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/admin/workday-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'cron', schedule: 'daily' }),
      });
      const syncResult = await syncRes.json();
      await env.KV.put('workday:last_cron_sync', JSON.stringify({
        timestamp: new Date().toISOString(),
        result: syncResult,
      }));
      console.log('Workday sync completed:', JSON.stringify(syncResult));
    } else {
      console.log('Workday sync not enabled, skipping');
    }
  } catch (syncError) {
    console.error('Workday cron sync failed:', syncError);
    await env.KV.put('workday:last_cron_error', JSON.stringify({
      timestamp: new Date().toISOString(),
      error: String(syncError),
    }));
  }

  console.log('Daily jobs completed');
}

async function runFrequentJobs(env: Env): Promise<void> {
  console.log('Running frequent jobs (every 5 min)...');

  // Auto-resume stuck video transcriptions.
  //
  // The API worker runs processVideoBackground inside ctx.waitUntil, which means the
  // task dies when the Worker gets redeployed or an unhandled error occurs. This cron
  // catches those zombies and restarts them (the API worker has deduplication built in —
  // only videos with updated_at > 5 min ago are considered stuck, so in-flight work
  // isn't disrupted).
  try {
    const resumeRes = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/admin/resume-stuck-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const resumeResult = await resumeRes.json() as any;
    if (resumeResult?.count > 0) {
      console.log(`Resumed ${resumeResult.count} stuck videos: ${(resumeResult.resumed || []).join(', ')}`);
      await env.KV.put('videos:last_auto_resume', JSON.stringify({
        timestamp: new Date().toISOString(),
        count: resumeResult.count,
        ids: resumeResult.resumed,
      }));
    }
  } catch (err) {
    console.error('Failed to auto-resume stuck videos:', err);
    await env.KV.put('videos:last_auto_resume_error', JSON.stringify({
      timestamp: new Date().toISOString(),
      error: String(err),
    }));
  }

  // Stuck docs-crawl watchdog: detect a background crawl whose progress has
  // stalled and record an alert (isolated so it can't break the other jobs).
  try {
    await checkDocsCrawlWatchdog(env);
  } catch (err) {
    console.error('Docs crawl watchdog failed:', err);
  }

  // Health checks
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      db: await checkDatabase(env.DB),
      kv: await checkKV(env.KV),
    },
  };
  await env.KV.put('health:status', JSON.stringify(healthStatus));

  console.log('Frequent jobs completed');
}

// Polls doc-stats and tracks whether an in-flight crawl is making progress.
// While a run is active we snapshot its processed-page count; if that count
// stops advancing for DOCS_STUCK_MINUTES we write `docs:stuck_alert` to KV and
// log loudly. Auto-retrigger is intentionally NOT done here to avoid re-crawl
// loops on a false positive — flip the commented POST below to enable it.
async function checkDocsCrawlWatchdog(env: Env): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/doc-stats`);
  if (!res.ok) return;
  const data = (await res.json()) as any;
  const ingest = data?.ingest;

  // No active crawl → clear any stale snapshot/alert and bail.
  if (!ingest || ingest.status !== 'running') {
    await env.KV.delete('docs:watchdog');
    await env.KV.delete('docs:stuck_alert');
    return;
  }

  const now = Date.now();
  const prev = (await env.KV.get('docs:watchdog', 'json')) as
    | { processed?: number; runId?: string; ts?: number }
    | null;

  // First sighting, a new run, or forward progress → refresh snapshot, clear alert.
  if (!prev || prev.runId !== ingest.runId || (ingest.processed ?? 0) > (prev.processed ?? -1)) {
    await env.KV.put(
      'docs:watchdog',
      JSON.stringify({ processed: ingest.processed ?? 0, runId: ingest.runId, ts: now })
    );
    await env.KV.delete('docs:stuck_alert');
    return;
  }

  // Processed count hasn't moved since the last snapshot — how long has it stalled?
  const stalledMs = now - (prev.ts ?? now);
  if (stalledMs >= DOCS_STUCK_MINUTES * 60 * 1000) {
    const alert = {
      runId: ingest.runId,
      processed: ingest.processed,
      total: ingest.total,
      stalledMinutes: Math.round(stalledMs / 60000),
      detectedAt: new Date().toISOString(),
    };
    console.error(
      `Docs crawl STUCK: run ${ingest.runId} stalled at ${ingest.processed}/${ingest.total} for ${alert.stalledMinutes}m`
    );
    await env.KV.put('docs:stuck_alert', JSON.stringify(alert));
    // To auto-heal, uncomment — mints a fresh run (old queue messages self-skip
    // via the KV runId guard), so it's safe/idempotent:
    // await fetch(`${API_BASE}/api/admin/ingest-docs`, { method: 'POST' });
  }
}

async function checkDatabase(db: D1Database): Promise<boolean> {
  try {
    await db.prepare('SELECT 1').first();
    return true;
  } catch {
    return false;
  }
}

async function checkKV(kv: KVNamespace): Promise<boolean> {
  try {
    await kv.put('health:check', 'ok', { expirationTtl: 60 });
    return true;
  } catch {
    return false;
  }
}
