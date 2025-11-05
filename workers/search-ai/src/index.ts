export interface Env {
	AI: Ai;
	VECTORIZE: VectorizeIndex;
}

interface SearchResult {
	id: string;
	title: string;
	description: string;
	type: 'asset' | 'script' | 'event' | 'shoutout';
	url: string;
	icon: string;
	metadata?: string;
	score?: number;
}

const API_BASE = 'https://seportal-api.arunpotta1024.workers.dev';

// Fetch all content from the D1 database API
async function fetchContentDatabase(): Promise<SearchResult[]> {
	try {
		console.log('Fetching from API:', API_BASE);

		const [urlAssets, fileAssets, scripts, events, shoutouts] = await Promise.all([
			fetch(`${API_BASE}/api/url-assets`).then(async r => {
				const text = await r.text();
				console.log('url-assets response:', text.substring(0, 100));
				return JSON.parse(text);
			}),
			fetch(`${API_BASE}/api/file-assets`).then(async r => {
				const text = await r.text();
				console.log('file-assets response:', text.substring(0, 100));
				return JSON.parse(text);
			}),
			fetch(`${API_BASE}/api/scripts`).then(async r => {
				const text = await r.text();
				console.log('scripts response:', text.substring(0, 100));
				return JSON.parse(text);
			}),
			fetch(`${API_BASE}/api/events`).then(async r => {
				const text = await r.text();
				console.log('events response:', text.substring(0, 100));
				return JSON.parse(text);
			}),
			fetch(`${API_BASE}/api/shoutouts`).then(async r => {
				const text = await r.text();
				console.log('shoutouts response:', text.substring(0, 100));
				return JSON.parse(text);
			}),
		]);

		console.log('Fetched data counts:', {
			urlAssets: urlAssets.length,
			fileAssets: fileAssets.length,
			scripts: scripts.length,
			events: events.length,
			shoutouts: shoutouts.length
		});

		const content: SearchResult[] = [
			// URL Assets
			...urlAssets.map((a: any) => ({
				id: `url-${a.id}`,
				title: a.title,
				description: a.description,
				type: 'asset' as const,
				url: '/assets',
				icon: a.icon || '📦',
				metadata: `${a.category}, ${Array.isArray(a.tags) ? a.tags.join(', ') : a.tags || ''}`
			})),
			// File Assets
			...fileAssets.map((a: any) => ({
				id: `file-${a.id}`,
				title: a.name,
				description: a.description || 'File asset',
				type: 'asset' as const,
				url: '/assets',
				icon: a.icon || '📄',
				metadata: `${a.category}, File`
			})),
			// Scripts
			...scripts.map((s: any) => ({
				id: `script-${s.id}`,
				title: s.name || s.title,
				description: s.description,
				type: 'script' as const,
				url: '/scripts',
				icon: s.icon || '💻',
				metadata: `${s.language}, ${s.category}`
			})),
			// Events
			...events.map((e: any) => ({
				id: `event-${e.id}`,
				title: e.title,
				description: e.description,
				type: 'event' as const,
				url: '/events',
				icon: e.icon || '📅',
				metadata: `${e.type}, ${e.date}, ${e.location}`
			})),
			// Shoutouts
			...shoutouts.map((s: any) => ({
				id: `shoutout-${s.id}`,
				title: `${s.to_user} - ${s.category}`,
				description: s.message,
				type: 'shoutout' as const,
				url: '/shoutouts',
				icon: s.icon || '🎉',
				metadata: `from ${s.from_user}, ${s.date}`
			}))
		];

		console.log('Total content items:', content.length);
		return content;
	} catch (error) {
		console.error('Error fetching content database:', error);
		return [];
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url);

		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({ status: 'ok', ai: 'enabled' }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Initialize embeddings endpoint
		if (url.pathname === '/init-embeddings' && request.method === 'POST') {
			try {
				console.log('Fetching live content from database...');
				const contentDatabase = await fetchContentDatabase();

				if (contentDatabase.length === 0) {
					return new Response(JSON.stringify({
						error: 'No content found in database'
					}), {
						status: 500,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				console.log(`Generating embeddings for ${contentDatabase.length} items...`);

				// Generate embeddings for all content
				for (const item of contentDatabase) {
					const text = `${item.title} ${item.description} ${item.metadata || ''} ${item.type}`;

					const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
						text: [text]
					});

					// Store in Vectorize
					await env.VECTORIZE.upsert([
						{
							id: item.id,
							values: embeddings.data[0],
							metadata: {
								title: item.title,
								description: item.description,
								type: item.type,
								url: item.url,
								icon: item.icon,
								metadata: item.metadata || ''
							}
						}
					]);
				}

				return new Response(JSON.stringify({
					success: true,
					message: `Initialized ${contentDatabase.length} embeddings from live database`
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			} catch (error) {
				console.error('Error initializing embeddings:', error);
				return new Response(JSON.stringify({
					error: 'Failed to initialize embeddings',
					details: error.message
				}), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}
		}

		// Search endpoint
		if (url.pathname === '/search' && request.method === 'POST') {
			try {
				const { query } = await request.json() as { query: string };

				if (!query || query.trim().length === 0) {
					return new Response(JSON.stringify({ results: [] }), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				// Generate embedding for the query
				const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
					text: [query]
				});

				// Search in Vectorize
				const results = await env.VECTORIZE.query(queryEmbedding.data[0], {
					topK: 8,
					returnMetadata: true
				});

				// Format results
				const formattedResults = results.matches.map(match => ({
					id: match.id,
					title: match.metadata?.title,
					description: match.metadata?.description,
					type: match.metadata?.type,
					url: match.metadata?.url,
					icon: match.metadata?.icon,
					metadata: match.metadata?.metadata,
					score: match.score
				}));

				return new Response(JSON.stringify({
					results: formattedResults,
					query,
					model: '@cf/baai/bge-base-en-v1.5'
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			} catch (error) {
				console.error('Search error:', error);
				return new Response(JSON.stringify({
					error: 'Search failed',
					details: error.message
				}), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}
		}

		// Default response
		return new Response(JSON.stringify({
			error: 'Not found',
			endpoints: [
				'POST /search - Semantic search with Workers AI',
				'POST /init-embeddings - Initialize vector embeddings',
				'GET /health - Health check'
			]
		}), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
};
