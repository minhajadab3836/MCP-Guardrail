import { ConfigLoader } from './configLoader.js';

export interface SecurityCheckResult {
  safe: boolean;
  reason?: string;
  matchedPattern?: string;
}

export class SecurityFilterService {
  public static inspectArguments(args: Record<string, any> | undefined): SecurityCheckResult {
    if (!args || Object.keys(args).length === 0) {
      return { safe: true };
    }

    const config = ConfigLoader.getConfig().security;
    const payloadString = JSON.stringify(args);

    // 1. Dynamic Payload Size Limit
    if (Buffer.byteLength(payloadString, 'utf8') > config.max_payload_bytes) {
      return {
        safe: false,
        reason: `Payload size exceeds limit (${config.max_payload_bytes} bytes)`,
      };
    }

    // 2. Dynamic Shell Injection Scanning
    for (const rawPattern of config.custom_shell_patterns) {
      const regex = new RegExp(rawPattern, 'i');
      if (regex.test(payloadString)) {
        return {
          safe: false,
          reason: 'Potential shell command injection detected in tool arguments',
          matchedPattern: rawPattern,
        };
      }
    }

    // 3. Dynamic Prompt Injection Scanning
    for (const rawPattern of config.custom_injection_patterns) {
      const regex = new RegExp(rawPattern, 'i');
      if (regex.test(payloadString)) {
        return {
          safe: false,
          reason: 'Prompt injection or system prompt override pattern detected',
          matchedPattern: rawPattern,
        };
      }
    }

    return { safe: true };
  }
}
