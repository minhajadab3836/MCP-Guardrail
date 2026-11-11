import { Request } from 'express';

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface ClientIdentity {
  id: string;
  name: string;
  tier: UserTier;
  allowedTools: string[];
}

export interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: string | number | null;
}

export interface ProxyContext {
  jsonrpc?: JsonRpcRequest;
  mcpMethod?: string;
  toolName?: string;
  isExecutionMethod?: boolean;
  client?: ClientIdentity;
}

export interface GuardrailRequest extends Request {
  proxyContext?: ProxyContext;
}
