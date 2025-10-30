export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
}

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
      } else if (cron === '*/15 * * * *') {
        // Runs every 15 minutes
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

  // Example: Clean up old data
  await env.DB.prepare(
    'DELETE FROM temporary_data WHERE created_at < datetime("now", "-24 hours")'
  ).run();

  // Example: Generate hourly analytics
  const stats = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM events WHERE created_at > datetime("now", "-1 hour")'
  ).first();

  await env.KV.put('stats:hourly', JSON.stringify({
    timestamp: new Date().toISOString(),
    eventCount: stats?.count || 0,
  }));

  console.log('Hourly jobs completed');
}

async function runDailyJobs(env: Env): Promise<void> {
  console.log('Running daily jobs...');

  // Example: Generate daily reports
  const dailyStats = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT user_id) as unique_users
    FROM events
    WHERE created_at > datetime("now", "-1 day")
  `).first();

  // Store report in R2
  const reportDate = new Date().toISOString().split('T')[0];
  await env.R2.put(`reports/daily/${reportDate}.json`, JSON.stringify({
    date: reportDate,
    stats: dailyStats,
    generated_at: new Date().toISOString(),
  }));

  // Example: Archive old data
  await env.DB.prepare(
    'DELETE FROM logs WHERE created_at < datetime("now", "-30 days")'
  ).run();

  console.log('Daily jobs completed');
}

async function runFrequentJobs(env: Env): Promise<void> {
  console.log('Running frequent jobs (every 15 min)...');

  // Example: Sync external data
  // This could fetch data from external APIs and cache in KV

  // Example: Health checks
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
