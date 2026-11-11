import { Response, NextFunction } from 'express';
import { GuardrailRequest } from '../types';
import { SecurityFilterService } from '../services/securityFilter';
import { MlSecurityFilterService } from '../services/mlSecurityFilter';

export const inspectSecurity = async (
  req: GuardrailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.method !== 'POST' || !req.proxyContext?.isExecutionMethod) {
    return next();
  }

  const payload = req.proxyContext.jsonrpc;
  const toolArgs = payload?.params?.arguments;
  const requestId = payload?.id || null;

  // 1. Fast Heuristic & Regex Check
  const result = SecurityFilterService.inspectArguments(toolArgs);
  if (!result.safe) {
    console.warn(
      `[MCP Security Block - Regex] Tool: ${req.proxyContext.toolName} | Reason: ${result.reason}`
    );

    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32003,
        message: `Security Block: ${result.reason}`,
        data: { matchedRule: result.matchedPattern, tool: req.proxyContext.toolName },
      },
      id: requestId,
    });
    return;
  }

  // 2. Semantic ONNX Model Scan (Scans string values inside arguments)
  if (toolArgs) {
    const textValues = Object.values(toolArgs)
      .filter((v) => typeof v === 'string')
      .join(' ');

    if (textValues.length > 0) {
      const mlResult = await MlSecurityFilterService.evaluateText(textValues);
      if (mlResult.isInjection) {
        console.warn(
          `[MCP Security Block - ML Guard] Tool: ${req.proxyContext.toolName} | Score: ${mlResult.score.toFixed(3)}`
        );

        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32003,
            message: `Security Block: Semantic prompt injection detected by local ML model (Score: ${mlResult.score.toFixed(2)})`,
            data: { confidence: mlResult.score, tool: req.proxyContext.toolName },
          },
          id: requestId,
        });
        return;
      }
    }
  }

  next();
};
