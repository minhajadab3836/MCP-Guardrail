import { Response, NextFunction } from 'express';
import { GuardrailRequest, JsonRpcRequest } from '../types.js';

export const inspectJsonRpc = (req: GuardrailRequest, res: Response, next: NextFunction): void => {
  // Pass-through non-POST requests (e.g., SSE handshake or GET requests)
  if (req.method !== 'POST') {
    return next();
  }

  const payload = req.body as JsonRpcRequest;

  // Validate basic JSON-RPC structure
  if (!payload || payload.jsonrpc !== '2.0' || !payload.method) {
    req.proxyContext = { isExecutionMethod: false };
    return next();
  }

  const method = payload.method;
  const isExecution = method === 'tools/call';
  const toolName = isExecution ? payload.params?.name : undefined;

  // Attach parsed context to request for authentication, rate-limiting, and safety filters
  req.proxyContext = {
    jsonrpc: payload,
    mcpMethod: method,
    isExecutionMethod: isExecution,
    toolName: toolName,
  };

  console.log(`[MCP Inspector] Method: ${method} | Tool: ${toolName || 'N/A'}`);
  next();
};
