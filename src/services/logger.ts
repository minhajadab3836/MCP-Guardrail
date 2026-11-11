export interface AuditLogEntry {
  timestamp: string;
  clientId: string;
  tier: string;
  method: string;
  toolName?: string;
  action: 'ALLOWED' | 'BLOCKED';
  reason?: string;
  clientIp: string;
}

export class AuditLogger {
  public static log(entry: AuditLogEntry): void {
    const logPayload = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    // Outputs structured JSON for ingestion (Datadog, CloudWatch, Loki)
    console.log(JSON.stringify(logPayload));
  }

  /**
   * Redacts sensitive parameters from logging output.
   */
  public static redactArguments(args: Record<string, any>): Record<string, any> {
    const redacted = { ...args };
    const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'authorization'];

    for (const key of Object.keys(redacted)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        redacted[key] = '[REDACTED]';
      }
    }
    return redacted;
  }
}
