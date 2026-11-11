import { ClientIdentity } from '../types';
import { ConfigLoader } from './configLoader';

export class AuthService {
  public static async authenticate(authHeader?: string, apiKeyHeader?: string): Promise<ClientIdentity | null> {
    const config = ConfigLoader.getConfig();

    // 1. Authenticate via X-API-Key Header
    if (apiKeyHeader) {
      const match = config.clients.find((c) => c.api_key === apiKeyHeader);
      if (match) {
        return {
          id: match.id,
          name: match.name,
          tier: match.tier,
          allowedTools: match.allowed_tools,
        };
      }
    }

    // 2. Authenticate via Authorization Bearer Token Header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const match = config.clients.find((c) => c.api_key === token);
      if (match) {
        return {
          id: match.id,
          name: match.name,
          tier: match.tier,
          allowedTools: match.allowed_tools,
        };
      }
    }

    return null;
  }

  public static isToolAllowed(client: ClientIdentity, toolName?: string): boolean {
    if (!toolName) return true;
    if (client.allowedTools.includes('*')) return true;
    return client.allowedTools.includes(toolName);
  }
}
