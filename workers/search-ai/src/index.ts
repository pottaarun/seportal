export interface Env {
	AI: Ai;
	VECTORIZE: VectorizeIndex;
	// Shared with the main API worker. We only use the `searchidx:*` key prefix here
	// to track which vector IDs are currently indexed (for pruning) and last-rebuild meta.
	KV: KVNamespace;
	// Service binding to seportal-api. We call it over Cloudflare's internal RPC
	// (env.API.fetch) instead of the public workers.dev URL — worker→worker fetches
	// over the public internet get blocked/loop back, and this is faster + cheaper.
	API: Fetcher;
}

interface SearchResult {
	id: string;
	title: string;
	description: string;
	type: 'asset' | 'script' | 'event' | 'shoutout' | 'video' | 'announcement' | 'competition';
	url: string;
	icon: string;
	metadata?: string;
	score?: number;
}

// KV keys (namespaced so we don't collide with the main API worker's keys).
const KV_IDS_KEY = 'searchidx:ids';   // JSON string[] of vector IDs currently in the index
const KV_META_KEY = 'searchidx:meta'; // JSON { indexed, pruned, at, complete }

const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';
const EMBED_BATCH = 25;   // texts per Workers AI call
const UPSERT_BATCH = 100; // vectors per Vectorize upsert
const DELETE_BATCH = 100; // vectors per Vectorize deleteByIds

/**
 * Fetch all searchable portal content from the main API and normalise it into a
 * flat SearchResult[] whose IDs / URLs / icons MATCH the frontend's client-side
 * index (pages-app GlobalSearch.tsx). Keeping them identical lets the frontend
 * merge semantic hits with its always-on lexical results by `id` without dupes.
 *
 * Returns `complete: false` if ANY endpoint failed, so the caller can skip
 * pruning and avoid wiping the index due to a transient API blip.
 */
