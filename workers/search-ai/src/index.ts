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

// Content database - in production, this would come from D1/KV
const contentDatabase: SearchResult[] = [
	// Assets
	{ id: 'a1', title: 'Cloudflare Workers Logo', description: 'Official Workers logo in SVG format for presentations and documentation', type: 'asset', url: '/assets', icon: '🖼️', metadata: 'SVG, Logo, Branding, Design' },
	{ id: 'a2', title: 'API Documentation', description: 'Complete REST API reference guide with examples and authentication flows', type: 'asset', url: '/assets', icon: '📄', metadata: 'PDF, Documentation, API, Reference' },
	{ id: 'a3', title: 'Architecture Diagram', description: 'System architecture overview showing microservices and data flow', type: 'asset', url: '/assets', icon: '📊', metadata: 'PNG, Architecture, Diagram, Infrastructure' },
	{ id: 'a4', title: 'Cloudflare Security Whitepaper', description: 'Comprehensive security features and compliance documentation', type: 'asset', url: '/assets', icon: '🔒', metadata: 'PDF, Security, Compliance, Enterprise' },
	{ id: 'a5', title: 'Product Demo Video', description: 'Customer-facing product demonstration and feature walkthrough', type: 'asset', url: '/assets', icon: '🎥', metadata: 'Video, Demo, Tutorial, Training' },

	// Scripts
	{ id: 's1', title: 'Cloudflare API Auth Helper', description: 'Quick authentication setup for Cloudflare API calls with token management', type: 'script', url: '/scripts', icon: '🔑', metadata: 'JavaScript, API, Authentication, Token' },
	{ id: 's2', title: 'Worker Deployment Script', description: 'Automated deployment for multiple Workers with rollback support', type: 'script', url: '/scripts', icon: '🚀', metadata: 'Bash, Automation, CI/CD, Deployment' },
	{ id: 's3', title: 'D1 Query Builder', description: 'Type-safe D1 query builder utility with migration helpers', type: 'script', url: '/scripts', icon: '🗄️', metadata: 'TypeScript, Database, D1, SQL' },
	{ id: 's4', title: 'Rate Limiter Middleware', description: 'Simple rate limiting for Workers with distributed state', type: 'script', url: '/scripts', icon: '🛡️', metadata: 'TypeScript, Security, Middleware, Protection' },
	{ id: 's5', title: 'Cache Optimization Tool', description: 'Analyze and optimize cache hit rates across your infrastructure', type: 'script', url: '/scripts', icon: '⚡', metadata: 'JavaScript, Performance, Caching, Optimization' },
	{ id: 's6', title: 'Log Analytics Parser', description: 'Parse and analyze Worker logs for debugging and monitoring', type: 'script', url: '/scripts', icon: '📈', metadata: 'Python, Logging, Analytics, Monitoring' },

	// Events
	{ id: 'e1', title: 'SE Team Sync', description: 'Monthly knowledge sharing session and team updates meeting', type: 'event', url: '/events', icon: '👥', metadata: 'Meeting, Sync, Team, Tomorrow' },
	{ id: 'e2', title: 'Cloudflare Connect 2025', description: 'Annual Cloudflare customer and partner conference in San Francisco', type: 'event', url: '/events', icon: '🎪', metadata: 'Conference, Networking, Customer, March 2025' },
	{ id: 'e3', title: 'Demo Friday', description: 'Weekly demo session where team members showcase their wins', type: 'event', url: '/events', icon: '🎬', metadata: 'Demo, Presentation, Friday, Weekly' },
	{ id: 'e4', title: 'API Workshop', description: 'Hands-on Cloudflare API integration workshop for developers', type: 'event', url: '/events', icon: '🛠️', metadata: 'Workshop, Training, API, Hands-on' },
	{ id: 'e5', title: 'Security Training', description: 'Quarterly security best practices and compliance training', type: 'event', url: '/events', icon: '🔐', metadata: 'Training, Security, Compliance, Quarterly' },

	// Shoutouts
	{ id: 'sh1', title: 'Sarah Park - Demo Excellence', description: 'Absolutely crushed the customer demo today and closed the deal', type: 'shoutout', url: '/shoutouts', icon: '🏆', metadata: 'Achievement, Sales, Mike Chen' },
	{ id: 'sh2', title: 'Jordan Lee - Automation Hero', description: 'New automation script saved the team 10+ hours this week', type: 'shoutout', url: '/shoutouts', icon: '💪', metadata: 'Helpful, Efficiency, Alex Kumar' },
	{ id: 'sh3', title: 'Team - Q4 Planning', description: 'Great energy and ideas during the Q4 planning session', type: 'shoutout', url: '/shoutouts', icon: '🤝', metadata: 'Teamwork, Planning, Sarah Park' },
	{ id: 'sh4', title: 'Mike Chen - Mentorship', description: 'Invaluable guidance and mentorship on the API integration', type: 'shoutout', url: '/shoutouts', icon: '👨‍🏫', metadata: 'Mentorship, Teaching, Jordan Lee' },
];

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
				console.log('Generating embeddings for all content...');

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
					message: `Initialized ${contentDatabase.length} embeddings`
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
