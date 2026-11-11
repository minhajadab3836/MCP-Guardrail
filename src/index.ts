import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { inspectJsonRpc } from './middleware/inspector';
import { authenticateClient } from './middleware/auth';
import { enforceRateLimits } from './middleware/rateLimit';
import { inspectSecurity } from './middleware/security';
import { globalErrorHandler } from './middleware/errorHandler';
import { AuditLogger } from './services/logger';
import { redisClient } from './services/redisClient';
import { ConfigLoader } from './services/configLoader';
import { MetricsService } from './services/metrics';
import { MlSecurityFilterService } from './services/mlSecurityFilter';
import { GuardrailRequest } from './types';

dotenv.config();

ConfigLoader.loadConfig();
ConfigLoader.watch();

const app = express();
const activeConfig = ConfigLoader.getConfig();
const PORT = activeConfig.server.port || process.env.PORT || 3000;
const TARGET_MCP_URL = activeConfig.server.target_mcp_url || process.env.TARGET_MCP_URL || 'http://localhost:8000';

app.use(express.json());

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', MetricsService.getMetricsContentType());
  res.send(await MetricsService.getMetrics());
});

app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on('finish', () => {
    const gReq = req as GuardrailRequest;
    if (gReq.proxyContext) {
      const diff = process.hrtime(startTime);
      const durationInSeconds = diff[0] + diff[1] / 1e9;
      const statusStr = res.statusCode.toString();
      const clientId = gReq.proxyContext.client?.id || 'unauthenticated';
      const tier = gReq.proxyContext.client?.tier || 'none';
      const method = gReq.proxyContext.mcpMethod || req.method;
      const action = res.statusCode < 400 ? 'ALLOWED' : 'BLOCKED';

      MetricsService.requestsTotal.inc({
        client_id: clientId,
        tier,
        method,
        status: statusStr,
        action,
      });

      MetricsService.requestDuration.observe({ method, status: statusStr }, durationInSeconds);

      if (res.statusCode >= 400) {
        MetricsService.blocksTotal.inc({
          client_id: clientId,
          reason: statusStr,
          tool_name: gReq.proxyContext.toolName || 'N/A',
        });
      }

      AuditLogger.log({
        timestamp: new Date().toISOString(),
        clientId,
        tier,
        method,
        toolName: gReq.proxyContext.toolName,
        action,
        clientIp: req.ip || req.socket.remoteAddress || 'unknown',
      });
    }
  });
  next();
});

app.use(inspectJsonRpc as express.RequestHandler);
app.use(authenticateClient as unknown as express.RequestHandler);
app.use(enforceRateLimits as unknown as express.RequestHandler);
app.use(inspectSecurity as unknown as express.RequestHandler);

const mcpProxy = createProxyMiddleware({
  target: TARGET_MCP_URL,
  changeOrigin: true,
  ws: true,
  on: {
    proxyReq: (proxyReq, req: GuardrailRequest) => {
      if (req.body && Object.keys(req.body).length > 0 && req.method === 'POST') {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, req, res: express.Response) => {
      res.status(502).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Gateway: Could not connect to downstream MCP server.',
        },
        id: (req as GuardrailRequest).proxyContext?.jsonrpc?.id || null,
      });
    },
  },
});

app.use('/', mcpProxy);
app.use(globalErrorHandler);

async function bootstrap() {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('[Redis Boot Warning] Retrying Redis connection in background...');
  }

  // Pre-warm ONNX ML model asynchronously
  MlSecurityFilterService.init().catch(() => {});

  app.listen(PORT, () => {
    console.log(`[MCP-Guardrail] Proxy listening on port ${PORT}`);
  });
}

bootstrap();
