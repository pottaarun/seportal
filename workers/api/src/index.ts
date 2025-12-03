export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: any; // Cloudflare Workers AI binding
  VECTORIZE: VectorizeIndex; // Cloudflare Vectorize binding
}

// Helper function to scrape and chunk documentation
async function scrapeAndIndexDocs(env: Env): Promise<number> {
  const docUrls = [
    'https://developers.cloudflare.com/workers/',
    'https://developers.cloudflare.com/workers/platform/pricing/',
    'https://developers.cloudflare.com/pages/',
    'https://developers.cloudflare.com/r2/',
    'https://developers.cloudflare.com/r2/pricing/',
    'https://developers.cloudflare.com/d1/',
    'https://developers.cloudflare.com/d1/platform/pricing/',
    'https://developers.cloudflare.com/kv/',
    'https://developers.cloudflare.com/kv/platform/pricing/',
    'https://developers.cloudflare.com/workers-ai/',
    'https://developers.cloudflare.com/vectorize/',
    'https://developers.cloudflare.com/ddos-protection/',
    'https://developers.cloudflare.com/waf/',
    'https://developers.cloudflare.com/cache/',
    'https://developers.cloudflare.com/ssl/',
    'https://developers.cloudflare.com/cloudflare-one/',
    'https://developers.cloudflare.com/images/',
    'https://developers.cloudflare.com/stream/',
    'https://developers.cloudflare.com/load-balancing/',
  ];

  const chunks: Array<{id: string; text: string; url: string}> = [];

  // Fetch all documentation pages
  for (const url of docUrls) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'SolutionHub-DocIndexer/1.0' }
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Extract text content
      let text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Chunk into 800-character segments with overlap
      const chunkSize = 800;
      const overlap = 100;
      let start = 0;

      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunkText = text.substring(start, end);

        if (chunkText.length > 100) { // Only add substantial chunks
          chunks.push({
            id: `${url.replace('https://developers.cloudflare.com/', '').replace(/\//g, '-')}-${start}`,
            text: chunkText,
            url: url
          });
        }

        start += chunkSize - overlap;
      }
    } catch (err) {
      console.error(`Failed to scrape ${url}:`, err);
    }
  }

  // Generate embeddings and insert into Vectorize in batches
  const batchSize = 10;
  let totalInserted = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const vectors = [];

    for (const chunk of batch) {
      try {
        const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: chunk.text
        });

        vectors.push({
          id: chunk.id,
          values: embedding.data[0],
          metadata: { url: chunk.url, length: chunk.text.length }
        });
      } catch (err) {
        console.error(`Failed to generate embedding for ${chunk.id}:`, err);
      }
    }

    if (vectors.length > 0) {
      await env.VECTORIZE.upsert(vectors);
      totalInserted += vectors.length;
    }
  }

  return totalInserted;
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

  // Scheduled handler for weekly documentation updates
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Starting weekly documentation update...');

    try {
      const totalIndexed = await scrapeAndIndexDocs(env);
      console.log(`Successfully indexed ${totalIndexed} documentation chunks`);
    } catch (error) {
      console.error('Failed to update documentation:', error);
    }
  }
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
        INSERT INTO url_assets (id, title, url, category, description, owner, likes, uses, date_added, icon, image_url, tags, product_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.title,
        data.url,
        data.category,
        data.description,
        data.owner,
        data.likes || 0,
        data.uses || 0,
        data.dateAdded || new Date().toISOString(),
        data.icon,
        data.imageUrl || '',
        JSON.stringify(data.tags || []),
        data.productId || null
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/url-assets/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE url_assets
        SET title=?, url=?, category=?, description=?, owner=?, icon=?, image_url=?, tags=?, product_id=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        data.title, data.url, data.category, data.description, data.owner, data.icon,
        data.imageUrl || '', JSON.stringify(data.tags || []), data.productId || null, id
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Get user's liked URL assets
    if (pathname === '/api/url-assets/user-likes' && request.method === 'POST') {
      const { userEmail } = await request.json() as any;
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }
      const { results } = await env.DB.prepare('SELECT asset_id FROM url_asset_likes WHERE user_email=?').bind(userEmail).all();
      const likedIds = results.map((r: any) => r.asset_id);
      return new Response(JSON.stringify(likedIds), { headers: corsHeaders });
    }

    // Increment uses for URL asset
    if (pathname.startsWith('/api/url-assets/') && pathname.endsWith('/use') && request.method === 'POST') {
      const id = pathname.split('/')[3];
      await env.DB.prepare('UPDATE url_assets SET uses = uses + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/url-assets/') && pathname.endsWith('/like') && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const { userEmail } = await request.json() as any;

      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }

      // Check if user has already liked
      const { results: likeResults } = await env.DB.prepare('SELECT * FROM url_asset_likes WHERE asset_id=? AND user_email=?')
        .bind(id, userEmail).all();

      if (likeResults.length > 0) {
        // Unlike - remove like record and decrement count
        await env.DB.prepare('DELETE FROM url_asset_likes WHERE asset_id=? AND user_email=?').bind(id, userEmail).run();
        await env.DB.prepare('UPDATE url_assets SET likes = likes - 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      } else {
        // Like - add like record and increment count
        const likeId = `like-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await env.DB.prepare('INSERT INTO url_asset_likes (id, asset_id, user_email) VALUES (?, ?, ?)')
          .bind(likeId, id, userEmail).run();
        await env.DB.prepare('UPDATE url_assets SET likes = likes + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      }

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

    if (pathname === '/api/file-assets/upload' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const metadata = JSON.parse(formData.get('metadata') as string);

        if (!file) {
          return new Response(JSON.stringify({ error: 'No file provided' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // Generate unique file key for R2
        const fileKey = `files/${metadata.id}-${file.name}`;

        // Upload file to R2
        await env.R2.put(fileKey, file.stream(), {
          httpMetadata: {
            contentType: file.type,
          },
        });

        // Store metadata in D1
        await env.DB.prepare(`
          INSERT INTO file_assets (id, name, type, category, size, downloads, date, icon, description, file_key)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          metadata.id,
          metadata.name,
          file.type,
          metadata.category,
          metadata.size,
          0,
          metadata.date,
          metadata.icon,
          metadata.description || '',
          fileKey
        ).run();

        return new Response(JSON.stringify({ success: true, fileKey }), { headers: corsHeaders });
      } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ error: 'Upload failed' }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    if (pathname === '/api/file-assets' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO file_assets (id, name, type, category, size, downloads, date, icon, description, file_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(data.id, data.name, data.type || '', data.category, data.size || '',
        data.downloads || 0, data.date || '', data.icon, data.description || '', data.file_key || '').run();
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

    if (pathname.startsWith('/api/file-assets/') && pathname.endsWith('/download') && request.method === 'GET') {
      try {
        const id = pathname.split('/')[3];

        // Get file metadata from D1
        const { results } = await env.DB.prepare('SELECT * FROM file_assets WHERE id=?').bind(id).all();

        if (results.length === 0) {
          return new Response(JSON.stringify({ error: 'File not found' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        const fileAsset = results[0] as any;

        if (!fileAsset.file_key) {
          return new Response(JSON.stringify({ error: 'File key not found' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        // Get file from R2
        const object = await env.R2.get(fileAsset.file_key);

        if (!object) {
          return new Response(JSON.stringify({ error: 'File not found in storage' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        // Increment download count
        await env.DB.prepare('UPDATE file_assets SET downloads = downloads + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(id).run();

        // Return file with proper headers
        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${fileAsset.name}"`);
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(object.body, { headers });
      } catch (error) {
        console.error('Download error:', error);
        return new Response(JSON.stringify({ error: 'Download failed' }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    if (pathname.startsWith('/api/file-assets/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();

      // Get file metadata to delete from R2
      const { results } = await env.DB.prepare('SELECT file_key FROM file_assets WHERE id=?').bind(id).all();

      if (results.length > 0) {
        const fileAsset = results[0] as any;
        if (fileAsset.file_key) {
          // Delete from R2
          await env.R2.delete(fileAsset.file_key);
        }
      }

      // Delete from database
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
        INSERT INTO scripts (id, name, language, category, description, author, likes, uses, date, icon, code, product_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(data.id, data.name, data.language, data.category, data.description,
        data.author, data.likes || 0, data.uses || 0, data.date, data.icon, data.code, data.productId || null).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Get user's liked scripts
    if (pathname === '/api/scripts/user-likes' && request.method === 'POST') {
      const { userEmail } = await request.json() as any;
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }
      const { results } = await env.DB.prepare('SELECT script_id FROM script_likes WHERE user_email=?').bind(userEmail).all();
      const likedIds = results.map((r: any) => r.script_id);
      return new Response(JSON.stringify(likedIds), { headers: corsHeaders });
    }

    // Increment uses for script
    if (pathname.startsWith('/api/scripts/') && pathname.endsWith('/use') && request.method === 'POST') {
      const id = pathname.split('/')[3];
      await env.DB.prepare('UPDATE scripts SET uses = uses + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/scripts/') && pathname.endsWith('/like') && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const { userEmail } = await request.json() as any;

      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }

      // Check if user has already liked
      const { results: likeResults } = await env.DB.prepare('SELECT * FROM script_likes WHERE script_id=? AND user_email=?')
        .bind(id, userEmail).all();

      if (likeResults.length > 0) {
        // Unlike - remove like record and decrement count
        await env.DB.prepare('DELETE FROM script_likes WHERE script_id=? AND user_email=?').bind(id, userEmail).run();
        await env.DB.prepare('UPDATE scripts SET likes = likes - 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      } else {
        // Like - add like record and increment count
        const likeId = `like-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await env.DB.prepare('INSERT INTO script_likes (id, script_id, user_email) VALUES (?, ?, ?)')
          .bind(likeId, id, userEmail).run();
        await env.DB.prepare('UPDATE scripts SET likes = likes + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      }

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

    // Get user's liked shoutouts
    if (pathname === '/api/shoutouts/user-likes' && request.method === 'POST') {
      const { userEmail } = await request.json() as any;
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }
      const { results } = await env.DB.prepare('SELECT shoutout_id FROM shoutout_likes WHERE user_email=?').bind(userEmail).all();
      const likedIds = results.map((r: any) => r.shoutout_id);
      return new Response(JSON.stringify(likedIds), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/shoutouts/') && pathname.endsWith('/like') && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const { userEmail } = await request.json() as any;

      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }

      // Check if user has already liked
      const { results: likeResults } = await env.DB.prepare('SELECT * FROM shoutout_likes WHERE shoutout_id=? AND user_email=?')
        .bind(id, userEmail).all();

      if (likeResults.length > 0) {
        // Unlike - remove like record and decrement count
        await env.DB.prepare('DELETE FROM shoutout_likes WHERE shoutout_id=? AND user_email=?').bind(id, userEmail).run();
        await env.DB.prepare('UPDATE shoutouts SET likes = likes - 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      } else {
        // Like - add like record and increment count
        const likeId = `like-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await env.DB.prepare('INSERT INTO shoutout_likes (id, shoutout_id, user_email) VALUES (?, ?, ?)')
          .bind(likeId, id, userEmail).run();
        await env.DB.prepare('UPDATE shoutouts SET likes = likes + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      }

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

    // Groups - Get all groups
    if (pathname === '/api/groups' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM groups ORDER BY created_at DESC').all();
      const groups = results.map((group: any) => ({
        ...group,
        members: JSON.parse(group.members || '[]'),
        admins: JSON.parse(group.admins || '[]')
      }));
      return new Response(JSON.stringify(groups), { headers: corsHeaders });
    }

    // Groups - Create group
    if (pathname === '/api/groups' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO groups (id, name, description, members, admins)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.name,
        data.description || '',
        JSON.stringify(data.members || []),
        JSON.stringify(data.admins || [])
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Groups - Update group
    if (pathname.startsWith('/api/groups/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE groups
        SET name=?, description=?, members=?, admins=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        data.name,
        data.description || '',
        JSON.stringify(data.members || []),
        JSON.stringify(data.admins || []),
        id
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Groups - Delete group
    if (pathname.startsWith('/api/groups/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM groups WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Groups - Add member
    if (pathname.match(/\/api\/groups\/[^/]+\/members$/) && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const { userEmail } = await request.json() as any;

      // Get current group
      const { results } = await env.DB.prepare('SELECT members FROM groups WHERE id=?').bind(id).all();
      if (results.length === 0) {
        return new Response(JSON.stringify({ error: 'Group not found' }), { status: 404, headers: corsHeaders });
      }

      const members = JSON.parse((results[0] as any).members || '[]');
      if (!members.includes(userEmail)) {
        members.push(userEmail);
        await env.DB.prepare('UPDATE groups SET members=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(JSON.stringify(members), id).run();
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Groups - Remove member
    if (pathname.match(/\/api\/groups\/[^/]+\/members\//) && request.method === 'DELETE') {
      const parts = pathname.split('/');
      const id = parts[3];
      const userEmail = decodeURIComponent(parts[5]);

      // Get current group
      const { results } = await env.DB.prepare('SELECT members FROM groups WHERE id=?').bind(id).all();
      if (results.length === 0) {
        return new Response(JSON.stringify({ error: 'Group not found' }), { status: 404, headers: corsHeaders });
      }

      const members = JSON.parse((results[0] as any).members || '[]');
      const updatedMembers = members.filter((email: string) => email !== userEmail);

      await env.DB.prepare('UPDATE groups SET members=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .bind(JSON.stringify(updatedMembers), id).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Polls - Get all polls
    if (pathname === '/api/polls' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM polls ORDER BY created_at DESC').all();
      const polls = results.map((poll: any) => ({
        ...poll,
        options: JSON.parse(poll.options || '[]'),
        targetGroups: JSON.parse(poll.target_groups || '["all"]'),
        totalVotes: poll.total_votes
      }));
      return new Response(JSON.stringify(polls), { headers: corsHeaders });
    }

    // Polls - Create poll
    if (pathname === '/api/polls' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO polls (id, question, options, category, date, total_votes, target_groups)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.question,
        JSON.stringify(data.options || []),
        data.category,
        data.date,
        data.totalVotes || 0,
        JSON.stringify(data.targetGroups || ['all'])
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Polls - Delete poll
    if (pathname.startsWith('/api/polls/') && !pathname.includes('/vote') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM polls WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Polls - Vote on poll
    if (pathname.match(/\/api\/polls\/[^/]+\/vote$/) && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const { optionIndex, userEmail } = await request.json() as any;

      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }

      // Check if user has already voted
      const { results: voteResults } = await env.DB.prepare('SELECT * FROM poll_votes WHERE poll_id=? AND user_email=?')
        .bind(id, userEmail).all();

      if (voteResults.length > 0) {
        return new Response(JSON.stringify({ error: 'You have already voted on this poll' }), { status: 400, headers: corsHeaders });
      }

      // Get current poll
      const { results } = await env.DB.prepare('SELECT * FROM polls WHERE id=?').bind(id).all();
      if (results.length === 0) {
        return new Response(JSON.stringify({ error: 'Poll not found' }), { status: 404, headers: corsHeaders });
      }

      const poll: any = results[0];
      const options = JSON.parse(poll.options || '[]');

      // Increment vote count for the selected option
      if (options[optionIndex]) {
        options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
      }

      const totalVotes = (poll.total_votes || 0) + 1;

      // Record the vote
      const voteId = `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare('INSERT INTO poll_votes (id, poll_id, user_email, option_index) VALUES (?, ?, ?, ?)')
        .bind(voteId, id, userEmail, optionIndex).run();

      // Update poll
      await env.DB.prepare('UPDATE polls SET options=?, total_votes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .bind(JSON.stringify(options), totalVotes, id).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Polls - Get user's voted polls
    if (pathname === '/api/polls/user-votes' && request.method === 'POST') {
      const { userEmail } = await request.json() as any;

      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }

      const { results } = await env.DB.prepare('SELECT poll_id, option_index FROM poll_votes WHERE user_email=?')
        .bind(userEmail).all();

      const votedPolls = results.reduce((acc: any, vote: any) => {
        acc[vote.poll_id] = vote.option_index;
        return acc;
      }, {});

      return new Response(JSON.stringify(votedPolls), { headers: corsHeaders });
    }

    // Announcements - Get all announcements
    if (pathname === '/api/announcements' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
      const announcements = results.map((announcement: any) => ({
        ...announcement,
        targetGroups: JSON.parse(announcement.target_groups || '["all"]')
      }));
      return new Response(JSON.stringify(announcements), { headers: corsHeaders });
    }

    // Announcements - Create announcement
    if (pathname === '/api/announcements' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO announcements (id, title, message, priority, author, date, target_groups)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.title,
        data.message,
        data.priority || 'normal',
        data.author,
        data.date,
        JSON.stringify(data.targetGroups || ['all'])
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Announcements - Delete announcement
    if (pathname.startsWith('/api/announcements/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM announcements WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Competitions - Get all competitions
    if (pathname === '/api/competitions' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM competitions ORDER BY end_date ASC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Competitions - Create competition
    if (pathname === '/api/competitions' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO competitions (id, title, description, category, start_date, end_date, prize, status, participants, winner, rules, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.title,
        data.description,
        data.category,
        data.startDate,
        data.endDate,
        data.prize || null,
        data.status || 'active',
        data.participants || 0,
        data.winner || null,
        data.rules || null,
        data.createdBy
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Competitions - Update competition
    if (pathname.startsWith('/api/competitions/') && !pathname.endsWith('/join') && request.method === 'PUT') {
      const id = pathname.split('/')[3];
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE competitions
        SET title=?, description=?, category=?, start_date=?, end_date=?, prize=?, status=?, winner=?, rules=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        data.title,
        data.description,
        data.category,
        data.startDate,
        data.endDate,
        data.prize || null,
        data.status || 'active',
        data.winner || null,
        data.rules || null,
        id
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Competitions - Delete competition
    if (pathname.startsWith('/api/competitions/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM competitions WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Competitions - Join competition (increment participants)
    if (pathname.match(/\/api\/competitions\/[^/]+\/join$/) && request.method === 'POST') {
      const id = pathname.split('/')[3];
      await env.DB.prepare('UPDATE competitions SET participants = participants + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Products - Get all products
    if (pathname === '/api/products' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY name ASC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Products - Create product
    if (pathname === '/api/products' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO products (id, name, description)
        VALUES (?, ?, ?)
      `).bind(
        data.id,
        data.name,
        data.description || ''
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Products - Update product
    if (pathname.startsWith('/api/products/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE products
        SET name=?, description=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        data.name,
        data.description || '',
        id
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Products - Delete product
    if (pathname.startsWith('/api/products/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Employees - Get all employees
    if (pathname === '/api/employees' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM employees ORDER BY name ASC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Employees - Create employee
    if (pathname === '/api/employees' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO employees (id, name, email, title, department, manager_id, photo_url, bio, location, region, start_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.name,
        data.email,
        data.title,
        data.department || '',
        data.managerId || null,
        data.photoUrl || '',
        data.bio || '',
        data.location || '',
        data.region || '',
        data.startDate || ''
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Employees - Update employee
    if (pathname.startsWith('/api/employees/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE employees
        SET name=?, email=?, title=?, department=?, manager_id=?, photo_url=?, bio=?, location=?, region=?, start_date=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        data.name,
        data.email,
        data.title,
        data.department || '',
        data.managerId || null,
        data.photoUrl || '',
        data.bio || '',
        data.location || '',
        data.region || '',
        data.startDate || '',
        id
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Employees - Delete employee
    if (pathname.startsWith('/api/employees/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM employees WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Employees - Upload photo
    if (pathname.startsWith('/api/employees/') && pathname.endsWith('/photo') && request.method === 'POST') {
      try {
        const id = pathname.split('/')[3];
        const formData = await request.formData();
        const file = formData.get('photo') as File;

        if (!file) {
          return new Response(JSON.stringify({ error: 'No photo provided' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const photoKey = `employee-photos/${id}-${Date.now()}.${file.name.split('.').pop()}`;

        await env.R2.put(photoKey, file.stream(), {
          httpMetadata: {
            contentType: file.type,
          },
        });

        // Generate public URL (you may need to adjust this based on your R2 setup)
        const photoUrl = `https://seportal-storage.${env.R2}.r2.cloudflarestorage.com/${photoKey}`;

        // Update employee record with photo URL
        await env.DB.prepare('UPDATE employees SET photo_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(photoKey, id).run();

        return new Response(JSON.stringify({ success: true, photoUrl: photoKey }), { headers: corsHeaders });
      } catch (error) {
        console.error('Photo upload error:', error);
        return new Response(JSON.stringify({ error: 'Photo upload failed' }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Employees - Get photo
    if (pathname.startsWith('/api/employees/') && pathname.endsWith('/photo') && request.method === 'GET') {
      try {
        const id = pathname.split('/')[3];
        const { results } = await env.DB.prepare('SELECT photo_url FROM employees WHERE id=?').bind(id).all();

        if (results.length === 0 || !results[0].photo_url) {
          return new Response(JSON.stringify({ error: 'Photo not found' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        const photoKey = (results[0] as any).photo_url;
        const object = await env.R2.get(photoKey);

        if (!object) {
          return new Response(JSON.stringify({ error: 'Photo not found in storage' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=31536000');

        return new Response(object.body, { headers });
      } catch (error) {
        console.error('Photo retrieval error:', error);
        return new Response(JSON.stringify({ error: 'Photo retrieval failed' }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // RFx - Generate RFP/RFI response using AI with live documentation scraping
    if (pathname === '/api/rfx/generate' && request.method === 'POST') {
      try {
        const data = await request.json() as any;
        const question = data.question;

        if (!question) {
          return new Response(JSON.stringify({ error: 'Question is required' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // Step 1: Identify relevant product/topic from the question
        const questionLower = question.toLowerCase();
        const relevantDocs: string[] = [];

        // Define documentation URLs based on keywords
        const docUrls: { [key: string]: string[] } = {
          'workers': ['https://developers.cloudflare.com/workers/', 'https://developers.cloudflare.com/workers/platform/pricing/'],
          'pages': ['https://developers.cloudflare.com/pages/', 'https://developers.cloudflare.com/pages/functions/'],
          'r2': ['https://developers.cloudflare.com/r2/', 'https://developers.cloudflare.com/r2/pricing/'],
          'd1': ['https://developers.cloudflare.com/d1/', 'https://developers.cloudflare.com/d1/platform/pricing/'],
          'kv': ['https://developers.cloudflare.com/kv/', 'https://developers.cloudflare.com/kv/platform/pricing/'],
          'ai': ['https://developers.cloudflare.com/workers-ai/', 'https://developers.cloudflare.com/workers-ai/models/'],
          'vectorize': ['https://developers.cloudflare.com/vectorize/'],
          'ddos': ['https://developers.cloudflare.com/ddos-protection/', 'https://developers.cloudflare.com/ddos-protection/about/'],
          'waf': ['https://developers.cloudflare.com/waf/', 'https://developers.cloudflare.com/waf/managed-rules/'],
          'cdn': ['https://developers.cloudflare.com/cache/', 'https://developers.cloudflare.com/speed/optimization/'],
          'ssl': ['https://developers.cloudflare.com/ssl/', 'https://developers.cloudflare.com/ssl/edge-certificates/'],
          'zero trust': ['https://developers.cloudflare.com/cloudflare-one/', 'https://developers.cloudflare.com/cloudflare-one/connections/'],
          'access': ['https://developers.cloudflare.com/cloudflare-one/applications/'],
          'gateway': ['https://developers.cloudflare.com/cloudflare-one/policies/'],
          'images': ['https://developers.cloudflare.com/images/', 'https://developers.cloudflare.com/images/pricing/'],
          'stream': ['https://developers.cloudflare.com/stream/', 'https://developers.cloudflare.com/stream/getting-started/'],
          'load balancing': ['https://developers.cloudflare.com/load-balancing/'],
          'argo': ['https://developers.cloudflare.com/argo-smart-routing/'],
        };

        // Determine which documentation to fetch
        const urlsToFetch: string[] = [];
        for (const [keyword, urls] of Object.entries(docUrls)) {
          if (questionLower.includes(keyword)) {
            urlsToFetch.push(...urls);
          }
        }

        // If no specific product detected, fetch general docs
        if (urlsToFetch.length === 0) {
          urlsToFetch.push(
            'https://developers.cloudflare.com/',
            'https://developers.cloudflare.com/workers/',
            'https://developers.cloudflare.com/pages/'
          );
        }

        // Step 2: Fetch and parse documentation
        const fetchPromises = urlsToFetch.slice(0, 3).map(async (url) => {
          try {
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'SolutionHub-RFx-Bot/1.0'
              }
            });

            if (!response.ok) return '';

            const html = await response.text();

            // Extract text content from HTML (simple approach)
            // Remove script and style tags
            let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

            // Remove HTML tags
            text = text.replace(/<[^>]+>/g, ' ');

            // Clean up whitespace
            text = text.replace(/\s+/g, ' ').trim();

            // Limit to first 2000 characters
            return text.substring(0, 2000);
          } catch (err) {
            console.error(`Failed to fetch ${url}:`, err);
            return '';
          }
        });

        const scrapedDocs = await Promise.all(fetchPromises);
        const combinedDocs = scrapedDocs.filter(doc => doc.length > 0).join('\n\n');

        // Step 3: Build context from scraped documentation
        let retrievedContext = '';
        if (combinedDocs.length > 100) {
          retrievedContext = `Latest Cloudflare Documentation:\n\n${combinedDocs}`;
        } else {
          // Fallback to comprehensive product info
          retrievedContext = `Cloudflare Product Information:

**Cloudflare Workers**: Serverless execution environment running on 300+ cities globally. 0ms cold starts, sub-millisecond CPU time. Pricing: Free tier with 100,000 requests/day, Paid $5/month for 10M requests. No egress fees.

**Cloudflare Pages**: JAMstack platform with unlimited sites, requests, and bandwidth. Free on all plans. Automatic Git integration, preview deployments, edge rendering.

**Cloudflare R2**: S3-compatible object storage with ZERO egress fees. Pricing: $0.015/GB/month storage, $4.50 per million writes, $0.36 per million reads. 10GB free storage monthly.

**Cloudflare D1**: Serverless SQLite database with automatic replication. Pricing: Free tier with 5GB storage, $0.75 per million reads, $1.00 per million writes.

**DDoS Protection**: Industry-leading protection against attacks exceeding 100 Tbps. Unmetered and unlimited on all plans. 300+ cities, sub-3-second detection.

**WAF**: Web Application Firewall protecting against OWASP Top 10. Managed rulesets, custom rules, automatic updates.

**CDN**: 300+ edge locations globally, unlimited bandwidth on all plans. HTTP/3, sub-50ms latency to 95% of internet users.

**Zero Trust**: Identity-based access control (Access) and secure web gateway (Gateway). Replaces VPN with modern security.

**Global Network**: 300+ cities, 200+ Tbps capacity, serving 20%+ of web traffic.`;
        }

        // Step 4: Generate response using AI with live documentation
        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            {
              role: 'system',
              content: `You are a Cloudflare solutions expert helping to respond to RFP/RFI questions. Use the following LIVE documentation fetched from Cloudflare's developer portal to provide accurate, up-to-date responses:

${retrievedContext}

Guidelines for responses:
- Be specific and technical when needed
- Highlight Cloudflare's unique advantages (zero egress fees, 300+ cities, serverless edge computing)
- Reference specific products and features from the live documentation
- Include performance metrics and pricing when mentioned
- Mention global presence and scale
- Be concise but comprehensive (aim for 200-400 words)
- Use professional tone suitable for RFP/RFI responses
- Focus on benefits and capabilities relevant to the question`
            },
            {
              role: 'user',
              content: `RFP/RFI Question: ${question}

Please provide a detailed, professional response that would be suitable for an RFP/RFI document.`
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        });

        return new Response(JSON.stringify({
          response: aiResponse.response || 'Unable to generate response',
          sources: urlsToFetch.slice(0, 3).length
        }), {
          headers: corsHeaders
        });
      } catch (error: any) {
        console.error('RFx generation error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to generate response',
          details: error.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Admin - Trigger manual documentation update
    if (pathname === '/api/admin/ingest-docs' && request.method === 'POST') {
      try {
        const totalIndexed = await scrapeAndIndexDocs(env);
        return new Response(JSON.stringify({
          success: true,
          message: `Successfully scraped and indexed ${totalIndexed} documentation chunks`
        }), {
          headers: corsHeaders
        });
      } catch (error: any) {
        console.error('Documentation ingestion error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to scrape and index documentation',
          details: error.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Admin - Old static doc ingestion (deprecated, keeping for backwards compatibility)
    if (pathname === '/api/admin/ingest-docs-old' && request.method === 'POST') {
      try {
        // Documentation chunks to ingest
        const docs = [
          { id: 'workers-overview', text: 'Cloudflare Workers is a serverless execution environment that allows you to create entirely new applications or augment existing ones without configuring or maintaining infrastructure. Workers runs on Cloudflare\'s global network in over 300 cities worldwide, providing exceptional performance, reliability, and scale. Workers uses the V8 JavaScript engine and supports JavaScript, TypeScript, Python, and any language that compiles to WebAssembly.', metadata: { product: 'Workers', category: 'Overview' } },
          { id: 'workers-features', text: 'Cloudflare Workers key features: runs JavaScript/TypeScript/Python at the edge, 0ms cold starts, sub-millisecond CPU time, execute in under 1ms globally, automatic scaling, pay only for what you use, supports HTTP/HTTPS requests, WebSockets, scheduled cron triggers, durable objects for stateful applications, bindings to KV, D1, R2, and other Cloudflare services.', metadata: { product: 'Workers', category: 'Features' } },
          { id: 'workers-pricing', text: 'Workers pricing: Free tier includes 100,000 requests per day. Paid plan ($5/month) includes 10 million requests, with additional requests at $0.50 per million. CPU time: first 50 million milliseconds included, then $0.02 per million milliseconds. No egress fees.', metadata: { product: 'Workers', category: 'Pricing' } },
          { id: 'workers-performance', text: 'Workers performance characteristics: deployed to 300+ cities globally, 0ms cold starts, requests execute in under 1ms on average, automatic global load balancing, built-in DDoS protection, HTTP/2 and HTTP/3 support, WebSocket support with no connection limits.', metadata: { product: 'Workers', category: 'Performance' } },
          { id: 'pages-overview', text: 'Cloudflare Pages is a JAMstack platform for frontend developers to collaborate and deploy websites. Pages integrates with Git providers (GitHub, GitLab) for automatic deployments on every commit. Supports static sites and full-stack applications with Pages Functions (Workers). Unlimited sites, unlimited requests, unlimited bandwidth on all plans including free.', metadata: { product: 'Pages', category: 'Overview' } },
          { id: 'pages-features', text: 'Pages features: automatic Git integration and deployments, preview deployments for every pull request, built-in analytics, automatic HTTPS, custom domains, serverless functions via Pages Functions, support for all major frameworks (React, Vue, Next.js, SvelteKit, Astro, etc.), edge rendering, incremental static regeneration.', metadata: { product: 'Pages', category: 'Features' } },
          { id: 'pages-pricing', text: 'Pages pricing: completely free for unlimited sites, unlimited requests, unlimited bandwidth. Pages Functions usage follows Workers pricing after free tier limits.', metadata: { product: 'Pages', category: 'Pricing' } },
          { id: 'r2-overview', text: 'Cloudflare R2 Storage is S3-compatible object storage without egress fees. R2 stores large amounts of unstructured data with zero charges for data transfer out to the internet. Fully compatible with S3 API, making migration simple. Automatically distributed across multiple datacenters for 99.999999999% durability.', metadata: { product: 'R2', category: 'Overview' } },
          { id: 'r2-features', text: 'R2 features: S3-compatible API, zero egress fees, automatic geographic distribution, 99.999999999% durability, jurisdiction-specific data localization, public and private buckets, presigned URLs, multipart uploads, object lifecycle policies, event notifications via Workers.', metadata: { product: 'R2', category: 'Features' } },
          { id: 'r2-pricing', text: 'R2 pricing: $0.015 per GB per month for storage, Class A operations (writes) $4.50 per million, Class B operations (reads) $0.36 per million, zero egress fees (free data transfer out). 10 GB storage free per month, 1 million Class A operations free, 10 million Class B operations free.', metadata: { product: 'R2', category: 'Pricing' } },
          { id: 'r2-vs-s3', text: 'R2 advantages over S3: zero egress fees compared to S3\'s $0.09/GB, S3-compatible API for easy migration, automatic global distribution, lower storage costs, integrated with Workers for edge computing, no data transfer fees between R2 and Workers/Pages.', metadata: { product: 'R2', category: 'Comparison' } },
          { id: 'd1-overview', text: 'Cloudflare D1 is a serverless SQL database built on SQLite. D1 provides a familiar SQL interface with automatic replication across multiple regions for high availability. Designed for serverless applications with Workers integration. No connection limits, automatic scaling, built-in time travel for point-in-time recovery.', metadata: { product: 'D1', category: 'Overview' } },
          { id: 'd1-features', text: 'D1 features: SQLite-compatible SQL database, automatic replication, no connection pooling required, time travel (point-in-time recovery), read replication, integrated with Workers, ACID transactions, prepared statements, migrations support, low latency reads from edge.', metadata: { product: 'D1', category: 'Features' } },
          { id: 'd1-pricing', text: 'D1 pricing: Free tier includes 5 GB storage, 1 million row reads per day, 100,000 row writes per day. Paid usage: $0.75 per million row reads, $1.00 per million row writes, $0.75 per GB per month storage.', metadata: { product: 'D1', category: 'Pricing' } },
          { id: 'kv-overview', text: 'Cloudflare Workers KV is a global, low-latency, key-value data store. KV supports exceptionally high read volumes with low latency, making it ideal for configuration data, user sessions, and application state. Eventually consistent with edge caching for optimal performance.', metadata: { product: 'KV', category: 'Overview' } },
          { id: 'kv-features', text: 'KV features: global edge caching, low-latency reads (under 1ms in 300+ cities), high read throughput, eventually consistent, supports keys up to 512 bytes and values up to 25 MB, list operations, expiration (TTL), metadata support.', metadata: { product: 'KV', category: 'Features' } },
          { id: 'kv-pricing', text: 'KV pricing: $0.50 per GB stored per month, read operations $0.50 per 10 million, write operations $5.00 per million, delete operations $5.00 per million, list operations $5.00 per million. Free tier: 100,000 reads per day, 1,000 writes per day, 1 GB storage.', metadata: { product: 'KV', category: 'Pricing' } },
          { id: 'workers-ai-overview', text: 'Workers AI allows you to run machine learning models on Cloudflare\'s global network. Access popular open-source models including Llama 2, Llama 3, Mistral, BERT, Whisper, Stable Diffusion, and more. Run inference at the edge with low latency. No GPU management required.', metadata: { product: 'Workers AI', category: 'Overview' } },
          { id: 'workers-ai-models', text: 'Workers AI supported models: Text generation (Llama 3.1, Llama 3.2, Llama 2, Mistral 7B, Gemma), text embeddings (@cf/baai/bge-base-en-v1.5, @cf/baai/bge-large-en-v1.5), image generation (Stable Diffusion), speech recognition (Whisper), translation models, image classification, object detection.', metadata: { product: 'Workers AI', category: 'Models' } },
          { id: 'workers-ai-pricing', text: 'Workers AI pricing: pay per request or per token depending on model, Llama models charge per input/output token, embeddings charge per token processed, image models charge per image generated. Regular Workers AI Neurons pricing applies.', metadata: { product: 'Workers AI', category: 'Pricing' } },
          { id: 'vectorize-overview', text: 'Cloudflare Vectorize is a globally distributed vector database for building AI-powered applications. Store and query vector embeddings for semantic search, recommendation systems, and RAG (Retrieval Augmented Generation) applications. Integrates with Workers AI for embedding generation.', metadata: { product: 'Vectorize', category: 'Overview' } },
          { id: 'vectorize-features', text: 'Vectorize features: supports multiple distance metrics (cosine, euclidean, dot product), metadata filtering, batch operations, integrates with Workers AI for embeddings, globally distributed, automatic indexing, supports dimensions up to 1536, namespace support.', metadata: { product: 'Vectorize', category: 'Features' } },
          { id: 'ddos-overview', text: 'Cloudflare DDoS Protection provides industry-leading protection against Distributed Denial of Service attacks. Automatic detection and mitigation of network-layer (L3/4) and application-layer (L7) DDoS attacks. Protects against attacks exceeding 100 Tbps. Unmetered and unlimited DDoS protection on all plans.', metadata: { product: 'DDoS Protection', category: 'Overview' } },
          { id: 'ddos-features', text: 'DDoS protection features: autonomous edge protection system, multi-layered defense (L3, L4, L7), global threat intelligence, advanced rate limiting, challenge pages, fingerprinting-based protection, protection against reflection attacks, amplification attacks, protocol attacks, application-layer attacks. No scrubbing centers required.', metadata: { product: 'DDoS Protection', category: 'Features' } },
          { id: 'ddos-performance', text: 'DDoS protection performance: mitigated attacks exceeding 100 Tbps, 300+ Tbps network capacity, protection in 300+ cities, sub-3-second detection time, automatic mitigation without manual intervention, 99.99% uptime SLA on Enterprise plans.', metadata: { product: 'DDoS Protection', category: 'Performance' } },
          { id: 'waf-overview', text: 'Cloudflare Web Application Firewall (WAF) protects applications from OWASP Top 10 vulnerabilities and zero-day threats. Managed rulesets automatically updated by Cloudflare security team. Custom rules for specific application protection. Rate limiting and bot management integration.', metadata: { product: 'WAF', category: 'Overview' } },
          { id: 'waf-features', text: 'WAF features: OWASP Top 10 protection (SQL injection, XSS, CSRF, etc.), managed rulesets, custom WAF rules, rate limiting, bot management, payload logging, advanced filtering, challenge pages, JavaScript challenges, managed challenges, geo-blocking, IP reputation scoring.', metadata: { product: 'WAF', category: 'Features' } },
          { id: 'waf-rulesets', text: 'WAF managed rulesets: Cloudflare Managed Ruleset (core rules), OWASP ModSecurity Core Rule Set, Cloudflare Specials (zero-day protections), application-specific rulesets (WordPress, Drupal, etc.), automatic updates, low false-positive rate.', metadata: { product: 'WAF', category: 'Rulesets' } },
          { id: 'cdn-overview', text: 'Cloudflare CDN is a global content delivery network with 300+ locations in over 120 countries. Automatically caches static content at the edge for faster delivery. Supports HTTP/2, HTTP/3, QUIC. Free unlimited bandwidth on all plans. Anycast network for automatic routing to nearest location.', metadata: { product: 'CDN', category: 'Overview' } },
          { id: 'cdn-features', text: 'CDN features: 300+ edge locations, anycast routing, automatic HTTPS, HTTP/2 and HTTP/3, smart tiered caching, cache analytics, custom cache rules, cache purge (single file, tag, hostname, or everything), origin connection pooling, Railgun (WAN optimization), Argo Smart Routing.', metadata: { product: 'CDN', category: 'Features' } },
          { id: 'cdn-performance', text: 'CDN performance: 300+ cities globally, sub-50ms latency to 95% of internet-connected population, 200+ Tbps network capacity, HTTP/3 and QUIC support for reduced latency, connection coalescing, early hints support, automatic image optimization.', metadata: { product: 'CDN', category: 'Performance' } },
          { id: 'ssl-overview', text: 'Cloudflare provides free Universal SSL certificates for all domains. Automatic certificate provisioning and renewal. Support for custom certificates, client certificates, mutual TLS. SSL for SaaS for serving multiple customer domains. TLS 1.3 support for enhanced security and performance.', metadata: { product: 'SSL/TLS', category: 'Overview' } },
          { id: 'ssl-features', text: 'SSL/TLS features: free Universal SSL, automatic renewal, TLS 1.3, HTTPS rewrites, Always Use HTTPS, opportunistic encryption, automatic HTTPS rewrites, certificate transparency monitoring, SSL for SaaS, custom certificates, client certificates, mutual TLS (mTLS).', metadata: { product: 'SSL/TLS', category: 'Features' } },
          { id: 'load-balancing-overview', text: 'Cloudflare Load Balancing distributes traffic across multiple origin servers for improved reliability and performance. Active health checks, geo-steering, session affinity, automatic failover. Integrates with Cloudflare\'s global network for intelligent routing.', metadata: { product: 'Load Balancing', category: 'Overview' } },
          { id: 'load-balancing-features', text: 'Load Balancing features: active health checks, passive health checks, geo-steering, session affinity (sticky sessions), weighted pools, automatic failover, custom health check paths, TCP/HTTP/HTTPS checks, notification webhooks, real-time analytics, adaptive routing.', metadata: { product: 'Load Balancing', category: 'Features' } },
          { id: 'zero-trust-overview', text: 'Cloudflare Zero Trust provides secure access to internal applications and internet browsing. Cloudflare Access replaces VPN with identity-based access control. Cloudflare Gateway provides secure web gateway, DNS filtering, and CASB. Built on Cloudflare\'s global network.', metadata: { product: 'Zero Trust', category: 'Overview' } },
          { id: 'access-features', text: 'Cloudflare Access features: identity-based access control, integrates with major identity providers (Okta, Azure AD, Google, etc.), application-level access policies, temporary access tokens, SSH and RDP protection, browser isolation, WARP client for device security.', metadata: { product: 'Access', category: 'Features' } },
          { id: 'gateway-features', text: 'Cloudflare Gateway features: secure web gateway, DNS filtering, firewall policies, shadow IT discovery, data loss prevention, browser isolation, CASB integrations, anti-virus scanning, traffic logging and analytics, SafeSearch enforcement.', metadata: { product: 'Gateway', category: 'Features' } },
          { id: 'images-overview', text: 'Cloudflare Images provides image optimization, resizing, and delivery. Automatic format conversion (WebP, AVIF), responsive images, flexible variants. Global CDN delivery. Storage included with unlimited transformations.', metadata: { product: 'Images', category: 'Overview' } },
          { id: 'images-features', text: 'Cloudflare Images features: automatic format conversion (WebP, AVIF), image resizing and cropping, quality optimization, responsive images, flexible variants (predefined transformations), metadata stripping, global CDN delivery, image storage, upload API, custom domains.', metadata: { product: 'Images', category: 'Features' } },
          { id: 'images-pricing', text: 'Images pricing: $5 per month per 100,000 images stored, $1 per 100,000 images delivered. Unlimited transformations and variants included.', metadata: { product: 'Images', category: 'Pricing' } },
          { id: 'stream-overview', text: 'Cloudflare Stream is a video streaming platform built for developers. Upload, encode, store, and deliver video content globally. Automatic encoding and adaptive bitrate streaming. Built-in player and API. Pay only for minutes watched, not bandwidth.', metadata: { product: 'Stream', category: 'Overview' } },
          { id: 'stream-features', text: 'Stream features: automatic video encoding, adaptive bitrate streaming (HLS, DASH), built-in customizable player, live streaming, video analytics, webhooks, thumbnail generation, watermarking, subtitle support, DRM protection, 4K video support.', metadata: { product: 'Stream', category: 'Features' } },
          { id: 'stream-pricing', text: 'Stream pricing: $1 per 1,000 minutes of video delivered, $5 per 1,000 minutes of video stored per month. No bandwidth charges, pay only for minutes watched.', metadata: { product: 'Stream', category: 'Pricing' } },
          { id: 'argo-overview', text: 'Argo Smart Routing optimizes routing across Cloudflare\'s network for up to 30% performance improvement. Intelligent routing based on real-time network conditions. Reduces latency, packet loss, and connection errors. Works with CDN and Load Balancing.', metadata: { product: 'Argo', category: 'Overview' } },
          { id: 'argo-features', text: 'Argo features: intelligent routing across Cloudflare backbone, real-time network congestion detection, automatic failover, tiered caching, connection coalescing, persistent connections, up to 30% faster page loads, reduced packet loss and errors.', metadata: { product: 'Argo', category: 'Features' } },
        ];

        // Generate embeddings and insert into Vectorize in batches
        const batchSize = 10;
        let totalInserted = 0;

        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = docs.slice(i, i + batchSize);

          // Generate embeddings for this batch
          const vectors = [];
          for (const doc of batch) {
            const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
              text: doc.text
            });

            vectors.push({
              id: doc.id,
              values: embedding.data[0],
              metadata: doc.metadata
            });
          }

          // Insert batch into Vectorize
          await env.VECTORIZE.insert(vectors);
          totalInserted += vectors.length;
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Successfully ingested ${totalInserted} documentation chunks into Vectorize`
        }), {
          headers: corsHeaders
        });
      } catch (error: any) {
        console.error('Documentation ingestion error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to ingest documentation',
          details: error.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Feature Requests - Get all feature requests
    if (pathname === '/api/feature-requests' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM feature_requests ORDER BY upvotes DESC, opportunity_value DESC, created_at ASC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Feature Requests - Create feature request
    if (pathname === '/api/feature-requests' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(`
        INSERT INTO feature_requests (id, product_name, feature, opportunity_value, submitter_email, submitter_name, upvotes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.productName,
        data.feature,
        data.opportunityValue,
        data.submitterEmail,
        data.submitterName,
        0
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Feature Requests - Delete feature request
    if (pathname.startsWith('/api/feature-requests/') && !pathname.includes('/upvote') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM feature_requests WHERE id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM feature_request_upvotes WHERE feature_request_id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Feature Requests - Upvote feature request
    if (pathname.match(/\/api\/feature-requests\/[^/]+\/upvote$/) && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const { userEmail } = await request.json() as any;

      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }

      // Check if user has already upvoted
      const { results: upvoteResults } = await env.DB.prepare('SELECT * FROM feature_request_upvotes WHERE feature_request_id=? AND user_email=?')
        .bind(id, userEmail).all();

      if (upvoteResults.length > 0) {
        // Un-upvote - remove upvote record and decrement count
        await env.DB.prepare('DELETE FROM feature_request_upvotes WHERE feature_request_id=? AND user_email=?').bind(id, userEmail).run();
        await env.DB.prepare('UPDATE feature_requests SET upvotes = upvotes - 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      } else {
        // Upvote - add upvote record and increment count
        const upvoteId = `upvote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await env.DB.prepare('INSERT INTO feature_request_upvotes (id, feature_request_id, user_email) VALUES (?, ?, ?)')
          .bind(upvoteId, id, userEmail).run();
        await env.DB.prepare('UPDATE feature_requests SET upvotes = upvotes + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Feature Requests - Get user's upvoted feature requests
    if (pathname === '/api/feature-requests/user-upvotes' && request.method === 'POST') {
      const { userEmail } = await request.json() as any;

      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }

      const { results } = await env.DB.prepare('SELECT feature_request_id FROM feature_request_upvotes WHERE user_email=?')
        .bind(userEmail).all();

      const upvotedIds = results.map((r: any) => r.feature_request_id);
      return new Response(JSON.stringify(upvotedIds), { headers: corsHeaders });
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
