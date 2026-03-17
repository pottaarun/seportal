import { useState, useEffect, useMemo } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "Skills Matrix - SolutionHub" },
    { name: "description", content: "SE Skills self-assessment and university course recommendations" },
  ];
}

// Skill level definitions
const SKILL_LEVELS = [
  { value: 1, label: "No Exposure", color: "#6B7280", description: "Have not worked with this technology" },
  { value: 2, label: "Awareness", color: "#F59E0B", description: "Basic understanding of concepts" },
  { value: 3, label: "Working Knowledge", color: "#3B82F6", description: "Can demo and discuss confidently" },
  { value: 4, label: "Deep Expertise", color: "#8B5CF6", description: "Can architect solutions and handle objections" },
  { value: 5, label: "SME", color: "#10B981", description: "Subject Matter Expert - go-to person" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#10B981',
  intermediate: '#3B82F6',
  advanced: '#8B5CF6',
  expert: '#EF4444',
};

// Default skill categories and skills for Cloudflare SE roles
const DEFAULT_CATEGORIES = [
  {
    name: "Application Security",
    icon: "🛡️",
    skills: ["WAF / Managed Rules", "DDoS Protection", "Bot Management", "API Shield / API Gateway", "Page Shield", "SSL/TLS & Certificate Management", "Rate Limiting", "Turnstile"],
  },
  {
    name: "Network Services",
    icon: "🌐",
    skills: ["Magic Transit", "Magic WAN", "Magic Firewall", "Argo Smart Routing", "Spectrum", "Load Balancing", "DNS / DNS Firewall", "China Network"],
  },
  {
    name: "Zero Trust / SASE",
    icon: "🔒",
    skills: ["Cloudflare Access", "Gateway (SWG)", "Browser Isolation", "CASB", "DLP", "DEX (Digital Experience)", "WARP Client", "Tunnel (Cloudflared)"],
  },
  {
    name: "Developer Platform",
    icon: "⚡",
    skills: ["Workers", "Pages", "R2 Storage", "D1 Database", "Workers KV", "Durable Objects", "Workers AI", "Vectorize", "Queues", "Hyperdrive"],
  },
  {
    name: "Performance & Reliability",
    icon: "🚀",
    skills: ["CDN / Caching", "Images & Stream", "Waiting Room", "Web Analytics", "Zaraz", "Speed Optimization (Fonts, Early Hints)"],
  },
  {
    name: "Email & Messaging",
    icon: "📧",
    skills: ["Email Routing", "Email Security (Area 1)", "DMARC Management"],
  },
  {
    name: "SE Core Skills",
    icon: "🎯",
    skills: ["Discovery & Qualification", "Technical Presentations", "POC / POV Execution", "Competitive Analysis", "RFP/RFI Response", "Solution Architecture", "Customer Objection Handling", "Cross-Sell / Upsell"],
  },
];

// Default university courses mapped to skill names and proficiency levels
// Courses are recommended when user's level is between min_level and max_level
const DEFAULT_COURSES: { skill: string; courses: { title: string; description: string; url: string; provider: string; duration: string; difficulty: string; min_level: number; max_level: number }[] }[] = [
  // ---- Application Security ----
  { skill: "WAF / Managed Rules", courses: [
    { title: "Understanding Cloudflare WAF", description: "Learn the basics of web application firewall concepts, rule sets, and how Cloudflare WAF protects web applications.", url: "https://developers.cloudflare.com/waf/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "WAF Managed Rules & Custom Rules Deep Dive", description: "Configure managed rulesets, create custom WAF rules, and tune false positives for customer environments.", url: "https://developers.cloudflare.com/waf/managed-rules/", provider: "Cloudflare Docs", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 3 },
    { title: "Advanced WAF Architecture & Deployment Patterns", description: "Design multi-zone WAF deployments, integrate with CI/CD, and handle complex edge cases across enterprise environments.", url: "https://developers.cloudflare.com/reference-architecture/design-guides/streamlined-waf-deployment-across-zones-and-applications/", provider: "Cloudflare Reference Architecture", duration: "3 hours", difficulty: "advanced", min_level: 3, max_level: 4 },
  ]},
  { skill: "DDoS Protection", courses: [
    { title: "DDoS Protection Fundamentals", description: "Understand DDoS attack vectors, Cloudflare's always-on L3/L4/L7 protection, and how to read DDoS analytics.", url: "https://developers.cloudflare.com/ddos-protection/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Advanced DDoS Mitigation & Magic Transit", description: "Configure DDoS overrides, understand adaptive protection, and position Magic Transit for network-layer DDoS protection.", url: "https://developers.cloudflare.com/ddos-protection/managed-rulesets/", provider: "Cloudflare Docs", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 3 },
    { title: "Protecting ISP & Telecom Networks from DDoS", description: "Enterprise-scale DDoS architecture for service providers and telecommunications companies.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/network/protecting-sp-networks-from-ddos/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "advanced", min_level: 3, max_level: 4 },
  ]},
  { skill: "Bot Management", courses: [
    { title: "Bot Management Overview", description: "Learn how Cloudflare identifies and mitigates automated traffic to protect domains from bad bots.", url: "https://developers.cloudflare.com/bots/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Bot Management Architecture & Configuration", description: "Deep dive into bot scores, JavaScript detections, heuristics, and configuring bot fight mode for customers.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/bots/bot-management/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 3 },
    { title: "Turnstile, WAF & Bot Management Integration", description: "Integrate Turnstile challenges with WAF rules and Bot Management for layered bot defense.", url: "https://developers.cloudflare.com/turnstile/tutorials/integrating-turnstile-waf-and-bot-management/", provider: "Cloudflare Tutorial", duration: "2 hours", difficulty: "advanced", min_level: 3, max_level: 4 },
  ]},
  { skill: "API Shield / API Gateway", courses: [
    { title: "API Shield Fundamentals", description: "Learn API discovery, schema validation, and mutual TLS for protecting APIs.", url: "https://developers.cloudflare.com/api-shield/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "API Security Architecture", description: "Design API protection strategies with schema learning, sequence detection, and rate limiting.", url: "https://developers.cloudflare.com/api-shield/security/", provider: "Cloudflare Docs", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Page Shield", courses: [
    { title: "Page Shield Overview", description: "Monitor and control third-party scripts on your websites to prevent supply chain attacks.", url: "https://developers.cloudflare.com/page-shield/", provider: "Cloudflare Docs", duration: "45 min", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "SSL/TLS & Certificate Management", courses: [
    { title: "SSL/TLS Fundamentals", description: "Understand SSL/TLS modes, certificate types, and how Cloudflare encrypts traffic.", url: "https://developers.cloudflare.com/ssl/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Advanced Certificate Management", description: "Configure custom certificates, certificate pinning, CSRs, and Total TLS for complex customer environments.", url: "https://developers.cloudflare.com/ssl/edge-certificates/", provider: "Cloudflare Docs", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Rate Limiting", courses: [
    { title: "Rate Limiting Rules", description: "Configure rate limiting to protect APIs and applications from abuse and excessive requests.", url: "https://developers.cloudflare.com/waf/rate-limiting-rules/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Turnstile", courses: [
    { title: "Turnstile CAPTCHA Alternative", description: "Deploy Turnstile as a privacy-preserving CAPTCHA alternative to protect forms and endpoints.", url: "https://developers.cloudflare.com/turnstile/", provider: "Cloudflare Docs", duration: "45 min", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Turnstile Advanced Integration", description: "Integrate Turnstile with login forms, conditionally enforce challenges, and handle E2E testing.", url: "https://developers.cloudflare.com/turnstile/tutorials/login-pages/", provider: "Cloudflare Tutorial", duration: "1.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},

  // ---- Network Services ----
  { skill: "Magic Transit", courses: [
    { title: "Magic Transit Fundamentals", description: "Understand how Magic Transit provides DDoS protection, traffic acceleration, and firewall capabilities for on-premise and cloud networks.", url: "https://developers.cloudflare.com/magic-transit/", provider: "Cloudflare Docs", duration: "1.5 hours", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Magic Transit Reference Architecture", description: "Deep dive into Magic Transit architecture, deployment options, and integration patterns for enterprise networks.", url: "https://developers.cloudflare.com/reference-architecture/architectures/magic-transit/", provider: "Cloudflare Reference Architecture", duration: "3 hours", difficulty: "advanced", min_level: 2, max_level: 4 },
  ]},
  { skill: "Magic WAN", courses: [
    { title: "Magic WAN & Cloudflare WAN", description: "Replace legacy WAN architectures with Cloudflare's global network for site-to-site connectivity.", url: "https://developers.cloudflare.com/magic-wan/", provider: "Cloudflare Docs", duration: "1.5 hours", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Protect Data Center Networks with WAN", description: "Design data center network protection using Magic WAN, Network Firewall, and Gateway.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/network/protect-data-center-networks/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Magic Firewall", courses: [
    { title: "Cloudflare Network Firewall", description: "Configure packet-level firewall rules at the network edge to filter unwanted traffic.", url: "https://developers.cloudflare.com/magic-firewall/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Argo Smart Routing", courses: [
    { title: "Argo Smart Routing", description: "Understand how Argo optimizes Internet routing to reduce latency and improve reliability.", url: "https://developers.cloudflare.com/argo-smart-routing/", provider: "Cloudflare Docs", duration: "30 min", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Spectrum", courses: [
    { title: "Spectrum: TCP/UDP Proxy", description: "Extend Cloudflare's DDoS protection and performance to any TCP/UDP application.", url: "https://developers.cloudflare.com/spectrum/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Load Balancing", courses: [
    { title: "Load Balancing Fundamentals", description: "Configure global and local traffic management, health checks, and failover strategies.", url: "https://developers.cloudflare.com/load-balancing/", provider: "Cloudflare Docs", duration: "1.5 hours", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Load Balancing Reference Architecture", description: "Deploy global and local traffic management solutions for enterprise environments.", url: "https://developers.cloudflare.com/reference-architecture/architectures/load-balancing/", provider: "Cloudflare Reference Architecture", duration: "3 hours", difficulty: "advanced", min_level: 2, max_level: 4 },
  ]},
  { skill: "DNS / DNS Firewall", courses: [
    { title: "Cloudflare DNS Fundamentals", description: "Set up and manage DNS zones, records, and understand Cloudflare's authoritative DNS.", url: "https://developers.cloudflare.com/dns/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "DNS Firewall & Advanced DNS", description: "Configure DNS Firewall for upstream protection and advanced DNS features like DNSSEC.", url: "https://developers.cloudflare.com/dns/dns-firewall/", provider: "Cloudflare Docs", duration: "1.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "China Network", courses: [
    { title: "Cloudflare China Network", description: "Understand the China Network partnership and how to serve content to users in mainland China.", url: "https://developers.cloudflare.com/china-network/", provider: "Cloudflare Docs", duration: "45 min", difficulty: "intermediate", min_level: 1, max_level: 3 },
  ]},

  // ---- Zero Trust / SASE ----
  { skill: "Cloudflare Access", courses: [
    { title: "Cloudflare Access (ZTNA) Fundamentals", description: "Set up Zero Trust Network Access to replace VPNs and secure applications with identity-aware access policies.", url: "https://developers.cloudflare.com/cloudflare-one/policies/access/", provider: "Cloudflare Docs", duration: "1.5 hours", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Designing ZTNA Access Policies", description: "Best practices for building effective access policies, integrating identity providers, and device posture checks.", url: "https://developers.cloudflare.com/reference-architecture/design-guides/designing-ztna-access-policies/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 3 },
    { title: "Evolving to a SASE Architecture", description: "Understand how to work towards a full SASE architecture using Cloudflare.", url: "https://developers.cloudflare.com/reference-architecture/architectures/sase/", provider: "Cloudflare Reference Architecture", duration: "3 hours", difficulty: "advanced", min_level: 3, max_level: 4 },
  ]},
  { skill: "Gateway (SWG)", courses: [
    { title: "Cloudflare Gateway Fundamentals", description: "Configure secure web gateway policies to filter DNS, HTTP, and network traffic.", url: "https://developers.cloudflare.com/cloudflare-one/policies/gateway/", provider: "Cloudflare Docs", duration: "1.5 hours", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Gateway DNS Filtering for ISPs", description: "Deploy Gateway as a DNS filtering solution for service providers and large networks.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/sase/gateway-dns-for-isp/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Browser Isolation", courses: [
    { title: "Browser Isolation Overview", description: "Protect users from web-based threats by rendering pages in Cloudflare's cloud.", url: "https://developers.cloudflare.com/cloudflare-one/policies/browser-isolation/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Securing Data in Use with RBI", description: "Use Remote Browser Isolation to protect sensitive data during web sessions.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/security/securing-data-in-use/", provider: "Cloudflare Reference Architecture", duration: "1.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "CASB", courses: [
    { title: "CASB (Cloud Access Security Broker)", description: "Scan SaaS applications for misconfigurations, data exposure, and shadow IT.", url: "https://developers.cloudflare.com/cloudflare-one/applications/scan-apps/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Securing Data at Rest with CASB", description: "Use API-driven CASB to detect and remediate data exposure across SaaS applications.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/security/securing-data-at-rest/", provider: "Cloudflare Reference Architecture", duration: "1.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "DLP", courses: [
    { title: "Data Loss Prevention (DLP)", description: "Create DLP profiles to detect and block sensitive data in transit.", url: "https://developers.cloudflare.com/cloudflare-one/policies/data-loss-prevention/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Securing Data in Transit with DLP", description: "Inspect network traffic and block sensitive data from going to risky destinations.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/security/securing-data-in-transit/", provider: "Cloudflare Reference Architecture", duration: "1.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "DEX (Digital Experience)", courses: [
    { title: "Digital Experience Monitoring", description: "Monitor network performance and user experience for remote and hybrid workers.", url: "https://developers.cloudflare.com/cloudflare-one/insights/dex/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "WARP Client", courses: [
    { title: "Cloudflare One Client (WARP)", description: "Deploy and manage the Cloudflare One Client for secure device connectivity.", url: "https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Deploy Client on Headless Linux", description: "Deploy the Cloudflare One Client on headless Linux devices using service tokens.", url: "https://developers.cloudflare.com/cloudflare-one/tutorials/deploy-client-headless-linux/", provider: "Cloudflare Tutorial", duration: "1 hour", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Tunnel (Cloudflared)", courses: [
    { title: "Cloudflare Tunnel Fundamentals", description: "Create outbound-only connections to expose internal services without opening inbound ports.", url: "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "VPN to ZTNA Migration with Tunnels", description: "Replace VPN concentrators with Cloudflare Tunnel for Zero Trust network access.", url: "https://developers.cloudflare.com/reference-architecture/design-guides/network-vpn-migration/", provider: "Cloudflare Reference Architecture", duration: "2.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},

  // ---- Developer Platform ----
  { skill: "Workers", courses: [
    { title: "Cloudflare Workers Getting Started", description: "Build and deploy your first serverless application on Cloudflare's global network.", url: "https://developers.cloudflare.com/workers/get-started/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Build a Full-Stack App with Workers", description: "Build a React SPA with an API Worker using the Vite plugin.", url: "https://developers.cloudflare.com/workers/vite-plugin/tutorial/", provider: "Cloudflare Tutorial", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 3 },
    { title: "Serverless Global APIs Architecture", description: "Design serverless APIs using Workers, D1, KV, and Durable Objects together.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/serverless/serverless-global-apis/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "advanced", min_level: 3, max_level: 4 },
  ]},
  { skill: "Pages", courses: [
    { title: "Cloudflare Pages Getting Started", description: "Deploy full-stack web applications with Git integration and global CDN.", url: "https://developers.cloudflare.com/pages/get-started/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Build an API with Pages Functions", description: "Build a full-stack Pages application with API routes and React.", url: "https://developers.cloudflare.com/pages/tutorials/build-an-api-with-pages-functions/", provider: "Cloudflare Tutorial", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "R2 Storage", courses: [
    { title: "R2 Object Storage Fundamentals", description: "Store and serve files with zero egress fees using Cloudflare R2.", url: "https://developers.cloudflare.com/r2/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Egress-Free Storage in Multi-Cloud", description: "Design multi-cloud architectures leveraging R2's zero-egress storage.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/storage/egress-free-storage-multi-cloud/", provider: "Cloudflare Reference Architecture", duration: "1.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "D1 Database", courses: [
    { title: "D1 Serverless SQL Database", description: "Build applications with D1, Cloudflare's serverless SQLite database.", url: "https://developers.cloudflare.com/d1/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Build a Comments API with D1", description: "Create a JSON API with Hono and D1 for a static blog site.", url: "https://developers.cloudflare.com/d1/tutorials/build-a-comments-api/", provider: "Cloudflare Tutorial", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Workers KV", courses: [
    { title: "Workers KV Key-Value Store", description: "Use KV for globally distributed, low-latency key-value storage.", url: "https://developers.cloudflare.com/kv/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Durable Objects", courses: [
    { title: "Durable Objects Fundamentals", description: "Build stateful serverless applications with strongly consistent storage and WebSocket support.", url: "https://developers.cloudflare.com/durable-objects/", provider: "Cloudflare Docs", duration: "1.5 hours", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Build a Real-Time Chat App", description: "Deploy a serverless, real-time chat application using Durable Objects.", url: "https://developers.cloudflare.com/workers/tutorials/deploy-a-realtime-chat-app/", provider: "Cloudflare Tutorial", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 3 },
    { title: "Control & Data Plane Pattern for DOs", description: "Separate control and data planes for high-performance Durable Object architectures.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/storage/durable-object-control-data-plane-pattern/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "advanced", min_level: 3, max_level: 4 },
  ]},
  { skill: "Workers AI", courses: [
    { title: "Workers AI Getting Started", description: "Run AI models on Cloudflare's global network with Workers AI.", url: "https://developers.cloudflare.com/workers-ai/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Build a RAG AI Application", description: "Build a Retrieval Augmented Generation AI using Workers AI, Vectorize, and D1.", url: "https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/", provider: "Cloudflare Tutorial", duration: "3 hours", difficulty: "intermediate", min_level: 2, max_level: 3 },
    { title: "AI Composable Architecture", description: "Build end-to-end AI applications on Cloudflare or integrate with external services.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-composable/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "advanced", min_level: 3, max_level: 4 },
  ]},
  { skill: "Vectorize", courses: [
    { title: "Vectorize Vector Database", description: "Store and query vector embeddings for semantic search and AI applications.", url: "https://developers.cloudflare.com/vectorize/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "RAG Architecture with Vectorize", description: "Design retrieval-augmented generation systems using Vectorize for semantic search.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-rag/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Queues", courses: [
    { title: "Cloudflare Queues", description: "Build reliable, asynchronous message processing with Cloudflare Queues.", url: "https://developers.cloudflare.com/queues/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Handle Rate Limits with Queues", description: "Use Queues to handle rate limits when calling external APIs.", url: "https://developers.cloudflare.com/queues/tutorials/handle-rate-limits/", provider: "Cloudflare Tutorial", duration: "1.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Hyperdrive", courses: [
    { title: "Hyperdrive: Accelerate Database Queries", description: "Connect Workers to existing databases with automatic connection pooling and caching.", url: "https://developers.cloudflare.com/hyperdrive/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},

  // ---- Performance & Reliability ----
  { skill: "CDN / Caching", courses: [
    { title: "CDN & Caching Fundamentals", description: "Understand Cloudflare's CDN, cache rules, and content delivery strategies.", url: "https://developers.cloudflare.com/cache/", provider: "Cloudflare Docs", duration: "1.5 hours", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "CDN Reference Architecture", description: "Deep dive into CDN architecture, cache tiers, and optimization strategies.", url: "https://developers.cloudflare.com/reference-architecture/architectures/cdn/", provider: "Cloudflare Reference Architecture", duration: "3 hours", difficulty: "advanced", min_level: 2, max_level: 4 },
  ]},
  { skill: "Images & Stream", courses: [
    { title: "Cloudflare Images & Stream", description: "Optimize image delivery and host/stream video at scale.", url: "https://developers.cloudflare.com/images/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Optimize Image Delivery with R2", description: "Build scalable image delivery with Cloudflare Image Resizing and R2.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/", provider: "Cloudflare Reference Architecture", duration: "1.5 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "Waiting Room", courses: [
    { title: "Waiting Room", description: "Manage traffic surges by queueing visitors during peak demand.", url: "https://developers.cloudflare.com/waiting-room/", provider: "Cloudflare Docs", duration: "45 min", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Web Analytics", courses: [
    { title: "Cloudflare Web Analytics", description: "Privacy-first web analytics without changing your DNS or using client-side JavaScript.", url: "https://developers.cloudflare.com/analytics/web-analytics/", provider: "Cloudflare Docs", duration: "30 min", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Zaraz", courses: [
    { title: "Cloudflare Zaraz", description: "Load third-party tools in the cloud to improve website speed and privacy.", url: "https://developers.cloudflare.com/zaraz/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Speed Optimization (Fonts, Early Hints)", courses: [
    { title: "Speed & Optimization", description: "Use Early Hints, Cloudflare Fonts, and other performance features to improve Core Web Vitals.", url: "https://developers.cloudflare.com/speed/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Distributed Web Performance Architecture", description: "Design a Cloudflare-based L7 performance architecture for reduced latency and better Core Web Vitals.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/distributed-web-performance-architecture/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},

  // ---- Email & Messaging ----
  { skill: "Email Routing", courses: [
    { title: "Email Routing", description: "Create custom email addresses and route emails without running a mail server.", url: "https://developers.cloudflare.com/email-routing/", provider: "Cloudflare Docs", duration: "30 min", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},
  { skill: "Email Security (Area 1)", courses: [
    { title: "Email Security Fundamentals", description: "Protect against phishing, BEC, and email-borne threats with Cloudflare Email Security.", url: "https://developers.cloudflare.com/email-security/", provider: "Cloudflare Docs", duration: "1 hour", difficulty: "beginner", min_level: 1, max_level: 2 },
    { title: "Email Security Deployment Architecture", description: "Understand deployment models for Cloudflare Email Security across enterprise environments.", url: "https://developers.cloudflare.com/reference-architecture/architectures/email-security-deployments/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
  { skill: "DMARC Management", courses: [
    { title: "DMARC Management", description: "Monitor and manage DMARC, SPF, and DKIM to prevent email spoofing.", url: "https://developers.cloudflare.com/dmarc-management/", provider: "Cloudflare Docs", duration: "45 min", difficulty: "beginner", min_level: 1, max_level: 3 },
  ]},

  // ---- SE Core Skills ----
  { skill: "Discovery & Qualification", courses: [
    { title: "Cloudflare Security Architecture Overview", description: "Understand the full Cloudflare security platform to conduct thorough discovery and qualify opportunities.", url: "https://developers.cloudflare.com/reference-architecture/architectures/security/", provider: "Cloudflare Reference Architecture", duration: "3 hours", difficulty: "intermediate", min_level: 1, max_level: 3 },
  ]},
  { skill: "Solution Architecture", courses: [
    { title: "Secure Application Delivery Design Guide", description: "Learn how to architect Cloudflare solutions for application performance, security, and reliability.", url: "https://developers.cloudflare.com/reference-architecture/design-guides/secure-application-delivery/", provider: "Cloudflare Reference Architecture", duration: "3 hours", difficulty: "intermediate", min_level: 1, max_level: 3 },
    { title: "Fullstack Application Architecture", description: "Understand how Cloudflare services come together in real fullstack application architectures.", url: "https://developers.cloudflare.com/reference-architecture/diagrams/serverless/fullstack-application/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "advanced", min_level: 3, max_level: 4 },
  ]},
  { skill: "Cross-Sell / Upsell", courses: [
    { title: "Cloudflare SASE with Microsoft Integration", description: "Learn how Microsoft and Cloudflare integrate to create cross-sell opportunities across SASE and productivity.", url: "https://developers.cloudflare.com/reference-architecture/architectures/cloudflare-sase-with-microsoft/", provider: "Cloudflare Reference Architecture", duration: "2 hours", difficulty: "intermediate", min_level: 2, max_level: 4 },
  ]},
];

interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  category_name?: string;
  sort_order: number;
}

interface SkillAssessment {
  id: string;
  user_email: string;
  user_name: string;
  skill_id: string;
  level: number;
  skill_name?: string;
  category_id?: string;
  category_name?: string;
}

interface UniversityCourse {
  id: string;
  title: string;
  description?: string;
  url?: string;
  provider?: string;
  duration?: string;
  difficulty: string;
  skill_id: string;
  skill_name?: string;
  category_name?: string;
  min_level: number;
  max_level: number;
  current_level?: number;
  recommendation_type?: 'required' | 'optional';
}

export default function SkillsMatrix() {
  const { isAdmin, currentUserEmail, currentUserName } = useAdmin();

  // State
  const [activeTab, setActiveTab] = useState<'assess' | 'curriculum' | 'team' | 'manage'>('assess');
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [allAssessments, setAllAssessments] = useState<SkillAssessment[]>([]);
  const [courses, setCourses] = useState<UniversityCourse[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<UniversityCourse[]>([]);
  const [courseTracking, setCourseTracking] = useState<Map<string, { status: string; started_at?: string; completed_at?: string }>>(new Map());
  const [personalCourses, setPersonalCourses] = useState<any[]>([]);
  const [showPersonalCourseModal, setShowPersonalCourseModal] = useState(false);
  const [personalCourseForm, setPersonalCourseForm] = useState({ title: '', description: '', url: '', provider: '', skill_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Local assessment state (before saving)
  const [localAssessments, setLocalAssessments] = useState<Map<string, number>>(new Map());

  // Admin modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingCourse, setEditingCourse] = useState<UniversityCourse | null>(null);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  // Form state
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '', sort_order: 0 });
  const [skillForm, setSkillForm] = useState({ category_id: '', name: '', description: '', sort_order: 0 });
  const [courseForm, setCourseForm] = useState({
    title: '', description: '', url: '', provider: '', duration: '',
    difficulty: 'beginner', skill_id: '', min_level: 1, max_level: 2
  });

  // Team view filter
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Load data
  useEffect(() => {
    loadData();
  }, [currentUserEmail]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, skills, coursesData] = await Promise.all([
        api.skillCategories.getAll(),
        api.skills.getAll(),
        api.universityCourses.getAll(),
      ]);

      setCategories(Array.isArray(cats) ? cats : []);
      setAllSkills(Array.isArray(skills) ? skills : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      // Expand all categories by default
      if (Array.isArray(cats)) {
        setExpandedCategories(new Set(cats.map((c: SkillCategory) => c.id)));
      }

      // Load user assessments
      if (currentUserEmail) {
        const userAssessments = await api.skillAssessments.getForUser(currentUserEmail);
        setAssessments(Array.isArray(userAssessments) ? userAssessments : []);

        // Initialize local assessments map
        const assessMap = new Map<string, number>();
        if (Array.isArray(userAssessments)) {
          userAssessments.forEach((a: SkillAssessment) => assessMap.set(a.skill_id, a.level));
        }
        setLocalAssessments(assessMap);

        // Load recommended courses, tracking data, and personal courses
        const [recommended, tracking, personal] = await Promise.all([
          api.universityCourses.getRecommended(currentUserEmail),
          api.courseCompletions.getByUser(currentUserEmail),
          api.personalCourses.getByUser(currentUserEmail),
        ]);
        setRecommendedCourses(Array.isArray(recommended) ? recommended : []);
        setPersonalCourses(Array.isArray(personal) ? personal : []);

        // Build tracking map
        const trackMap = new Map<string, { status: string; started_at?: string; completed_at?: string }>();
        if (Array.isArray(tracking)) {
          tracking.forEach((t: any) => trackMap.set(t.course_id, { status: t.status, started_at: t.started_at, completed_at: t.completed_at }));
        }
        setCourseTracking(trackMap);
      }

      // Load team assessments if admin
      if (isAdmin) {
        const teamData = await api.skillAssessments.getAll();
        setAllAssessments(Array.isArray(teamData) ? teamData : []);
      }
    } catch (e) {
      console.error('Error loading skills data:', e);
    }
    setLoading(false);
  };

  // Update course tracking status
  const handleCourseStatus = async (courseId: string, status: 'not_started' | 'in_progress' | 'completed') => {
    if (!currentUserEmail) return;
    try {
      if (status === 'not_started') {
        await api.courseCompletions.remove(currentUserEmail, courseId);
        setCourseTracking(prev => { const m = new Map(prev); m.delete(courseId); return m; });
      } else {
        await api.courseCompletions.updateStatus(currentUserEmail, courseId, status);
        setCourseTracking(prev => {
          const m = new Map(prev);
          m.set(courseId, { status, started_at: new Date().toISOString(), completed_at: status === 'completed' ? new Date().toISOString() : undefined });
          return m;
        });
      }
    } catch (e) {
      console.error('Error updating course status:', e);
    }
  };

  // Update personal course status
  const handlePersonalCourseStatus = async (course: any, status: string) => {
    try {
      await api.personalCourses.update(course.id, { ...course, status });
      setPersonalCourses(prev => prev.map(c => c.id === course.id ? { ...c, status } : c));
    } catch (e) {
      console.error('Error updating personal course status:', e);
    }
  };

  // Delete personal course
  const handleDeletePersonalCourse = async (courseId: string) => {
    if (!window.confirm('Remove this course from your list?')) return;
    try {
      await api.personalCourses.delete(courseId);
      setPersonalCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (e) {
      console.error('Error deleting personal course:', e);
    }
  };

  // Add personal course
  const handleAddPersonalCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserEmail || !personalCourseForm.title) return;
    try {
      const result = await api.personalCourses.create({
        user_email: currentUserEmail,
        ...personalCourseForm,
      });
      setPersonalCourses(prev => [{ ...personalCourseForm, id: result.id, user_email: currentUserEmail, status: 'not_started', created_at: new Date().toISOString() }, ...prev]);
      setPersonalCourseForm({ title: '', description: '', url: '', provider: '', skill_id: '' });
      setShowPersonalCourseModal(false);
    } catch (e) {
      console.error('Error adding personal course:', e);
      alert('Failed to add course');
    }
  };

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped = new Map<string, Skill[]>();
    allSkills.forEach(skill => {
      const existing = grouped.get(skill.category_id) || [];
      existing.push(skill);
      grouped.set(skill.category_id, existing);
    });
    return grouped;
  }, [allSkills]);

  // Handle level change
  const handleLevelChange = (skillId: string, level: number) => {
    setLocalAssessments(prev => {
      const next = new Map(prev);
      next.set(skillId, level);
      return next;
    });
    setHasChanges(true);
  };

  // Save assessments
  const saveAssessments = async () => {
    if (!currentUserEmail || !currentUserName) return;
    setSaving(true);
    try {
      const assessmentData = Array.from(localAssessments.entries()).map(([skill_id, level]) => ({
        skill_id, level,
      }));
      await api.skillAssessments.saveBulk(currentUserEmail, currentUserName, assessmentData);
      setHasChanges(false);

      // Reload data to get updated recommendations
      await loadData();
    } catch (e) {
      console.error('Error saving assessments:', e);
      alert('Failed to save assessments');
    }
    setSaving(false);
  };

  // Seed default categories/skills and courses
  const seedDefaults = async () => {
    if (!window.confirm('This will add the default Cloudflare SE skill categories, skills, and university courses. Continue?')) return;
    setSeedingDefaults(true);
    try {
      // Track skill name -> skill ID for course mapping
      const skillNameToId = new Map<string, string>();

      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const cat = DEFAULT_CATEGORIES[i];
        const catResult = await api.skillCategories.create({
          name: cat.name, icon: cat.icon, sort_order: i, description: '',
        }) as any;
        for (let j = 0; j < cat.skills.length; j++) {
          const skillResult = await api.skills.create({
            category_id: catResult.id,
            name: cat.skills[j],
            sort_order: j,
          }) as any;
          skillNameToId.set(cat.skills[j], skillResult.id);
        }
      }

      // Seed courses mapped to skills
      for (const entry of DEFAULT_COURSES) {
        const skillId = skillNameToId.get(entry.skill);
        if (!skillId) continue;
        for (const course of entry.courses) {
          await api.universityCourses.create({
            title: course.title,
            description: course.description,
            url: course.url,
            provider: course.provider,
            duration: course.duration,
            difficulty: course.difficulty,
            skill_id: skillId,
            min_level: course.min_level,
            max_level: course.max_level,
          });
        }
      }

      await loadData();
    } catch (e) {
      console.error('Error seeding defaults:', e);
      alert('Failed to seed default skills');
    }
    setSeedingDefaults(false);
  };

  // Seed only courses (when skills already exist but courses don't)
  const seedCoursesOnly = async () => {
    if (!window.confirm('This will add the default Cloudflare university courses mapped to your existing skills. Continue?')) return;
    setSeedingDefaults(true);
    try {
      // Build a name -> id map from existing skills
      const skillNameToId = new Map<string, string>();
      allSkills.forEach(s => skillNameToId.set(s.name, s.id));

      let added = 0;
      for (const entry of DEFAULT_COURSES) {
        const skillId = skillNameToId.get(entry.skill);
        if (!skillId) continue;
        for (const course of entry.courses) {
          await api.universityCourses.create({
            title: course.title,
            description: course.description,
            url: course.url,
            provider: course.provider,
            duration: course.duration,
            difficulty: course.difficulty,
            skill_id: skillId,
            min_level: course.min_level,
            max_level: course.max_level,
          });
          added++;
        }
      }

      alert(`Added ${added} courses to the library.`);
      await loadData();
    } catch (e) {
      console.error('Error seeding courses:', e);
      alert('Failed to seed courses');
    }
    setSeedingDefaults(false);
  };

  // Delete handlers
  const deleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category and all its skills?')) return;
    await api.skillCategories.delete(id);
    await loadData();
  };

  const deleteSkill = async (id: string) => {
    if (!window.confirm('Delete this skill?')) return;
    await api.skills.delete(id);
    await loadData();
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm('Delete this course?')) return;
    await api.universityCourses.delete(id);
    await loadData();
  };

  // Category CRUD
  const saveCategory = async () => {
    if (editingCategory) {
      await api.skillCategories.update(editingCategory.id, categoryForm);
    } else {
      await api.skillCategories.create(categoryForm);
    }
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', icon: '', sort_order: 0 });
    await loadData();
  };

  // Skill CRUD
  const saveSkill = async () => {
    if (editingSkill) {
      await api.skills.update(editingSkill.id, skillForm);
    } else {
      await api.skills.create(skillForm);
    }
    setShowSkillModal(false);
    setEditingSkill(null);
    setSkillForm({ category_id: '', name: '', description: '', sort_order: 0 });
    await loadData();
  };

  // Course CRUD
  const saveCourse = async () => {
    if (editingCourse) {
      await api.universityCourses.update(editingCourse.id, courseForm);
    } else {
      await api.universityCourses.create(courseForm);
    }
    setShowCourseModal(false);
    setEditingCourse(null);
    setCourseForm({ title: '', description: '', url: '', provider: '', duration: '', difficulty: 'beginner', skill_id: '', min_level: 1, max_level: 2 });
    await loadData();
  };

  // Toggle category expand
  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute completion stats
  const completionStats = useMemo(() => {
    const totalSkills = allSkills.length;
    const assessed = Array.from(localAssessments.values()).filter(v => v > 0).length;
    const avgLevel = assessed > 0
      ? Array.from(localAssessments.values()).reduce((a, b) => a + b, 0) / assessed
      : 0;
    return { totalSkills, assessed, avgLevel, percentage: totalSkills > 0 ? Math.round((assessed / totalSkills) * 100) : 0 };
  }, [allSkills, localAssessments]);

  // Team overview data
  const teamOverview = useMemo(() => {
    const userMap = new Map<string, { email: string; name: string; assessments: SkillAssessment[] }>();
    allAssessments.forEach(a => {
      if (!userMap.has(a.user_email)) {
        userMap.set(a.user_email, { email: a.user_email, name: a.user_name, assessments: [] });
      }
      userMap.get(a.user_email)!.assessments.push(a);
    });
    return Array.from(userMap.values());
  }, [allAssessments]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🎯</div>
        <h2>Loading Skills Matrix...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Preparing your assessment</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div>
            <h2>🎯 Skills Matrix</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Self-assess your skills to get personalized university course recommendations
            </p>
          </div>
          {hasChanges && (
            <button
              onClick={saveAssessments}
              disabled={saving}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Assessment'}
            </button>
          )}
        </div>
      </div>

      {/* Completion Progress */}
      {activeTab === 'assess' && allSkills.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: '600' }}>Assessment Progress</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {completionStats.assessed} / {completionStats.totalSkills} skills rated
              {completionStats.avgLevel > 0 && ` | Avg: ${completionStats.avgLevel.toFixed(1)}`}
            </span>
          </div>
          <div style={{
            height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${completionStats.percentage}%`,
              background: completionStats.percentage === 100
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : 'linear-gradient(90deg, var(--cf-orange), #F59E0B)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
        {[
          { key: 'assess', label: '📝 Self-Assessment', show: true },
          { key: 'curriculum', label: '🎓 My Curriculum', show: true },
          { key: 'team', label: '👥 Team Overview', show: isAdmin },
          { key: 'manage', label: '⚙️ Manage Skills', show: isAdmin },
        ].filter(t => t.show).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="filter-btn"
            style={{
              padding: '12px 24px',
              borderRadius: '0',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--cf-orange)' : '2px solid transparent',
              marginBottom: '-2px',
              fontWeight: activeTab === tab.key ? '600' : '400',
              color: activeTab === tab.key ? 'var(--cf-orange)' : 'var(--text-secondary)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======== SELF-ASSESSMENT TAB ======== */}
      {activeTab === 'assess' && (
        <div>
          {categories.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</div>
              <h3>No skills configured yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {isAdmin
                  ? 'Set up skill categories and skills for your team to assess.'
                  : 'Ask an admin to set up the skills matrix.'}
              </p>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={seedDefaults} disabled={seedingDefaults}
                    style={{ padding: '10px 20px', fontSize: '14px' }}>
                    {seedingDefaults ? 'Seeding...' : 'Load Default Cloudflare Skills & Courses'}
                  </button>
                  <button onClick={() => { setActiveTab('manage'); }} className="btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '14px' }}>
                    Configure Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Skill Level Legend */}
              <div style={{
                display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap',
              }}>
                {SKILL_LEVELS.map(level => (
                  <div key={level.value} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '6px',
                    background: 'var(--bg-secondary)', fontSize: '12px',
                  }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: level.color, flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: '600' }}>{level.value}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{level.label}</span>
                  </div>
                ))}
              </div>

              {/* Categories + Skills */}
              {categories.map(category => {
                const skills = skillsByCategory.get(category.id) || [];
                const isExpanded = expandedCategories.has(category.id);
                const categoryAssessed = skills.filter(s => localAssessments.has(s.id) && (localAssessments.get(s.id) || 0) > 0).length;

                return (
                  <div key={category.id} className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
                    {/* Category header */}
                    <div
                      onClick={() => toggleCategory(category.id)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1rem 1.25rem', cursor: 'pointer',
                        background: 'var(--bg-secondary)',
                        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{category.icon || '📁'}</span>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{category.name}</h3>
                        <span style={{
                          fontSize: '12px', color: 'var(--text-tertiary)',
                          padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: '10px',
                        }}>
                          {categoryAssessed}/{skills.length}
                        </span>
                      </div>
                      <span style={{ fontSize: '18px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                        ▼
                      </span>
                    </div>

                    {/* Skills list */}
                    {isExpanded && (
                      <div>
                        {skills.map((skill, idx) => {
                          const currentLevel = localAssessments.get(skill.id) || 0;
                          return (
                            <div
                              key={skill.id}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.875rem 1.25rem',
                                borderBottom: idx < skills.length - 1 ? '1px solid var(--border-color)' : 'none',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: '500', fontSize: '14px' }}>{skill.name}</span>
                                {skill.description && (
                                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                                    {skill.description}
                                  </p>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {SKILL_LEVELS.map(level => (
                                  <button
                                    key={level.value}
                                    onClick={() => handleLevelChange(skill.id, level.value)}
                                    title={`${level.label}: ${level.description}`}
                                    style={{
                                      width: '36px', height: '36px',
                                      borderRadius: '8px',
                                      border: currentLevel === level.value
                                        ? `2px solid ${level.color}`
                                        : '2px solid var(--border-color)',
                                      background: currentLevel === level.value
                                        ? `${level.color}20`
                                        : 'var(--bg-tertiary)',
                                      color: currentLevel === level.value
                                        ? level.color
                                        : 'var(--text-tertiary)',
                                      fontWeight: currentLevel === level.value ? '700' : '400',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {level.value}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Save button at bottom */}
              {hasChanges && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <button
                    onClick={saveAssessments}
                    disabled={saving}
                    style={{
                      padding: '12px 40px', fontSize: '15px', fontWeight: '600',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving Assessment...' : 'Save My Assessment'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ======== CURRICULUM TAB ======== */}
      {activeTab === 'curriculum' && (
        <div>
          {assessments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🎓</div>
              <h3>Complete your assessment first</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Rate your skills in the Self-Assessment tab to get personalized course recommendations.
              </p>
              <button onClick={() => setActiveTab('assess')} style={{ padding: '10px 20px', fontSize: '14px' }}>
                Go to Assessment
              </button>
            </div>
          ) : (
            <>
              {/* ---- Progress Summary Bar ---- */}
              {(() => {
                const requiredCourses = recommendedCourses.filter(c => c.recommendation_type === 'required');
                const allTracked = [...recommendedCourses, ...personalCourses];
                const completedCount = recommendedCourses.filter(c => courseTracking.get(c.id)?.status === 'completed').length
                  + personalCourses.filter(c => c.status === 'completed').length;
                const inProgressCount = recommendedCourses.filter(c => courseTracking.get(c.id)?.status === 'in_progress').length
                  + personalCourses.filter(c => c.status === 'in_progress').length;
                const requiredCompleted = requiredCourses.filter(c => courseTracking.get(c.id)?.status === 'completed').length;
                const totalAll = recommendedCourses.length + personalCourses.length;

                return totalAll > 0 ? (
                  <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--cf-blue)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>Your Progress</h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ {completedCount} completed</span>
                        <span style={{ color: 'var(--cf-orange)', fontWeight: 600 }}>◉ {inProgressCount} in progress</span>
                        {requiredCourses.length > 0 && (
                          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                            {requiredCompleted}/{requiredCourses.length} required done
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '4px', transition: 'width 0.5s ease',
                        width: `${totalAll > 0 ? (completedCount / totalAll) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, var(--color-success), var(--color-teal))',
                      }} />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Split courses into required and optional */}
              {(() => {
                const requiredCourses = recommendedCourses.filter(c => c.recommendation_type === 'required');
                const optionalCourses = recommendedCourses.filter(c => c.recommendation_type === 'optional');

                const groupByCategory = (list: UniversityCourse[]) => {
                  const grouped = new Map<string, UniversityCourse[]>();
                  list.forEach(course => {
                    const key = course.category_name || 'Other';
                    grouped.set(key, [...(grouped.get(key) || []), course]);
                  });
                  return Array.from(grouped.entries());
                };

                const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string }> = {
                  'not_started': { label: 'Not Started', color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)', next: 'in_progress' },
                  'in_progress': { label: 'In Progress', color: 'var(--cf-orange)', bg: 'rgba(246,130,31,0.1)', next: 'completed' },
                  'completed':   { label: 'Completed', color: 'var(--color-success)', bg: 'var(--color-success-light)', next: 'not_started' },
                };

                const renderStatusToggle = (courseId: string) => {
                  const tracking = courseTracking.get(courseId);
                  const status = tracking?.status || 'not_started';
                  const config = STATUS_CONFIG[status] || STATUS_CONFIG['not_started'];
                  const nextStatus = config.next as 'not_started' | 'in_progress' | 'completed';

                  return (
                    <button
                      className="btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleCourseStatus(courseId, nextStatus); }}
                      style={{
                        background: `${config.bg} !important`, color: `${config.color} !important`,
                        border: `1px solid ${config.color}30 !important`, borderRadius: '9999px !important',
                        fontSize: '11px !important', padding: '0 10px !important', height: '28px !important',
                        fontWeight: 600, gap: '4px',
                      }}
                      title={`Click to mark as ${STATUS_CONFIG[nextStatus]?.label}`}
                    >
                      {status === 'completed' ? '✓' : status === 'in_progress' ? '◉' : '○'} {config.label}
                    </button>
                  );
                };

                const renderCourseCard = (course: UniversityCourse, isOptional: boolean) => {
                  const status = courseTracking.get(course.id)?.status || 'not_started';
                  const isCompleted = status === 'completed';

                  return (
                    <div key={course.id} className="card" style={{
                      padding: '1.25rem',
                      borderLeft: isCompleted ? '3px solid var(--color-success)' : isOptional ? '3px solid var(--border-color-strong)' : '3px solid var(--cf-orange)',
                      opacity: isCompleted ? 0.7 : isOptional ? 0.85 : 1,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', flex: 1, textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                          {course.title}
                        </h4>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                          background: `${DIFFICULTY_COLORS[course.difficulty] || '#6B7280'}20`,
                          color: DIFFICULTY_COLORS[course.difficulty] || '#6B7280',
                          textTransform: 'capitalize', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {course.difficulty}
                        </span>
                      </div>

                      {course.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
                          {course.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.75rem' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          {course.skill_name}
                        </span>
                        {course.current_level && (
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
                            background: `${SKILL_LEVELS[course.current_level - 1]?.color || '#6B7280'}20`,
                            color: SKILL_LEVELS[course.current_level - 1]?.color || '#6B7280',
                          }}>
                            Level {course.current_level}
                          </span>
                        )}
                        {course.provider && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                            {course.provider}
                          </span>
                        )}
                        {course.duration && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                            {course.duration}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        {renderStatusToggle(course.id)}
                        {course.url && (
                          <a href={course.url} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', textDecoration: 'none', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                            Open ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {/* ---- REQUIRED COURSES ---- */}
                    {requiredCourses.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px' }}>Required Courses</h3>
                          <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                            {requiredCourses.filter(c => courseTracking.get(c.id)?.status !== 'completed').length} remaining
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '13px' }}>
                          These courses address skill gaps where your self-assessment is below level 3.
                          Mark your progress as you work through them.
                        </p>
                        {groupByCategory(requiredCourses).map(([categoryName, catCourses]) => (
                          <div key={categoryName} style={{ marginBottom: '1.25rem' }}>
                            <h4 style={{ marginBottom: '0.75rem', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                              {categoryName}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.75rem' }}>
                              {catCourses.map(course => renderCourseCard(course, false))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {requiredCourses.length === 0 && recommendedCourses.length > 0 && (
                      <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '2rem', borderLeft: '3px solid var(--color-success)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '15px' }}>No skill gaps detected</h4>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px' }}>All your assessed skills are at level 3 or above.</p>
                      </div>
                    )}

                    {/* ---- OPTIONAL COURSES ---- */}
                    {optionalCourses.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px' }}>Optional — Deepen Your Expertise</h3>
                          <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700', background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                            {optionalCourses.length}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', marginBottom: '1rem', fontSize: '13px' }}>
                          You already have working knowledge in these areas. These are optional but can help you go deeper.
                        </p>
                        {groupByCategory(optionalCourses).map(([categoryName, catCourses]) => (
                          <div key={categoryName} style={{ marginBottom: '1.25rem' }}>
                            <h4 style={{ marginBottom: '0.75rem', fontSize: '13px', fontWeight: '600', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                              {categoryName}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.75rem' }}>
                              {catCourses.map(course => renderCourseCard(course, true))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {recommendedCourses.length === 0 && (
                      <div className="card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px' }}>
                          {courses.length === 0 ? 'No courses have been configured yet. Ask an admin to set up the course library.' : 'No matching courses for your current skill levels.'}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ---- PERSONAL COURSES ---- */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>My Custom Courses</h3>
                    {personalCourses.length > 0 && (
                      <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700', background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                        {personalCourses.length}
                      </span>
                    )}
                  </div>
                  <button className="btn-secondary btn-sm" onClick={() => setShowPersonalCourseModal(true)}>
                    + Add Course
                  </button>
                </div>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '1rem', fontSize: '13px' }}>
                  Add any external course, tutorial, or resource you're working through. Track your own learning alongside the recommended curriculum.
                </p>

                {personalCourses.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.75rem' }}>
                    {personalCourses.map((course) => {
                      const status = course.status || 'not_started';
                      const STATUS_CFG: Record<string, { label: string; color: string; bg: string; next: string }> = {
                        'not_started': { label: 'Not Started', color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)', next: 'in_progress' },
                        'in_progress': { label: 'In Progress', color: 'var(--cf-orange)', bg: 'rgba(246,130,31,0.1)', next: 'completed' },
                        'completed':   { label: 'Completed', color: 'var(--color-success)', bg: 'var(--color-success-light)', next: 'not_started' },
                      };
                      const cfg = STATUS_CFG[status] || STATUS_CFG['not_started'];
                      const isCompleted = status === 'completed';

                      return (
                        <div key={course.id} className="card" style={{
                          padding: '1.25rem',
                          borderLeft: `3px solid ${isCompleted ? 'var(--color-success)' : status === 'in_progress' ? 'var(--cf-orange)' : 'var(--color-info)'}`,
                          opacity: isCompleted ? 0.7 : 1,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', flex: 1, textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                              {course.title}
                            </h4>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: 'rgba(99,102,241,0.1)', color: 'var(--color-info)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              Custom
                            </span>
                          </div>

                          {course.description && (
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>{course.description}</p>
                          )}

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.75rem' }}>
                            {course.provider && (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{course.provider}</span>
                            )}
                            {course.skill_name && (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{course.skill_name}</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="btn-ghost btn-sm"
                              onClick={() => handlePersonalCourseStatus(course, cfg.next)}
                              style={{
                                background: `${cfg.bg} !important`, color: `${cfg.color} !important`,
                                border: `1px solid ${cfg.color}30 !important`, borderRadius: '9999px !important',
                                fontSize: '11px !important', padding: '0 10px !important', height: '28px !important',
                                fontWeight: 600, gap: '4px',
                              }}
                            >
                              {status === 'completed' ? '✓' : status === 'in_progress' ? '◉' : '○'} {cfg.label}
                            </button>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {course.url && (
                                <a href={course.url} target="_blank" rel="noopener noreferrer"
                                  style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', textDecoration: 'none', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                                  Open ↗
                                </a>
                              )}
                              <button className="btn-ghost btn-sm" onClick={() => handleDeletePersonalCourse(course.id)}
                                style={{ color: 'var(--text-tertiary) !important', fontSize: '12px !important', padding: '0 6px !important', height: '28px !important' }}>
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    No custom courses yet. Click "+ Add Course" to track any external resource.
                  </div>
                )}
              </div>

              {/* ---- All courses reference section ---- */}
              {courses.length > 0 && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '1rem', padding: '8px 0' }}>
                    Browse All Available Courses ({courses.length})
                  </summary>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
                    {courses.map(course => (
                      <div key={course.id} className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px' }}>{course.title}</span>
                          <span style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                            background: `${DIFFICULTY_COLORS[course.difficulty] || '#6B7280'}20`,
                            color: DIFFICULTY_COLORS[course.difficulty] || '#6B7280',
                            textTransform: 'capitalize', whiteSpace: 'nowrap', marginLeft: '8px',
                          }}>
                            {course.difficulty}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                          {course.skill_name} ({course.category_name}) | Levels {course.min_level}-{course.max_level}
                        </div>
                        {course.url && (
                          <a href={course.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--cf-blue)', textDecoration: 'none' }}>Open Course ↗</a>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}

          {/* Add Personal Course Modal */}
          {showPersonalCourseModal && (
            <div className="modal-overlay" onClick={() => setShowPersonalCourseModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                <div className="modal-header">
                  <h3>Add a Custom Course</h3>
                  <button className="modal-close" onClick={() => setShowPersonalCourseModal(false)}>×</button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Add any external course, tutorial, video, or resource you want to track.
                </p>
                <form onSubmit={handleAddPersonalCourse}>
                  <div className="form-group">
                    <label>Title *</label>
                    <input type="text" className="form-input" value={personalCourseForm.title}
                      onChange={(e) => setPersonalCourseForm({ ...personalCourseForm, title: e.target.value })}
                      placeholder="e.g., Cloudflare Workers Tutorial on YouTube" required />
                  </div>
                  <div className="form-group">
                    <label>URL</label>
                    <input type="url" className="form-input" value={personalCourseForm.url}
                      onChange={(e) => setPersonalCourseForm({ ...personalCourseForm, url: e.target.value })}
                      placeholder="https://..." />
                  </div>
                  <div className="form-group">
                    <label>Provider / Source</label>
                    <input type="text" className="form-input" value={personalCourseForm.provider}
                      onChange={(e) => setPersonalCourseForm({ ...personalCourseForm, provider: e.target.value })}
                      placeholder="e.g., YouTube, Udemy, Internal Wiki" />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-input" value={personalCourseForm.description}
                      onChange={(e) => setPersonalCourseForm({ ...personalCourseForm, description: e.target.value })}
                      placeholder="Brief description..." rows={2} style={{ minHeight: '60px', resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label>Related Skill (optional)</label>
                    <select className="form-select" value={personalCourseForm.skill_id}
                      onChange={(e) => setPersonalCourseForm({ ...personalCourseForm, skill_id: e.target.value })}>
                      <option value="">-- None --</option>
                      {categories.map(cat => (
                        <optgroup key={cat.id} label={cat.name}>
                          {(skillsByCategory.get(cat.id) || []).map(skill => (
                            <option key={skill.id} value={skill.id}>{skill.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowPersonalCourseModal(false)}>Cancel</button>
                    <button type="submit" disabled={!personalCourseForm.title}>Add Course</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== TEAM OVERVIEW TAB (Admin) ======== */}
      {activeTab === 'team' && isAdmin && (
        <div>
          {teamOverview.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>👥</div>
              <h3>No assessments yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Team members haven't completed their skill assessments yet.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  {teamOverview.length} team member{teamOverview.length !== 1 ? 's' : ''} have completed assessments
                </p>
                <select
                  className="form-select"
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Team heatmap table */}
              <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1, borderRight: '1px solid var(--border-color)' }}>
                        SE Name
                      </th>
                      {allSkills
                        .filter(s => teamFilter === 'all' || s.category_id === teamFilter)
                        .map(skill => (
                          <th key={skill.id} style={{
                            padding: '8px 6px', textAlign: 'center', fontSize: '11px',
                            maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            borderBottom: '1px solid var(--border-color)',
                          }} title={skill.name}>
                            {skill.name.length > 12 ? skill.name.substring(0, 12) + '...' : skill.name}
                          </th>
                        ))}
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderLeft: '2px solid var(--border-color)' }}>
                        Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamOverview.map(member => {
                      const memberMap = new Map(member.assessments.map(a => [a.skill_id, a.level]));
                      const filteredSkills = allSkills.filter(s => teamFilter === 'all' || s.category_id === teamFilter);
                      const levels = filteredSkills.map(s => memberMap.get(s.id) || 0).filter(l => l > 0);
                      const avg = levels.length > 0 ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1) : '-';

                      return (
                        <tr key={member.email} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{
                            padding: '8px 12px', fontWeight: '500', whiteSpace: 'nowrap',
                            position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1,
                            borderRight: '1px solid var(--border-color)',
                          }}>
                            {member.name}
                          </td>
                          {filteredSkills.map(skill => {
                            const level = memberMap.get(skill.id) || 0;
                            const levelInfo = SKILL_LEVELS[level - 1];
                            return (
                              <td key={skill.id} style={{ padding: '4px', textAlign: 'center' }}>
                                {level > 0 ? (
                                  <div
                                    title={`${skill.name}: ${levelInfo?.label || 'N/A'}`}
                                    style={{
                                      width: '28px', height: '28px', borderRadius: '6px',
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      background: `${levelInfo?.color || '#6B7280'}25`,
                                      color: levelInfo?.color || '#6B7280',
                                      fontWeight: '600', fontSize: '12px',
                                    }}
                                  >
                                    {level}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>-</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{
                            padding: '8px 12px', textAlign: 'center', fontWeight: '600',
                            borderLeft: '2px solid var(--border-color)',
                          }}>
                            {avg}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Skill gap summary */}
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Skill Gap Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {allSkills
                    .filter(s => teamFilter === 'all' || s.category_id === teamFilter)
                    .map(skill => {
                      const levels = teamOverview
                        .map(m => m.assessments.find(a => a.skill_id === skill.id)?.level || 0)
                        .filter(l => l > 0);
                      const avg = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
                      const assessed = levels.length;

                      return (
                        <div key={skill.id} style={{
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          borderLeft: `3px solid ${avg >= 4 ? '#10B981' : avg >= 3 ? '#3B82F6' : avg >= 2 ? '#F59E0B' : '#EF4444'}`,
                        }}>
                          <div style={{ fontWeight: '500', fontSize: '13px', marginBottom: '4px' }}>{skill.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Avg: {avg > 0 ? avg.toFixed(1) : 'N/A'} | {assessed} rated
                            </span>
                            <div style={{
                              width: '50px', height: '6px', background: 'var(--bg-tertiary)',
                              borderRadius: '3px', overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%', width: `${(avg / 5) * 100}%`,
                                background: avg >= 4 ? '#10B981' : avg >= 3 ? '#3B82F6' : avg >= 2 ? '#F59E0B' : '#EF4444',
                                borderRadius: '3px',
                              }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======== MANAGE SKILLS TAB (Admin) ======== */}
      {activeTab === 'manage' && isAdmin && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={seedDefaults} disabled={seedingDefaults}
              className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              {seedingDefaults ? 'Seeding...' : 'Seed Default Skills & Courses'}
            </button>
            {allSkills.length > 0 && courses.length === 0 && (
              <button onClick={seedCoursesOnly} disabled={seedingDefaults}
                className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                {seedingDefaults ? 'Seeding...' : 'Seed Course Library Only'}
              </button>
            )}
            <button onClick={() => {
              setCategoryForm({ name: '', description: '', icon: '', sort_order: categories.length });
              setEditingCategory(null);
              setShowCategoryModal(true);
            }} style={{ padding: '8px 16px', fontSize: '13px' }}>
              + Add Category
            </button>
            <button onClick={() => {
              setSkillForm({ category_id: categories[0]?.id || '', name: '', description: '', sort_order: 0 });
              setEditingSkill(null);
              setShowSkillModal(true);
            }} style={{ padding: '8px 16px', fontSize: '13px' }} disabled={categories.length === 0}>
              + Add Skill
            </button>
            <button onClick={() => {
              setCourseForm({ title: '', description: '', url: '', provider: '', duration: '', difficulty: 'beginner', skill_id: allSkills[0]?.id || '', min_level: 1, max_level: 2 });
              setEditingCourse(null);
              setShowCourseModal(true);
            }} style={{ padding: '8px 16px', fontSize: '13px' }} disabled={allSkills.length === 0}>
              + Add Course
            </button>
          </div>

          {/* Categories & Skills */}
          <h3 style={{ marginBottom: '1rem' }}>Categories & Skills ({categories.length} categories, {allSkills.length} skills)</h3>
          {categories.map(category => {
            const skills = skillsByCategory.get(category.id) || [];
            return (
              <div key={category.id} className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: skills.length > 0 ? '0.75rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{category.icon || '📁'}</span>
                    <span style={{ fontWeight: '600' }}>{category.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>({skills.length} skills)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryForm({ name: category.name, description: category.description || '', icon: category.icon || '', sort_order: category.sort_order });
                        setShowCategoryModal(true);
                      }}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="btn-danger"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {skills.map(skill => (
                      <div key={skill.id} style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                        background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <span>{skill.name}</span>
                        <button
                          onClick={() => {
                            setEditingSkill(skill);
                            setSkillForm({ category_id: skill.category_id, name: skill.name, description: skill.description || '', sort_order: skill.sort_order });
                            setShowSkillModal(true);
                          }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--cf-blue)', fontSize: '11px', padding: '0 2px',
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteSkill(skill.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#EF4444', fontSize: '11px', padding: '0 2px',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Courses */}
          <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>University Courses ({courses.length})</h3>
          {courses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No courses configured yet. Add courses to map them to skill levels.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
              {courses.map(course => (
                <div key={course.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{course.title}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          setEditingCourse(course);
                          setCourseForm({
                            title: course.title, description: course.description || '', url: course.url || '',
                            provider: course.provider || '', duration: course.duration || '',
                            difficulty: course.difficulty, skill_id: course.skill_id,
                            min_level: course.min_level, max_level: course.max_level,
                          });
                          setShowCourseModal(true);
                        }}
                        className="btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="btn-danger"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {course.skill_name} ({course.category_name}) | {course.difficulty} | Levels {course.min_level}-{course.max_level}
                    {course.provider && ` | ${course.provider}`}
                    {course.duration && ` | ${course.duration}`}
                  </div>
                  {course.url && (
                    <a href={course.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: 'var(--cf-blue)', textDecoration: 'none' }}>
                      {course.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== MODALS ======== */}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>x</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveCategory(); }}>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-input" value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Application Security" required />
              </div>
              <div className="form-group">
                <label>Icon (emoji)</label>
                <input className="form-input" value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="e.g., 🛡️" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input className="form-input" value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Optional description" />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input className="form-input" type="number" value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button type="submit" disabled={!categoryForm.name}>{editingCategory ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skill Modal */}
      {showSkillModal && (
        <div className="modal-overlay" onClick={() => setShowSkillModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSkill ? 'Edit Skill' : 'Add Skill'}</h3>
              <button className="modal-close" onClick={() => setShowSkillModal(false)}>x</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveSkill(); }}>
              <div className="form-group">
                <label>Category *</label>
                <select className="form-select" value={skillForm.category_id}
                  onChange={(e) => setSkillForm({ ...skillForm, category_id: e.target.value })} required>
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Skill Name *</label>
                <input className="form-input" value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  placeholder="e.g., WAF / Managed Rules" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input className="form-input" value={skillForm.description}
                  onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                  placeholder="Optional description" />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input className="form-input" type="number" value={skillForm.sort_order}
                  onChange={(e) => setSkillForm({ ...skillForm, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSkillModal(false)}>Cancel</button>
                <button type="submit" disabled={!skillForm.name || !skillForm.category_id}>{editingSkill ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingCourse ? 'Edit Course' : 'Add University Course'}</h3>
              <button className="modal-close" onClick={() => setShowCourseModal(false)}>x</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveCourse(); }}>
              <div className="form-group">
                <label>Course Title *</label>
                <input className="form-input" value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="e.g., Cloudflare WAF Deep Dive" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-input" value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Course description" rows={2}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div className="form-group">
                <label>Course URL</label>
                <input className="form-input" value={courseForm.url}
                  onChange={(e) => setCourseForm({ ...courseForm, url: e.target.value })}
                  placeholder="https://university.cloudflare.com/..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Provider</label>
                  <input className="form-input" value={courseForm.provider}
                    onChange={(e) => setCourseForm({ ...courseForm, provider: e.target.value })}
                    placeholder="e.g., Cloudflare University" />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input className="form-input" value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    placeholder="e.g., 2 hours" />
                </div>
              </div>
              <div className="form-group">
                <label>Maps to Skill *</label>
                <select className="form-select" value={courseForm.skill_id}
                  onChange={(e) => setCourseForm({ ...courseForm, skill_id: e.target.value })} required>
                  <option value="">Select skill...</option>
                  {categories.map(cat => (
                    <optgroup key={cat.id} label={`${cat.icon || ''} ${cat.name}`}>
                      {(skillsByCategory.get(cat.id) || []).map(skill => (
                        <option key={skill.id} value={skill.id}>{skill.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Difficulty *</label>
                  <select className="form-select" value={courseForm.difficulty}
                    onChange={(e) => setCourseForm({ ...courseForm, difficulty: e.target.value })}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Min Level (target)</label>
                  <select className="form-select" value={courseForm.min_level}
                    onChange={(e) => setCourseForm({ ...courseForm, min_level: parseInt(e.target.value) })}>
                    {SKILL_LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.value} - {l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Max Level (target)</label>
                  <select className="form-select" value={courseForm.max_level}
                    onChange={(e) => setCourseForm({ ...courseForm, max_level: parseInt(e.target.value) })}>
                    {SKILL_LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.value} - {l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '-8px' }}>
                This course will be recommended to SEs whose level for the selected skill falls between min and max.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCourseModal(false)}>Cancel</button>
                <button type="submit" disabled={!courseForm.title || !courseForm.skill_id}>{editingCourse ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