async function fetchContentDatabase(env: Env): Promise<{ items: SearchResult[]; complete: boolean }> {
	let complete = true;
	const get = async (path: string): Promise<any[]> => {
		try {
			// Internal RPC via the service binding; host is arbitrary (api routes on pathname).
			const r = await env.API.fetch(`https://seportal-api${path}`);
			if (!r.ok) { complete = false; return []; }
			const data = await r.json();
			return Array.isArray(data) ? data : [];
		} catch (e) {
			console.error(`fetchContentDatabase: ${path} failed`, e);
			complete = false;
			return [];
		}
	};

	const [urlAssets, fileAssets, scripts, events, shoutouts, videos, announcements, competitions] =
		await Promise.all([
			get('/api/url-assets'),
			get('/api/file-assets'),
			get('/api/scripts'),
			get('/api/events'),
			get('/api/shoutouts'),
			get('/api/videos'),
			get('/api/announcements'),
			get('/api/competitions'),
		]);

	const items: SearchResult[] = [
		...urlAssets.map((a: any) => ({
			id: `asset-${a.id}`,
			title: a.title,
			description: `${a.description || ''} ${a.title || ''}`.trim(),
			type: 'asset' as const,
			url: '/assets',
			icon: a.icon || '📦',
			metadata: `${a.category || ''}, ${Array.isArray(a.tags) ? a.tags.join(', ') : a.tags || ''}, owner: ${a.owner || ''}, URL: ${a.url || ''}`,
		})),
		...fileAssets.map((a: any) => ({
			id: `file-${a.id}`,
			title: a.name,
			description: `${a.description || ''} ${a.name || ''}`.trim(),
			type: 'asset' as const,
			url: '/assets',
			icon: a.icon || '📄',
			metadata: `${a.category || ''}, ${a.name || ''}, File, owner: ${a.owner || ''}, type: ${a.type || ''}`,
		})),
		...scripts.map((s: any) => ({
			id: `script-${s.id}`,
			title: s.name || s.title,
			description: `${s.description || ''} ${s.name || s.title || ''}`.trim(),
			type: 'script' as const,
			url: '/scripts',
			icon: s.icon || '💻',
			metadata: `${s.language || ''}, ${s.category || ''}, author: ${s.author || ''}`,
		})),
		...events.map((e: any) => ({
			id: `event-${e.id}`,
			title: e.title,
			description: `${e.description || ''} ${e.title || ''}`.trim(),
			type: 'event' as const,
			url: '/events',
			icon: e.icon || '📅',
			metadata: `${e.type || ''}, ${e.date || ''}, ${e.location || ''}`,
		})),
		...shoutouts.map((s: any) => ({
			id: `shoutout-${s.id}`,
			title: `${s.to_user || ''} - ${s.category || ''}`,
			description: `${s.message || ''} To: ${s.to_user || ''} From: ${s.from_user || ''}`.trim(),
			type: 'shoutout' as const,
			url: '/shoutouts',
			icon: s.icon || '🎉',
			metadata: `${s.category || ''}, from ${s.from_user || ''}, to ${s.to_user || ''}, ${s.date || ''}`,
		})),
		...videos.map((v: any) => ({
			id: `video-${v.id}`,
			title: v.title,
			description: `${v.description || ''} ${v.title || ''}`.trim(),
			type: 'video' as const,
			url: `/learning?v=${v.id}`,
			icon: '🎬',
			metadata: `${v.category || 'General'}, uploaded by ${v.uploader_name || v.uploader_email || ''}`,
		})),
		...announcements.map((a: any) => ({
			id: `announcement-${a.id}`,
			title: a.title,
			description: `${a.message || ''} ${a.title || ''}`.trim(),
			type: 'announcement' as const,
			url: '/announcements',
			icon: '📢',
			metadata: `${a.priority || ''}, by ${a.author || ''}, ${a.date || ''}`,
		})),
		...competitions.map((c: any) => ({
			id: `competition-${c.id}`,
			title: c.title,
			description: `${c.description || ''} ${c.title || ''}`.trim(),
			type: 'competition' as const,
			url: '/competitions',
			icon: '🏆',
			metadata: `${c.status || ''}, ${c.category || ''}, prize: ${c.prize || 'N/A'}, ${c.participants || 0} participants`,
		})),
	].filter((i) => i.id && i.title); // drop malformed rows (missing id/title)

	console.log('fetchContentDatabase counts:', {
		urlAssets: urlAssets.length, fileAssets: fileAssets.length, scripts: scripts.length,
		events: events.length, shoutouts: shoutouts.length, videos: videos.length,
		announcements: announcements.length, competitions: competitions.length,
		total: items.length, complete,
	});

	return { items, complete };
}

function embedText(item: SearchResult): string {
	return `${item.title} ${item.description} ${item.metadata || ''} ${item.type}`.trim();
}

/**
 * (Re)build the whole semantic index from the live portal content:
 *   1. fetch + normalise content
 *   2. batch-embed and upsert every item
 *   3. PRUNE vectors whose IDs are no longer present (using the ID set stored in KV)
 *
 * Pruning is skipped when the fetch was incomplete (any endpoint failed) so a
 * transient API error can never wipe the index. Used by both POST /init-embeddings
 * and the scheduled() cron.
 */
