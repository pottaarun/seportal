#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Cloudflare API configuration
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

interface CloudflareAIRequest {
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
}

/**
 * Fetch latest Cloudflare documentation
 */
async function fetchCloudflareDocumentation(topic: string): Promise<string> {
  try {
    // Use Cloudflare's official documentation sources
    const docUrls = [
      `https://developers.cloudflare.com/api/`,
      `https://developers.cloudflare.com/workers/`,
      `https://developers.cloudflare.com/pages/`,
      `https://developers.cloudflare.com/r2/`,
      `https://developers.cloudflare.com/d1/`,
      `https://developers.cloudflare.com/security/`,
    ];

    // For now, return a structured prompt that guides the LLM
    // In production, you'd implement actual web scraping or use Cloudflare's docs API
    return `
When answering questions about Cloudflare products and services, reference these key areas:

1. **Cloudflare Workers**: Serverless JavaScript/TypeScript runtime at the edge
2. **Cloudflare Pages**: JAMstack platform for static sites with serverless functions
3. **Cloudflare R2**: S3-compatible object storage with zero egress fees
4. **Cloudflare D1**: Serverless SQL database built on SQLite
5. **Cloudflare KV**: Low-latency key-value storage
6. **Workers AI**: Run LLMs and AI models at the edge
7. **Cloudflare Images**: Image optimization and transformation
8. **Cloudflare Stream**: Video streaming platform
9. **Cloudflare Access**: Zero Trust network access
10. **Cloudflare Gateway**: Secure web gateway and DNS filtering
11. **DDoS Protection**: Industry-leading DDoS mitigation
12. **WAF (Web Application Firewall)**: Protect against OWASP Top 10
13. **CDN**: Global content delivery network with 300+ locations
14. **SSL/TLS**: Free universal SSL certificates
15. **Load Balancing**: Intelligent traffic distribution
16. **Argo Smart Routing**: Optimized routing for faster performance

Always emphasize:
- Global network presence (300+ cities)
- Zero egress fees (especially for R2)
- Serverless/edge computing advantages
- Security features
- Developer-friendly pricing
- Performance benefits
    `.trim();
  } catch (error) {
    console.error("Error fetching documentation:", error);
    return "Unable to fetch documentation at this time.";
  }
}

/**
 * Call Cloudflare Workers AI to generate RFx response
 */
async function generateRFxResponse(
  question: string,
  documentation: string
): Promise<string> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a Cloudflare solutions expert helping to respond to RFP/RFI questions. Use the following Cloudflare product documentation to provide accurate, detailed responses:

${documentation}

Guidelines for responses:
- Be specific and technical when needed
- Highlight Cloudflare's unique advantages
- Reference specific products and features
- Include performance metrics when relevant
- Mention global presence and scale
- Be concise but comprehensive
- Use professional tone suitable for RFP/RFI responses`,
            },
            {
              role: "user",
              content: `RFP/RFI Question: ${question}

Please provide a detailed, professional response that would be suitable for an RFP/RFI document.`,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        } as CloudflareAIRequest),
      }
    );

    if (!response.ok) {
      throw new Error(`Cloudflare AI API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.result?.response || data.result?.content || "Unable to generate response.";
  } catch (error) {
    console.error("Error calling Cloudflare AI:", error);
    throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP Server Implementation
 */
const server = new Server(
  {
    name: "solutionhub-rfx-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "generate_rfx_response",
    description:
      "Generate a professional RFP/RFI response using Cloudflare's latest documentation and AI",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The RFP/RFI question to answer",
        },
        topic: {
          type: "string",
          description:
            "Optional topic/category to focus documentation search (e.g., 'workers', 'security', 'cdn')",
        },
      },
      required: ["question"],
    },
  },
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_rfx_response") {
    const question = args.question as string;
    const topic = (args.topic as string) || "general";

    if (!question) {
      throw new Error("Question is required");
    }

    try {
      // Fetch relevant documentation
      const documentation = await fetchCloudflareDocumentation(topic);

      // Generate response using Cloudflare AI
      const response = await generateRFxResponse(question, documentation);

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SolutionHub RFx MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
