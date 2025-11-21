/**
 * Documentation Ingestion Script
 * Populates Vectorize index with Cloudflare product documentation
 */

interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    product: string;
    category: string;
    url?: string;
  };
}

// Comprehensive Cloudflare documentation organized by product
const cloudflareDocumentation: DocumentChunk[] = [
  // Workers
  {
    id: 'workers-overview',
    text: 'Cloudflare Workers is a serverless execution environment that allows you to create entirely new applications or augment existing ones without configuring or maintaining infrastructure. Workers runs on Cloudflare\'s global network in over 300 cities worldwide, providing exceptional performance, reliability, and scale. Workers uses the V8 JavaScript engine and supports JavaScript, TypeScript, Python, and any language that compiles to WebAssembly.',
    metadata: { product: 'Workers', category: 'Overview' }
  },
  {
    id: 'workers-features',
    text: 'Cloudflare Workers key features: runs JavaScript/TypeScript/Python at the edge, 0ms cold starts, sub-millisecond CPU time, execute in under 1ms globally, automatic scaling, pay only for what you use, supports HTTP/HTTPS requests, WebSockets, scheduled cron triggers, durable objects for stateful applications, bindings to KV, D1, R2, and other Cloudflare services.',
    metadata: { product: 'Workers', category: 'Features' }
  },
  {
    id: 'workers-pricing',
    text: 'Workers pricing: Free tier includes 100,000 requests per day. Paid plan ($5/month) includes 10 million requests, with additional requests at $0.50 per million. CPU time: first 50 million milliseconds included, then $0.02 per million milliseconds. No egress fees.',
    metadata: { product: 'Workers', category: 'Pricing' }
  },
  {
    id: 'workers-performance',
    text: 'Workers performance characteristics: deployed to 300+ cities globally, 0ms cold starts, requests execute in under 1ms on average, automatic global load balancing, built-in DDoS protection, HTTP/2 and HTTP/3 support, WebSocket support with no connection limits.',
    metadata: { product: 'Workers', category: 'Performance' }
  },

  // Pages
  {
    id: 'pages-overview',
    text: 'Cloudflare Pages is a JAMstack platform for frontend developers to collaborate and deploy websites. Pages integrates with Git providers (GitHub, GitLab) for automatic deployments on every commit. Supports static sites and full-stack applications with Pages Functions (Workers). Unlimited sites, unlimited requests, unlimited bandwidth on all plans including free.',
    metadata: { product: 'Pages', category: 'Overview' }
  },
  {
    id: 'pages-features',
    text: 'Pages features: automatic Git integration and deployments, preview deployments for every pull request, built-in analytics, automatic HTTPS, custom domains, serverless functions via Pages Functions, support for all major frameworks (React, Vue, Next.js, SvelteKit, Astro, etc.), edge rendering, incremental static regeneration.',
    metadata: { product: 'Pages', category: 'Features' }
  },
  {
    id: 'pages-pricing',
    text: 'Pages pricing: completely free for unlimited sites, unlimited requests, unlimited bandwidth. Pages Functions usage follows Workers pricing after free tier limits.',
    metadata: { product: 'Pages', category: 'Pricing' }
  },

  // R2
  {
    id: 'r2-overview',
    text: 'Cloudflare R2 Storage is S3-compatible object storage without egress fees. R2 stores large amounts of unstructured data with zero charges for data transfer out to the internet. Fully compatible with S3 API, making migration simple. Automatically distributed across multiple datacenters for 99.999999999% durability.',
    metadata: { product: 'R2', category: 'Overview' }
  },
  {
    id: 'r2-features',
    text: 'R2 features: S3-compatible API, zero egress fees, automatic geographic distribution, 99.999999999% durability, jurisdiction-specific data localization, public and private buckets, presigned URLs, multipart uploads, object lifecycle policies, event notifications via Workers.',
    metadata: { product: 'R2', category: 'Features' }
  },
  {
    id: 'r2-pricing',
    text: 'R2 pricing: $0.015 per GB per month for storage, Class A operations (writes) $4.50 per million, Class B operations (reads) $0.36 per million, zero egress fees (free data transfer out). 10 GB storage free per month, 1 million Class A operations free, 10 million Class B operations free.',
    metadata: { product: 'R2', category: 'Pricing' }
  },
  {
    id: 'r2-vs-s3',
    text: 'R2 advantages over S3: zero egress fees compared to S3\'s $0.09/GB, S3-compatible API for easy migration, automatic global distribution, lower storage costs, integrated with Workers for edge computing, no data transfer fees between R2 and Workers/Pages.',
    metadata: { product: 'R2', category: 'Comparison' }
  },

  // D1
  {
    id: 'd1-overview',
    text: 'Cloudflare D1 is a serverless SQL database built on SQLite. D1 provides a familiar SQL interface with automatic replication across multiple regions for high availability. Designed for serverless applications with Workers integration. No connection limits, automatic scaling, built-in time travel for point-in-time recovery.',
    metadata: { product: 'D1', category: 'Overview' }
  },
  {
    id: 'd1-features',
    text: 'D1 features: SQLite-compatible SQL database, automatic replication, no connection pooling required, time travel (point-in-time recovery), read replication, integrated with Workers, ACID transactions, prepared statements, migrations support, low latency reads from edge.',
    metadata: { product: 'D1', category: 'Features' }
  },
  {
    id: 'd1-pricing',
    text: 'D1 pricing: Free tier includes 5 GB storage, 1 million row reads per day, 100,000 row writes per day. Paid usage: $0.75 per million row reads, $1.00 per million row writes, $0.75 per GB per month storage.',
    metadata: { product: 'D1', category: 'Pricing' }
  },

  // KV
  {
    id: 'kv-overview',
    text: 'Cloudflare Workers KV is a global, low-latency, key-value data store. KV supports exceptionally high read volumes with low latency, making it ideal for configuration data, user sessions, and application state. Eventually consistent with edge caching for optimal performance.',
    metadata: { product: 'KV', category: 'Overview' }
  },
  {
    id: 'kv-features',
    text: 'KV features: global edge caching, low-latency reads (under 1ms in 300+ cities), high read throughput, eventually consistent, supports keys up to 512 bytes and values up to 25 MB, list operations, expiration (TTL), metadata support.',
    metadata: { product: 'KV', category: 'Features' }
  },
  {
    id: 'kv-pricing',
    text: 'KV pricing: $0.50 per GB stored per month, read operations $0.50 per 10 million, write operations $5.00 per million, delete operations $5.00 per million, list operations $5.00 per million. Free tier: 100,000 reads per day, 1,000 writes per day, 1 GB storage.',
    metadata: { product: 'KV', category: 'Pricing' }
  },

  // Workers AI
  {
    id: 'workers-ai-overview',
    text: 'Workers AI allows you to run machine learning models on Cloudflare\'s global network. Access popular open-source models including Llama 2, Llama 3, Mistral, BERT, Whisper, Stable Diffusion, and more. Run inference at the edge with low latency. No GPU management required.',
    metadata: { product: 'Workers AI', category: 'Overview' }
  },
  {
    id: 'workers-ai-models',
    text: 'Workers AI supported models: Text generation (Llama 3.1, Llama 3.2, Llama 2, Mistral 7B, Gemma), text embeddings (@cf/baai/bge-base-en-v1.5, @cf/baai/bge-large-en-v1.5), image generation (Stable Diffusion), speech recognition (Whisper), translation models, image classification, object detection.',
    metadata: { product: 'Workers AI', category: 'Models' }
  },
  {
    id: 'workers-ai-pricing',
    text: 'Workers AI pricing: pay per request or per token depending on model, Llama models charge per input/output token, embeddings charge per token processed, image models charge per image generated. Regular Workers AI Neurons pricing applies.',
    metadata: { product: 'Workers AI', category: 'Pricing' }
  },

  // Vectorize
  {
    id: 'vectorize-overview',
    text: 'Cloudflare Vectorize is a globally distributed vector database for building AI-powered applications. Store and query vector embeddings for semantic search, recommendation systems, and RAG (Retrieval Augmented Generation) applications. Integrates with Workers AI for embedding generation.',
    metadata: { product: 'Vectorize', category: 'Overview' }
  },
  {
    id: 'vectorize-features',
    text: 'Vectorize features: supports multiple distance metrics (cosine, euclidean, dot product), metadata filtering, batch operations, integrates with Workers AI for embeddings, globally distributed, automatic indexing, supports dimensions up to 1536, namespace support.',
    metadata: { product: 'Vectorize', category: 'Features' }
  },

  // DDoS Protection
  {
    id: 'ddos-overview',
    text: 'Cloudflare DDoS Protection provides industry-leading protection against Distributed Denial of Service attacks. Automatic detection and mitigation of network-layer (L3/4) and application-layer (L7) DDoS attacks. Protects against attacks exceeding 100 Tbps. Unmetered and unlimited DDoS protection on all plans.',
    metadata: { product: 'DDoS Protection', category: 'Overview' }
  },
  {
    id: 'ddos-features',
    text: 'DDoS protection features: autonomous edge protection system, multi-layered defense (L3, L4, L7), global threat intelligence, advanced rate limiting, challenge pages, fingerprinting-based protection, protection against reflection attacks, amplification attacks, protocol attacks, application-layer attacks. No scrubbing centers required.',
    metadata: { product: 'DDoS Protection', category: 'Features' }
  },
  {
    id: 'ddos-performance',
    text: 'DDoS protection performance: mitigated attacks exceeding 100 Tbps, 300+ Tbps network capacity, protection in 300+ cities, sub-3-second detection time, automatic mitigation without manual intervention, 99.99% uptime SLA on Enterprise plans.',
    metadata: { product: 'DDoS Protection', category: 'Performance' }
  },

  // WAF
  {
    id: 'waf-overview',
    text: 'Cloudflare Web Application Firewall (WAF) protects applications from OWASP Top 10 vulnerabilities and zero-day threats. Managed rulesets automatically updated by Cloudflare security team. Custom rules for specific application protection. Rate limiting and bot management integration.',
    metadata: { product: 'WAF', category: 'Overview' }
  },
  {
    id: 'waf-features',
    text: 'WAF features: OWASP Top 10 protection (SQL injection, XSS, CSRF, etc.), managed rulesets, custom WAF rules, rate limiting, bot management, payload logging, advanced filtering, challenge pages, JavaScript challenges, managed challenges, geo-blocking, IP reputation scoring.',
    metadata: { product: 'WAF', category: 'Features' }
  },
  {
    id: 'waf-rulesets',
    text: 'WAF managed rulesets: Cloudflare Managed Ruleset (core rules), OWASP ModSecurity Core Rule Set, Cloudflare Specials (zero-day protections), application-specific rulesets (WordPress, Drupal, etc.), automatic updates, low false-positive rate.',
    metadata: { product: 'WAF', category: 'Rulesets' }
  },

  // CDN
  {
    id: 'cdn-overview',
    text: 'Cloudflare CDN is a global content delivery network with 300+ locations in over 120 countries. Automatically caches static content at the edge for faster delivery. Supports HTTP/2, HTTP/3, QUIC. Free unlimited bandwidth on all plans. Anycast network for automatic routing to nearest location.',
    metadata: { product: 'CDN', category: 'Overview' }
  },
  {
    id: 'cdn-features',
    text: 'CDN features: 300+ edge locations, anycast routing, automatic HTTPS, HTTP/2 and HTTP/3, smart tiered caching, cache analytics, custom cache rules, cache purge (single file, tag, hostname, or everything), origin connection pooling, Railgun (WAN optimization), Argo Smart Routing.',
    metadata: { product: 'CDN', category: 'Features' }
  },
  {
    id: 'cdn-performance',
    text: 'CDN performance: 300+ cities globally, sub-50ms latency to 95% of internet-connected population, 200+ Tbps network capacity, HTTP/3 and QUIC support for reduced latency, connection coalescing, early hints support, automatic image optimization.',
    metadata: { product: 'CDN', category: 'Performance' }
  },

  // SSL/TLS
  {
    id: 'ssl-overview',
    text: 'Cloudflare provides free Universal SSL certificates for all domains. Automatic certificate provisioning and renewal. Support for custom certificates, client certificates, mutual TLS. SSL for SaaS for serving multiple customer domains. TLS 1.3 support for enhanced security and performance.',
    metadata: { product: 'SSL/TLS', category: 'Overview' }
  },
  {
    id: 'ssl-features',
    text: 'SSL/TLS features: free Universal SSL, automatic renewal, TLS 1.3, HTTPS rewrites, Always Use HTTPS, opportunistic encryption, automatic HTTPS rewrites, certificate transparency monitoring, SSL for SaaS, custom certificates, client certificates, mutual TLS (mTLS).',
    metadata: { product: 'SSL/TLS', category: 'Features' }
  },

  // Load Balancing
  {
    id: 'load-balancing-overview',
    text: 'Cloudflare Load Balancing distributes traffic across multiple origin servers for improved reliability and performance. Active health checks, geo-steering, session affinity, automatic failover. Integrates with Cloudflare\'s global network for intelligent routing.',
    metadata: { product: 'Load Balancing', category: 'Overview' }
  },
  {
    id: 'load-balancing-features',
    text: 'Load Balancing features: active health checks, passive health checks, geo-steering, session affinity (sticky sessions), weighted pools, automatic failover, custom health check paths, TCP/HTTP/HTTPS checks, notification webhooks, real-time analytics, adaptive routing.',
    metadata: { product: 'Load Balancing', category: 'Features' }
  },

  // Zero Trust (Access & Gateway)
  {
    id: 'zero-trust-overview',
    text: 'Cloudflare Zero Trust provides secure access to internal applications and internet browsing. Cloudflare Access replaces VPN with identity-based access control. Cloudflare Gateway provides secure web gateway, DNS filtering, and CASB. Built on Cloudflare\'s global network.',
    metadata: { product: 'Zero Trust', category: 'Overview' }
  },
  {
    id: 'access-features',
    text: 'Cloudflare Access features: identity-based access control, integrates with major identity providers (Okta, Azure AD, Google, etc.), application-level access policies, temporary access tokens, SSH and RDP protection, browser isolation, WARP client for device security.',
    metadata: { product: 'Access', category: 'Features' }
  },
  {
    id: 'gateway-features',
    text: 'Cloudflare Gateway features: secure web gateway, DNS filtering, firewall policies, shadow IT discovery, data loss prevention, browser isolation, CASB integrations, anti-virus scanning, traffic logging and analytics, SafeSearch enforcement.',
    metadata: { product: 'Gateway', category: 'Features' }
  },

  // Images
  {
    id: 'images-overview',
    text: 'Cloudflare Images provides image optimization, resizing, and delivery. Automatic format conversion (WebP, AVIF), responsive images, flexible variants. Global CDN delivery. Storage included with unlimited transformations.',
    metadata: { product: 'Images', category: 'Overview' }
  },
  {
    id: 'images-features',
    text: 'Cloudflare Images features: automatic format conversion (WebP, AVIF), image resizing and cropping, quality optimization, responsive images, flexible variants (predefined transformations), metadata stripping, global CDN delivery, image storage, upload API, custom domains.',
    metadata: { product: 'Images', category: 'Features' }
  },
  {
    id: 'images-pricing',
    text: 'Images pricing: $5 per month per 100,000 images stored, $1 per 100,000 images delivered. Unlimited transformations and variants included.',
    metadata: { product: 'Images', category: 'Pricing' }
  },

  // Stream
  {
    id: 'stream-overview',
    text: 'Cloudflare Stream is a video streaming platform built for developers. Upload, encode, store, and deliver video content globally. Automatic encoding and adaptive bitrate streaming. Built-in player and API. Pay only for minutes watched, not bandwidth.',
    metadata: { product: 'Stream', category: 'Overview' }
  },
  {
    id: 'stream-features',
    text: 'Stream features: automatic video encoding, adaptive bitrate streaming (HLS, DASH), built-in customizable player, live streaming, video analytics, webhooks, thumbnail generation, watermarking, subtitle support, DRM protection, 4K video support.',
    metadata: { product: 'Stream', category: 'Features' }
  },
  {
    id: 'stream-pricing',
    text: 'Stream pricing: $1 per 1,000 minutes of video delivered, $5 per 1,000 minutes of video stored per month. No bandwidth charges, pay only for minutes watched.',
    metadata: { product: 'Stream', category: 'Pricing' }
  },

  // Argo Smart Routing
  {
    id: 'argo-overview',
    text: 'Argo Smart Routing optimizes routing across Cloudflare\'s network for up to 30% performance improvement. Intelligent routing based on real-time network conditions. Reduces latency, packet loss, and connection errors. Works with CDN and Load Balancing.',
    metadata: { product: 'Argo', category: 'Overview' }
  },
  {
    id: 'argo-features',
    text: 'Argo features: intelligent routing across Cloudflare backbone, real-time network congestion detection, automatic failover, tiered caching, connection coalescing, persistent connections, up to 30% faster page loads, reduced packet loss and errors.',
    metadata: { product: 'Argo', category: 'Features' }
  },
];

console.log(`Prepared ${cloudflareDocumentation.length} documentation chunks for ingestion.`);
console.log('Use the API endpoint /api/admin/ingest-docs to populate the Vectorize index.');
