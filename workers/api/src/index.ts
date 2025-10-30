export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for API
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Webhook handlers
      if (url.pathname.startsWith('/webhooks/')) {
        return handleWebhook(request, env, url.pathname);
      }

      // API endpoints
      if (url.pathname.startsWith('/api/')) {
        return handleAPI(request, env, url.pathname);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};

async function handleWebhook(request: Request, env: Env, pathname: string): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  // Example: /webhooks/salesforce
  if (pathname === '/webhooks/salesforce') {
    const payload = await request.json();

    // Store webhook data in D1
    await env.DB.prepare(
      'INSERT INTO webhook_logs (source, payload, received_at) VALUES (?, ?, ?)'
    ).bind('salesforce', JSON.stringify(payload), new Date().toISOString()).run();

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }

  // Example: /webhooks/slack
  if (pathname === '/webhooks/slack') {
    const payload = await request.json();

    // Handle Slack webhook
    await env.KV.put(`slack:last_event`, JSON.stringify(payload));

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }

  return new Response('Webhook not found', { status: 404, headers: corsHeaders });
}

async function handleAPI(request: Request, env: Env, pathname: string): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  // Example API endpoints
  if (pathname === '/api/status') {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: Date.now()
    }), { headers: corsHeaders });
  }

  // Example: Get data from D1
  if (pathname === '/api/data') {
    const results = await env.DB.prepare('SELECT * FROM some_table LIMIT 10').all();
    return new Response(JSON.stringify(results), { headers: corsHeaders });
  }

  return new Response('API endpoint not found', { status: 404, headers: corsHeaders });
}
