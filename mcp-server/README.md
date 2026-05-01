# SolutionHub RFx MCP Server

> **Note:** This is a **standalone MCP server** for use with Claude Desktop or any other MCP client. It is not part of the production deploy — the in-app RFx Response Generator at `/rfx` is implemented in `workers/api/src/index.ts` and uses `llama-3.3-70b-instruct-fp8-fast` with a Vectorize-grounded RAG prompt over indexed Cloudflare docs. Use this MCP server when you want to invoke the same answer flow from Claude Desktop instead of the web UI.

MCP (Model Context Protocol) server for generating RFP/RFI responses using Cloudflare Workers AI and latest Cloudflare documentation.

## Features

- 🤖 Uses Cloudflare Workers AI via the REST API (`@cf/meta/llama-3.1-8b-instruct` by default — bump to `llama-3.3-70b-instruct-fp8-fast` to match the in-app RFx generator)
- 📚 References latest Cloudflare product documentation
- 🎯 Optimized for RFP/RFI responses
- ⚡ Fast, edge-based AI inference

## Setup

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers AI enabled
- Cloudflare API token with AI permissions

### Installation

```bash
cd mcp-server
npm install
npm run build
```

### Configuration

Set the following environment variables:

```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
```

### Running

```bash
npm start
```

## Usage with Claude Desktop

Add to your Claude Desktop MCP settings (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "solutionhub-rfx": {
      "command": "node",
      "args": ["/path/to/seportal/mcp-server/dist/index.js"],
      "env": {
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id",
        "CLOUDFLARE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Tools

### `generate_rfx_response`

Generate professional RFP/RFI responses.

**Parameters:**
- `question` (required): The RFP/RFI question to answer
- `topic` (optional): Topic to focus on (e.g., 'workers', 'security', 'cdn')

**Example:**
```
Question: "What DDoS protection capabilities does your platform offer?"
Topic: "security"
```

## Architecture

1. **Documentation Fetching**: Retrieves relevant Cloudflare product information
2. **AI Processing**: Uses Cloudflare Workers AI (Llama 3.1 8B) to generate responses
3. **Context Enhancement**: Provides product-specific context to ensure accurate responses

## Cloudflare Products Covered

- Workers & Pages
- R2 Object Storage
- D1 Database
- KV Storage
- Workers AI
- Images & Stream
- Access & Gateway (Zero Trust)
- DDoS Protection
- WAF
- CDN
- SSL/TLS
- Load Balancing

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build
```

## License

MIT
