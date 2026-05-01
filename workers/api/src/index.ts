export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: any; // Cloudflare Workers AI binding
  VECTORIZE: VectorizeIndex; // Cloudflare Vectorize binding (cloudflare-docs index)
  VIDEO_VECTORIZE: VectorizeIndex; // Cloudflare Vectorize binding for video transcripts (seportal-videos index)
  // Stream/API config
  CLOUDFLARE_ACCOUNT_ID?: string; // Public account id (set via wrangler [vars])
  STREAM_API_TOKEN?: string; // Secret: `wrangler secret put STREAM_API_TOKEN`
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

// =============================================================================
// LEARNING HUB — Video upload, transcription (Stream + Whisper), vectorization
// =============================================================================

const STREAM_API_BASE = 'https://api.cloudflare.com/client/v4';

interface StreamVideoDetails {
  uid: string;
  readyToStream: boolean;
  status?: { state: string; pctComplete?: string; errorReasonCode?: string };
  duration?: number;
  thumbnail?: string;
  playback?: { hls?: string; dash?: string };
  meta?: Record<string, string>;
}

interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

/**
 * Cloudflare Stream: Request a one-time direct-upload URL that the browser can POST a file to.
 * Returns `{ uid, uploadURL }` where `uid` becomes the permanent Stream video identifier.
 *
 * Docs: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
 */
async function streamCreateDirectUpload(
  env: Env,
  params: { maxDurationSeconds: number; name: string; creator?: string; meta?: Record<string, string> }
): Promise<{ uid: string; uploadURL: string }> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.STREAM_API_TOKEN) {
    throw new Error('Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID and STREAM_API_TOKEN.');
  }
  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STREAM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: params.maxDurationSeconds,
        creator: params.creator,
        meta: { name: params.name, ...(params.meta || {}) },
      }),
    }
  );
  const data = await res.json() as any;
  if (!data.success) {
    throw new Error(`Stream direct_upload failed: ${JSON.stringify(data.errors)}`);
  }
  return { uid: data.result.uid, uploadURL: data.result.uploadURL };
}

/**
 * Cloudflare Stream: Create a tus-resumable upload session.
 * Returns `{ uid, uploadURL }` where `uploadURL` is a tus endpoint the client can PATCH
 * chunks to with tus-js-client. Resumable + resilient to network drops — required for
 * files >~200MB or flaky connections.
 *
 * Docs: https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/
 */
async function streamCreateTusUpload(
  env: Env,
  params: {
    uploadLength: number;
    maxDurationSeconds: number;
    name: string;
    creator?: string;
    meta?: Record<string, string>;
  }
): Promise<{ uid: string; uploadURL: string }> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.STREAM_API_TOKEN) {
    throw new Error('Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID and STREAM_API_TOKEN.');
  }
  // tus Upload-Metadata format: space-separated "key base64value" pairs.
  const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
  const metadataPairs: string[] = [
    `name ${b64(params.name)}`,
    `maxdurationseconds ${b64(String(params.maxDurationSeconds))}`,
  ];
  if (params.creator) metadataPairs.push(`creator ${b64(params.creator)}`);
  // Merge caller-supplied meta (e.g., our internal video_id) so we can find it back later
  for (const [k, v] of Object.entries(params.meta || {})) {
    metadataPairs.push(`${k} ${b64(v)}`);
  }

  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STREAM_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(params.uploadLength),
        'Upload-Metadata': metadataPairs.join(','),
      },
    }
  );
  if (!res.ok && res.status !== 201) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Stream tus create failed: ${res.status} ${errText.slice(0, 200)}`);
  }
  const uid = res.headers.get('stream-media-id') || '';
  const uploadURL = res.headers.get('location') || '';
  if (!uid || !uploadURL) {
    throw new Error(`Stream tus create: missing response headers (uid=${!!uid}, location=${!!uploadURL})`);
  }
  return { uid, uploadURL };
}

async function streamGetVideo(env: Env, uid: string): Promise<StreamVideoDetails | null> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.STREAM_API_TOKEN) return null;
  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    { headers: { Authorization: `Bearer ${env.STREAM_API_TOKEN}` } }
  );
  const data = await res.json() as any;
  if (!data.success) return null;
  return data.result as StreamVideoDetails;
}

async function streamDeleteVideo(env: Env, uid: string): Promise<boolean> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.STREAM_API_TOKEN) return false;
  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${env.STREAM_API_TOKEN}` } }
  );
  return res.ok;
}

/**
 * Trigger Cloudflare Stream's built-in auto-caption generation (runs Whisper server-side).
 * Idempotent: if a caption already exists for this language, treat that as success
 * (this happens when our pipeline gets restarted after the original generation call
 * already succeeded but a later step died).
 * Docs: https://developers.cloudflare.com/stream/edit-videos/adding-captions/
 */
async function streamGenerateCaptions(env: Env, uid: string, lang = 'en'): Promise<boolean> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.STREAM_API_TOKEN) return false;
  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}/captions/${lang}/generate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STREAM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (res.ok) return true;
  // Parse body to check for the "already exists" case
  try {
    const data = await res.json() as any;
    const msg = JSON.stringify(data).toLowerCase();
    if (msg.includes('existing caption') || msg.includes('already')) {
      console.log(`[streamGenerateCaptions ${uid}] caption already exists, continuing`);
      return true;
    }
    console.error(`[streamGenerateCaptions ${uid}] failed:`, data);
  } catch {}
  return false;
}

