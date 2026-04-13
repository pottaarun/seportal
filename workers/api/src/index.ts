export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: any; // Cloudflare Workers AI binding
  VECTORIZE: VectorizeIndex; // Cloudflare Vectorize binding
}

// Helper function to clear documentation from Vectorize
async function clearDocumentationVectors(env: Env): Promise<number> {
  try {
    // Get all documentation vector IDs from D1
    const { results } = await env.DB.prepare('SELECT id FROM doc_vectors').all();

    if (!results || results.length === 0) {
      console.log('No documentation vectors to clear');
      return 0;
    }

    // Extract vector IDs
    const vectorIds = results.map((r: any) => r.id);
    console.log(`Found ${vectorIds.length} documentation vectors to delete`);

    // Delete from Vectorize in batches
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < vectorIds.length; i += batchSize) {
      const batch = vectorIds.slice(i, i + batchSize);
      try {
        await env.VECTORIZE.deleteByIds(batch);
        deletedCount += batch.length;
        console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} vectors`);
      } catch (err) {
        console.error(`Error deleting batch at index ${i}:`, err);
      }
    }

    // Clear the tracking table
    await env.DB.prepare('DELETE FROM doc_vectors').run();
    console.log(`Cleared tracking table`);

    return deletedCount;
  } catch (error) {
    console.error('Error clearing documentation vectors:', error);
    return 0;
  }
}

// Helper function to scrape and chunk documentation
async function scrapeAndIndexDocs(env: Env): Promise<number> {
  // Comprehensive documentation URLs with product categorization
  const docUrls: Array<{url: string; product: string; category: string}> = [
    // Developer Platform
    { url: 'https://developers.cloudflare.com/workers/', product: 'Workers', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/workers/platform/pricing/', product: 'Workers', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/workers/runtime-apis/', product: 'Workers', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/pages/', product: 'Pages', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/pages/framework-guides/', product: 'Pages', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/workers-ai/', product: 'Workers AI', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/workers-ai/models/', product: 'Workers AI', category: 'developer-platform' },

    // Storage
    { url: 'https://developers.cloudflare.com/r2/', product: 'R2 Storage', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/r2/pricing/', product: 'R2 Storage', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/d1/', product: 'D1 Database', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/d1/platform/pricing/', product: 'D1 Database', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/kv/', product: 'Workers KV', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/kv/platform/pricing/', product: 'Workers KV', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/durable-objects/', product: 'Durable Objects', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/vectorize/', product: 'Vectorize', category: 'developer-platform' },
    { url: 'https://developers.cloudflare.com/queues/', product: 'Queues', category: 'developer-platform' },

    // Application Security
    { url: 'https://developers.cloudflare.com/waf/', product: 'Web Application Firewall', category: 'application-security' },
    { url: 'https://developers.cloudflare.com/ddos-protection/', product: 'DDoS Protection', category: 'application-security' },
    { url: 'https://developers.cloudflare.com/bots/', product: 'Bot Management', category: 'application-security' },
    { url: 'https://developers.cloudflare.com/api-shield/', product: 'API Shield', category: 'application-security' },
    { url: 'https://developers.cloudflare.com/page-shield/', product: 'Page Shield', category: 'application-security' },
    { url: 'https://developers.cloudflare.com/ssl/', product: 'SSL/TLS', category: 'application-security' },

    // Application Performance
    { url: 'https://developers.cloudflare.com/cache/', product: 'Cache', category: 'application-performance' },
    { url: 'https://developers.cloudflare.com/load-balancing/', product: 'Load Balancing', category: 'application-performance' },
    { url: 'https://developers.cloudflare.com/images/', product: 'Images', category: 'application-performance' },
    { url: 'https://developers.cloudflare.com/stream/', product: 'Stream', category: 'application-performance' },
    { url: 'https://developers.cloudflare.com/speed/', product: 'Speed Optimization', category: 'application-performance' },
    { url: 'https://developers.cloudflare.com/zaraz/', product: 'Zaraz', category: 'application-performance' },

    // Network Services
    { url: 'https://developers.cloudflare.com/dns/', product: 'DNS', category: 'network-services' },
    { url: 'https://developers.cloudflare.com/spectrum/', product: 'Spectrum', category: 'network-services' },
    { url: 'https://developers.cloudflare.com/magic-wan/', product: 'Magic WAN', category: 'network-services' },
    { url: 'https://developers.cloudflare.com/magic-transit/', product: 'Magic Transit', category: 'network-services' },
    { url: 'https://developers.cloudflare.com/network-interconnect/', product: 'Network Interconnect', category: 'network-services' },

    // SASE & Zero Trust
    { url: 'https://developers.cloudflare.com/cloudflare-one/', product: 'Cloudflare One', category: 'sase' },
    { url: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/', product: 'Cloudflare Tunnel', category: 'sase' },
    { url: 'https://developers.cloudflare.com/cloudflare-one/identity/', product: 'Access', category: 'sase' },
    { url: 'https://developers.cloudflare.com/cloudflare-one/policies/gateway/', product: 'Gateway', category: 'sase' },
    { url: 'https://developers.cloudflare.com/cloudflare-one/applications/', product: 'Access Applications', category: 'sase' },

    // Workplace Security
    { url: 'https://developers.cloudflare.com/email-security/', product: 'Area 1 Email Security', category: 'workplace-security' },
    { url: 'https://developers.cloudflare.com/browser-isolation/', product: 'Browser Isolation', category: 'workplace-security' },
    { url: 'https://developers.cloudflare.com/warp-client/', product: 'WARP Client', category: 'workplace-security' },
  ];

  const chunks: Array<{id: string; text: string; url: string; product: string; category: string; chunkIndex: number}> = [];

  // Fetch all documentation pages
  for (const docConfig of docUrls) {
    try {
      const response = await fetch(docConfig.url, {
        headers: { 'User-Agent': 'SolutionHub-DocIndexer/1.0' }
      });

      if (!response.ok) {
        console.log(`Failed to fetch ${docConfig.url}: ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Extract text content
      let text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Prepend product name to help with context
      text = `Product: ${docConfig.product}. Category: ${docConfig.category}. ${text}`;

      // Chunk into 800-character segments with overlap
      const chunkSize = 800;
      const overlap = 100;
      let start = 0;
      let chunkIndex = 0;

      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunkText = text.substring(start, end);

        if (chunkText.length > 100) { // Only add substantial chunks
          const urlPath = docConfig.url.replace('https://developers.cloudflare.com/', '').replace(/\//g, '-');
          chunks.push({
            id: `${urlPath}-${start}`,
            text: chunkText,
            url: docConfig.url,
            product: docConfig.product,
            category: docConfig.category,
            chunkIndex: chunkIndex
          });
          chunkIndex++;
        }

        start += chunkSize - overlap;
      }
      console.log(`Scraped ${docConfig.product}: ${chunkIndex} chunks`);
    } catch (err) {
      console.error(`Failed to scrape ${docConfig.url}:`, err);
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
          metadata: {
            url: chunk.url,
            product: chunk.product,
            category: chunk.category,
            length: chunk.text.length,
            type: 'documentation'
          }
        });

        // Track in D1
        await env.DB.prepare(`
          INSERT OR REPLACE INTO doc_vectors (id, product_name, category, url, chunk_index)
          VALUES (?, ?, ?, ?, ?)
        `).bind(chunk.id, chunk.product, chunk.category, chunk.url, chunk.chunkIndex).run();

      } catch (err) {
        console.error(`Failed to generate embedding for ${chunk.id}:`, err);
      }
    }

    if (vectors.length > 0) {
      await env.VECTORIZE.upsert(vectors);
      totalInserted += vectors.length;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: Inserted ${vectors.length} vectors (${totalInserted} total)`);
    }
  }

  console.log(`Successfully inserted ${totalInserted} documentation vectors`);
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
      // Index fresh documentation (upsert will replace old vectors automatically)
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

  // Workday webhook (placeholder)
  if (pathname === '/webhooks/workday') {
    const payload = await request.json() as any;
    const syncId = `sync-${Date.now()}`;
    const now = new Date().toISOString();
    const eventType = payload?.event_type || payload?.type || 'unknown';

    // Store in sync_log
    await env.DB.prepare(
      `INSERT INTO sync_log (id, provider, sync_type, status, started_at, completed_at, details)
       VALUES (?, 'workday', 'webhook', 'completed', ?, ?, ?)`
    ).bind(syncId, now, now, JSON.stringify({ event_type: eventType, payload })).run();

    console.log(`Workday webhook received: event_type=${eventType}`);

    return new Response(JSON.stringify({ success: true, sync_id: syncId, event_type: eventType }), { headers: corsHeaders });
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

    // Bulk delete URL assets
    if (pathname === '/api/url-assets/bulk-delete' && request.method === 'POST') {
      const { ids } = await request.json() as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid ids array' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Delete each asset
      for (const id of ids) {
        await env.DB.prepare('DELETE FROM url_assets WHERE id=?').bind(id).run();
      }

      return new Response(JSON.stringify({ success: true, deletedCount: ids.length }), { headers: corsHeaders });
    }

    // File Assets
    if (pathname === '/api/file-assets' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM file_assets ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    if (pathname === '/api/file-assets/upload' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as unknown as File;
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

    // Bulk delete file assets
    if (pathname === '/api/file-assets/bulk-delete' && request.method === 'POST') {
      const { ids } = await request.json() as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid ids array' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Get all file keys that need to be deleted from R2
      const placeholders = ids.map(() => '?').join(',');
      const { results } = await env.DB.prepare(
        `SELECT file_key FROM file_assets WHERE id IN (${placeholders})`
      ).bind(...ids).all();

      // Delete files from R2
      for (const fileAsset of results as any[]) {
        if (fileAsset.file_key) {
          await env.R2.delete(fileAsset.file_key);
        }
      }

      // Delete from database
      await env.DB.prepare(
        `DELETE FROM file_assets WHERE id IN (${placeholders})`
      ).bind(...ids).run();

      return new Response(JSON.stringify({ success: true, deletedCount: ids.length }), { headers: corsHeaders });
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

    // Announcements - Generate customer email from announcement
    if (pathname === '/api/announcements/generate-email' && request.method === 'POST') {
      const data = await request.json() as any;
      const { title, message, products, tone, customerName } = data;

      // Build product context from DB
      let productContext = '';
      if (products && products.length > 0) {
        const placeholders = products.map(() => '?').join(',');
        const { results: productRows } = await env.DB.prepare(
          `SELECT name, description FROM products WHERE id IN (${placeholders})`
        ).bind(...products).all();
        productContext = productRows.map((p: any) => `- ${p.name}: ${p.description || 'Cloudflare product'}`).join('\n');
      }

      const aiResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          {
            role: 'system',
            content: `You are a Solutions Engineer at Cloudflare writing a customer outreach email. Write professional, helpful emails that explain how Cloudflare products can mitigate security or infrastructure issues described in the news/alert.

Guidelines:
- Be concise and professional -- 3-5 short paragraphs max
- Start with a brief mention of the news/issue (do NOT copy-paste the whole alert)
- Explain how specific Cloudflare products address the issue
- Include brief technical reasoning for why each product helps
- End with a soft call-to-action (offer to discuss, schedule a call, etc.)
- Tone: ${tone || 'professional'}
- Do NOT include a subject line -- just write the email body
- Do NOT use markdown formatting -- write plain text suitable for email
- Use line breaks between paragraphs`
          },
          {
            role: 'user',
            content: `News/Alert Title: ${title}

Details: ${message}

${customerName ? `Customer name: ${customerName}` : ''}

Cloudflare products that can help mitigate this:
${productContext || '(No specific products selected -- recommend relevant Cloudflare products based on the issue)'}`
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      // Generate a subject line separately for better quality
      const subjectResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          {
            role: 'system',
            content: 'Generate a short, professional email subject line (max 10 words). Return ONLY the subject line, nothing else. Do not use quotes.'
          },
          {
            role: 'user',
            content: `Write a subject line for an email about: ${title}. The email explains how Cloudflare products can help mitigate this issue.`
          }
        ],
        max_tokens: 30,
        temperature: 0.5,
      });

      return new Response(JSON.stringify({
        subject: (subjectResponse.response || '').trim(),
        body: (aiResponse.response || '').trim(),
      }), { headers: corsHeaders });
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

    // Employees - Get by email
    if (pathname.startsWith('/api/employees/by-email/') && request.method === 'GET') {
      const encodedEmail = pathname.replace('/api/employees/by-email/', '');
      const email = decodeURIComponent(encodedEmail);
      const row = await env.DB.prepare('SELECT * FROM employees WHERE email=?').bind(email).first();
      if (row) {
        return new Response(JSON.stringify(row), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: 'Employee not found' }), { status: 404, headers: corsHeaders });
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
        const file = formData.get('photo') as unknown as File;

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
        const categories = data.categories || [];

        if (!question) {
          return new Response(JSON.stringify({ error: 'Question is required' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // Step 1: Identify relevant product/topic from the question
        const questionLower = question.toLowerCase();
        const relevantDocs: string[] = [];

        // Define documentation URLs based on categories
        const categoryUrls: { [key: string]: string[] } = {
          'application-security': [
            'https://developers.cloudflare.com/waf/',
            'https://developers.cloudflare.com/ddos-protection/',
            'https://developers.cloudflare.com/bots/',
            'https://developers.cloudflare.com/api-shield/'
          ],
          'network-services': [
            'https://developers.cloudflare.com/load-balancing/',
            'https://developers.cloudflare.com/dns/',
            'https://developers.cloudflare.com/spectrum/',
            'https://developers.cloudflare.com/magic-wan/'
          ],
          'developer-platform': [
            'https://developers.cloudflare.com/workers/',
            'https://developers.cloudflare.com/pages/',
            'https://developers.cloudflare.com/r2/',
            'https://developers.cloudflare.com/d1/',
            'https://developers.cloudflare.com/workers-ai/'
          ],
          'application-performance': [
            'https://developers.cloudflare.com/cache/',
            'https://developers.cloudflare.com/speed/',
            'https://developers.cloudflare.com/images/',
            'https://developers.cloudflare.com/stream/',
            'https://developers.cloudflare.com/argo-smart-routing/'
          ],
          'sase': [
            'https://developers.cloudflare.com/cloudflare-one/',
            'https://developers.cloudflare.com/magic-wan/',
            'https://developers.cloudflare.com/magic-firewall/'
          ],
          'workplace-security': [
            'https://developers.cloudflare.com/cloudflare-one/applications/',
            'https://developers.cloudflare.com/cloudflare-one/policies/',
            'https://developers.cloudflare.com/cloudflare-one/connections/',
            'https://developers.cloudflare.com/email-security/'
          ]
        };

        // Legacy keyword-based URLs for backwards compatibility
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

        // Determine which documentation to fetch based on selected categories
        const urlsToFetch: string[] = [];

        // First, add URLs from selected categories
        if (categories && categories.length > 0) {
          for (const category of categories) {
            if (categoryUrls[category]) {
              urlsToFetch.push(...categoryUrls[category]);
            }
          }
        }

        // Then, add keyword-based URLs
        for (const [keyword, urls] of Object.entries(docUrls)) {
          if (questionLower.includes(keyword)) {
            urlsToFetch.push(...urls);
          }
        }

        // If no specific product or category detected, fetch general docs
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

        // Step 3: Query Vectorize for similar uploaded RFPs
        let uploadedRfpContext = '';
        try {
          // Generate embedding for the question
          const questionEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
            text: question
          });

          // Query Vectorize for similar RFP responses
          const vectorResults = await env.VECTORIZE.query(questionEmbedding.data[0], {
            topK: 3,
            filter: { type: 'completed-rfp' }
          });

          // Build context from uploaded RFPs
          if (vectorResults.matches && vectorResults.matches.length > 0) {
            const relevantRfps = vectorResults.matches
              .filter((match: any) => match.score > 0.7) // Only use high-confidence matches
              .map((match: any) => {
                const metadata = match.metadata as any;
                return `Previous RFP Response:\nQ: ${metadata.question}\nA: ${metadata.answer}`;
              });

            if (relevantRfps.length > 0) {
              uploadedRfpContext = `\n\n--- Previously Submitted RFP Responses (use as supplementary context only) ---\n\n${relevantRfps.join('\n\n')}`;
            }
          }
        } catch (err) {
          console.error('Failed to query uploaded RFPs:', err);
          // Continue without uploaded RFP context
        }

        // Step 4: Build context from scraped documentation (prioritize this)
        let retrievedContext = '';
        if (combinedDocs.length > 100) {
          retrievedContext = `Latest Cloudflare Documentation:\n\n${combinedDocs}`;
        } else {
          // Fallback to comprehensive product info
          retrievedContext = `Cloudflare Product Information:

**Cloudflare Workers** (https://developers.cloudflare.com/workers/): Serverless execution environment with 0ms cold starts and sub-millisecond CPU time. Deployed across 335+ points of presence worldwide. Supports JavaScript, TypeScript, Python, Rust, C, and C++. No egress fees.

**Cloudflare Pages** (https://developers.cloudflare.com/pages/): JAMstack platform with unlimited sites, requests, and bandwidth. Automatic Git integration, instant preview deployments, edge rendering with React Server Components support, and Functions for dynamic functionality.

**Cloudflare R2** (https://developers.cloudflare.com/r2/): S3-compatible object storage with zero egress fees. Compatible with existing S3 tools and libraries. Automatic geographic distribution across Cloudflare's 335+ points of presence for low-latency access worldwide.

**Cloudflare D1** (https://developers.cloudflare.com/d1/): Serverless SQLite database with automatic replication. Full SQL support including transactions, joins, and indexes. Zero-configuration setup with automatic backups.

**DDoS Protection** (https://developers.cloudflare.com/ddos-protection/): Unmetered and unlimited protection against volumetric, protocol, and application-layer attacks. Automated detection and mitigation in under 3 seconds. Available at all 335+ points of presence.

**WAF** (https://developers.cloudflare.com/waf/): Web Application Firewall with managed rulesets protecting against OWASP Top 10 vulnerabilities. Custom rules engine, rate limiting, bot management, and API security. Automatic updates to threat intelligence.

**CDN** (https://developers.cloudflare.com/cache/): Content delivery with unlimited bandwidth through 335+ points of presence. HTTP/3 and QUIC support, Tiered Cache for improved cache hit ratios, image optimization, and smart routing.

**Zero Trust** (https://developers.cloudflare.com/cloudflare-one/): Replace VPNs with identity-based access control (Access) and secure web gateway (Gateway). Device posture checks, DNS filtering, browser isolation, and data loss prevention.

**Network**: Operates from 335+ points of presence across 100+ countries with 200+ Tbps total capacity. Interconnected with major ISPs and cloud providers.`;
        }

        // Step 5: Generate response using AI with live documentation
        const aiResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            {
              role: 'system',
              content: `You are a Cloudflare solutions expert crafting winning RFP/RFI responses. Your goal is to position Cloudflare as the strongest possible choice while remaining strictly truthful and accurate.

Use the following LIVE documentation fetched from Cloudflare's developer portal as your source of truth:

${retrievedContext}${uploadedRfpContext}

STRATEGIC APPROACH:
- Frame every answer to highlight where Cloudflare excels compared to the industry. Lead with Cloudflare's strongest differentiators for the specific capability being asked about.
- Emphasize architectural advantages that are genuinely unique to Cloudflare (e.g., single-pass inspection, zero egress fees, 0ms cold starts, connectivity cloud model, every service on every server in every location).
- When a question touches on a capability where Cloudflare has a measurable edge (performance, cost, simplicity, integrated platform), make that the centerpiece of the response.
- Position Cloudflare's integrated platform as a strategic advantage -- fewer vendors, unified control plane, composable services that work together natively rather than bolted-on point solutions.

ACCURACY RULES (NON-NEGOTIABLE):
- ONLY state capabilities that are documented in the provided context or that you are certain Cloudflare actually offers. Never fabricate features, metrics, or claims.
- If Cloudflare does not fully cover a requirement, acknowledge the gap honestly but pivot to how Cloudflare's existing capabilities address the core intent, or how integrations/partnerships close the gap.
- Do NOT claim Cloudflare can do something it cannot. Overpromising loses deals faster than honest scoping.
- Every technical claim must be grounded in the documentation context provided. If you are unsure, hedge with "Cloudflare supports..." rather than making an absolute claim.

FORMATTING:
- PRIORITIZE information from the official Cloudflare Documentation above
- Use previously submitted RFP responses only as supplementary context
- Be concise -- maximum 4-5 sentences per response
- Be specific and technical, not vague or marketing-heavy
- ALWAYS include the relevant Cloudflare developer documentation URL when referencing a product (format: https://developers.cloudflare.com/[product]/)
- Include performance metrics when available and verifiable
- When mentioning network presence, use "335+ points of presence" - NEVER mention "data centers" or "cities"
- DO NOT include pricing information or dollar amounts
- DO NOT add "contact us for pricing" or similar commercial language
- Only mention points of presence when specifically relevant
- Vary your language across responses -- avoid repetitive boilerplate
- Use a confident, professional tone suitable for enterprise RFP/RFI documents`
            },
            {
              role: 'user',
              content: `RFP/RFI Question: ${question}

Please provide a brief, professional response (4-5 sentences maximum) that would be suitable for an RFP/RFI document.`
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        });

        // Log the question to rfx_queries for metrics tracking
        try {
          await env.DB.prepare(
            'INSERT INTO rfx_queries (question) VALUES (?)'
          ).bind(question).run();
        } catch (logErr) {
          console.error('Failed to log RFx query:', logErr);
        }

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

    // RFx - Ingest completed RFP responses for training
    if (pathname === '/api/rfx/ingest-completed' && request.method === 'POST') {
      try {
        const data = await request.json() as any;
        const { fileName, qaData } = data;

        if (!qaData || !Array.isArray(qaData) || qaData.length === 0) {
          return new Response(JSON.stringify({ error: 'No Q&A data provided' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // Index each Q&A pair in the vector database
        let successCount = 0;
        const batchSize = 10;

        for (let i = 0; i < qaData.length; i += batchSize) {
          const batch = qaData.slice(i, Math.min(i + batchSize, qaData.length));

          const uploadedAt = new Date().toISOString();

          const vectorsWithMeta = await Promise.all(batch.map(async (qa: any, idx: number) => {
            const combinedText = `Question: ${qa.question}\n\nAnswer: ${qa.answer}`;

            // Generate embedding using Workers AI
            const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
              text: combinedText
            });

            return {
              id: `rfp-${fileName}-${i + idx}-${Date.now()}`,
              values: embedding.data[0],
              metadata: {
                type: 'completed-rfp',
                fileName: fileName,
                question: qa.question,
                answer: qa.answer,
                uploadedAt: uploadedAt
              },
              question: qa.question,
              answer: qa.answer
            };
          }));

          // Insert into Vectorize (only pass id, values, metadata)
          const vectors = vectorsWithMeta.map(({ id, values, metadata }) => ({ id, values, metadata }));
          await env.VECTORIZE.upsert(vectors);

          // Insert into D1 for tracking
          for (const v of vectorsWithMeta) {
            await env.DB.prepare(`
              INSERT INTO rfp_uploads (vectorId, fileName, uploadedAt, question, answer)
              VALUES (?, ?, ?, ?, ?)
            `).bind(
              v.id,
              fileName,
              uploadedAt,
              v.question,
              v.answer
            ).run();
          }

          successCount += batch.length;
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Successfully indexed ${successCount} Q&A pairs from ${fileName}`,
          count: successCount
        }), {
          headers: corsHeaders
        });
      } catch (error: any) {
        console.error('RFP ingestion error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to ingest RFP data',
          details: error.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // RFx - List uploaded RFPs for admin management
    if (pathname === '/api/rfx/uploaded-rfps' && request.method === 'GET') {
      try {
        // Query D1 database for uploaded RFP metadata
        const results = await env.DB.prepare(`
          SELECT fileName, COUNT(*) as count, MIN(uploadedAt) as uploadedAt
          FROM rfp_uploads
          GROUP BY fileName
          ORDER BY uploadedAt DESC
        `).all();

        return new Response(JSON.stringify({
          uploads: results.results || []
        }), {
          headers: corsHeaders
        });
      } catch (error: any) {
        console.error('Failed to list RFPs:', error);
        // If table doesn't exist, return empty array
        return new Response(JSON.stringify({
          uploads: []
        }), {
          headers: corsHeaders
        });
      }
    }

    // RFx - Delete uploaded RFP by fileName
    if (pathname === '/api/rfx/delete-rfp' && request.method === 'DELETE') {
      try {
        const data = await request.json() as any;
        const { fileName } = data;

        if (!fileName) {
          return new Response(JSON.stringify({ error: 'fileName is required' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // Get all vector IDs for this fileName from D1
        const vectors = await env.DB.prepare(`
          SELECT vectorId FROM rfp_uploads WHERE fileName = ?
        `).bind(fileName).all();

        if (vectors.results && vectors.results.length > 0) {
          // Delete from Vectorize
          const vectorIds = vectors.results.map((v: any) => v.vectorId);
          await env.VECTORIZE.deleteByIds(vectorIds);

          // Delete from D1
          await env.DB.prepare(`
            DELETE FROM rfp_uploads WHERE fileName = ?
          `).bind(fileName).run();

          return new Response(JSON.stringify({
            success: true,
            deletedCount: vectorIds.length,
            message: `Deleted ${vectorIds.length} entries from ${fileName}`
          }), {
            headers: corsHeaders
          });
        } else {
          return new Response(JSON.stringify({
            success: true,
            deletedCount: 0,
            message: 'No entries found for this fileName'
          }), {
            headers: corsHeaders
          });
        }
      } catch (error: any) {
        console.error('Failed to delete RFP:', error);
        return new Response(JSON.stringify({
          error: 'Failed to delete RFP data',
          details: error.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Admin - Clear documentation database
    if (pathname === '/api/admin/clear-docs' && request.method === 'POST') {
      try {
        console.log('Clearing documentation database...');
        const deletedCount = await clearDocumentationVectors(env);

        return new Response(JSON.stringify({
          success: true,
          message: `Successfully cleared ${deletedCount} documentation vectors from database`,
          deletedCount: deletedCount
        }), {
          headers: corsHeaders
        });
      } catch (error: any) {
        console.error('Documentation clearing error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to clear documentation',
          details: error.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Admin - Get documentation index stats (count + last updated)
    if (pathname === '/api/admin/doc-stats' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT COUNT(*) as count FROM doc_vectors').all();
        const docCount = (results?.[0] as any)?.count || 0;
        const lastUpdated = await env.KV.get('docs:last_updated');
        return new Response(JSON.stringify({
          docCount,
          lastUpdated: lastUpdated || null,
        }), { headers: corsHeaders });
      } catch (error: any) {
        return new Response(JSON.stringify({ docCount: 0, lastUpdated: null }), { headers: corsHeaders });
      }
    }

    // RFx - Get stats (total questions answered)
    if (pathname === '/api/rfx/stats' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT COUNT(*) as count FROM rfx_queries').all();
        const questionsAnswered = (results?.[0] as any)?.count || 0;
        return new Response(JSON.stringify({ questionsAnswered }), { headers: corsHeaders });
      } catch (error: any) {
        return new Response(JSON.stringify({ questionsAnswered: 0 }), { headers: corsHeaders });
      }
    }

    // Admin - Trigger manual documentation update
    if (pathname === '/api/admin/ingest-docs' && request.method === 'POST') {
      try {
        // Scrape and index fresh documentation
        console.log('Scraping and indexing fresh documentation from developers.cloudflare.com...');
        const totalIndexed = await scrapeAndIndexDocs(env);
        console.log(`Indexed ${totalIndexed} documentation chunks`);

        // Store the last-updated timestamp in KV
        await env.KV.put('docs:last_updated', new Date().toISOString());

        return new Response(JSON.stringify({
          success: true,
          message: `Successfully scraped and indexed ${totalIndexed} documentation chunks with product names and categories`,
          totalIndexed: totalIndexed
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

      // For each feature request, get the total opportunity value and opportunities
      const enrichedResults = await Promise.all(results.map(async (fr: any) => {
        const { results: opportunities } = await env.DB.prepare(
          'SELECT id, user_email, user_name, opportunity_value, customer_name, sfdc_link, description, created_at FROM feature_request_opportunities WHERE feature_request_id=? ORDER BY created_at DESC'
        ).bind(fr.id).all();

        // Calculate total opportunity value from all opportunities
        const totalOpportunityValue = opportunities.reduce((sum: number, opp: any) => sum + opp.opportunity_value, 0);

        return {
          ...fr,
          opportunity_value: totalOpportunityValue,
          opportunities: opportunities
        };
      }));

      // Re-sort with updated opportunity values
      enrichedResults.sort((a, b) => {
        if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
        if (b.opportunity_value !== a.opportunity_value) return b.opportunity_value - a.opportunity_value;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      return new Response(JSON.stringify(enrichedResults), { headers: corsHeaders });
    }

    // Feature Requests - Create feature request
    if (pathname === '/api/feature-requests' && request.method === 'POST') {
      const data = await request.json() as any;

      // Create the feature request (with opportunity_value set to 0, will be calculated from opportunities table)
      await env.DB.prepare(`
        INSERT INTO feature_requests (id, product_name, feature, opportunity_value, submitter_email, submitter_name, upvotes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id,
        data.productName,
        data.feature,
        0, // Will be calculated from opportunities table
        data.submitterEmail,
        data.submitterName,
        0
      ).run();

      // Create the initial opportunity entry
      const opportunityId = `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(`
        INSERT INTO feature_request_opportunities (id, feature_request_id, user_email, user_name, opportunity_value)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        opportunityId,
        data.id,
        data.submitterEmail,
        data.submitterName,
        data.opportunityValue
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

    // Feature Requests - Add opportunity to existing feature request
    if (pathname.match(/\/api\/feature-requests\/[^/]+\/add-opportunity$/) && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const { userEmail, userName, opportunityValue, customerName, sfdcLink, description } = await request.json() as any;

      if (!userEmail || !userName || !opportunityValue) {
        return new Response(JSON.stringify({ error: 'User email, name, and opportunity value required' }), { status: 400, headers: corsHeaders });
      }

      // Always add new opportunity (allows multiple opportunities per SE)
      const opportunityId = `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(`
        INSERT INTO feature_request_opportunities (id, feature_request_id, user_email, user_name, opportunity_value, customer_name, sfdc_link, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        opportunityId,
        id,
        userEmail,
        userName,
        opportunityValue,
        customerName || null,
        sfdcLink || null,
        description || null
      ).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Feature Requests - Delete opportunity
    if (pathname.match(/\/api\/feature-requests\/[^/]+\/opportunities\/[^/]+$/) && request.method === 'DELETE') {
      const parts = pathname.split('/');
      const opportunityId = parts[parts.length - 1];
      const { userEmail } = await request.json() as any;

      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'User email required' }), { status: 400, headers: corsHeaders });
      }

      // Only allow user to delete their own opportunities
      await env.DB.prepare('DELETE FROM feature_request_opportunities WHERE id=? AND user_email=?')
        .bind(opportunityId, userEmail).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ==========================================
    // Skills Matrix API endpoints
    // ==========================================

    // Skill Categories - GET all
    if (pathname === '/api/skill-categories' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM skill_categories ORDER BY sort_order ASC, name ASC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Skill Categories - POST create
    if (pathname === '/api/skill-categories' && request.method === 'POST') {
      const body = await request.json() as any;
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO skill_categories (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, body.name, body.description || null, body.icon || null, body.sort_order || 0).run();
      return new Response(JSON.stringify({ id, ...body }), { headers: corsHeaders });
    }

    // Skill Categories - PUT update
    if (pathname.startsWith('/api/skill-categories/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const body = await request.json() as any;
      await env.DB.prepare(
        'UPDATE skill_categories SET name=?, description=?, icon=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).bind(body.name, body.description || null, body.icon || null, body.sort_order || 0, id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Skill Categories - DELETE
    if (pathname.startsWith('/api/skill-categories/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      // Delete associated skills, assessments, and courses
      const { results: skills } = await env.DB.prepare('SELECT id FROM skills WHERE category_id=?').bind(id).all();
      for (const skill of skills) {
        await env.DB.prepare('DELETE FROM skill_assessments WHERE skill_id=?').bind(skill.id).run();
        await env.DB.prepare('DELETE FROM university_courses WHERE skill_id=?').bind(skill.id).run();
      }
      await env.DB.prepare('DELETE FROM skills WHERE category_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM skill_categories WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Skills - GET all (optionally filter by category_id)
    if (pathname === '/api/skills' && request.method === 'GET') {
      const reqUrl = new URL(request.url);
      const categoryId = reqUrl.searchParams.get('category_id');
      let query = 'SELECT s.*, sc.name as category_name FROM skills s LEFT JOIN skill_categories sc ON s.category_id = sc.id';
      if (categoryId) {
        query += ' WHERE s.category_id = ?';
        const { results } = await env.DB.prepare(query + ' ORDER BY s.sort_order ASC, s.name ASC').bind(categoryId).all();
        return new Response(JSON.stringify(results), { headers: corsHeaders });
      }
      const { results } = await env.DB.prepare(query + ' ORDER BY sc.sort_order ASC, s.sort_order ASC, s.name ASC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Skills - POST create
    if (pathname === '/api/skills' && request.method === 'POST') {
      const body = await request.json() as any;
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO skills (id, category_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, body.category_id, body.name, body.description || null, body.sort_order || 0).run();
      return new Response(JSON.stringify({ id, ...body }), { headers: corsHeaders });
    }

    // Skills - PUT update
    if (pathname.startsWith('/api/skills/') && !pathname.includes('/assessments') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const body = await request.json() as any;
      await env.DB.prepare(
        'UPDATE skills SET category_id=?, name=?, description=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).bind(body.category_id, body.name, body.description || null, body.sort_order || 0, id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Skills - DELETE
    if (pathname.startsWith('/api/skills/') && !pathname.includes('/assessments') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM skill_assessments WHERE skill_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM university_courses WHERE skill_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM skills WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Skill Assessments - GET for a user
    if (pathname === '/api/skill-assessments' && request.method === 'GET') {
      const reqUrl2 = new URL(request.url);
      const userEmail = reqUrl2.searchParams.get('user_email');
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'user_email required' }), { status: 400, headers: corsHeaders });
      }
      const { results } = await env.DB.prepare(
        'SELECT sa.*, s.name as skill_name, s.category_id, sc.name as category_name FROM skill_assessments sa LEFT JOIN skills s ON sa.skill_id = s.id LEFT JOIN skill_categories sc ON s.category_id = sc.id WHERE sa.user_email = ? ORDER BY sc.sort_order ASC, s.sort_order ASC'
      ).bind(userEmail).all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Skill Assessments - GET all (admin view for team overview)
    if (pathname === '/api/skill-assessments/all' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT sa.*, s.name as skill_name, s.category_id, sc.name as category_name FROM skill_assessments sa LEFT JOIN skills s ON sa.skill_id = s.id LEFT JOIN skill_categories sc ON s.category_id = sc.id ORDER BY sa.user_name ASC, sc.sort_order ASC, s.sort_order ASC'
      ).all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Skill Assessments - POST/PUT (upsert a single assessment)
    if (pathname === '/api/skill-assessments' && request.method === 'POST') {
      const body = await request.json() as any;
      const id = crypto.randomUUID();
      // Upsert: insert or update on conflict
      await env.DB.prepare(
        `INSERT INTO skill_assessments (id, user_email, user_name, skill_id, level) 
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_email, skill_id) DO UPDATE SET level=excluded.level, user_name=excluded.user_name, updated_at=CURRENT_TIMESTAMP`
      ).bind(id, body.user_email, body.user_name, body.skill_id, body.level).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Skill Assessments - POST bulk (save entire assessment at once)
    if (pathname === '/api/skill-assessments/bulk' && request.method === 'POST') {
      const body = await request.json() as any;
      const { user_email, user_name, assessments } = body; // assessments: [{skill_id, level}]
      
      for (const assessment of assessments) {
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO skill_assessments (id, user_email, user_name, skill_id, level) 
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_email, skill_id) DO UPDATE SET level=excluded.level, user_name=excluded.user_name, updated_at=CURRENT_TIMESTAMP`
        ).bind(id, user_email, user_name, assessment.skill_id, assessment.level).run();
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // University Courses - GET all (optionally filter by skill_id)
    if (pathname === '/api/university-courses' && request.method === 'GET') {
      const reqUrl3 = new URL(request.url);
      const skillId = reqUrl3.searchParams.get('skill_id');
      if (skillId) {
        const { results } = await env.DB.prepare(
          'SELECT uc.*, s.name as skill_name, sc.name as category_name FROM university_courses uc LEFT JOIN skills s ON uc.skill_id = s.id LEFT JOIN skill_categories sc ON s.category_id = sc.id WHERE uc.skill_id = ? ORDER BY uc.min_level ASC, uc.title ASC'
        ).bind(skillId).all();
        return new Response(JSON.stringify(results), { headers: corsHeaders });
      }
      const { results } = await env.DB.prepare(
        'SELECT uc.*, s.name as skill_name, sc.name as category_name FROM university_courses uc LEFT JOIN skills s ON uc.skill_id = s.id LEFT JOIN skill_categories sc ON s.category_id = sc.id ORDER BY sc.sort_order ASC, s.sort_order ASC, uc.min_level ASC'
      ).all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // University Courses - GET recommended for a user (based on their assessments)
    if (pathname === '/api/university-courses/recommended' && request.method === 'GET') {
      const reqUrl4 = new URL(request.url);
      const userEmail = reqUrl4.searchParams.get('user_email');
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'user_email required' }), { status: 400, headers: corsHeaders });
      }
      // Recommend courses based on skill gaps:
      // - Required (mandatory): user level < 3 (skill gap exists, needs improvement)
      // - Optional: user level >= 3 (already proficient, deeper learning available)
      // Mandatory courses are prioritized first, sorted by lowest skill level (biggest gaps)
      // then by difficulty (beginner first) to provide the most impactful learning path
      const { results } = await env.DB.prepare(
        `SELECT uc.*, s.name as skill_name, sc.name as category_name, sa.level as current_level,
                CASE WHEN sa.level < 3 THEN 'required' ELSE 'optional' END as recommendation_type
         FROM university_courses uc
         LEFT JOIN skills s ON uc.skill_id = s.id
         LEFT JOIN skill_categories sc ON s.category_id = sc.id
         LEFT JOIN skill_assessments sa ON uc.skill_id = sa.skill_id AND sa.user_email = ?
         WHERE sa.level IS NOT NULL AND sa.level >= uc.min_level AND sa.level <= uc.max_level
         ORDER BY
           CASE WHEN sa.level < 3 THEN 0 ELSE 1 END ASC,
           sa.level ASC,
           CASE uc.difficulty WHEN 'beginner' THEN 0 WHEN 'intermediate' THEN 1 WHEN 'advanced' THEN 2 WHEN 'expert' THEN 3 ELSE 4 END ASC,
           sc.sort_order ASC, s.sort_order ASC`
      ).bind(userEmail).all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // University Courses - POST create
    if (pathname === '/api/university-courses' && request.method === 'POST') {
      const body = await request.json() as any;
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO university_courses (id, title, description, url, provider, duration, difficulty, skill_id, min_level, max_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, body.title, body.description || null, body.url || null, body.provider || null, body.duration || null, body.difficulty || 'beginner', body.skill_id, body.min_level || 1, body.max_level || 2).run();
      return new Response(JSON.stringify({ id, ...body }), { headers: corsHeaders });
    }

    // University Courses - PUT update
    if (pathname.startsWith('/api/university-courses/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const body = await request.json() as any;
      await env.DB.prepare(
        'UPDATE university_courses SET title=?, description=?, url=?, provider=?, duration=?, difficulty=?, skill_id=?, min_level=?, max_level=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).bind(body.title, body.description || null, body.url || null, body.provider || null, body.duration || null, body.difficulty || 'beginner', body.skill_id, body.min_level || 1, body.max_level || 2, id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // University Courses - DELETE
    if (pathname.startsWith('/api/university-courses/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM university_courses WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Course Completions - GET user's course tracking data
    if (pathname === '/api/course-completions' && request.method === 'GET') {
      const reqUrl5 = new URL(request.url);
      const userEmail = reqUrl5.searchParams.get('user_email');
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'user_email required' }), { status: 400, headers: corsHeaders });
      }
      const { results } = await env.DB.prepare(
        'SELECT course_id, status, started_at, completed_at FROM course_completions WHERE user_email = ? ORDER BY updated_at DESC'
      ).bind(userEmail).all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Course Completions - POST/PUT update course status (not_started, in_progress, completed)
    if (pathname === '/api/course-completions' && request.method === 'POST') {
      const body = await request.json() as any;
      if (!body.user_email || !body.course_id || !body.status) {
        return new Response(JSON.stringify({ error: 'user_email, course_id, and status required' }), { status: 400, headers: corsHeaders });
      }
      const now = new Date().toISOString();
      const startedAt = body.status === 'in_progress' || body.status === 'completed' ? now : null;
      const completedAt = body.status === 'completed' ? now : null;
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO course_completions (id, user_email, course_id, status, started_at, completed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_email, course_id) DO UPDATE SET
           status = excluded.status,
           started_at = CASE WHEN excluded.status IN ('in_progress','completed') THEN COALESCE(course_completions.started_at, excluded.started_at) ELSE course_completions.started_at END,
           completed_at = CASE WHEN excluded.status = 'completed' THEN excluded.completed_at ELSE NULL END,
           updated_at = excluded.updated_at`
      ).bind(id, body.user_email, body.course_id, body.status, startedAt, completedAt, now).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Course Completions - DELETE remove tracking entry entirely
    if (pathname === '/api/course-completions' && request.method === 'DELETE') {
      const body = await request.json() as any;
      if (!body.user_email || !body.course_id) {
        return new Response(JSON.stringify({ error: 'user_email and course_id required' }), { status: 400, headers: corsHeaders });
      }
      await env.DB.prepare(
        'DELETE FROM course_completions WHERE user_email = ? AND course_id = ?'
      ).bind(body.user_email, body.course_id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Personal Courses - GET user's personal courses
    if (pathname === '/api/personal-courses' && request.method === 'GET') {
      const reqUrl6 = new URL(request.url);
      const userEmail = reqUrl6.searchParams.get('user_email');
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'user_email required' }), { status: 400, headers: corsHeaders });
      }
      const { results } = await env.DB.prepare(
        `SELECT pc.*, s.name as skill_name FROM personal_courses pc
         LEFT JOIN skills s ON pc.skill_id = s.id
         WHERE pc.user_email = ? ORDER BY pc.created_at DESC`
      ).bind(userEmail).all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // Personal Courses - POST create
    if (pathname === '/api/personal-courses' && request.method === 'POST') {
      const body = await request.json() as any;
      if (!body.user_email || !body.title) {
        return new Response(JSON.stringify({ error: 'user_email and title required' }), { status: 400, headers: corsHeaders });
      }
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO personal_courses (id, user_email, title, description, url, provider, skill_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, body.user_email, body.title, body.description || null, body.url || null, body.provider || null, body.skill_id || null, body.status || 'not_started').run();
      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    }

    // Personal Courses - PUT update
    if (pathname.startsWith('/api/personal-courses/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const body = await request.json() as any;
      const now = new Date().toISOString();
      const startedAt = body.status === 'in_progress' || body.status === 'completed' ? now : null;
      const completedAt = body.status === 'completed' ? now : null;
      await env.DB.prepare(
        `UPDATE personal_courses SET title=?, description=?, url=?, provider=?, skill_id=?, status=?,
         started_at = CASE WHEN ? IN ('in_progress','completed') THEN COALESCE(started_at, ?) ELSE started_at END,
         completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END,
         updated_at=CURRENT_TIMESTAMP WHERE id=?`
      ).bind(body.title, body.description || null, body.url || null, body.provider || null, body.skill_id || null, body.status || 'not_started', body.status, startedAt, body.status, completedAt, id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Personal Courses - DELETE
    if (pathname.startsWith('/api/personal-courses/') && request.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM personal_courses WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ========== Workday Integration Endpoints ==========

    // Workday Config - GET
    if (pathname === '/api/admin/workday-config' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT * FROM integration_config WHERE provider='workday'`
      ).all();
      if (!results || results.length === 0) {
        return new Response(JSON.stringify({
          provider: 'workday',
          tenant_url: '',
          client_id: '',
          sync_enabled: false,
          sync_interval_hours: 24,
          field_mapping: null,
          last_sync_at: null,
          last_sync_status: null
        }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify(results[0]), { headers: corsHeaders });
    }

    // Workday Config - PUT
    if (pathname === '/api/admin/workday-config' && request.method === 'PUT') {
      const body = await request.json() as any;
      const now = new Date().toISOString();

      // Store secrets in KV if provided
      if (body.client_secret) {
        await env.KV.put('workday:client_secret', body.client_secret);
      }
      if (body.refresh_token) {
        await env.KV.put('workday:refresh_token', body.refresh_token);
      }

      await env.DB.prepare(
        `INSERT OR REPLACE INTO integration_config (id, provider, tenant_url, client_id, client_secret_kv_key, refresh_token_kv_key, sync_enabled, sync_interval_hours, field_mapping, updated_at)
         VALUES ('workday-config', 'workday', ?, ?, 'workday:client_secret', 'workday:refresh_token', ?, ?, ?, ?)`
      ).bind(
        body.tenant_url || '',
        body.client_id || '',
        body.sync_enabled ? 1 : 0,
        body.sync_interval_hours || 24,
        body.field_mapping ? JSON.stringify(body.field_mapping) : null,
        now
      ).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Workday Sync - POST (manual trigger, placeholder)
    if (pathname === '/api/admin/workday-sync' && request.method === 'POST') {
      const syncId = `sync-${Date.now()}`;
      const now = new Date().toISOString();

      // Create sync_log entry
      await env.DB.prepare(
        `INSERT INTO sync_log (id, provider, sync_type, status, started_at)
         VALUES (?, 'workday', 'manual', 'pending', ?)`
      ).bind(syncId, now).run();

      // Check config
      const { results: configResults } = await env.DB.prepare(
        `SELECT * FROM integration_config WHERE provider='workday'`
      ).all();

      if (!configResults || configResults.length === 0 || !(configResults[0] as any).sync_enabled) {
        await env.DB.prepare(
          `UPDATE sync_log SET status='failed', completed_at=?, details=? WHERE id=?`
        ).bind(now, JSON.stringify({ error: 'Workday integration not configured or disabled' }), syncId).run();
        return new Response(JSON.stringify({
          success: false,
          error: 'Workday integration not configured or disabled'
        }), { status: 400, headers: corsHeaders });
      }

      // PLACEHOLDER: Real Workday API call would go here
      console.log('Workday sync placeholder - real API call would go here');

      const completedAt = new Date().toISOString();

      // Update sync_log
      await env.DB.prepare(
        `UPDATE sync_log SET status='placeholder', completed_at=?, details=? WHERE id=?`
      ).bind(completedAt, JSON.stringify({ message: 'Placeholder sync - configure credentials to enable real sync' }), syncId).run();

      // Update integration_config
      await env.DB.prepare(
        `UPDATE integration_config SET last_sync_at=?, last_sync_status='placeholder' WHERE provider='workday'`
      ).bind(completedAt).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Workday sync initiated (placeholder - configure credentials to enable real sync)',
        sync_id: syncId,
        placeholder: true
      }), { headers: corsHeaders });
    }

    // Workday Sync Status - GET
    if (pathname === '/api/admin/workday-sync-status' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT last_sync_at, last_sync_status FROM integration_config WHERE provider='workday'`
      ).all();
      if (!results || results.length === 0) {
        return new Response(JSON.stringify({ last_sync_at: null, last_sync_status: null }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify(results[0]), { headers: corsHeaders });
    }

    // Sync Logs - GET
    if (pathname === '/api/admin/sync-logs' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 50`
      ).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // ========== Reporting Endpoints ==========

    // Skills by Team
    if (pathname === '/api/reports/skills-by-team' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT e.department, s.name as skill_name, sc.name as category_name,
          ROUND(AVG(sa.level), 1) as avg_level, COUNT(DISTINCT sa.user_email) as assessed_count
        FROM skill_assessments sa
        JOIN employees e ON sa.user_email = e.email
        JOIN skills s ON sa.skill_id = s.id
        JOIN skill_categories sc ON s.category_id = sc.id
        WHERE e.department IS NOT NULL AND e.department != ''
        GROUP BY e.department, s.id
        ORDER BY e.department, sc.sort_order, s.sort_order`
      ).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // Course Completion by Manager
    if (pathname === '/api/reports/course-completion-by-manager' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT mgr.name as manager_name, mgr.id as manager_id,
          COUNT(DISTINCT e.id) as direct_reports,
          COUNT(DISTINCT CASE WHEN cc.status = 'completed' THEN cc.id END) as completed_courses,
          COUNT(DISTINCT CASE WHEN cc.status = 'in_progress' THEN cc.id END) as in_progress_courses,
          COUNT(DISTINCT uc.id) as total_recommended
        FROM employees e
        JOIN employees mgr ON e.manager_id = mgr.id
        LEFT JOIN skill_assessments sa ON e.email = sa.user_email
        LEFT JOIN university_courses uc ON sa.skill_id = uc.skill_id AND sa.level >= uc.min_level AND sa.level <= uc.max_level AND sa.level < 3
        LEFT JOIN course_completions cc ON e.email = cc.user_email AND uc.id = cc.course_id
        GROUP BY mgr.id
        ORDER BY mgr.name`
      ).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // Onboarding Progress
    if (pathname === '/api/reports/onboarding-progress' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT e.name, e.email, e.title, e.department, e.start_date, e.region,
          COUNT(DISTINCT CASE WHEN cc.status = 'completed' THEN cc.course_id END) as completed_courses,
          COUNT(DISTINCT CASE WHEN cc.status = 'in_progress' THEN cc.course_id END) as in_progress_courses,
          COUNT(DISTINCT sa.skill_id) as skills_assessed
        FROM employees e
        LEFT JOIN course_completions cc ON e.email = cc.user_email
        LEFT JOIN skill_assessments sa ON e.email = sa.user_email
        WHERE e.start_date IS NOT NULL AND e.start_date != '' AND e.start_date >= date('now', '-90 days')
        GROUP BY e.id
        ORDER BY e.start_date DESC`
      ).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // Headcount
    if (pathname === '/api/reports/headcount' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT 
          COALESCE(region, 'Unknown') as region,
          COALESCE(department, 'Unknown') as department,
          COUNT(*) as count
        FROM employees
        GROUP BY region, department
        ORDER BY region, department`
      ).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // Skills Gap Summary
    if (pathname === '/api/reports/skills-gap-summary' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT sc.name as category_name, s.name as skill_name,
          COUNT(CASE WHEN sa.level = 1 THEN 1 END) as level_1,
          COUNT(CASE WHEN sa.level = 2 THEN 1 END) as level_2,
          COUNT(CASE WHEN sa.level = 3 THEN 1 END) as level_3,
          COUNT(CASE WHEN sa.level = 4 THEN 1 END) as level_4,
          COUNT(CASE WHEN sa.level = 5 THEN 1 END) as level_5,
          ROUND(AVG(sa.level), 1) as avg_level,
          COUNT(sa.id) as total_assessed
        FROM skills s
        JOIN skill_categories sc ON s.category_id = sc.id
        LEFT JOIN skill_assessments sa ON s.id = sa.skill_id
        GROUP BY s.id
        ORDER BY sc.sort_order, s.sort_order`
      ).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // ======== AI CURRICULUM ANALYZER ========
    if (pathname === '/api/ai/analyze-curriculum' && request.method === 'POST') {
      try {
        // 1. Gather all data the AI needs
        const [skillsResult, coursesResult, assessmentsResult, categoriesResult] = await Promise.all([
          env.DB.prepare('SELECT s.*, sc.name as category_name FROM skills s JOIN skill_categories sc ON s.category_id = sc.id ORDER BY sc.sort_order, s.sort_order').all(),
          env.DB.prepare('SELECT uc.*, s.name as skill_name, sc.name as category_name FROM university_courses uc JOIN skills s ON uc.skill_id = s.id JOIN skill_categories sc ON s.category_id = sc.id').all(),
          env.DB.prepare(`SELECT s.name as skill_name, sc.name as category_name,
            COUNT(sa.id) as total_assessed,
            ROUND(AVG(sa.level), 1) as avg_level,
            COUNT(CASE WHEN sa.level <= 2 THEN 1 END) as below_level_3
            FROM skills s
            JOIN skill_categories sc ON s.category_id = sc.id
            LEFT JOIN skill_assessments sa ON s.id = sa.skill_id
            GROUP BY s.id ORDER BY sc.sort_order, s.sort_order`).all(),
          env.DB.prepare('SELECT * FROM skill_categories ORDER BY sort_order').all(),
        ]);

        const skills = skillsResult.results || [];
        const courses = coursesResult.results || [];
        const assessments = assessmentsResult.results || [];
        const categories = categoriesResult.results || [];

        // Build summary for the AI
        const skillSummary = assessments.map((a: any) =>
          `- ${a.skill_name} (${a.category_name}): avg level ${a.avg_level || 'N/A'}, ${a.total_assessed} assessed, ${a.below_level_3} below level 3`
        ).join('\n');

        const courseSummary = courses.map((c: any) =>
          `- "${c.title}" [${c.difficulty}] for ${c.skill_name} (levels ${c.min_level}-${c.max_level})${c.provider ? `, provider: ${c.provider}` : ''}`
        ).join('\n');

        const categoryList = categories.map((c: any) => c.name).join(', ');

        const skillsWithNoCourses = skills.filter((s: any) =>
          !courses.some((c: any) => c.skill_id === s.id)
        ).map((s: any) => `${s.name} (${s.category_name})`);

        const highGapSkills = assessments.filter((a: any) =>
          a.avg_level && a.avg_level < 2.5 && a.total_assessed > 0
        ).map((a: any) => `${a.skill_name} (avg: ${a.avg_level})`);

        const prompt = `You are a curriculum advisor for a Cloudflare Solutions Engineering team. Analyze the current course library and team skill data, then provide recommendations.

## Current Skill Categories
${categoryList}

## Team Skill Assessment Summary
${skillSummary || 'No assessments completed yet.'}

## Current Course Library (${courses.length} courses)
${courseSummary || 'No courses in library yet.'}

## Skills With No Courses
${skillsWithNoCourses.length > 0 ? skillsWithNoCourses.join(', ') : 'All skills have at least one course.'}

## Highest Gap Skills (avg < 2.5)
${highGapSkills.length > 0 ? highGapSkills.join(', ') : 'No significant gaps detected.'}

Based on this data, provide your analysis in the following JSON structure. Be specific and actionable. For suggested courses, use real Cloudflare developer docs URLs (developers.cloudflare.com) and real training resources where possible.

{
  "gap_analysis": {
    "summary": "1-2 sentence overall assessment",
    "uncovered_skills": ["list of skills that have no courses or insufficient courses"],
    "critical_gaps": ["skills where team avg is low AND course coverage is weak"],
    "over_covered": ["skills that have many courses but team is already proficient"]
  },
  "suggested_courses": [
    {
      "title": "Course title",
      "description": "What the SE will learn",
      "url": "https://developers.cloudflare.com/... or other real URL",
      "provider": "Cloudflare Docs / Cloudflare TV / Cloudflare Blog",
      "duration": "estimated time",
      "difficulty": "beginner|intermediate|advanced|expert",
      "target_skill": "skill name this maps to",
      "min_level": 1,
      "max_level": 3,
      "reason": "Why this course is needed"
    }
  ],
  "curriculum_optimization": {
    "priority_order": ["Ordered list of skill categories by training urgency"],
    "recommendations": ["3-5 actionable recommendations for improving the curriculum"]
  }
}

Return ONLY valid JSON, no markdown fences or extra text.`;

        const aiResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            { role: 'system', content: 'You are a curriculum planning expert. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2048,
          temperature: 0.3,
        });

        let analysis;
        try {
          // Try to parse the AI response as JSON
          let responseText = aiResponse.response || '';
          // Strip markdown code fences if present
          responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          analysis = JSON.parse(responseText);
        } catch (parseErr) {
          // If JSON parsing fails, return the raw text as a fallback
          analysis = {
            raw_response: aiResponse.response,
            parse_error: 'AI response was not valid JSON. Showing raw analysis.',
            gap_analysis: { summary: aiResponse.response, uncovered_skills: [], critical_gaps: [], over_covered: [] },
            suggested_courses: [],
            curriculum_optimization: { priority_order: [], recommendations: [] },
          };
        }

        return new Response(JSON.stringify({
          success: true,
          analysis,
          metadata: {
            total_skills: skills.length,
            total_courses: courses.length,
            total_categories: categories.length,
            skills_with_no_courses: skillsWithNoCourses.length,
            high_gap_skills: highGapSkills.length,
            analyzed_at: new Date().toISOString(),
          }
        }), { headers: corsHeaders });

      } catch (error: any) {
        console.error('AI curriculum analysis error:', error);
        return new Response(JSON.stringify({ error: 'AI analysis failed', details: error.message }), {
          status: 500, headers: corsHeaders
        });
      }
    }

    // ── Error Logs ──

    if (pathname === '/api/error-logs' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(
        `INSERT INTO error_logs (user_email, user_name, error_type, error_message, error_context, stack_trace) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        data.user_email || null,
        data.user_name || null,
        data.error_type || 'unknown',
        data.error_message || '',
        data.error_context || null,
        data.stack_trace || null,
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname === '/api/error-logs' && request.method === 'GET') {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const resolved = url.searchParams.get('resolved');
      let query = 'SELECT * FROM error_logs';
      const params: any[] = [];
      if (resolved !== null && resolved !== '') {
        query += ' WHERE resolved = ?';
        params.push(parseInt(resolved, 10));
      }
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      const stmt = env.DB.prepare(query);
      const { results } = await (params.length === 2 ? stmt.bind(params[0], params[1]) : stmt.bind(params[0])).all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/error-logs/') && pathname.endsWith('/resolve') && request.method === 'POST') {
      const id = pathname.replace('/api/error-logs/', '').replace('/resolve', '');
      await env.DB.prepare('UPDATE error_logs SET resolved = 1 WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Page Views (tab visit tracking) ──

    if (pathname === '/api/page-views' && request.method === 'POST') {
      const data = await request.json() as any;
      await env.DB.prepare(
        `INSERT INTO page_views (user_email, user_name, page_path, page_label) VALUES (?, ?, ?, ?)`
      ).bind(
        data.user_email || null,
        data.user_name || null,
        data.page_path,
        data.page_label || null,
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname === '/api/page-views/stats' && request.method === 'GET') {
      const url = new URL(request.url);
      const days = parseInt(url.searchParams.get('days') || '30', 10);
      const since = new Date(Date.now() - days * 86400000).toISOString();

      // Most visited tabs overall
      const { results: byPage } = await env.DB.prepare(
        `SELECT page_path, page_label,
                COUNT(*) as view_count,
                COUNT(DISTINCT user_email) as unique_users
         FROM page_views
         WHERE viewed_at >= ?
         GROUP BY page_path
         ORDER BY view_count DESC`
      ).bind(since).all();

      // Views per user (top users)
      const { results: byUser } = await env.DB.prepare(
        `SELECT user_email, user_name, COUNT(*) as view_count
         FROM page_views
         WHERE viewed_at >= ? AND user_email IS NOT NULL
         GROUP BY user_email
         ORDER BY view_count DESC
         LIMIT 20`
      ).bind(since).all();

      // Daily trend
      const { results: daily } = await env.DB.prepare(
        `SELECT DATE(viewed_at) as date, page_path, COUNT(*) as view_count
         FROM page_views
         WHERE viewed_at >= ?
         GROUP BY DATE(viewed_at), page_path
         ORDER BY date DESC`
      ).bind(since).all();

      // Total views
      const totalRow = await env.DB.prepare(
        `SELECT COUNT(*) as total FROM page_views WHERE viewed_at >= ?`
      ).bind(since).first() as any;

      return new Response(JSON.stringify({
        period_days: days,
        total_views: totalRow?.total || 0,
        by_page: byPage,
        by_user: byUser,
        daily_trend: daily,
      }), { headers: corsHeaders });
    }

    // Per-user page view stats
    if (pathname.startsWith('/api/page-views/user/') && request.method === 'GET') {
      const encodedEmail = pathname.replace('/api/page-views/user/', '');
      const email = decodeURIComponent(encodedEmail);
      const url = new URL(request.url);
      const days = parseInt(url.searchParams.get('days') || '30', 10);
      const since = new Date(Date.now() - days * 86400000).toISOString();

      // Tabs this user visits most
      const { results: byPage } = await env.DB.prepare(
        `SELECT page_path, page_label, COUNT(*) as view_count,
                MIN(viewed_at) as first_visit, MAX(viewed_at) as last_visit
         FROM page_views
         WHERE user_email = ? AND viewed_at >= ?
         GROUP BY page_path
         ORDER BY view_count DESC`
      ).bind(email, since).all();

      // Daily activity for this user
      const { results: daily } = await env.DB.prepare(
        `SELECT DATE(viewed_at) as date, COUNT(*) as view_count
         FROM page_views
         WHERE user_email = ? AND viewed_at >= ?
         GROUP BY DATE(viewed_at)
         ORDER BY date DESC`
      ).bind(email, since).all();

      // Total views
      const totalRow = await env.DB.prepare(
        `SELECT COUNT(*) as total FROM page_views WHERE user_email = ? AND viewed_at >= ?`
      ).bind(email, since).first() as any;

      // Recent activity (last 20 views)
      const { results: recent } = await env.DB.prepare(
        `SELECT page_path, page_label, viewed_at
         FROM page_views
         WHERE user_email = ?
         ORDER BY viewed_at DESC
         LIMIT 20`
      ).bind(email).all();

      return new Response(JSON.stringify({
        user_email: email,
        period_days: days,
        total_views: totalRow?.total || 0,
        by_page: byPage,
        daily,
        recent,
      }), { headers: corsHeaders });
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
