import { Response, NextFunction } from 'express';
import { GuardrailRequest } from '../types.js';
import { AuthService } from '../services/authService.js';

export const authenticateClient = async (
  req: GuardrailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Pass non-POST handshake requests if unauthenticated access is allowed for GET/SSE
  if (req.method !== 'POST') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'] as string;

  const client = await AuthService.authenticate(authHeader, apiKeyHeader);

  const requestId = req.proxyContext?.jsonrpc?.id || null;

  if (!client) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized: Invalid or missing API key or Bearer token.',
      },
      id: requestId,
    });
    return;
  }

  // Check tool scope permissions if executing a tool
  const toolName = req.proxyContext?.toolName;
  if (req.proxyContext?.isExecutionMethod && toolName) {
    const hasPermission = AuthService.isToolAllowed(client, toolName);
    if (!hasPermission) {
      res.status(403).json({
        jsonrpc: '2.0',
        error: {
          code: -32002,
          message: `Forbidden: Client scope does not permit execution of tool '${toolName}'.`,
        },
        id: requestId,
      });
      return;
    }
  }

  // Attach identity to context
  if (req.proxyContext) {
    req.proxyContext.client = client;
  }

  console.log(`[MCP Auth] Authenticated: ${client.name} (${client.tier} tier)`);
  next();
};
