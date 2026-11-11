import client from 'prom-client';

// Enable default Node.js runtime metrics (CPU, Memory, Event Loop latency)
client.collectDefaultMetrics({ prefix: 'mcp_proxy_' });

export class MetricsService {
  // Total HTTP / JSON-RPC Requests
  public static requestsTotal = new client.Counter({
    name: 'mcp_proxy_requests_total',
    help: 'Total count of incoming MCP JSON-RPC requests',
    labelNames: ['client_id', 'tier', 'method', 'status', 'action'],
  });

  // Security & Rate Limit Blocks
  public static blocksTotal = new client.Counter({
    name: 'mcp_proxy_blocks_total',
    help: 'Total count of blocked requests categorized by reason',
    labelNames: ['client_id', 'reason', 'tool_name'],
  });

  // Request Duration Histogram
  public static requestDuration = new client.Histogram({
    name: 'mcp_proxy_request_duration_seconds',
    help: 'Histogram of end-to-end proxy processing latency in seconds',
    labelNames: ['method', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  });

  public static getMetricsContentType(): string {
    return client.register.contentType;
  }

  public static async getMetrics(): Promise<string> {
    return await client.register.metrics();
  }
}
