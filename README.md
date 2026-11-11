# 🛡️ MCP-Guardrail Proxy

> An enterprise-grade, lightweight security & rate-limiting reverse proxy for Model Context Protocol (MCP) tool servers.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-compose-ready-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## 🌟 Key Features
- **OAuth 2.1 / API Key Verification:** Granular tool-level permission scopes per identity tier.
- **Atomic Distributed Rate-Limiting:** Redis Lua-backed Token Bucket algorithm tuned for LLM burst traffic patterns.
- **Dual Defense Engine:** Regex shell injection detection + local ONNX ML prompt injection scoring.
- **Stdio-to-HTTP Transport Bridge:** Connect Claude Desktop securely to remote MCP server infrastructures.
- **Live Observability:** Native `/metrics` endpoint with bundled Prometheus and Grafana dashboards.
- **Zero-Downtime Hot Reloading:** Live `guardrail.yml` updates without proxy restarts.

## 📐 Architecture Flow

```mermaid
flowchart TD
    Client[AI Client / Claude Desktop] -->|stdio| Bridge[mcp-bridge CLI]
    Bridge -->|HTTP/SSE + API Key| Proxy[MCP Guardrail Proxy :3000]

    subgraph Middleware Pipeline
        Proxy --> Auth[1. Auth & Scope Verification]
        Auth --> Rate[2. Redis Lua Rate Limiter :6379]
        Rate --> Security[3. Dual Regex & ONNX ML Defense]
        Security --> Metrics[4. Prometheus Metrics Exporter]
    end

    Security -->|Forward Valid JSON-RPC| Target[Target MCP Server :8000]
    
    subgraph Observability
        Metrics --> Prom[Prometheus :9090]
        Prom --> Grafana[Grafana Dashboard :3001]
    end
```



## 🚀 Quick Start

### 1. Launch Stack via Docker
```bash
docker compose up --build -d
````

### 2. Run Automated Verification Tests


```bash
npm test
```

### 3. Connect via Stdio Transport Bridge (Claude Desktop)

Add to your `claude_desktop_config.json`:



```json
{
  "mcpServers": {
    "secure-mcp-proxy": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-guardrail/src/cli/bridge.ts"],
      "env": {
        "MCP_PROXY_URL": "http://localhost:3000/",
        "MCP_API_KEY": "key_enterprise_999"
      }
    }
  }
}
```