async function streamGetCaptionsVTT(env: Env, uid: string, lang = 'en'): Promise<string | null> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.STREAM_API_TOKEN) return null;
  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}/captions/${lang}/vtt`,
    { headers: { Authorization: `Bearer ${env.STREAM_API_TOKEN}` } }
  );
  if (!res.ok) return null;
  return res.text();
}

/**
 * Parse WebVTT text into structured cues with timestamps.
 * Handles both "HH:MM:SS.mmm" and "MM:SS.mmm" formats.
 */
function parseVTT(vtt: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  const parseTime = (s: string): number => {
    const parts = s.trim().split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(s) || 0;
  };
  const lines = vtt.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    // Cue timing line looks like: "00:00:05.000 --> 00:00:09.500" with optional settings after
    const m = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?\.\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?\.\d{1,3})/);
    if (m) {
      const start = parseTime(m[1]);
      const end = parseTime(m[2]);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        // Strip simple VTT formatting tags like <v Speaker> and <c.color>
        textLines.push(lines[i].replace(/<[^>]+>/g, '').trim());
        i++;
      }
      const text = textLines.join(' ').trim();
      if (text) cues.push({ start, end, text });
    }
    i++;
  }
  return cues;
}

/**
 * Group caption cues into ~30-second windows suitable for embedding.
 * Each window is a paragraph-sized chunk that preserves rough timestamp context.
 */
function groupCaptionCuesIntoChunks(cues: CaptionCue[], windowSeconds = 30): Array<{ text: string; start: number; end: number }> {
  if (cues.length === 0) return [];
  const chunks: Array<{ text: string; start: number; end: number }> = [];
  let windowStart = cues[0].start;
  let windowEnd = windowStart + windowSeconds;
  let buf: string[] = [];
  let bufStart = cues[0].start;
  let bufEnd = cues[0].end;

  for (const cue of cues) {
    if (cue.start >= windowEnd && buf.length > 0) {
      chunks.push({ text: buf.join(' '), start: bufStart, end: bufEnd });
      buf = [];
      windowStart = cue.start;
      windowEnd = windowStart + windowSeconds;
      bufStart = cue.start;
    }
    if (buf.length === 0) bufStart = cue.start;
    buf.push(cue.text);
    bufEnd = cue.end;
  }
  if (buf.length > 0) chunks.push({ text: buf.join(' '), start: bufStart, end: bufEnd });
  return chunks;
}

/**
 * Fallback chunker when we only have plain transcript text (no timestamps).
 * Produces ~800-char chunks with 100-char overlap.
 */
function chunkText(text: string, size = 800, overlap = 100): Array<{ text: string; start: number; end: number }> {
  const chunks: Array<{ text: string; start: number; end: number }> = [];
  if (!text) return chunks;
  let offset = 0;
  let idx = 0;
  while (offset < text.length) {
    const end = Math.min(offset + size, text.length);
    const slice = text.slice(offset, end);
    chunks.push({ text: slice, start: idx, end: idx });
    offset = end - overlap;
    if (offset < 0) offset = 0;
    idx++;
    if (end === text.length) break;
  }
  return chunks;
}

/**
 * End-to-end background processor for a single video.
 *
 * Progress is reported to the `videos` D1 row as (progress 0-100, stage label)
 * at every transition so the UI can render a live progress bar:
 *
 *   Stages (approximate % of total):
 *     - "Transcoding video"           0-25%  (Stream returns pctComplete, we scale)
 *     - "Generating AI captions"      25-50% (Whisper on Stream's side — no % available, ticks slowly)
 *     - "Indexing transcript"         50-95% (embedding & upserting chunks — exact % from chunks_done)
 *     - "Finalizing"                  95-99%
 *     - completed                     100%
 *
 * Runs entirely within the Worker's ctx.waitUntil so the upload API returns immediately.
 */
export async function processVideoBackground(videoId: string, env: Env): Promise<void> {
  const log = (msg: string) => console.log(`[processVideo ${videoId}] ${msg}`);

  // Helper: write progress + stage to D1 (swallow errors — progress is nice-to-have)
  const setProgress = async (progress: number, stage: string) => {
    try {
      await env.DB.prepare(
        `UPDATE videos SET transcription_progress=?, transcription_stage=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
      ).bind(Math.max(0, Math.min(100, Math.round(progress))), stage, videoId).run();
    } catch (e) { /* best-effort */ }
  };

  const fail = async (reason: string) => {
    log(`FAILED: ${reason}`);
    try {
      // Increment retry_count and stamp last_retry_at so the auto-resume job can
      // compute exponential backoff before the next attempt.
      await env.DB.prepare(
        `UPDATE videos
         SET transcription_status=?,
             transcription_stage=?,
             transcription_error=?,
             retry_count = COALESCE(retry_count, 0) + 1,
             last_retry_at = ?,
             updated_at=CURRENT_TIMESTAMP
         WHERE id=?`
      ).bind('failed', 'Failed', reason, new Date().toISOString(), videoId).run();
    } catch (e) { console.error('Failed to update video status:', e); }
  };

  try {
    const video = await env.DB.prepare('SELECT * FROM videos WHERE id=?').bind(videoId).first() as any;
    if (!video) return fail('video row not found');
    if (!video.stream_uid) return fail('missing stream_uid');

    await env.DB.prepare(
      'UPDATE videos SET transcription_status=?, transcription_error=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind('processing', videoId).run();
    await setProgress(1, 'Starting');

    // ---- Stage 1: Wait for Stream to finish transcoding (0-25%) ----
    const MAX_POLLS = 90;
    const POLL_INTERVAL_MS = 10_000;
    let streamVideo: StreamVideoDetails | null = null;
    for (let i = 0; i < MAX_POLLS; i++) {
      streamVideo = await streamGetVideo(env, video.stream_uid);
      if (!streamVideo) { await sleep(POLL_INTERVAL_MS); continue; }
      if (streamVideo.status?.state === 'error') return fail(`Stream transcoding error: ${streamVideo.status?.errorReasonCode || 'unknown'}`);
      if (streamVideo.readyToStream) break;

      // Stream gives us pctComplete as a string like "45" — map to 0-25% of overall
      const streamPct = Number(streamVideo.status?.pctComplete) || 0;
      await setProgress(1 + (streamPct * 0.24), `Transcoding video (${streamPct}%)`);
      log(`Transcoding: ${streamVideo.status?.pctComplete || '?'}% (state=${streamVideo.status?.state})`);
      await sleep(POLL_INTERVAL_MS);
    }
    if (!streamVideo?.readyToStream) return fail('timed out waiting for Stream to finish transcoding');

    await setProgress(25, 'Video ready, preparing captions');

    // Save Stream metadata to D1
    await env.DB.prepare(
      `UPDATE videos SET duration_seconds=?, thumbnail_url=?, playback_url=?, dash_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(
      streamVideo.duration || 0,
      streamVideo.thumbnail || null,
      streamVideo.playback?.hls || null,
      streamVideo.playback?.dash || null,
      videoId
    ).run();

    // ---- Stage 2: Trigger AI caption generation + poll for VTT (25-50%) ----
    // If we're resuming a task where captions were already generated (but a later step
    // died), the VTT is already available — fetch it and skip straight to parsing.
    let vtt: string | null = await streamGetCaptionsVTT(env, video.stream_uid, 'en');

    if (!vtt || !vtt.trim().startsWith('WEBVTT')) {
      log('Triggering Stream auto-captions');
      await setProgress(27, 'Generating AI captions');
      const captionOk = await streamGenerateCaptions(env, video.stream_uid, 'en');
      if (!captionOk) return fail('failed to trigger auto-caption generation');

      // Poll for captions VTT (up to ~10 min). Stream doesn't expose a progress %,
      // so we tick from 27% → ~49% linearly over the polling window to signal aliveness.
      const MAX_CAPTION_POLLS = 60;
      for (let i = 0; i < MAX_CAPTION_POLLS; i++) {
        vtt = await streamGetCaptionsVTT(env, video.stream_uid, 'en');
        if (vtt && vtt.trim().startsWith('WEBVTT')) break;
        const pct = 27 + Math.min(22, (i / MAX_CAPTION_POLLS) * 22);
        await setProgress(pct, `Generating AI captions`);
        log(`Waiting for captions (attempt ${i + 1}/${MAX_CAPTION_POLLS})`);
        await sleep(10_000);
      }
      if (!vtt) return fail('timed out waiting for captions');
    } else {
      log('Captions already generated, skipping generation step');
      await setProgress(49, 'Captions ready, parsing');
    }

    await setProgress(50, 'Parsing transcript');

    // ---- Stage 3: Parse + store transcript ----
    const cues = parseVTT(vtt);
    if (cues.length === 0) return fail('captions are empty');
    const fullTranscript = cues.map(c => c.text).join(' ');
    const chunks = groupCaptionCuesIntoChunks(cues, 30);
    log(`Transcript: ${fullTranscript.length} chars, ${cues.length} cues, ${chunks.length} chunks`);

    await env.DB.prepare(
      `UPDATE videos SET transcript=?, transcript_vtt=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(fullTranscript, vtt, videoId).run();

    // ---- Stage 4: Embed chunks + upsert to VIDEO_VECTORIZE (50-95%) ----
    await setProgress(52, `Indexing transcript (0 of ${chunks.length} chunks)`);
    const BATCH = 10;
    let totalIndexed = 0;
    for (let b = 0; b < chunks.length; b += BATCH) {
      const batch = chunks.slice(b, b + BATCH);
      const vectors: Array<{ id: string; values: number[]; metadata: Record<string, any> }> = [];
      for (let k = 0; k < batch.length; k++) {
        const chunk = batch[k];
        const chunkIndex = b + k;
        try {
          const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: chunk.text });
          const vectorId = `v-${videoId}-${chunkIndex}`;
          vectors.push({
            id: vectorId,
            values: emb.data[0],
            metadata: {
              video_id: videoId,
              chunk_index: chunkIndex,
              start_seconds: chunk.start,
              end_seconds: chunk.end,
              title: video.title,
              category: video.category || '',
              snippet: chunk.text.substring(0, 500),
            },
          });
          await env.DB.prepare(
            `INSERT OR REPLACE INTO video_vectors (vector_id, video_id, chunk_index, chunk_text, start_seconds, end_seconds)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(vectorId, videoId, chunkIndex, chunk.text, chunk.start, chunk.end).run();
        } catch (err) {
          console.error(`[processVideo ${videoId}] embed chunk ${chunkIndex} failed`, err);
        }
      }
      if (vectors.length > 0) {
        await env.VIDEO_VECTORIZE.upsert(vectors);
        totalIndexed += vectors.length;
      }
      const chunksDone = Math.min(b + batch.length, chunks.length);
      const embedPct = 52 + (chunksDone / chunks.length) * 43; // 52 → 95
      await setProgress(embedPct, `Indexing transcript (${chunksDone} of ${chunks.length} chunks)`);
    }

    // ---- Stage 5: Finalize ----
    // Reset retry_count on success so a future legitimate failure doesn't inherit
    // backoff delay from old attempts.
    await setProgress(98, 'Finalizing');
    await env.DB.prepare(
      `UPDATE videos
       SET transcription_status=?,
           transcription_progress=100,
           transcription_stage=?,
           retry_count=0,
           transcription_error=NULL,
           updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).bind('completed', 'Completed', videoId).run();
    log(`Completed: indexed ${totalIndexed} vectors`);
  } catch (err: any) {
    await fail(err?.message || String(err));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTs(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Deletes a video everywhere: Stream, Vectorize, and D1.
 */
async function deleteVideoEverywhere(videoId: string, env: Env): Promise<void> {
  const video = await env.DB.prepare('SELECT stream_uid FROM videos WHERE id=?').bind(videoId).first() as any;
  // Delete Vectorize vectors
  try {
    const { results: vecRows } = await env.DB.prepare('SELECT vector_id FROM video_vectors WHERE video_id=?').bind(videoId).all();
    const vecIds = (vecRows || []).map((r: any) => r.vector_id);
    if (vecIds.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < vecIds.length; i += BATCH) {
        await env.VIDEO_VECTORIZE.deleteByIds(vecIds.slice(i, i + BATCH));
      }
    }
  } catch (e) { console.error('Failed to delete video vectors:', e); }
  // Delete Stream
  if (video?.stream_uid) {
    try { await streamDeleteVideo(env, video.stream_uid); } catch (e) { console.error('Failed to delete Stream video:', e); }
  }
  // Delete D1 rows
  await env.DB.prepare('DELETE FROM video_vectors WHERE video_id=?').bind(videoId).run();
  await env.DB.prepare('DELETE FROM video_views WHERE video_id=?').bind(videoId).run();
  await env.DB.prepare('DELETE FROM videos WHERE id=?').bind(videoId).run();
}

// ──────────────────────────────────────────────────────────────────────────────
// Content changelog — every successful create/update/delete on a tracked
// resource (assets, scripts, ai_solutions) writes one row here. The bell
// icon, dashboard "What's New" card, and per-item "Updated" pills all read
// from this table. Self-edits are filtered at query time, so logging is
// fire-and-forget; failures are swallowed so a logging hiccup never blocks
// the user's actual write.
// ──────────────────────────────────────────────────────────────────────────────
type ContentType = 'asset' | 'script' | 'ai_solution';
type ChangeType = 'created' | 'updated' | 'deleted';

async function logContentChange(env: Env, params: {
  type: ContentType;
  id: string;
  title?: string | null;
  subtype?: string | null;          // 'tool' | 'gem' | 'prompt' | 'skill' | 'workflow' | 'agent' | etc.
  path?: string | null;             // route path the bell should navigate to
  changeType: ChangeType;
  byEmail?: string | null;
  byName?: string | null;
  summary?: string | null;
}) {
  // Default route by content type
  const path = params.path ?? (
    params.type === 'asset' ? '/assets' :
    params.type === 'script' ? '/scripts' :
    params.type === 'ai_solution' ? '/ai-hub' :
    '/'
  );
  try {
    await env.DB.prepare(
      `INSERT INTO content_changelog
       (content_type, content_id, content_title, content_subtype, content_path,
        change_type, changed_by_email, changed_by_name, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      params.type,
      params.id,
      params.title ?? null,
      params.subtype ?? null,
      path,
      params.changeType,
      params.byEmail ?? null,
      params.byName ?? null,
      params.summary ?? null,
    ).run();
  } catch (e) {
    console.error('logContentChange failed:', e);
  }
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
        return handleAPI(request, env, url.pathname, ctx);
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

async function handleAPI(request: Request, env: Env, pathname: string, ctx?: ExecutionContext): Promise<Response> {
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
      await logContentChange(env, {
        type: 'asset', id: data.id, title: data.title, subtype: 'url',
        changeType: 'created',
        byEmail: data.editor_email || data.owner || null,
        byName: data.editor_name || null,
      });
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
      await logContentChange(env, {
        type: 'asset', id: id || '', title: data.title, subtype: 'url',
        changeType: 'updated',
        byEmail: data.editor_email || data.owner || null,
        byName: data.editor_name || null,
      });
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
      // Look up the title before delete so the changelog has something to display.
      const before = await env.DB.prepare('SELECT title FROM url_assets WHERE id=?').bind(id).first() as any;
      await env.DB.prepare('DELETE FROM url_assets WHERE id=?').bind(id).run();
      const editorEmail = url.searchParams.get('editor_email');
      const editorName = url.searchParams.get('editor_name');
      await logContentChange(env, {
        type: 'asset', id: id || '', title: before?.title, subtype: 'url',
        changeType: 'deleted',
        byEmail: editorEmail, byName: editorName,
      });
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
        await logContentChange(env, {
          type: 'asset', id: metadata.id, title: metadata.name, subtype: 'file',
          changeType: 'created',
          byEmail: metadata.editor_email || metadata.owner || null,
          byName: metadata.editor_name || null,
        });

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
      await logContentChange(env, {
        type: 'asset', id: data.id, title: data.name, subtype: 'file',
        changeType: 'created',
        byEmail: data.editor_email || data.owner || null,
        byName: data.editor_name || null,
      });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/file-assets/') && request.method === 'PUT') {
      const id = pathname.split('/').pop();
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE file_assets SET name=?, category=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).bind(data.name, data.category, data.description || '', id).run();
      await logContentChange(env, {
        type: 'asset', id: id || '', title: data.name, subtype: 'file',
        changeType: 'updated',
        byEmail: data.editor_email || null,
        byName: data.editor_name || null,
      });
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

      // Get file metadata to delete from R2 + capture title for changelog
      const { results } = await env.DB.prepare('SELECT file_key, name FROM file_assets WHERE id=?').bind(id).all();

      let titleSnapshot: string | null = null;
      if (results.length > 0) {
        const fileAsset = results[0] as any;
        titleSnapshot = fileAsset.name || null;
        if (fileAsset.file_key) {
          // Delete from R2
          await env.R2.delete(fileAsset.file_key);
        }
      }

      // Delete from database
      await env.DB.prepare('DELETE FROM file_assets WHERE id=?').bind(id).run();
      await logContentChange(env, {
        type: 'asset', id: id || '', title: titleSnapshot, subtype: 'file',
        changeType: 'deleted',
        byEmail: url.searchParams.get('editor_email'),
        byName: url.searchParams.get('editor_name'),
      });
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
      await logContentChange(env, {
        type: 'script', id: data.id, title: data.name, subtype: data.language,
        changeType: 'created',
        byEmail: data.editor_email || data.author || null,
        byName: data.editor_name || null,
      });
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
      const before = await env.DB.prepare('SELECT name, language FROM scripts WHERE id=?').bind(id).first() as any;
      await env.DB.prepare('DELETE FROM scripts WHERE id=?').bind(id).run();
      await logContentChange(env, {
        type: 'script', id: id || '', title: before?.name, subtype: before?.language,
        changeType: 'deleted',
        byEmail: url.searchParams.get('editor_email'),
        byName: url.searchParams.get('editor_name'),
      });
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

    // --- Polls (DEPRECATED, replaced by Learning Hub) ---
    // Polls endpoints return empty/no-op responses so any stale client won't break.
    // The polls + poll_votes tables are dropped via migrations/archive_and_remove_polls.sql
    if (pathname === '/api/polls' && request.method === 'GET') {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }
    if (pathname === '/api/polls/user-votes' && request.method === 'POST') {
      return new Response(JSON.stringify({}), { headers: corsHeaders });
    }
    if (pathname.startsWith('/api/polls') && (request.method === 'POST' || request.method === 'DELETE')) {
      return new Response(
        JSON.stringify({ error: 'Polls have been retired. See the Learning Hub for team knowledge sharing.' }),
        { status: 410, headers: corsHeaders }
      );
    }

    // Admin - Archive polls to R2 before dropping the tables.
    // One-time export: dumps every poll + vote as JSON to R2 under archives/polls-<timestamp>.json
    if (pathname === '/api/admin/archive-polls' && (request.method === 'GET' || request.method === 'POST')) {
      try {
        let polls: any[] = [];
        let pollVotes: any[] = [];
        try {
          const pollsRes = await env.DB.prepare('SELECT * FROM polls ORDER BY created_at DESC').all();
          polls = (pollsRes.results || []).map((p: any) => ({
            ...p,
            options: (() => { try { return JSON.parse(p.options || '[]'); } catch { return p.options; } })(),
            target_groups: (() => { try { return JSON.parse(p.target_groups || '[]'); } catch { return p.target_groups; } })(),
          }));
        } catch (e) {
          // Table may already be dropped
          console.log('polls table not found - may already be archived/dropped');
        }
        try {
          const votesRes = await env.DB.prepare('SELECT * FROM poll_votes').all();
          pollVotes = votesRes.results || [];
        } catch (e) {
          console.log('poll_votes table not found - may already be archived/dropped');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveKey = `archives/polls-${timestamp}.json`;
        const archive = {
          archived_at: new Date().toISOString(),
          reason: 'Polls tab retired; replaced by Learning Hub (video/training library).',
          poll_count: polls.length,
          vote_count: pollVotes.length,
          polls,
          poll_votes: pollVotes,
        };
        await env.R2.put(archiveKey, JSON.stringify(archive, null, 2), {
          httpMetadata: { contentType: 'application/json' },
        });

        return new Response(JSON.stringify({
          success: true,
          archive_key: archiveKey,
          poll_count: polls.length,
          vote_count: pollVotes.length,
          message: `Archived ${polls.length} polls and ${pollVotes.length} votes to R2: ${archiveKey}. Next step: run migrations/archive_and_remove_polls.sql to drop the tables.`,
        }), { headers: corsHeaders });
      } catch (error: any) {
        return new Response(JSON.stringify({
          error: 'Archive failed',
          details: error.message,
        }), { status: 500, headers: corsHeaders });
      }
    }

    // Admin - Download polls archive JSON (for historical reference)
    if (pathname === '/api/admin/archive-polls/download' && request.method === 'GET') {
      try {
        const list = await env.R2.list({ prefix: 'archives/polls-', limit: 100 });
        const latest = list.objects.sort((a, b) => b.key.localeCompare(a.key))[0];
        if (!latest) {
          return new Response(JSON.stringify({ error: 'No polls archive found' }), { status: 404, headers: corsHeaders });
        }
        const obj = await env.R2.get(latest.key);
        if (!obj) {
          return new Response(JSON.stringify({ error: 'Archive object missing' }), { status: 404, headers: corsHeaders });
        }
        return new Response(obj.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${latest.key.split('/').pop()}"`,
          },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================================
    // GENERIC R2 MULTIPART UPLOAD ENDPOINTS
    //
    // Four-endpoint protocol for uploading arbitrarily large files to R2 through
    // the Worker (bypassing the 100MB request-body limit on single-request uploads):
    //
    //   1. POST /api/uploads/multipart/create   -> returns {uploadId, key, partSize}
    //   2. PUT  /api/uploads/multipart/part     -> upload a single chunk (~10MB each)
    //   3. POST /api/uploads/multipart/complete -> finalize; committed to R2
    //   4. POST /api/uploads/multipart/abort    -> cancel and clean up
    //
    // The key is generated server-side (caller supplies a "prefix" like `files/` or
    // `assets/`) so clients cannot overwrite arbitrary R2 objects. Each chunk is
    // individually retryable, which makes GB-scale uploads resilient to network
    // interruptions over corporate proxies / WARP / flaky Wi-Fi.
    // =========================================================================

    if (pathname === '/api/uploads/multipart/create' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const prefix = (body.prefix || 'uploads/').replace(/^\/+/, '').replace(/\/?$/, '/');
        // Validate prefix: only allow known safe prefixes
        const ALLOWED_PREFIXES = new Set(['uploads/', 'files/', 'assets/', 'employee-photos/', 'archives/']);
        if (!ALLOWED_PREFIXES.has(prefix)) {
          return new Response(JSON.stringify({ error: `Invalid prefix "${prefix}"` }), { status: 400, headers: corsHeaders });
        }
        const rawName = (body.name || 'upload.bin').toString();
        // Sanitize filename: strip path components + any chars outside [\w.\-]
        const safeName = rawName.split('/').pop()!.replace(/[^\w.\-]+/g, '_').slice(0, 200);
        const id = body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const key = `${prefix}${id}-${safeName}`;

        const multipart = await env.R2.createMultipartUpload(key, {
          httpMetadata: {
            contentType: body.contentType || 'application/octet-stream',
          },
        });

        return new Response(JSON.stringify({
          uploadId: multipart.uploadId,
          key,
          // Recommend 10MB parts — well under the Worker's 100MB body limit with overhead,
          // and R2 requires every non-final part to be >= 5MB.
          partSize: 10 * 1024 * 1024,
        }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('multipart/create error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // PUT raw chunk bytes; key + uploadId + partNumber come via query params (keeps the body pure).
    if (pathname === '/api/uploads/multipart/part' && request.method === 'PUT') {
      try {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');
        const uploadId = url.searchParams.get('uploadId');
        const partNumber = Number(url.searchParams.get('partNumber'));
        if (!key || !uploadId || !partNumber || partNumber < 1) {
          return new Response(JSON.stringify({ error: 'Missing key/uploadId/partNumber' }), { status: 400, headers: corsHeaders });
        }
        if (!request.body) {
          return new Response(JSON.stringify({ error: 'Empty body' }), { status: 400, headers: corsHeaders });
        }
        const multipart = env.R2.resumeMultipartUpload(key, uploadId);
        // Read full chunk into memory first so R2 knows Content-Length up front.
        // (uploading directly from a stream works but produces errors if length is unknown.)
        const chunk = await request.arrayBuffer();
        const uploaded = await multipart.uploadPart(partNumber, chunk);
        return new Response(JSON.stringify({
          partNumber: uploaded.partNumber,
          etag: uploaded.etag,
        }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('multipart/part error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    if (pathname === '/api/uploads/multipart/complete' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { key, uploadId, parts } = body;
        if (!key || !uploadId || !Array.isArray(parts)) {
          return new Response(JSON.stringify({ error: 'Missing key/uploadId/parts' }), { status: 400, headers: corsHeaders });
        }
        const multipart = env.R2.resumeMultipartUpload(key, uploadId);
        const obj = await multipart.complete(parts);
        return new Response(JSON.stringify({
          success: true,
          key: obj.key,
          etag: obj.etag,
          size: obj.size,
        }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('multipart/complete error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    if (pathname === '/api/uploads/multipart/abort' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { key, uploadId } = body;
        if (!key || !uploadId) {
          return new Response(JSON.stringify({ error: 'Missing key/uploadId' }), { status: 400, headers: corsHeaders });
        }
        const multipart = env.R2.resumeMultipartUpload(key, uploadId);
        await multipart.abort();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('multipart/abort error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================================
    // LEARNING HUB: Videos / Training Library
    // =========================================================================

    // List all videos (optionally filtered by category)
    if (pathname === '/api/videos' && request.method === 'GET') {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      // Deliberately exclude the heavy transcript + transcript_vtt columns from the list view
      // (they can be 100s of KB each); they're only needed for the detail view.
      const cols = 'id, title, description, category, tags, stream_uid, thumbnail_url, playback_url, dash_url, duration_seconds, uploader_email, uploader_name, transcription_status, transcription_progress, transcription_stage, transcription_error, retry_count, last_retry_at, view_count, created_at, updated_at';
      const sql = category
        ? `SELECT ${cols} FROM videos WHERE category=? ORDER BY created_at DESC`
        : `SELECT ${cols} FROM videos ORDER BY created_at DESC`;
      const stmt = category ? env.DB.prepare(sql).bind(category) : env.DB.prepare(sql);
      const { results } = await stmt.all();
      const videos = (results || []).map((v: any) => ({
        ...v,
        tags: (() => { try { return JSON.parse(v.tags || '[]'); } catch { return []; } })(),
      }));
      return new Response(JSON.stringify(videos), { headers: corsHeaders });
    }

    // Get a single video (includes transcript)
    if (pathname.match(/^\/api\/videos\/[^/]+$/) && request.method === 'GET') {
      const id = pathname.split('/').pop()!;
      const row = await env.DB.prepare('SELECT * FROM videos WHERE id=?').bind(id).first() as any;
      if (!row) return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404, headers: corsHeaders });
      row.tags = (() => { try { return JSON.parse(row.tags || '[]'); } catch { return []; } })();
      return new Response(JSON.stringify(row), { headers: corsHeaders });
    }

    // Poll transcription status + progress (for the UI's progress bar).
    if (pathname.match(/^\/api\/videos\/[^/]+\/status$/) && request.method === 'GET') {
      const id = pathname.split('/')[3];
      const row = await env.DB.prepare(
        'SELECT transcription_status, transcription_progress, transcription_stage, transcription_error, retry_count, last_retry_at, transcript, playback_url FROM videos WHERE id=?'
      ).bind(id).first() as any;
      if (!row) return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify({
        transcription_status: row.transcription_status,
        transcription_progress: Number(row.transcription_progress) || 0,
        transcription_stage: row.transcription_stage || '',
        stream_ready: !!row.playback_url,
        transcript_length: row.transcript ? row.transcript.length : 0,
        error: row.transcription_error || undefined,
        retry_count: Number(row.retry_count) || 0,
        last_retry_at: row.last_retry_at || undefined,
      }), { headers: corsHeaders });
    }

    // Step 1 of upload: create a Stream upload URL + DB row.
    //
    // If the client supplies `upload_length` (bytes), we create a *tus* resumable
    // session — required for large files and flaky connections. Without it, we fall
    // back to the basic direct_upload URL which accepts a single multipart POST.
    //
    // NOTE: parallel tus uploads via tus-js-client's parallelUploads option require
    // the server to support the tus "concatenation" extension, which Cloudflare Stream
    // does not. Upload throughput is therefore bandwidth-bound per connection.
    //
    // Response: { video_id, uid, uploadURL, method: 'tus' | 'direct' }
    if (pathname === '/api/videos/upload-url' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const title = (body.title || '').trim();
        const uploader_email = (body.uploader_email || '').trim();
        if (!title) return new Response(JSON.stringify({ error: 'title is required' }), { status: 400, headers: corsHeaders });
        if (!uploader_email) return new Response(JSON.stringify({ error: 'uploader_email is required' }), { status: 400, headers: corsHeaders });

        const videoId = `vid-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        const maxDur = Math.min(Math.max(Number(body.max_duration_seconds) || 3600, 60), 21600); // 1h default, 6h cap
        const uploadLength = Number(body.upload_length) || 0;

        let uid: string, uploadURL: string, method: 'tus' | 'direct';
        if (uploadLength > 0) {
          const res = await streamCreateTusUpload(env, {
            uploadLength,
            maxDurationSeconds: maxDur,
            name: title,
            creator: uploader_email,
            meta: { video_id: videoId, category: body.category || '' },
          });
          uid = res.uid;
          uploadURL = res.uploadURL;
          method = 'tus';
        } else {
          const res = await streamCreateDirectUpload(env, {
            maxDurationSeconds: maxDur,
            name: title,
            creator: uploader_email,
            meta: { video_id: videoId, category: body.category || '' },
          });
          uid = res.uid;
          uploadURL = res.uploadURL;
          method = 'direct';
        }

        await env.DB.prepare(`
          INSERT INTO videos (id, title, description, category, tags, stream_uid, uploader_email, uploader_name, transcription_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          videoId,
          title,
          body.description || '',
          body.category || 'general',
          JSON.stringify(body.tags || []),
          uid,
          uploader_email,
          body.uploader_name || '',
          'uploading'
        ).run();

        return new Response(JSON.stringify({ video_id: videoId, uid, uploadURL, method }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('upload-url error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Failed to create upload URL' }), { status: 500, headers: corsHeaders });
      }
    }

    // Step 2 of upload: client notifies us the upload finished.
    // We kick off background transcription + vectorization via ctx.waitUntil.
    if (pathname.match(/^\/api\/videos\/[^/]+\/finalize$/) && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const row = await env.DB.prepare('SELECT id FROM videos WHERE id=?').bind(id).first();
      if (!row) return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404, headers: corsHeaders });

      if (ctx) {
        ctx.waitUntil(processVideoBackground(id, env));
      } else {
        await processVideoBackground(id, env);
      }

      return new Response(JSON.stringify({ success: true, status: 'processing' }), { headers: corsHeaders });
    }

    // Update video metadata (title, description, category, tags) — admin/uploader only (enforced client-side)
    if (pathname.match(/^\/api\/videos\/[^/]+$/) && request.method === 'PUT') {
      const id = pathname.split('/').pop()!;
      const data = await request.json() as any;
      await env.DB.prepare(`
        UPDATE videos
        SET title=?, description=?, category=?, tags=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        data.title,
        data.description || '',
        data.category || 'general',
        JSON.stringify(data.tags || []),
        id
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Delete a video (from Stream, Vectorize, and D1)
    if (pathname.match(/^\/api\/videos\/[^/]+$/) && request.method === 'DELETE') {
      const id = pathname.split('/').pop()!;
      try {
        await deleteVideoEverywhere(id, env);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Record a view
    if (pathname.match(/^\/api\/videos\/[^/]+\/view$/) && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await request.json().catch(() => ({})) as any;
      const viewId = `view-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      await env.DB.prepare(
        `INSERT INTO video_views (id, video_id, user_email, user_name, watched_seconds) VALUES (?, ?, ?, ?, ?)`
      ).bind(viewId, id, body.userEmail || null, body.userName || null, body.watchedSeconds || 0).run();
      await env.DB.prepare('UPDATE videos SET view_count = view_count + 1, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Semantic search across all transcripts.
    // Embeds the query, runs VIDEO_VECTORIZE.query, groups results by video, returns top videos with best-match snippet.
    if (pathname === '/api/videos/search' && request.method === 'POST') {
      try {
        const { query, limit } = await request.json() as any;
        if (!query || typeof query !== 'string') {
          return new Response(JSON.stringify({ error: 'query is required' }), { status: 400, headers: corsHeaders });
        }
        const k = Math.min(Math.max(Number(limit) || 10, 1), 25);

        const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });
        const vectorResults = await env.VIDEO_VECTORIZE.query(emb.data[0], {
          topK: k * 5, // over-fetch so we can dedupe by video_id and still return k
          returnMetadata: true,
        });

        // Collect best-scoring chunk per video
        const bestPerVideo = new Map<string, { score: number; metadata: any }>();
        for (const match of vectorResults.matches || []) {
          const meta = match.metadata as any;
          if (!meta?.video_id) continue;
          const existing = bestPerVideo.get(meta.video_id);
          if (!existing || match.score > existing.score) {
            bestPerVideo.set(meta.video_id, { score: match.score, metadata: meta });
          }
        }

        // Join against D1 to get full video details for the top-k videos by best-score
        const topVideoIds = [...bestPerVideo.entries()]
          .sort((a, b) => b[1].score - a[1].score)
          .slice(0, k)
          .map(([videoId]) => videoId);

        if (topVideoIds.length === 0) {
          return new Response(JSON.stringify({ results: [] }), { headers: corsHeaders });
        }

        // D1 doesn't support array parameters — build a placeholder list
        const placeholders = topVideoIds.map(() => '?').join(',');
        const { results: videoRows } = await env.DB.prepare(
          `SELECT id, title, description, category, stream_uid, thumbnail_url, duration_seconds FROM videos WHERE id IN (${placeholders})`
        ).bind(...topVideoIds).all();

        const videoMap = new Map<string, any>();
        for (const v of (videoRows || []) as any[]) videoMap.set(v.id, v);

        const results = topVideoIds
          .map(videoId => {
            const best = bestPerVideo.get(videoId)!;
            const v = videoMap.get(videoId);
            if (!v) return null;
            return {
              video_id: videoId,
              title: v.title,
              description: v.description,
              category: v.category,
              stream_uid: v.stream_uid,
              thumbnail_url: v.thumbnail_url,
              duration_seconds: v.duration_seconds,
              score: best.score,
              snippet: best.metadata.snippet || '',
              timestamp: best.metadata.start_seconds || 0,
            };
          })
          .filter(Boolean);

        return new Response(JSON.stringify({ results, query }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('video search error:', error);
        return new Response(JSON.stringify({ error: 'Search failed', details: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Similar-video recommendations.
    // Uses the given video's transcript as the query: averages its chunk embeddings into a centroid,
    // then queries Vectorize for closest OTHER videos.
    if (pathname.match(/^\/api\/videos\/[^/]+\/recommendations$/) && request.method === 'GET') {
      try {
        const id = pathname.split('/')[3];
        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 5, 1), 20);

        const video = await env.DB.prepare(
          'SELECT id, title, description, category, transcript FROM videos WHERE id=?'
        ).bind(id).first() as any;
        if (!video) return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404, headers: corsHeaders });

        // Build a query text from title + description + transcript excerpt.
        // (Using one combined embedding is simpler + faster than computing a true centroid from stored vectors,
        //  and behaves similarly for the "find similar videos" use case.)
        const combined = [
          video.title,
          video.description || '',
          (video.transcript || '').substring(0, 4000),
        ].filter(Boolean).join('\n\n');

        const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: combined });
        const vectorResults = await env.VIDEO_VECTORIZE.query(emb.data[0], {
          topK: limit * 5 + 5, // over-fetch so we can exclude the source video and dedupe
          returnMetadata: true,
        });

        const bestPerVideo = new Map<string, { score: number; metadata: any }>();
        for (const match of vectorResults.matches || []) {
          const meta = match.metadata as any;
          if (!meta?.video_id || meta.video_id === id) continue; // exclude source video
          const existing = bestPerVideo.get(meta.video_id);
          if (!existing || match.score > existing.score) {
            bestPerVideo.set(meta.video_id, { score: match.score, metadata: meta });
          }
        }

        const topVideoIds = [...bestPerVideo.entries()]
          .sort((a, b) => b[1].score - a[1].score)
          .slice(0, limit)
          .map(([videoId]) => videoId);

        if (topVideoIds.length === 0) {
          // Fallback: recommend same-category videos by popularity
          const { results: fallback } = await env.DB.prepare(
            `SELECT id, title, description, category, stream_uid, thumbnail_url, duration_seconds, view_count
             FROM videos
             WHERE id != ? AND transcription_status='completed'
             ORDER BY CASE WHEN category=? THEN 0 ELSE 1 END, view_count DESC
             LIMIT ?`
          ).bind(id, video.category || '', limit).all();
          return new Response(JSON.stringify({ recommendations: fallback || [], fallback: true }), { headers: corsHeaders });
        }

        const placeholders = topVideoIds.map(() => '?').join(',');
        const { results: videoRows } = await env.DB.prepare(
          `SELECT id, title, description, category, stream_uid, thumbnail_url, duration_seconds, view_count
           FROM videos WHERE id IN (${placeholders})`
        ).bind(...topVideoIds).all();

        const videoMap = new Map<string, any>();
        for (const v of (videoRows || []) as any[]) videoMap.set(v.id, v);

        const recommendations = topVideoIds
          .map(vid => {
            const best = bestPerVideo.get(vid)!;
            const v = videoMap.get(vid);
            if (!v) return null;
            return { ...v, similarity: best.score, reason: best.metadata.snippet || '' };
          })
          .filter(Boolean);

        return new Response(JSON.stringify({ recommendations }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('recommendations error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Automatic resume of stuck / failed transcriptions with exponential backoff.
    //
    // Two classes of video are eligible:
    //   A) STUCK: transcription_status IN ('processing', 'uploading', 'pending') and
    //      updated_at hasn't moved in 5 minutes → the ctx.waitUntil task died silently.
    //      These retry immediately.
    //
    //   B) FAILED: transcription_status='failed' AND retry_count < 10 AND enough time
    //      has passed since last_retry_at (exponential backoff).
    //      Backoff: attempt N waits 5min * 2^(N-1) before retrying, capped at 24h.
    //
    // A healthy running task updates progress at every stage transition (every few
    // seconds during embedding, every 10s during polling stages), so it won't be
    // falsely flagged as stuck.
    if (pathname === '/api/admin/resume-stuck-videos' && request.method === 'POST') {
      try {
        const staleCutoffMinutes = 5;
        const MAX_RETRIES = 10;

        // Class A: stuck in-progress jobs
        const stuckResults = await env.DB.prepare(
          `SELECT id, transcription_status, retry_count, last_retry_at
           FROM videos
           WHERE transcription_status IN ('processing', 'uploading', 'pending')
             AND stream_uid IS NOT NULL AND stream_uid != ''
             AND datetime(updated_at) < datetime('now', '-${staleCutoffMinutes} minutes')
           LIMIT 20`
        ).all();

        // Class B: failed jobs within retry budget
        const failedResults = await env.DB.prepare(
          `SELECT id, retry_count, last_retry_at, transcription_error
           FROM videos
           WHERE transcription_status = 'failed'
             AND stream_uid IS NOT NULL AND stream_uid != ''
             AND COALESCE(retry_count, 0) < ?
           LIMIT 50`
        ).bind(MAX_RETRIES).all();

        const resumedIds: string[] = [];
        const skipped: Array<{ id: string; reason: string; next_retry_at?: string }> = [];

        // Resume stuck jobs immediately
        for (const row of (stuckResults.results || []) as any[]) {
          if (ctx) {
            ctx.waitUntil(processVideoBackground(row.id, env));
            resumedIds.push(row.id);
          }
        }

        // Resume failed jobs whose backoff window has elapsed
        const now = Date.now();
        for (const row of (failedResults.results || []) as any[]) {
          const attemptCount = Number(row.retry_count) || 0;
          const lastRetryAt = row.last_retry_at ? Date.parse(row.last_retry_at) : 0;
          // Backoff: 5 min * 2^(attempt-1), capped at 24 hours
          const backoffMs = Math.min(
            5 * 60 * 1000 * Math.pow(2, Math.max(0, attemptCount - 1)),
            24 * 60 * 60 * 1000
          );
          const nextRetryAt = lastRetryAt + backoffMs;
          if (now < nextRetryAt) {
            skipped.push({
              id: row.id,
              reason: `backoff: attempt ${attemptCount}, next try in ${Math.round((nextRetryAt - now) / 60_000)} min`,
              next_retry_at: new Date(nextRetryAt).toISOString(),
            });
            continue;
          }
          // Move back to 'processing' so we don't double-trigger via the stuck query
          // next time the cron fires before this run finishes
          try {
            await env.DB.prepare(
              `UPDATE videos SET transcription_status='processing', updated_at=CURRENT_TIMESTAMP WHERE id=?`
            ).bind(row.id).run();
          } catch {}
          if (ctx) {
            ctx.waitUntil(processVideoBackground(row.id, env));
            resumedIds.push(row.id);
          }
        }

        console.log(`resume-stuck-videos: resumed=${resumedIds.length} skipped=${skipped.length}`);
        return new Response(JSON.stringify({
          success: true,
          resumed: resumedIds,
          count: resumedIds.length,
          skipped,
          stale_cutoff_minutes: staleCutoffMinutes,
          max_retries: MAX_RETRIES,
        }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('resume-stuck-videos error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Admin: force reprocess (re-transcribe + re-vectorize) an existing video
    if (pathname.match(/^\/api\/videos\/[^/]+\/reprocess$/) && request.method === 'POST') {
      const id = pathname.split('/')[3];
      const video = await env.DB.prepare('SELECT stream_uid FROM videos WHERE id=?').bind(id).first() as any;
      if (!video) return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404, headers: corsHeaders });

      // Reset retry counter — user-initiated retries start the backoff ladder from scratch
      await env.DB.prepare(
        `UPDATE videos SET retry_count=0, last_retry_at=NULL, transcription_error=NULL WHERE id=?`
      ).bind(id).run();

      // Clear existing vectors first
      try {
        const { results: vecRows } = await env.DB.prepare('SELECT vector_id FROM video_vectors WHERE video_id=?').bind(id).all();
        const vecIds = (vecRows || []).map((r: any) => r.vector_id);
        if (vecIds.length > 0) {
          for (let i = 0; i < vecIds.length; i += 100) {
            await env.VIDEO_VECTORIZE.deleteByIds(vecIds.slice(i, i + 100));
          }
        }
        await env.DB.prepare('DELETE FROM video_vectors WHERE video_id=?').bind(id).run();
      } catch (e) { console.error('reprocess: cleanup failed', e); }

      if (ctx) ctx.waitUntil(processVideoBackground(id, env));
      else await processVideoBackground(id, env);

      return new Response(JSON.stringify({ success: true, status: 'processing' }), { headers: corsHeaders });
    }

    // Chat / "ask this video a question":
    // RAG over the CURRENT video only. Embeds the question, queries VIDEO_VECTORIZE with
    // a filter on video_id, builds LLM context from the top chunks (with timestamps),
    // calls llama-3.3 for an answer, and returns citations so the UI can seek to the
    // exact moments in the video where the answer was spoken.
    if (pathname.match(/^\/api\/videos\/[^/]+\/ask$/) && request.method === 'POST') {
      try {
        const id = pathname.split('/')[3];
        const body = await request.json() as any;
        const question = (body.question || '').trim();
        if (!question) return new Response(JSON.stringify({ error: 'question is required' }), { status: 400, headers: corsHeaders });

        const video = await env.DB.prepare(
          'SELECT id, title, description, category, transcript, duration_seconds, uploader_name FROM videos WHERE id=?'
        ).bind(id).first() as any;
        if (!video) return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404, headers: corsHeaders });
        if (!video.transcript) {
          return new Response(JSON.stringify({
            answer: "This video hasn't been transcribed yet. Try again in a minute once transcription finishes.",
            citations: [],
          }), { headers: corsHeaders });
        }

        // Step 1: Embed the question
        const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: question });

        // Step 2: Query Vectorize for this video's chunks, filtered by video_id
        // topK=6 gives us enough surrounding context while keeping the prompt small.
        const vectorResults = await env.VIDEO_VECTORIZE.query(emb.data[0], {
          topK: 6,
          returnMetadata: true,
          filter: { video_id: id },
        });

        const matches = (vectorResults.matches || []).filter((m: any) => {
          const meta = m.metadata as any;
          return meta && meta.video_id === id; // extra safety if filter isn't honored
        });

        // Step 3: Build context for the LLM (chunks sorted by timestamp for coherence)
        const contextChunks = matches
          .map((m: any) => ({ ...m.metadata, score: m.score }))
          .sort((a: any, b: any) => (a.start_seconds || 0) - (b.start_seconds || 0));

        // If the vector search returns nothing (e.g., very short video with 1 chunk that
        // didn't clear the similarity threshold), fall back to the whole transcript.
        let contextText: string;
        let citations: Array<{ start_seconds: number; end_seconds: number; snippet: string; score: number }> = [];
        if (contextChunks.length === 0) {
          const excerpt = (video.transcript || '').substring(0, 4000);
          contextText = `Full transcript excerpt:\n${excerpt}`;
        } else {
          contextText = contextChunks.map((c: any) =>
            `[@ ${formatTs(c.start_seconds || 0)}] ${c.snippet || ''}`
          ).join('\n\n');
          citations = contextChunks.map((c: any) => ({
            start_seconds: Number(c.start_seconds) || 0,
            end_seconds: Number(c.end_seconds) || 0,
            snippet: c.snippet || '',
            score: Number(c.score) || 0,
          }));
        }

        // Step 4: LLM
        const aiResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant answering questions about a specific training video.

Video title: ${video.title}
${video.description ? `Description: ${video.description}` : ''}
${video.uploader_name ? `Uploaded by: ${video.uploader_name}` : ''}

Below are excerpts from the video's transcript, each prefixed with a timestamp in [@ MM:SS] format.

RULES:
- Answer ONLY from the transcript excerpts provided. Do NOT fabricate or speculate.
- If the answer isn't in the transcript, say so plainly ("The video doesn't cover that").
- Quote or paraphrase specific phrases. When you reference a point, mention the timestamp in [MM:SS] format so the viewer can jump to it.
- Keep answers concise (2-4 sentences unless the viewer asks for more detail).
- Use plain language; no marketing fluff.

TRANSCRIPT EXCERPTS:
${contextText}`,
            },
            { role: 'user', content: question },
          ],
          max_tokens: 400,
          temperature: 0.3,
        });

        return new Response(JSON.stringify({
          answer: (aiResponse.response || '').trim() || "I couldn't find an answer in this video.",
          citations,
          video_id: id,
        }), { headers: corsHeaders });
      } catch (error: any) {
        console.error('/ask error:', error);
        return new Response(JSON.stringify({ error: 'Ask failed', details: error.message }), { status: 500, headers: corsHeaders });
      }
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
      const mcpContextRaw = data.mcp_context;
      const mcpContext: Array<{ source: string; text: string }> = Array.isArray(mcpContextRaw)
        ? mcpContextRaw.filter((c: any) => c && typeof c.text === 'string' && c.text.trim().length > 0)
        : [];

      // Build product context from DB
      let productContext = '';
      if (products && products.length > 0) {
        const placeholders = products.map(() => '?').join(',');
        const { results: productRows } = await env.DB.prepare(
          `SELECT name, description FROM products WHERE id IN (${placeholders})`
        ).bind(...products).all();
        productContext = productRows.map((p: any) => `- ${p.name}: ${p.description || 'Cloudflare product'}`).join('\n');
      }

      // Compose cf-portal MCP grounding (browser-side wiki/Backstage results)
      let mcpGrounding = '';
      if (mcpContext.length > 0) {
        const trimmed = mcpContext.map(c => ({
          source: c.source,
          text: (c.text || '').slice(0, 3000),
        }));
        mcpGrounding = '\n\nLive cf-portal grounding (signed in as the user):\n' +
          trimmed.map(c => `[${c.source}] ${c.text}`).join('\n\n---\n\n');
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
${productContext || '(No specific products selected -- recommend relevant Cloudflare products based on the issue)'}${mcpGrounding}`
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
        // Browser-side cf-portal MCP grounding (wiki + Backstage techdocs +
        // Cloudflare docs). The frontend collects this under the user's
        // identity and passes it through; we just inject it into the prompt.
        const mcpContextRaw = data.mcp_context;
        const mcpContext: Array<{ source: string; text: string }> = Array.isArray(mcpContextRaw)
          ? mcpContextRaw.filter((c: any) => c && typeof c.text === 'string' && c.text.trim().length > 0)
          : [];

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

        // Compose MCP grounding block (browser-side cf-portal results)
        let mcpContextBlock = '';
        if (mcpContext.length > 0) {
          const trimmed = mcpContext.map(c => ({
            source: c.source,
            text: (c.text || '').slice(0, 4000),
          }));
          mcpContextBlock = '\n\n--- Live cf-portal MCP grounding (signed in as the user) ---\n\n' +
            trimmed.map(c => `[mcp:${c.source}]\n${c.text}`).join('\n\n---\n\n');
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

${retrievedContext}${uploadedRfpContext}${mcpContextBlock}

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

    // ─── Notifications: feed, unread count, mark-seen ──────────────────────
    //
    // Drives the top-nav bell, dashboard "What's New" card, and per-item
    // "Updated" pills. All endpoints exclude entries where changed_by_email
    // matches the requesting user (no notifications for your own edits).

    // GET /api/notifications/feed?user_email=...&limit=50&days=14
    // Returns the user's recent changes with an is_unread flag per row.
    if (pathname === '/api/notifications/feed' && request.method === 'GET') {
      const url2 = new URL(request.url);
      const userEmail = url2.searchParams.get('user_email') || '';
      const limit = Math.min(200, Math.max(1, parseInt(url2.searchParams.get('limit') || '50', 10)));
      const days = Math.min(60, Math.max(1, parseInt(url2.searchParams.get('days') || '14', 10)));
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const { results } = await env.DB.prepare(
        `SELECT cl.id, cl.content_type, cl.content_id, cl.content_title, cl.content_subtype,
                cl.content_path, cl.change_type, cl.changed_by_email, cl.changed_by_name,
                cl.summary, cl.changed_at,
                cs.last_seen_at,
                CASE
                  WHEN cs.last_seen_at IS NULL THEN 1
                  WHEN cs.last_seen_at < cl.changed_at THEN 1
                  ELSE 0
                END as is_unread
         FROM content_changelog cl
         LEFT JOIN content_seen cs
           ON cs.user_email = ?
           AND cs.content_type = cl.content_type
           AND cs.content_id = cl.content_id
         WHERE cl.changed_at >= ?
           AND (cl.changed_by_email IS NULL OR cl.changed_by_email != ?)
         ORDER BY cl.changed_at DESC
         LIMIT ?`
      ).bind(userEmail, since, userEmail, limit).all();

      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // GET /api/notifications/unread-count?user_email=...
    // Returns just the count for the bell badge. Computes against the same
    // 30-day window as the feed (older changes don't badge).
    if (pathname === '/api/notifications/unread-count' && request.method === 'GET') {
      const url2 = new URL(request.url);
      const userEmail = url2.searchParams.get('user_email') || '';
      const since = new Date(Date.now() - 30 * 86400000).toISOString();

      // For each (content_type, content_id) we only need the LATEST change
      // — counting unread by-row would inflate when one item was edited
      // multiple times. Group then count.
      const row = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM (
           SELECT cl.content_type, cl.content_id, MAX(cl.changed_at) as latest_change
           FROM content_changelog cl
           WHERE cl.changed_at >= ?
             AND (cl.changed_by_email IS NULL OR cl.changed_by_email != ?)
           GROUP BY cl.content_type, cl.content_id
         ) latest
         LEFT JOIN content_seen cs
           ON cs.user_email = ?
           AND cs.content_type = latest.content_type
           AND cs.content_id = latest.content_id
         WHERE cs.last_seen_at IS NULL OR cs.last_seen_at < latest.latest_change`
      ).bind(since, userEmail, userEmail).first() as any;

      return new Response(JSON.stringify({ count: row?.count || 0 }),
        { headers: corsHeaders });
    }

    // GET /api/notifications/unread-by-content?user_email=...&content_type=asset
    // Returns the set of content_ids that are unread for this user. Used to
    // render "Updated" pills on the asset/script/ai-hub list pages.
    if (pathname === '/api/notifications/unread-by-content' && request.method === 'GET') {
      const url2 = new URL(request.url);
      const userEmail = url2.searchParams.get('user_email') || '';
      const contentType = url2.searchParams.get('content_type') || '';
      const since = new Date(Date.now() - 30 * 86400000).toISOString();

      if (!contentType) {
        return new Response(JSON.stringify({ error: 'content_type is required' }),
          { status: 400, headers: corsHeaders });
      }

      const { results } = await env.DB.prepare(
        `SELECT latest.content_id, latest.latest_change as changed_at
         FROM (
           SELECT content_id, MAX(changed_at) as latest_change
           FROM content_changelog
           WHERE content_type = ?
             AND changed_at >= ?
             AND (changed_by_email IS NULL OR changed_by_email != ?)
           GROUP BY content_id
         ) latest
         LEFT JOIN content_seen cs
           ON cs.user_email = ?
           AND cs.content_type = ?
           AND cs.content_id = latest.content_id
         WHERE cs.last_seen_at IS NULL OR cs.last_seen_at < latest.latest_change`
      ).bind(contentType, since, userEmail, userEmail, contentType).all();

      return new Response(JSON.stringify({
        content_ids: (results || []).map((r: any) => r.content_id),
      }), { headers: corsHeaders });
    }

    // POST /api/notifications/mark-seen
    // Body: { user_email, content_type, content_id }  →  marks one item seen
    // OR    { user_email, mark_all: true }            →  marks every current row seen
    if (pathname === '/api/notifications/mark-seen' && request.method === 'POST') {
      const data = await request.json() as any;
      const userEmail: string = data.user_email || '';
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'user_email is required' }),
          { status: 400, headers: corsHeaders });
      }

      if (data.mark_all === true) {
        // Mark every (content_type, content_id) pair currently in the
        // changelog as seen at the time of this request.
        const { results: latest } = await env.DB.prepare(
          `SELECT content_type, content_id, MAX(changed_at) as latest_change
           FROM content_changelog
           GROUP BY content_type, content_id`
        ).all();
        const now = new Date().toISOString();
        for (const r of (latest as any[])) {
          await env.DB.prepare(
            `INSERT INTO content_seen (user_email, content_type, content_id, last_seen_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_email, content_type, content_id)
             DO UPDATE SET last_seen_at = excluded.last_seen_at`
          ).bind(userEmail, r.content_type, r.content_id, now).run();
        }
        return new Response(JSON.stringify({ success: true, marked: latest?.length || 0 }),
          { headers: corsHeaders });
      }

      const contentType: string = data.content_type || '';
      const contentId: string = data.content_id || '';
      if (!contentType || !contentId) {
        return new Response(JSON.stringify({
          error: 'content_type and content_id (or mark_all=true) are required',
        }), { status: 400, headers: corsHeaders });
      }

      const now = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO content_seen (user_email, content_type, content_id, last_seen_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_email, content_type, content_id)
         DO UPDATE SET last_seen_at = excluded.last_seen_at`
      ).bind(userEmail, contentType, contentId, now).run();

      return new Response(JSON.stringify({ success: true }),
        { headers: corsHeaders });
    }

    // ─── My Team: group-admin + manager access ─────────────────────────────
    //
    // A user has team-leadership access to anyone who is either:
    //   1. A direct report (employees.manager_id = my employees.id), OR
    //   2. A member of a group where my email is in groups.admins
    //
    // Used by /my-team and the Dashboard "My Team" card to render the set of
    // people the requesting user is responsible for, plus drill-down data
    // (skills, curriculum, activity) for each.

    // GET /api/team/my-team?email=alice@cloudflare.com
    // Returns the unified set of people the requester has access to, with
    // their employee record + which path(s) granted access (group / manager
    // / both) and the group names if applicable.
    if (pathname === '/api/team/my-team' && request.method === 'GET') {
      const url2 = new URL(request.url);
      const requesterEmail = (url2.searchParams.get('email') || '').toLowerCase();
      if (!requesterEmail) {
        return new Response(JSON.stringify({ error: 'email is required' }),
          { status: 400, headers: corsHeaders });
      }

      // 1) Find employee row for the requester (used for the manager path)
      const me = await env.DB.prepare(
        'SELECT id, name, email FROM employees WHERE LOWER(email) = ?'
      ).bind(requesterEmail).first() as any;

      // 2) Direct reports — anyone whose manager_id matches my employee id
      let directReports: any[] = [];
      if (me?.id) {
        const r = await env.DB.prepare(
          `SELECT id, name, email, title, department, photo_url, location, region, manager_id
           FROM employees
           WHERE manager_id = ? AND LOWER(email) != ?`
        ).bind(me.id, requesterEmail).all();
        directReports = r.results || [];
      }

      // 3) Group-admin path — find every group where I'm in admins, then
      //    pull employee rows for the member emails. We also remember which
      //    groups granted access for each member so the UI can show
      //    provenance (e.g. "via AMER SE team").
      const { results: groups } = await env.DB.prepare(
        'SELECT id, name, members, admins FROM groups'
      ).all();
      const groupsForMember = new Map<string, string[]>(); // email -> [group_name]
      const groupMemberEmails = new Set<string>();
      for (const g of (groups as any[])) {
        let admins: string[] = [];
        let members: string[] = [];
        try { admins = JSON.parse(g.admins || '[]'); } catch { /* ignore */ }
        try { members = JSON.parse(g.members || '[]'); } catch { /* ignore */ }
        const adminEmails = admins.map(a => (a || '').toLowerCase());
        if (!adminEmails.includes(requesterEmail)) continue;
        for (const m of members) {
          const me2 = (m || '').toLowerCase();
          if (!me2 || me2 === requesterEmail) continue;
          groupMemberEmails.add(me2);
          if (!groupsForMember.has(me2)) groupsForMember.set(me2, []);
          groupsForMember.get(me2)!.push(g.name);
        }
      }

      // Look up employee records for group members (in one query)
      let groupEmployees: any[] = [];
      if (groupMemberEmails.size > 0) {
        const placeholders = Array.from(groupMemberEmails).map(() => 'LOWER(?)').join(',');
        const r = await env.DB.prepare(
          `SELECT id, name, email, title, department, photo_url, location, region, manager_id
           FROM employees
           WHERE LOWER(email) IN (${placeholders})`
        ).bind(...Array.from(groupMemberEmails)).all();
        groupEmployees = r.results || [];
      }

      // 4) Merge directReports + groupEmployees, dedup by email, annotate
      //    each with `sources: ('manager' | 'group')[]` and `groups: [name]`.
      const byEmail = new Map<string, any>();
      const reportEmails = new Set<string>(directReports.map((r: any) => r.email.toLowerCase()));

      for (const r of directReports) {
        byEmail.set(r.email.toLowerCase(), { ...r, sources: ['manager'], groups: [] });
      }
      for (const r of groupEmployees) {
        const key = r.email.toLowerCase();
        const existing = byEmail.get(key);
        if (existing) {
          existing.sources.push('group');
          existing.groups = groupsForMember.get(key) || [];
        } else {
          byEmail.set(key, {
            ...r,
            sources: ['group'],
            groups: groupsForMember.get(key) || [],
          });
        }
      }

      const members = Array.from(byEmail.values()).sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );

      return new Response(JSON.stringify({
        requester: { email: requesterEmail, employee_id: me?.id || null, name: me?.name || null },
        members,
        counts: {
          total: members.length,
          direct_reports: reportEmails.size,
          group_only: members.filter(m => !m.sources.includes('manager')).length,
        },
      }), { headers: corsHeaders });
    }

    // GET /api/team/member/:email/snapshot?requester=...
    // Returns the full team-management drill for a single member: profile,
    // skill assessments, curriculum progress, recent activity. Authorized
    // by re-running the same access logic — the requester must be the
    // member's manager OR a group admin of a group the member belongs to.
    if (pathname.startsWith('/api/team/member/') && pathname.endsWith('/snapshot') && request.method === 'GET') {
      const targetEmailRaw = decodeURIComponent(
        pathname.replace('/api/team/member/', '').replace('/snapshot', '')
      );
      const targetEmail = (targetEmailRaw || '').toLowerCase();
      const url2 = new URL(request.url);
      const requesterEmail = (url2.searchParams.get('requester') || '').toLowerCase();

      if (!requesterEmail || !targetEmail) {
        return new Response(JSON.stringify({ error: 'requester and target email are required' }),
          { status: 400, headers: corsHeaders });
      }
      if (requesterEmail === targetEmail) {
        return new Response(JSON.stringify({ error: 'requester and target are the same person' }),
          { status: 400, headers: corsHeaders });
      }

      // Authorization: replay the access logic and see if targetEmail is
      // in the requester's accessible set. We could dedupe with the
      // /my-team endpoint but we'd lose the early-exit optimization.
      const requester = await env.DB.prepare(
        'SELECT id FROM employees WHERE LOWER(email) = ?'
      ).bind(requesterEmail).first() as any;

      let accessGranted = false;
      let viaSource: 'manager' | 'group' | null = null;

      // Manager path
      if (requester?.id) {
        const isReport = await env.DB.prepare(
          'SELECT 1 FROM employees WHERE LOWER(email) = ? AND manager_id = ? LIMIT 1'
        ).bind(targetEmail, requester.id).first();
        if (isReport) { accessGranted = true; viaSource = 'manager'; }
      }

      // Group-admin path
      if (!accessGranted) {
        const { results: groups } = await env.DB.prepare(
          'SELECT name, members, admins FROM groups'
        ).all();
        for (const g of (groups as any[])) {
          let admins: string[] = [];
          let members: string[] = [];
          try { admins = JSON.parse(g.admins || '[]'); } catch { /* ignore */ }
          try { members = JSON.parse(g.members || '[]'); } catch { /* ignore */ }
          const adminEmails = admins.map(a => (a || '').toLowerCase());
          const memberEmails = members.map(m => (m || '').toLowerCase());
          if (adminEmails.includes(requesterEmail) && memberEmails.includes(targetEmail)) {
            accessGranted = true;
            viaSource = 'group';
            break;
          }
        }
      }

      if (!accessGranted) {
        return new Response(JSON.stringify({
          error: 'Forbidden — you are not the manager or a group admin for this user',
        }), { status: 403, headers: corsHeaders });
      }

      // Pull the member's full profile + assessments + curriculum + activity
      const profile = await env.DB.prepare(
        `SELECT id, name, email, title, department, photo_url, bio, location, region,
                start_date, employee_status, business_unit, job_family, job_level,
                manager_id
         FROM employees WHERE LOWER(email) = ?`
      ).bind(targetEmail).first();

      // Skill assessments — depends on `skill_assessments` table
      const skillsTblExists = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='skill_assessments'"
      ).first();
      let skillAssessments: any[] = [];
      if (skillsTblExists) {
        const r = await env.DB.prepare(
          `SELECT * FROM skill_assessments WHERE LOWER(user_email) = ? ORDER BY updated_at DESC LIMIT 200`
        ).bind(targetEmail).all();
        skillAssessments = r.results || [];
      }

      // Curriculum / course progress — graceful if table is missing
      let coursesAssigned: any[] = [];
      let coursesCompleted: any[] = [];
      const coursesTbl = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_courses'"
      ).first();
      if (coursesTbl) {
        const r = await env.DB.prepare(
          `SELECT * FROM user_courses WHERE LOWER(user_email) = ?`
        ).bind(targetEmail).all();
        coursesAssigned = r.results || [];
        coursesCompleted = coursesAssigned.filter((c: any) =>
          c.status === 'completed' || c.completed_at
        );
      }

      // Recent activity — page views in the last 30 days, top 5 pages
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const { results: pageActivity } = await env.DB.prepare(
        `SELECT page_path, page_label, COUNT(*) as views, MAX(viewed_at) as last_viewed
         FROM page_views
         WHERE LOWER(user_email) = ? AND viewed_at >= ?
         GROUP BY page_path
         ORDER BY views DESC
         LIMIT 8`
      ).bind(targetEmail, since30).all();

      const lastSeenRow = await env.DB.prepare(
        `SELECT MAX(viewed_at) as last_seen FROM page_views WHERE LOWER(user_email) = ?`
      ).bind(targetEmail).first() as any;

      // AI Hub contributions — community solutions authored
      let aiHubContributions: any[] = [];
      try {
        const r = await env.DB.prepare(
          `SELECT id, title, type, upvotes, uses, created_at, updated_at
           FROM ai_solutions
           WHERE LOWER(author_email) = ?
           ORDER BY updated_at DESC
           LIMIT 20`
        ).bind(targetEmail).all();
        aiHubContributions = r.results || [];
      } catch { /* ai_solutions might not be present everywhere */ }

      return new Response(JSON.stringify({
        access: { granted: true, via: viaSource },
        profile,
        skills: {
          assessed: skillAssessments.length,
          assessments: skillAssessments,
        },
        curriculum: {
          assigned: coursesAssigned.length,
          completed: coursesCompleted.length,
          courses: coursesAssigned,
        },
        activity: {
          last_seen: lastSeenRow?.last_seen || null,
          pages_30d: pageActivity || [],
        },
        ai_hub: {
          contributions: aiHubContributions.length,
          recent: aiHubContributions,
        },
      }), { headers: corsHeaders });
    }

    // Per-day page view drill-down — "who viewed what on this day"
    // GET /api/page-views/day/:YYYY-MM-DD
    // Returns total + unique users + per-user breakdown (with the pages
    // each user touched) + per-page summary + chronological timeline.
    if (pathname.startsWith('/api/page-views/day/') && request.method === 'GET') {
      const dateRaw = pathname.replace('/api/page-views/day/', '').trim();
      // Accept YYYY-MM-DD only — anything else is a bad request.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        return new Response(JSON.stringify({ error: 'date must be YYYY-MM-DD' }),
          { status: 400, headers: corsHeaders });
      }

      // Total + unique users for the day
      const headlineRow = await env.DB.prepare(
        `SELECT COUNT(*) as total_views,
                COUNT(DISTINCT user_email) as unique_users
         FROM page_views
         WHERE DATE(viewed_at) = ?`
      ).bind(dateRaw).first() as any;

      // Per-page summary: one row per page_path with view count + how many
      // distinct users hit it
      const { results: byPage } = await env.DB.prepare(
        `SELECT page_path, page_label,
                COUNT(*) as view_count,
                COUNT(DISTINCT user_email) as unique_users
         FROM page_views
         WHERE DATE(viewed_at) = ?
         GROUP BY page_path
         ORDER BY view_count DESC`
      ).bind(dateRaw).all();

      // Per-user summary: one row per user with their total views and a
      // first/last touch time. The UI renders a sub-list of pages per user,
      // which we fetch in the same query (joined back) — but D1/SQLite makes
      // a single GROUP_CONCAT-style query awkward, so instead we issue two
      // queries and stitch them in JS.
      const { results: byUser } = await env.DB.prepare(
        `SELECT user_email, MAX(user_name) as user_name,
                COUNT(*) as view_count,
                COUNT(DISTINCT page_path) as pages_visited,
                MIN(viewed_at) as first_view,
                MAX(viewed_at) as last_view
         FROM page_views
         WHERE DATE(viewed_at) = ?
         GROUP BY user_email
         ORDER BY view_count DESC`
      ).bind(dateRaw).all();

      // Per-(user, page) detail — we'll attach these to each user row
      const { results: byUserPage } = await env.DB.prepare(
        `SELECT user_email, page_path, page_label,
                COUNT(*) as count,
                MAX(viewed_at) as last_viewed
         FROM page_views
         WHERE DATE(viewed_at) = ?
         GROUP BY user_email, page_path
         ORDER BY count DESC`
      ).bind(dateRaw).all();

      // Group the per-(user, page) rows by user
      const pagesByUser = new Map<string, any[]>();
      for (const row of byUserPage as any[]) {
        if (!pagesByUser.has(row.user_email)) pagesByUser.set(row.user_email, []);
        pagesByUser.get(row.user_email)!.push({
          page_path: row.page_path,
          page_label: row.page_label,
          count: row.count,
          last_viewed: row.last_viewed,
        });
      }
      const enrichedByUser = (byUser as any[]).map(u => ({
        ...u,
        pages: pagesByUser.get(u.user_email) ?? [],
      }));

      // Chronological timeline — useful for "what was the user doing at
      // 2pm?" — capped at 500 rows so payload stays bounded.
      const { results: timeline } = await env.DB.prepare(
        `SELECT user_email, user_name, page_path, page_label, viewed_at
         FROM page_views
         WHERE DATE(viewed_at) = ?
         ORDER BY viewed_at ASC
         LIMIT 500`
      ).bind(dateRaw).all();

      return new Response(JSON.stringify({
        date: dateRaw,
        total_views: headlineRow?.total_views || 0,
        unique_users: headlineRow?.unique_users || 0,
        by_user: enrichedByUser,
        by_page: byPage,
        timeline,
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

    // ──────────────────────────────────────────────────────────────────────
    // AI HUB — stage-aware solution library + Cloudflare GitHub skills RAG
    // ──────────────────────────────────────────────────────────────────────

    // List all solutions (with optional filters)
    if (pathname === '/api/ai-hub/solutions' && request.method === 'GET') {
      const url = new URL(request.url);
      const stage = url.searchParams.get('stage');
      const type = url.searchParams.get('type');
      const starter = url.searchParams.get('starter');
      const sort = url.searchParams.get('sort') || 'upvotes'; // upvotes | recent | uses
      const search = url.searchParams.get('q');
      // Optional comma-separated list of tags. A row matches if its `tags` JSON
      // array contains EVERY supplied tag. The new SE Messaging Playbooks
      // section uses this with `tag=playbook` (and an optional kind tag) to
      // load its content independently of the global Solution Type filter.
      const tag = url.searchParams.get('tag');

      const where: string[] = [];
      const params: any[] = [];
      if (stage && stage !== 'all') {
        where.push('(sales_stage = ? OR sales_stage = ?)');
        params.push(stage, 'all');
      }
      if (type && type !== 'all') {
        where.push('type = ?');
        params.push(type);
      }
      if (starter === '1') {
        where.push('is_starter = 1');
      } else if (starter === '0') {
        where.push('is_starter = 0');
      }
      if (search) {
        where.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(content) LIKE ?)');
        const s = `%${search.toLowerCase()}%`;
        params.push(s, s, s);
      }
      if (tag) {
        // Tags are stored as a JSON-stringified array (e.g. '["playbook","playbook:discovery"]').
        // We match each requested tag with a LIKE that brackets it in quotes so we
        // do not get false-positives from substring matches on a different tag.
        for (const t of tag.split(',').map(s => s.trim()).filter(Boolean)) {
          where.push('tags LIKE ?');
          params.push(`%"${t}"%`);
        }
      }

      let orderBy = 'is_pinned DESC, upvotes DESC, created_at DESC';
      if (sort === 'recent') orderBy = 'is_pinned DESC, created_at DESC';
      else if (sort === 'uses') orderBy = 'is_pinned DESC, uses DESC, upvotes DESC';
      else if (sort === 'alpha') orderBy = 'title ASC';

      const sql = `SELECT * FROM ai_solutions${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${orderBy} LIMIT 500`;
      const stmt = env.DB.prepare(sql);
      const { results } = params.length ? await stmt.bind(...params).all() : await stmt.all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // Aggregated stats for the hub header (counts per stage / type / total)
    //
    // Splits the count into `library` vs `playbook`. The library accordions
    // on /ai-hub explicitly hide playbook-tagged rows (they live on the AI
    // Coach tab instead), so the dashboard card and library hero pill
    // should report `library` — otherwise users see e.g. "22 solutions" on
    // the dashboard, click through, and land on an empty Library tab.
    //
    // Playbook artifacts are tagged with "playbook" inside the JSON tags
    // array — pattern-match that with LIKE since SQLite JSON1 isn't always
    // available on D1.
    if (pathname === '/api/ai-hub/stats' && request.method === 'GET') {
      const [byStage, byType, totals, skillsRow] = await Promise.all([
        env.DB.prepare(`SELECT sales_stage, COUNT(*) as count FROM ai_solutions GROUP BY sales_stage`).all(),
        env.DB.prepare(`SELECT type, COUNT(*) as count FROM ai_solutions GROUP BY type`).all(),
        env.DB.prepare(`SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_starter = 1 THEN 1 ELSE 0 END) as starters,
          SUM(CASE WHEN is_starter = 0 THEN 1 ELSE 0 END) as community,
          SUM(CASE WHEN tags LIKE '%"playbook"%' THEN 1 ELSE 0 END) as playbook,
          SUM(CASE WHEN tags IS NULL OR tags NOT LIKE '%"playbook"%' THEN 1 ELSE 0 END) as library,
          SUM(CASE WHEN is_starter = 1 AND (tags IS NULL OR tags NOT LIKE '%"playbook"%') THEN 1 ELSE 0 END) as library_starters,
          SUM(CASE WHEN is_starter = 0 AND (tags IS NULL OR tags NOT LIKE '%"playbook"%') THEN 1 ELSE 0 END) as library_community
          FROM ai_solutions`).first(),
        env.DB.prepare(`SELECT
          COUNT(*) as count,
          SUM(CASE WHEN status = 'indexed' THEN 1 ELSE 0 END) as indexed,
          SUM(chunks_count) as chunks,
          MAX(last_indexed_at) as last_indexed_at
          FROM cf_skills`).first(),
      ]);
      const t = totals as any;
      return new Response(JSON.stringify({
        // Library-only counts (drives the dashboard card + library hero pill)
        library: t?.library || 0,
        library_starters: t?.library_starters || 0,
        library_community: t?.library_community || 0,
        // Playbook count — for the coach tab and disambiguation when
        // the library is empty but playbook artifacts exist
        playbook: t?.playbook || 0,
        // Backward-compatible totals (kept so older clients keep working)
        total: t?.total || 0,
        starters: t?.starters || 0,
        community: t?.community || 0,
        by_stage: byStage.results || [],
        by_type: byType.results || [],
        skills: {
          count: (skillsRow as any)?.count || 0,
          indexed: (skillsRow as any)?.indexed || 0,
          chunks: (skillsRow as any)?.chunks || 0,
          last_indexed_at: (skillsRow as any)?.last_indexed_at || null,
        },
      }), { headers: corsHeaders });
    }

    // Get a single solution by id
    if (pathname.startsWith('/api/ai-hub/solutions/') && request.method === 'GET'
        && !pathname.endsWith('/upvote') && !pathname.endsWith('/use')) {
      const id = pathname.replace('/api/ai-hub/solutions/', '');
      const row = await env.DB.prepare('SELECT * FROM ai_solutions WHERE id = ?').bind(id).first();
      if (!row) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify(row), { headers: corsHeaders });
    }

    // Create a new solution (community contribution)
    if (pathname === '/api/ai-hub/solutions' && request.method === 'POST') {
      const data = await request.json() as any;
      if (!data.title || !data.content || !data.author_email) {
        return new Response(JSON.stringify({ error: 'title, content, and author_email are required' }), {
          status: 400, headers: corsHeaders,
        });
      }
      const id = data.id || `sol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : (data.tags || null);
      await env.DB.prepare(
        `INSERT INTO ai_solutions (id, type, title, description, content, sales_stage, product, tags,
          author_email, author_name, is_starter, is_pinned, icon, source_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        data.type || 'prompt',
        data.title,
        data.description || null,
        data.content,
        data.sales_stage || 'all',
        data.product || null,
        tags,
        data.author_email,
        data.author_name || data.author_email,
        data.is_starter ? 1 : 0,
        data.is_pinned ? 1 : 0,
        data.icon || null,
        data.source_url || null,
      ).run();
      const row = await env.DB.prepare('SELECT * FROM ai_solutions WHERE id = ?').bind(id).first();
      await logContentChange(env, {
        type: 'ai_solution', id, title: data.title, subtype: data.type || 'prompt',
        changeType: 'created',
        byEmail: data.editor_email || data.author_email || null,
        byName: data.editor_name || data.author_name || null,
      });
      return new Response(JSON.stringify(row), { headers: corsHeaders });
    }

    // Update an existing solution
    if (pathname.startsWith('/api/ai-hub/solutions/') && request.method === 'PUT') {
      const id = pathname.replace('/api/ai-hub/solutions/', '');
      const data = await request.json() as any;
      const tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : (data.tags || null);
      await env.DB.prepare(
        `UPDATE ai_solutions SET
           type = COALESCE(?, type),
           title = COALESCE(?, title),
           description = COALESCE(?, description),
           content = COALESCE(?, content),
           sales_stage = COALESCE(?, sales_stage),
           product = COALESCE(?, product),
           tags = COALESCE(?, tags),
           is_starter = COALESCE(?, is_starter),
           is_pinned = COALESCE(?, is_pinned),
           icon = COALESCE(?, icon),
           source_url = COALESCE(?, source_url),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(
        data.type ?? null,
        data.title ?? null,
        data.description ?? null,
        data.content ?? null,
        data.sales_stage ?? null,
        data.product ?? null,
        tags,
        data.is_starter !== undefined ? (data.is_starter ? 1 : 0) : null,
        data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : null,
        data.icon ?? null,
        data.source_url ?? null,
        id,
      ).run();
      const row = await env.DB.prepare('SELECT * FROM ai_solutions WHERE id = ?').bind(id).first() as any;
      await logContentChange(env, {
        type: 'ai_solution', id, title: row?.title || data.title, subtype: row?.type,
        changeType: 'updated',
        byEmail: data.editor_email || null,
        byName: data.editor_name || null,
      });
      return new Response(JSON.stringify(row), { headers: corsHeaders });
    }

    // Delete a solution
    if (pathname.startsWith('/api/ai-hub/solutions/') && request.method === 'DELETE') {
      const id = pathname.replace('/api/ai-hub/solutions/', '');
      const before = await env.DB.prepare('SELECT title, type FROM ai_solutions WHERE id = ?').bind(id).first() as any;
      await env.DB.prepare('DELETE FROM ai_solution_upvotes WHERE solution_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM ai_solution_uses WHERE solution_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM ai_solutions WHERE id = ?').bind(id).run();
      await logContentChange(env, {
        type: 'ai_solution', id, title: before?.title, subtype: before?.type,
        changeType: 'deleted',
        byEmail: url.searchParams.get('editor_email'),
        byName: url.searchParams.get('editor_name'),
      });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Toggle upvote on a solution (returns the new upvote count + whether the user has upvoted)
    if (pathname.match(/^\/api\/ai-hub\/solutions\/[^/]+\/upvote$/) && request.method === 'POST') {
      const id = pathname.split('/')[4];
      const data = await request.json() as any;
      if (!data.user_email) {
        return new Response(JSON.stringify({ error: 'user_email is required' }), {
          status: 400, headers: corsHeaders,
        });
      }
      const existing = await env.DB.prepare(
        'SELECT id FROM ai_solution_upvotes WHERE solution_id = ? AND user_email = ?'
      ).bind(id, data.user_email).first();

      let upvoted: boolean;
      if (existing) {
        await env.DB.prepare('DELETE FROM ai_solution_upvotes WHERE id = ?').bind((existing as any).id).run();
        await env.DB.prepare('UPDATE ai_solutions SET upvotes = MAX(0, upvotes - 1), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
        upvoted = false;
      } else {
        await env.DB.prepare(
          'INSERT INTO ai_solution_upvotes (id, solution_id, user_email) VALUES (?, ?, ?)'
        ).bind(`uv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, id, data.user_email).run();
        await env.DB.prepare('UPDATE ai_solutions SET upvotes = upvotes + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
        upvoted = true;
      }
      const row = await env.DB.prepare('SELECT upvotes FROM ai_solutions WHERE id = ?').bind(id).first() as any;
      return new Response(JSON.stringify({ success: true, upvoted, upvotes: row?.upvotes || 0 }), { headers: corsHeaders });
    }

    // Get the list of solution ids the user has upvoted (for highlighting in UI)
    if (pathname === '/api/ai-hub/upvotes' && request.method === 'GET') {
      const url = new URL(request.url);
      const userEmail = url.searchParams.get('user_email');
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'user_email is required' }), { status: 400, headers: corsHeaders });
      }
      const { results } = await env.DB.prepare(
        'SELECT solution_id FROM ai_solution_upvotes WHERE user_email = ?'
      ).bind(userEmail).all();
      return new Response(JSON.stringify((results || []).map((r: any) => r.solution_id)), { headers: corsHeaders });
    }

    // Track a use (view/copy/apply) — ignored if it errors out, never blocks the user
    if (pathname.match(/^\/api\/ai-hub\/solutions\/[^/]+\/use$/) && request.method === 'POST') {
      const id = pathname.split('/')[4];
      const data = await request.json() as any;
      try {
        await env.DB.prepare(
          `INSERT INTO ai_solution_uses (solution_id, user_email, user_name, action) VALUES (?, ?, ?, ?)`
        ).bind(id, data.user_email || null, data.user_name || null, data.action || 'view').run();
        await env.DB.prepare(`UPDATE ai_solutions SET uses = uses + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run();
      } catch (e) { /* swallow */ }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // List all indexed Cloudflare GitHub skills (with status)
    if (pathname === '/api/ai-hub/skills' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT id, name, description, source_url, github_repo, github_branch, github_path,
                chunks_count, byte_size, status, last_error, last_indexed_at, created_at, updated_at
         FROM cf_skills ORDER BY status DESC, name ASC`
      ).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // Get a single skill (with its full markdown content)
    if (pathname.startsWith('/api/ai-hub/skills/') && request.method === 'GET') {
      const id = pathname.replace('/api/ai-hub/skills/', '');
      const row = await env.DB.prepare('SELECT * FROM cf_skills WHERE id = ?').bind(id).first();
      if (!row) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify(row), { headers: corsHeaders });
    }

    // Discover skills in the cloudflare/skills GitHub repo (no embedding yet — just preview)
    if (pathname === '/api/ai-hub/skills/discover' && request.method === 'POST') {
      try {
        const data = await request.json().catch(() => ({})) as any;
        const repo = data.repo || 'cloudflare/skills';
        const branch = data.branch || 'main';
        const skillsDir = data.path || 'skills';

        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SolutionHub-AIHub/1.0',
        };
        // Optional GitHub token to lift rate limits (set with `wrangler secret put GITHUB_TOKEN`)
        if ((env as any).GITHUB_TOKEN) headers['Authorization'] = `Bearer ${(env as any).GITHUB_TOKEN}`;

        const listUrl = `https://api.github.com/repos/${repo}/contents/${skillsDir}?ref=${branch}`;
        const listRes = await fetch(listUrl, { headers });
        if (!listRes.ok) {
          const errText = await listRes.text().catch(() => '');
          return new Response(JSON.stringify({
            error: `GitHub API ${listRes.status}`, details: errText.slice(0, 200),
          }), { status: 502, headers: corsHeaders });
        }
        const dirs = await listRes.json() as any[];
        const skillFolders = (Array.isArray(dirs) ? dirs : []).filter(d => d.type === 'dir');
        const discovered = skillFolders.map(d => ({
          id: d.name,
          name: d.name,
          source_url: `https://raw.githubusercontent.com/${repo}/${branch}/${d.path}/SKILL.md`,
          github_path: `${d.path}/SKILL.md`,
          github_repo: repo,
          github_branch: branch,
        }));
        return new Response(JSON.stringify({ skills: discovered, count: discovered.length }), { headers: corsHeaders });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: 'Failed to discover skills', details: e.message }), {
          status: 500, headers: corsHeaders,
        });
      }
    }

    // Ingest one or more skills from GitHub: download SKILL.md, chunk, embed, upsert into VECTORIZE
    if (pathname === '/api/ai-hub/skills/ingest' && request.method === 'POST') {
      try {
        const data = await request.json().catch(() => ({})) as any;
        const repo = data.repo || 'cloudflare/skills';
        const branch = data.branch || 'main';
        const skillIds: string[] | null = Array.isArray(data.skills) && data.skills.length > 0 ? data.skills : null;

        const ghHeaders: Record<string, string> = {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'SolutionHub-AIHub/1.0',
        };
        if ((env as any).GITHUB_TOKEN) ghHeaders['Authorization'] = `Bearer ${(env as any).GITHUB_TOKEN}`;

        // If the caller didn't supply a list, discover all skills folders from the repo
        let toIngest: Array<{ id: string; path: string; rawUrl: string }> = [];
        if (skillIds) {
          toIngest = skillIds.map(id => ({
            id,
            path: `skills/${id}/SKILL.md`,
            rawUrl: `https://raw.githubusercontent.com/${repo}/${branch}/skills/${id}/SKILL.md`,
          }));
        } else {
          const listRes = await fetch(`https://api.github.com/repos/${repo}/contents/skills?ref=${branch}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SolutionHub-AIHub/1.0',
              ...((env as any).GITHUB_TOKEN ? { 'Authorization': `Bearer ${(env as any).GITHUB_TOKEN}` } : {}) },
          });
          if (!listRes.ok) {
            return new Response(JSON.stringify({ error: `GitHub list failed (${listRes.status})` }),
              { status: 502, headers: corsHeaders });
          }
          const dirs = await listRes.json() as any[];
          toIngest = (Array.isArray(dirs) ? dirs : [])
            .filter(d => d.type === 'dir')
            .map(d => ({
              id: d.name,
              path: `${d.path}/SKILL.md`,
              rawUrl: `https://raw.githubusercontent.com/${repo}/${branch}/${d.path}/SKILL.md`,
            }));
        }

        if (toIngest.length === 0) {
          return new Response(JSON.stringify({ error: 'No skills to ingest' }), { status: 400, headers: corsHeaders });
        }

        const ingestSummary: Array<{ id: string; status: string; chunks?: number; error?: string }> = [];

        for (const skill of toIngest) {
          try {
            // Mark as indexing
            await env.DB.prepare(
              `INSERT INTO cf_skills (id, name, source_url, github_repo, github_branch, github_path, status, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'indexing', CURRENT_TIMESTAMP)
               ON CONFLICT(id) DO UPDATE SET status = 'indexing', updated_at = CURRENT_TIMESTAMP,
                 source_url = excluded.source_url, github_path = excluded.github_path,
                 github_repo = excluded.github_repo, github_branch = excluded.github_branch`
            ).bind(skill.id, skill.id, skill.rawUrl, repo, branch, skill.path).run();

            const mdRes = await fetch(skill.rawUrl, { headers: ghHeaders });
            if (!mdRes.ok) throw new Error(`Fetch ${mdRes.status}`);
            const md = await mdRes.text();

            // Strip the YAML frontmatter and pull `name`/`description` out of it
            let frontmatterName = skill.id;
            let frontmatterDesc: string | null = null;
            let body = md;
            const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n?/);
            if (fmMatch) {
              const fm = fmMatch[1];
              const nameMatch = fm.match(/^name:\s*(.+)$/m);
              const descMatch = fm.match(/^description:\s*([\s\S]+?)(?=\n[a-z_-]+:|\n*$)/m);
              if (nameMatch) frontmatterName = nameMatch[1].trim();
              if (descMatch) frontmatterDesc = descMatch[1].trim().replace(/\n\s+/g, ' ');
              body = md.slice(fmMatch[0].length);
            }

            // Chunk the body. We use a simple ~700-char window with 100-char overlap which
            // works well for SKILL.md files (mostly headings + bulleted rules).
            const chunks: string[] = [];
            const target = 800;
            const overlap = 100;
            let pos = 0;
            while (pos < body.length) {
              const end = Math.min(pos + target, body.length);
              const slice = body.slice(pos, end).trim();
              if (slice.length > 50) chunks.push(slice);
              if (end === body.length) break;
              pos = end - overlap;
              if (pos < 0) pos = 0;
            }
            if (chunks.length === 0) chunks.push(body.trim());

            // Remove any previously indexed chunks for this skill (keeps things idempotent)
            const oldVecs = await env.DB.prepare(
              'SELECT id FROM cf_skill_vectors WHERE skill_id = ?'
            ).bind(skill.id).all();
            const oldIds = (oldVecs.results || []).map((r: any) => r.id);
            if (oldIds.length > 0) {
              try { await env.VECTORIZE.deleteByIds(oldIds); } catch (e) { /* ignore */ }
              await env.DB.prepare('DELETE FROM cf_skill_vectors WHERE skill_id = ?').bind(skill.id).run();
            }

            // Embed + upsert each chunk
            let chunkIdx = 0;
            for (const chunkText of chunks) {
              const vectorId = `cfskill-${skill.id}-${chunkIdx}-${Date.now()}`;
              const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [chunkText] });
              const vector = embeddings.data[0];
              await env.VECTORIZE.upsert([{
                id: vectorId,
                values: vector,
                metadata: {
                  kind: 'cf-skill',
                  skill_id: skill.id,
                  skill_name: frontmatterName,
                  description: frontmatterDesc || '',
                  chunk_index: chunkIdx,
                  source_url: skill.rawUrl,
                  text: chunkText.slice(0, 500), // keep the metadata small but useful for citations
                },
              }]);
              await env.DB.prepare(
                `INSERT INTO cf_skill_vectors (id, skill_id, chunk_index, chunk_text, byte_size)
                 VALUES (?, ?, ?, ?, ?)`
              ).bind(vectorId, skill.id, chunkIdx, chunkText, chunkText.length).run();
              chunkIdx++;
            }

            // Save the full markdown + mark indexed
            await env.DB.prepare(
              `UPDATE cf_skills SET
                 name = ?,
                 description = ?,
                 content = ?,
                 chunks_count = ?,
                 byte_size = ?,
                 status = 'indexed',
                 last_error = NULL,
                 last_indexed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(frontmatterName, frontmatterDesc, md, chunks.length, md.length, skill.id).run();

            ingestSummary.push({ id: skill.id, status: 'indexed', chunks: chunks.length });
          } catch (e: any) {
            await env.DB.prepare(
              `UPDATE cf_skills SET status = 'failed', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
            ).bind(e.message || 'Unknown error', skill.id).run();
            ingestSummary.push({ id: skill.id, status: 'failed', error: e.message });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          ingested: ingestSummary.filter(s => s.status === 'indexed').length,
          failed: ingestSummary.filter(s => s.status === 'failed').length,
          results: ingestSummary,
        }), { headers: corsHeaders });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: 'Skill ingestion failed', details: e.message }),
          { status: 500, headers: corsHeaders });
      }
    }

    // Delete an indexed skill (and its vectors)
    if (pathname.startsWith('/api/ai-hub/skills/') && request.method === 'DELETE') {
      const id = pathname.replace('/api/ai-hub/skills/', '');
      const oldVecs = await env.DB.prepare(
        'SELECT id FROM cf_skill_vectors WHERE skill_id = ?'
      ).bind(id).all();
      const oldIds = (oldVecs.results || []).map((r: any) => r.id);
      if (oldIds.length > 0) {
        try { await env.VECTORIZE.deleteByIds(oldIds); } catch (e) { /* ignore */ }
      }
      await env.DB.prepare('DELETE FROM cf_skill_vectors WHERE skill_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM cf_skills WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true, deleted_vectors: oldIds.length }), { headers: corsHeaders });
    }

    // ──────────────────────────────────────────────────────────────────────
    // AI Hub chat — stage-aware messaging coach with skill-grounded RAG
    // ──────────────────────────────────────────────────────────────────────

    if (pathname === '/api/ai-hub/chat' && request.method === 'POST') {
      const t0 = Date.now();
      try {
        const data = await request.json() as any;
        const message: string = (data.message || '').trim();
        const stage: string = data.sales_stage || 'all';
        const sessionId: string = data.session_id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const userEmail: string | null = data.user_email || null;
        const userName: string | null = data.user_name || null;
        const history: Array<{ role: 'user' | 'assistant'; content: string }> = Array.isArray(data.history) ? data.history.slice(-6) : [];
        const contextSolutionIds: string[] = Array.isArray(data.context_solution_ids) ? data.context_solution_ids : [];
        // mcp_context is gathered browser-side via lib/mcp.ts (cf-portal MCP
        // search over wiki + Backstage techdocs + catalog + Cloudflare docs).
        // The browser does the OAuth dance under the user's identity, so the
        // results respect their permissions. We just inject the text into
        // the prompt as one more retrieval source — best effort.
        const mcpContextRaw = data.mcp_context;
        const mcpContext: Array<{ source: string; text: string }> = Array.isArray(mcpContextRaw)
          ? mcpContextRaw.filter((c: any) => c && typeof c.text === 'string' && c.text.trim().length > 0)
          : [];

        if (!message) {
          return new Response(JSON.stringify({ error: 'message is required' }),
            { status: 400, headers: corsHeaders });
        }

        // Pull any solutions the user attached as context
        let solutionContext = '';
        if (contextSolutionIds.length > 0) {
          const placeholders = contextSolutionIds.map(() => '?').join(',');
          const { results: sols } = await env.DB.prepare(
            `SELECT title, type, content FROM ai_solutions WHERE id IN (${placeholders})`
          ).bind(...contextSolutionIds).all();
          if (sols && sols.length > 0) {
            solutionContext = '\n\n## Solutions the user attached as context\n' +
              sols.map((s: any) => `### ${s.title} (${s.type})\n${s.content}`).join('\n\n');
          }
        }

        // Compose MCP grounding block (if the browser provided any)
        let mcpGrounding = '';
        if (mcpContext.length > 0) {
          // Cap each source to 4kb so the prompt stays under model limits
          const trimmed = mcpContext.map(c => ({
            source: c.source,
            text: (c.text || '').slice(0, 4000),
          }));
          mcpGrounding = '\n\n## cf-portal MCP grounding (live, signed in as the user)\n\n' +
            trimmed.map((c, i) => `### [mcp:${c.source} #${i + 1}]\n${c.text}`).join('\n\n---\n\n');
        }

        // RAG: embed the question, retrieve top-K Cloudflare skill chunks
        let citations: Array<{ skill_id: string; skill_name: string; snippet: string; score: number; source_url: string }> = [];
        let skillContext = '';
        try {
          const qEmbed = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [message] });
          const queryVec = qEmbed.data[0];
          const matches = await env.VECTORIZE.query(queryVec, {
            topK: 6,
            returnMetadata: true,
            filter: { kind: 'cf-skill' },
          });
          const goodMatches = (matches.matches || []).filter(m => (m.score || 0) > 0.4);
          if (goodMatches.length > 0) {
            // Pull full chunk text from D1 (the metadata only stores a 500-char preview)
            const ids = goodMatches.map(m => m.id);
            const placeholders = ids.map(() => '?').join(',');
            const { results: chunkRows } = await env.DB.prepare(
              `SELECT id, skill_id, chunk_text FROM cf_skill_vectors WHERE id IN (${placeholders})`
            ).bind(...ids).all();
            const chunkLookup = new Map<string, string>();
            (chunkRows || []).forEach((r: any) => chunkLookup.set(r.id, r.chunk_text));

            const skillNames = new Map<string, string>();
            for (const m of goodMatches) {
              const meta = m.metadata as any;
              skillNames.set(meta.skill_id, meta.skill_name || meta.skill_id);
            }

            citations = goodMatches.map(m => {
              const meta = m.metadata as any;
              const fullChunk = chunkLookup.get(m.id) || meta.text || '';
              return {
                skill_id: meta.skill_id,
                skill_name: meta.skill_name || meta.skill_id,
                snippet: fullChunk.slice(0, 350),
                score: m.score || 0,
                source_url: meta.source_url || '',
              };
            });

            skillContext = '\n\n## Relevant Cloudflare GitHub Skills (verbatim from the cloudflare/skills repo)\n\n' +
              goodMatches.map((m, i) => {
                const meta = m.metadata as any;
                const fullChunk = chunkLookup.get(m.id) || meta.text || '';
                return `### [${i + 1}] ${meta.skill_name} (score ${(m.score || 0).toFixed(2)})\nSource: ${meta.source_url}\n\n${fullChunk}`;
              }).join('\n\n---\n\n');
          }
        } catch (ragErr) {
          console.error('AI Hub chat RAG failed:', ragErr);
          // Non-fatal — fall back to general AI knowledge
        }

        // Stage-specific system prompt
        const stageGuidance: Record<string, string> = {
          'all': 'The seller has not picked a specific stage. Give well-rounded advice that applies broadly.',
          'running-business': 'The seller is preparing for, running, or following up on customer meetings. Optimize for: meeting prep checklists, briefing docs, agenda design, action items, follow-up emails, internal handoffs, and time-on-task efficiency.',
          'account-planning': 'The seller is in Account Planning & Prospecting. Optimize for: ICP fit, propensity scoring, account research, stakeholder mapping, point-of-view development, outreach copy, value hypothesis, and engagement plans.',
          'qualification': 'The seller is in Qualification & Discovery. Optimize for: discovery questions, MEDDPICC/MEDDIC qualification, pain framing, problem-solution fit, business value framing, current state mapping, and uncovering technical and economic decision criteria.',
          'solution-design': 'The seller is in Solution Design & Proposal. Optimize for: solution architecture narratives, technical validation, ROI modeling, mutual action plans, technical demo design, proof-of-value scoping, RFP responses, and competitive positioning.',
          'negotiation': 'The seller is in Negotiation & Close. Optimize for: objection handling, procurement navigation, paper process, T&Cs negotiation, price defense, multi-year framing, ROI re-affirmation, deal desk strategy, and approval choreography.',
          'renewals': 'The seller is in Renewals & Retention. Optimize for: business reviews, value realization stories, expansion plays, churn risk mitigation, multi-year renewal framing, executive sponsor mapping, and adoption plans.',
        };
        const stageBlock = stageGuidance[stage] || stageGuidance['all'];

        const systemPrompt = `You are an elite Solutions Engineering coach for the Cloudflare sales team. You help SEs craft sharper messaging, stronger discovery, more durable solution narratives, and clearer customer-facing artifacts.

## Stage context
${stageBlock}

## How to answer
- Be direct, structured, and immediately useful. Default to bullet lists, talk tracks, or templates the SE can copy-paste.
- When you reference a Cloudflare capability, ground it in the retrieved skill content below. Quote a short snippet when it is decisive.
- If the retrieved skills do not cover something the user asks about, say so plainly and offer a general best-practice answer using your training. Never fabricate Cloudflare features, metrics, or product names.
- When relevant, suggest 1-3 concrete next steps the SE can take in their CRM, deck, or customer email.
- Keep answers under ~400 words unless the user explicitly asks for a long-form draft.
- Only mention "335+ points of presence" — never "data centers" or "cities" — when describing Cloudflare's network.
- Do NOT invent pricing, contract terms, or roadmap commitments.

## Citation style
At the end of your answer, if you used retrieved skills, list them as a "Sources" section with the skill names. When you draw on the cf-portal MCP grounding (wiki, Backstage, etc.), credit it as "Source: cf-portal MCP — <source>". Do not fabricate sources.${skillContext}${solutionContext}${mcpGrounding}`;

        const messages: Array<{ role: string; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ];

        const aiResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages,
          max_tokens: 1200,
          temperature: 0.5,
        });

        const reply = (aiResponse.response || '').trim() ||
          'I could not generate a response. Try rephrasing your question or selecting a more specific sales stage.';

        const latency = Date.now() - t0;

        // Persist both turns (best effort)
        try {
          await env.DB.prepare(
            `INSERT INTO ai_chat_messages (session_id, user_email, user_name, role, content, sales_stage, context_solution_ids)
             VALUES (?, ?, ?, 'user', ?, ?, ?)`
          ).bind(sessionId, userEmail, userName, message, stage,
            contextSolutionIds.length ? JSON.stringify(contextSolutionIds) : null).run();
          await env.DB.prepare(
            `INSERT INTO ai_chat_messages (session_id, user_email, user_name, role, content, sales_stage, citations, latency_ms)
             VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?)`
          ).bind(sessionId, userEmail, userName, reply, stage,
            citations.length ? JSON.stringify(citations) : null, latency).run();
        } catch (e) {
          console.error('Failed to persist AI Hub chat turn', e);
        }

        return new Response(JSON.stringify({
          reply,
          session_id: sessionId,
          citations,
          stage,
          latency_ms: latency,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
          retrieved_skills: citations.length,
          mcp_sources_used: mcpContext.length,
        }), { headers: corsHeaders });
      } catch (e: any) {
        console.error('AI Hub chat error:', e);
        return new Response(JSON.stringify({ error: 'Chat failed', details: e.message }),
          { status: 500, headers: corsHeaders });
      }
    }

    // Past chat sessions for the current user (last 30)
    if (pathname === '/api/ai-hub/chat/sessions' && request.method === 'GET') {
      const url = new URL(request.url);
      const userEmail = url.searchParams.get('user_email');
      if (!userEmail) {
        return new Response(JSON.stringify({ error: 'user_email is required' }),
          { status: 400, headers: corsHeaders });
      }
      const { results } = await env.DB.prepare(
        `SELECT session_id, sales_stage,
                MIN(created_at) as started_at,
                MAX(created_at) as last_at,
                COUNT(*) as turns,
                (SELECT content FROM ai_chat_messages c2
                 WHERE c2.session_id = ai_chat_messages.session_id AND c2.role = 'user'
                 ORDER BY created_at ASC LIMIT 1) as first_user_message
         FROM ai_chat_messages
         WHERE user_email = ?
         GROUP BY session_id
         ORDER BY last_at DESC
         LIMIT 30`
      ).bind(userEmail).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // Full transcript of one chat session
    if (pathname.startsWith('/api/ai-hub/chat/sessions/') && request.method === 'GET') {
      const sessionId = pathname.replace('/api/ai-hub/chat/sessions/', '');
      const { results } = await env.DB.prepare(
        `SELECT id, role, content, sales_stage, citations, created_at
         FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at ASC`
      ).bind(sessionId).all();
      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
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
