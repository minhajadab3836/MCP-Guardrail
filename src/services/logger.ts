export interface AuditLogEntry {
  timestamp: string;
  clientId: string;
  tier: string;
  method: string;
  toolName?: string | undefined;
  action: 'ALLOWED' | 'BLOCKED';
  clientIp: string;
}

export class AuditLogger {
  public static redactArguments(
    args: Record<string, any> | undefined
  ): Record<string, any> | undefined {
    if (!args) return undefined;

    const redacted = { ...args };
    const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'authorization', 'key'];

    for (const key of Object.keys(redacted)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        redacted[key] = '[REDACTED]';
      }
    }

    return redacted;
  }

  public static log(entry: AuditLogEntry): void {
    const formattedLog = JSON.stringify(entry);
    console.log(formattedLog);
  }
}