async function rebuildIndex(env: Env): Promise<{ indexed: number; pruned: number; total: number; complete: boolean; skipped?: string }> {
	const { items, complete } = await fetchContentDatabase(env);

	if (items.length === 0) {
		// Never prune to empty on a bad/empty fetch.
		return { indexed: 0, pruned: 0, total: 0, complete, skipped: 'no-content' };
	}

	// ---- Embed + upsert in batches ----
	let pending: Array<{ id: string; values: number[]; metadata: Record<string, any> }> = [];
	const flush = async () => {
		if (pending.length === 0) return;
		await env.VECTORIZE.upsert(pending);
		pending = [];
	};

	for (let b = 0; b < items.length; b += EMBED_BATCH) {
		const batch = items.slice(b, b + EMBED_BATCH);
		const texts = batch.map(embedText);
		const emb = await env.AI.run(EMBED_MODEL, { text: texts }) as { data: number[][] };
		for (let k = 0; k < batch.length; k++) {
			const item = batch[k];
			pending.push({
				id: item.id,
				values: emb.data[k],
				metadata: {
					title: item.title,
					description: item.description,
					type: item.type,
					url: item.url,
					icon: item.icon,
					metadata: item.metadata || '',
				},
			});
			if (pending.length >= UPSERT_BATCH) await flush();
		}
	}
	await flush();

	const newIds = items.map((i) => i.id);

	// ---- Prune removed items ----
	let pruned = 0;
	if (complete) {
		let prev: string[] = [];
		try {
			const raw = await env.KV.get(KV_IDS_KEY);
			if (raw) prev = JSON.parse(raw);
		} catch { /* ignore corrupt state; treat as empty */ }

		const newSet = new Set(newIds);
		const removed = prev.filter((id) => !newSet.has(id));
		for (let i = 0; i < removed.length; i += DELETE_BATCH) {
			await env.VECTORIZE.deleteByIds(removed.slice(i, i + DELETE_BATCH));
		}
		pruned = removed.length;

		// Only persist the authoritative ID set when the fetch was complete.
		await env.KV.put(KV_IDS_KEY, JSON.stringify(newIds));
	}

	await env.KV.put(KV_META_KEY, JSON.stringify({
		indexed: newIds.length, pruned, complete, at: new Date().toISOString(),
	}));

	console.log('rebuildIndex done:', { indexed: newIds.length, pruned, total: items.length, complete });
	return { indexed: newIds.length, pruned, total: items.length, complete };
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url);

		// Health check — also reports last rebuild meta so the index's freshness is observable.
		if (url.pathname === '/health') {
			let meta: any = null;
			try { const raw = await env.KV.get(KV_META_KEY); if (raw) meta = JSON.parse(raw); } catch { /* ignore */ }
			return new Response(JSON.stringify({ status: 'ok', ai: 'enabled', index: meta }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Rebuild the index from live content (manual trigger; same code path as the cron).
		if (url.pathname === '/init-embeddings' && request.method === 'POST') {
			try {
				const result = await rebuildIndex(env);
				if (result.skipped) {
					return new Response(JSON.stringify({ error: 'No content found in database', ...result }), {
						status: 502,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				}
				return new Response(JSON.stringify({
					success: true,
					message: `Indexed ${result.indexed} items${result.complete ? `, pruned ${result.pruned}` : ' (partial fetch — pruning skipped)'}`,
					...result,
				}), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
			} catch (error: any) {
				console.error('init-embeddings error:', error);
				return new Response(JSON.stringify({ error: 'Failed to initialize embeddings', details: error?.message || String(error) }), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
		}

		// Semantic search: embed the query, query Vectorize, return top matches.
		if (url.pathname === '/search' && request.method === 'POST') {
			try {
				const { query } = await request.json() as { query: string };
				if (!query || query.trim().length === 0) {
					return new Response(JSON.stringify({ results: [] }), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				}

				const queryEmbedding = await env.AI.run(EMBED_MODEL, { text: [query] }) as { data: number[][] };
				const results = await env.VECTORIZE.query(queryEmbedding.data[0], {
					topK: 12,
					returnMetadata: true,
				});

				const formattedResults = results.matches.map((match) => ({
					id: match.id,
					title: match.metadata?.title,
					description: match.metadata?.description,
					type: match.metadata?.type,
					url: match.metadata?.url,
					icon: match.metadata?.icon,
					metadata: match.metadata?.metadata,
					score: match.score,
				}));

				return new Response(JSON.stringify({ results: formattedResults, query, model: EMBED_MODEL }), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			} catch (error: any) {
				console.error('Search error:', error);
				return new Response(JSON.stringify({ error: 'Search failed', details: error?.message || String(error) }), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
		}

		return new Response(JSON.stringify({
			error: 'Not found',
			endpoints: [
				'POST /search - Semantic search with Workers AI',
				'POST /init-embeddings - Rebuild vector embeddings from live content (also runs on a daily cron)',
				'GET /health - Health check + last rebuild meta',
			],
		}), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
	},

	// Daily automated refresh: keeps the index fresh and prunes deleted content
	// so semantic search never drifts stale (the reason the old index was abandoned).
	async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(
			rebuildIndex(env)
				.then((r) => console.log('scheduled rebuild complete:', r))
				.catch((e) => console.error('scheduled rebuild failed:', e)),
		);
	},
};
