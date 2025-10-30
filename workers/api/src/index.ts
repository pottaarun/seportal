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
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };

  try {
    // URL Assets endpoints
    if (pathname === '/api/url-assets' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM url_assets ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    if (pathname === '/api/url-assets' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO url_assets (id, title, url, category, description, owner, likes, date_added, icon, image_url, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.title,
        data.url,
        data.category,
        data.description,
        data.owner,
        data.likes || 0,
        data.dateAdded || new Date().toISOString(),
        data.icon,
        data.imageUrl || '',
        JSON.stringify(data.tags || [])
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/url-assets/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE url_assets
        SET title=?, url=?, category=?, description=?, owner=?, icon=?, image_url=?, tags=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        data.title, data.url, data.category, data.description, data.owner, data.icon,
        data.imageUrl || '', JSON.stringify(data.tags || []), id
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/url-assets/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM url_assets WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // File Assets
    if (pathname === '/api/file-assets' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM file_assets ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    if (pathname === '/api/file-assets' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO file_assets (id, name, type, category, size, downloads, date, icon, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(data.id, data.name, data.type || '', data.category, data.size || '',
        data.downloads || 0, data.date || '', data.icon, data.description || '').run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/file-assets/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE file_assets SET name=?, category=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).bind(data.name, data.category, data.description || '', id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/file-assets/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM file_assets WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Scripts
    if (pathname === '/api/scripts' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM scripts ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    if (pathname === '/api/scripts' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO scripts (id, name, language, category, description, author, likes, uses, date, icon, code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(data.id, data.name, data.language, data.category, data.description,
        data.author, data.likes || 0, data.uses || 0, data.date, data.icon, data.code).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/scripts/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM scripts WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Events
    if (pathname === '/api/events' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    if (pathname === '/api/events' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO events (id, title, type, date, time, location, attendees, description, icon, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(data.id, data.title, data.type, data.date, data.time, data.location,
        data.attendees || 0, data.description, data.icon, data.color).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/events/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM events WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Shoutouts
    if (pathname === '/api/shoutouts' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM shoutouts ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    if (pathname === '/api/shoutouts' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO shoutouts (id, from_user, to_user, message, category, likes, date, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(data.id, data.from, data.to, data.message, data.category,
        data.likes || 0, data.date, data.icon).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/shoutouts/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM shoutouts WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Users - Get user by email
    if (pathname.startsWith('/api/users/') && request.method === 'GET') {
      const encodedEmail = pathname.split('/').pop();
      const email = decodeURIComponent(encodedEmail || '');
      const { results } = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).all();
      if (results.length > 0) {
        return new Response(JSON.stringify(results[0]), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
    }

    // Users - Create or update user
    if (pathname === '/api/users' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO users (email, name, last_login)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET name=?, last_login=CURRENT_TIMESTAMP
      `).bind(data.email, data.name, data.name).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: corsHeaders
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
