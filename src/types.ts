import { Request } from 'express';

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface ClientIdentity {
  id: string;
  name: string;
  tier: UserTier;
  allowedTools: string[]; // e.g., ["*"] or ["calculator", "web_search"]
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, any>;
    [key: string]: any;
  };
}

export interface ProxyContext {
  jsonrpc?: JsonRpcRequest;
  isExecutionMethod: boolean;
  mcpMethod?: string;
  toolName?: string;
}

export interface GuardrailRequest extends Request {
  proxyContext?: ProxyContext;
}
