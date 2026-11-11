import { Request, Response, NextFunction } from 'express';
import { GuardrailRequest } from '../types.js';
import { sendJsonRpcError, JsonRpcErrorCode } from '../utils/errors.js';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const guardReq = req as GuardrailRequest;
  const requestId = guardReq.proxyContext?.jsonrpc?.id || null;

  console.error('[Unhandled Proxy Error]:', err);

  sendJsonRpcError(
    res,
    500,
    JsonRpcErrorCode.INTERNAL_ERROR,
    err.message || 'Internal proxy engine error',
    requestId
  );
};
