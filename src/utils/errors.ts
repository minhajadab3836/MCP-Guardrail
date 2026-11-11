import { Response } from 'express';

export enum JsonRpcErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  // Custom Guardrail Errors
  BAD_GATEWAY = -32000,
  UNAUTHORIZED = -32001,
  FORBIDDEN = -32002,
  SECURITY_BLOCK = -32003,
  RATE_LIMITED = -32005,
}

export function sendJsonRpcError(
  res: Response,
  httpStatus: number,
  code: JsonRpcErrorCode,
  message: string,
  id: string | number | null = null,
  data?: Record<string, any>
): void {
  res.status(httpStatus).json({
    jsonrpc: '2.0',
    error: {
      code,
      message,
      ...(data ? { data } : {}),
    },
    id,
  });
}
