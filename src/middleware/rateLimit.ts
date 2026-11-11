import { Response, NextFunction } from 'express';
import { GuardrailRequest } from '../types';
import { RateLimiterService } from '../services/rateLimiter';

export const enforceRateLimits = (
  req: GuardrailRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.method !== 'POST') {
    return next();
  }

  const client = req.proxyContext?.client;
  const requestId = req.proxyContext?.jsonrpc?.id || null;

  if (!client) {
    // If unauthenticated, auth middleware handles rejection
    return next();
  }

  const isExecution = req.proxyContext?.isExecutionMethod ?? false;
  const result = RateLimiterService.consumeToken(client.id, client.tier, isExecution);

  // Set standard rate limiting headers
  res.setHeader('X-RateLimit-Remaining', result.remainingTokens);

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfterSeconds);
    
    res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: -32005,
        message: `Too Many Requests: Rate limit exceeded for client '${client.name}'. Retry in ${result.retryAfterSeconds} second(s).`,
        data: {
          retryAfter: result.retryAfterSeconds,
          tier: client.tier,
        },
      },
      id: requestId,
    });
    return;
  }

  console.log(`[MCP RateLimiter] Tokens remaining for ${client.id}: ${result.remainingTokens}`);
  next();
};

